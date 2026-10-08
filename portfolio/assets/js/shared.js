export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugify = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
export function safeUrl(value, {image=false}={}) {
  const url=String(value||'').trim();
  if (!url || /[\u0000-\u0020\\]/.test(url) || url.startsWith('//')) return '';
  if (/^https:\/\//i.test(url)) { try { const parsed=new URL(url); return parsed.username || parsed.password ? '' : parsed.href; } catch { return ''; } }
  if (!image && /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(url)) return url;
  if (!image && /^#\//.test(url)) return url;
  if (image && /^(?:\.\/)?assets\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(url) && !url.split('/').includes('..')) return url;
  return '';
}
export function formatDate(value) {
  const date=new Date(value+'T12:00:00');
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(date);
}
export function readMinutes(text) { return Math.max(1,Math.ceil(String(text).split(/\s+/).length/200)); }
export function markdown(source) {
  const inline = text => escapeHTML(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_,label,href) => {
    const clean=safeUrl(href.replace(/&amp;/g,'&'));
    return clean ? `<a href="${escapeHTML(clean)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  });
  let code=false, codeLines=[], paragraph=[], list=[], html=[];
  const flush=()=>{if(paragraph.length){html.push('<p>'+paragraph.map(inline).join('<br>')+'</p>');paragraph=[];}if(list.length){html.push('<ul>'+list.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>');list=[];}};
  for(const line of String(source||'').replace(/\r/g,'').split('\n')){
    if(line.startsWith('```')){flush();if(code){html.push('<pre><code>'+escapeHTML(codeLines.join('\n'))+'</code></pre>');codeLines=[];}code=!code;continue;}
    if(code){codeLines.push(line);continue;}
    if(!line.trim()){flush();continue;}
    if(/^#{1,3} /.test(line)){flush();const level=Math.max(2,Math.min(3,line.match(/^#+/)[0].length));html.push(`<h${level}>${inline(line.replace(/^#+ /,''))}</h${level}>`);}
    else if(/^- /.test(line)){if(paragraph.length)flush();list.push(line.slice(2));}
    else if(/^> /.test(line)){flush();html.push('<blockquote>'+inline(line.slice(2))+'</blockquote>');}
    else {if(list.length)flush();paragraph.push(line);}
  }
  flush();if(codeLines.length)html.push('<pre><code>'+escapeHTML(codeLines.join('\n'))+'</code></pre>');return html.join('\n');
}
export function validateContent(data) {
  if(!data || data.version!==1 || !data.profile || !Array.isArray(data.projects) || !Array.isArray(data.articles))throw new Error('Format konten tidak valid. Gunakan file content.json dari website ini.');
  for(const key of ['brand','heroFirst','heroSecond','name','aboutTitle','role','tagline','intro','bio','location','email','avatar','github','instagram','youtube','linkedin','projectsTitle','projectsIntro','blogTitle','blogIntro','contactTitle','contactText']) if(typeof data.profile[key]!=='string')throw new Error('Profil tidak lengkap: '+key);
  for(const key of ['github','instagram','youtube','linkedin'])if(data.profile[key]&&!/^https:\/\//.test(safeUrl(data.profile[key])))throw new Error('Tautan sosial harus URL HTTPS yang valid.');
  if(data.profile.avatar&&!safeUrl(data.profile.avatar,{image:true}))throw new Error('Foto profil tidak valid.');
  if(!data.profile.brand.trim() || !data.profile.name.trim())throw new Error('Nama brand dan kreator wajib diisi.');
  if(!Array.isArray(data.profile.skills) || data.profile.skills.some(x=>typeof x!=='string'))throw new Error('Daftar skill tidak valid.');
  for(const kind of ['projects','articles']) {
    const ids=new Set();
    if(data[kind].length>500)throw new Error('Maksimal 500 item per koleksi.');
    for(const item of data[kind]){
      if(!item || typeof item.id!=='string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(item.id) || ids.has(item.id))throw new Error('ID konten tidak valid atau duplikat.');
      ids.add(item.id);
      for(const key of ['title','category','body','image',...(kind==='projects'?['description','url','icon']:['excerpt','date','cover'])])if(typeof item[key]!=='string')throw new Error('Field konten tidak valid: '+key);
      if(!item.title.trim() || !item.category.trim())throw new Error('Judul dan kategori wajib diisi.');
      if(item.image && !safeUrl(item.image,{image:true}))throw new Error('Gambar harus URL HTTPS atau file gambar di assets/.');
      if(kind==='projects' && (!Array.isArray(item.tags) || item.tags.some(x=>typeof x!=='string') || typeof item.featured!=='boolean'))throw new Error('Tag atau pilihan proyek unggulan tidak valid.');
      if(kind==='projects' && item.url && !safeUrl(item.url))throw new Error('Tautan proyek harus menggunakan HTTPS.');
      if(kind==='articles' && (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||Number.isNaN(Date.parse(item.date+'T12:00:00Z'))))throw new Error('Tanggal artikel tidak valid.');
    }
  }
  if(new TextEncoder().encode(JSON.stringify(data)).length>900000)throw new Error('Konten melebihi 900 KB. Gunakan URL gambar, jangan menyisipkan data gambar.');
  return data;
}
export const iconNames=['network','code','server','file','terminal','globe','grid','beaker'];
export function icon(name){
  const paths={network:'<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',server:'<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M12 6.5h5M12 17.5h5"/>',file:'<path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6"/>',terminal:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4m7 0h5"/>',globe:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/>',grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',beaker:'<path d="M9 2h6M10 2v7L4 19q-1 3 2 3h12q3 0 2-3L14 9V2M7 15h10"/>'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.code}</svg>`;
}
