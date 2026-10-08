import {validateContent} from './shared.js';
const verifierKey='daps.oauth.verifier';
const proofKey='daps.oauth.context';
const toBase64URL=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

export class GitHubStore {
  #api; #session=''; #sha=''; #login=''; #repository='';
  constructor(config) {
    if(!config.adminApiUrl)throw new Error('Login GitHub belum dihubungkan. Ikuti panduan setup Cloudflare Worker, lalu isi adminApiUrl di config.json.');
    const url=new URL(config.adminApiUrl);
    if(url.protocol!=='https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname))throw new Error('adminApiUrl harus berupa alamat HTTPS Worker, misalnya https://daps-admin.namamu.workers.dev.');
    this.#api=url.origin;
  }
  get connected(){return !!this.#session;}
  get login(){return this.#login;}
  get repository(){return this.#repository;}
  async beginLogin() {
    const verifier=toBase64URL(crypto.getRandomValues(new Uint8Array(32)));
    const challenge=toBase64URL(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    // Transient proof only: no session token, GitHub token, or client secret is stored here.
    try{sessionStorage.setItem(verifierKey,verifier);sessionStorage.setItem(proofKey,JSON.stringify({api:this.#api,expires:Date.now()+600000}));}
    catch{throw new Error('Browser memblokir penyimpanan sementara untuk login. Izinkan penyimpanan situs lalu coba kembali.');}
    location.assign(this.#api+'/auth/start?challenge='+encodeURIComponent(challenge));
  }
  async completeLogin(ticket) {
    let verifier,context;
    try{verifier=sessionStorage.getItem(verifierKey);context=JSON.parse(sessionStorage.getItem(proofKey)||'null');sessionStorage.removeItem(verifierKey);sessionStorage.removeItem(proofKey);}catch{throw new Error('Bukti login tidak tersedia. Mulai login kembali dari tab ini.');}
    if(!verifier||!context||context.api!==this.#api||context.expires<Date.now())throw new Error('Login sudah kedaluwarsa atau dibuka dari tab berbeda. Klik Masuk dengan GitHub lagi.');
    try{
      const session=await this.#request('/auth/exchange',{method:'POST',body:JSON.stringify({ticket,verifier})});
      if(!/^[A-Za-z0-9_-]{43}$/.test(session.session||''))throw new Error('Server belum mengonfirmasi sesi login.');
      this.#session=session.session;this.#login=session.login;this.#repository=session.repository;
      const file=await this.#request('/api/content');
      this.#sha=file.sha;return validateContent(file.data);
    }catch(error){await this.logout();throw error;}
  }
  async #request(path,options={}) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch(this.#api+path,{...options,cache:'no-store',signal:controller.signal,credentials:'omit',headers:{Accept:'application/json',...(this.#session?{Authorization:'Bearer '+this.#session}:{}),...(options.body?{'Content-Type':'application/json'}:{})}});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Server admin menolak permintaan.');
      return result;
    }catch(error){if(error.name==='AbortError')throw new Error('Server terlalu lama merespons. Periksa repositori sebelum mencoba menerbitkan lagi.');if(error instanceof TypeError)throw new Error('Tidak dapat terhubung ke server admin. Periksa adminApiUrl, SITE_URL, dan koneksi internet.');throw error;}
    finally{clearTimeout(timeout);}
  }
  async publish(data) {
    if(!this.connected)throw new Error('Masuk dengan GitHub untuk menerbitkan perubahan.');
    validateContent(data);
    const result=await this.#request('/api/content',{method:'PUT',body:JSON.stringify({data,sha:this.#sha})});
    if(!result.sha)throw new Error('Penyimpanan belum dikonfirmasi. Periksa GitHub sebelum mencoba lagi.');
    this.#sha=result.sha;return result;
  }
  async logout() {
    const session=this.#session;
    this.#session='';this.#sha='';this.#login='';this.#repository='';
    if(session){try{await fetch(this.#api+'/api/logout',{method:'POST',credentials:'omit',keepalive:true,headers:{Authorization:'Bearer '+session},signal:AbortSignal.timeout(8000)});}catch{/* Session still expires automatically on the server. */}}
  }
}
