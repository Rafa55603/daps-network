import {escapeHTML as e,photoList} from './shared.js?v=photos1';
const pending=new Map();
const limit=2*1024*1024;
export const photoPreview=path=>pending.get(path)?.preview||(path.startsWith('assets/')||path.startsWith('./assets/')?'../'+path:path);
export function clearPendingPhotos(){for(const photo of pending.values())URL.revokeObjectURL(photo.preview);pending.clear();}
export function referencedPending(data){const used=new Set([...data.projects,...data.articles].flatMap(photoList));return [...pending].filter(([path])=>used.has(path));}
export function pendingPhotoCount(data){return referencedPending(data).filter(([,photo])=>!photo.uploaded).length;}
export async function publishPhotos(data,store,onProgress){const photos=referencedPending(data);for(let i=0;i<photos.length;i++){const [path,photo]=photos[i];if(photo.uploaded)continue;onProgress(i+1,photos.length);const result=await store.uploadImage(photo.blob);if(result.path!==path)throw new Error('Alamat foto dari server tidak sesuai. Foto belum diterbitkan.');photo.uploaded=true;}}
export async function photoBackup(data){const photos=[];for(const [path,photo]of referencedPending(data)){if(photo.uploaded)continue;let binary='';for(const byte of new Uint8Array(await photo.blob.arrayBuffer()))binary+=String.fromCharCode(byte);photos.push({path,type:photo.blob.type,base64:btoa(binary)});}return photos.length?{format:'daps-photo-backup-v1',content:data,photos}:data;}
export async function restorePhotos(backup){
  if(backup.format!=='daps-photo-backup-v1')return;
  if(!Array.isArray(backup.photos))throw new Error('Cadangan foto tidak valid.');
  const restored=[];
  for(const photo of backup.photos){
    if(!['image/webp','image/png'].includes(photo.type)||typeof photo.base64!=='string'||photo.base64.length>2800000)throw new Error('Foto cadangan tidak valid.');
    const bytes=Uint8Array.from(atob(photo.base64),x=>x.charCodeAt(0));if(bytes.length>limit)throw new Error('Foto cadangan terlalu besar.');
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(photo.path!==`assets/uploads/${digest}.${photo.type==='image/png'?'png':'webp'}`)throw new Error('Isi foto cadangan tidak cocok dengan alamatnya.');
    const blob=new Blob([bytes],{type:photo.type});const bitmap=await createImageBitmap(blob);bitmap.close();restored.push([photo.path,blob]);
  }
  for(const [path,blob]of restored)if(!pending.has(path))pending.set(path,{blob,preview:URL.createObjectURL(blob),uploaded:false});
}

async function preparePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(`${file.name}: gunakan JPG, PNG, atau WebP.`);
  if(file.size>25*1024*1024)throw new Error(`${file.name}: maksimal 25 MB per foto sebelum kompresi.`);
  let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error(`${file.name}: gambar tidak dapat dibaca.`);}
  try{
    const ratio=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Browser tidak mendukung pengolahan foto.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
    if(!blob)throw new Error('Foto gagal dikompres.');
    if(blob.size>limit)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.68));
    if(!blob||blob.size>limit)throw new Error(`${file.name}: masih terlalu besar setelah kompresi. Coba gambar lebih kecil.`);
    if(!['image/png','image/webp'].includes(blob.type))throw new Error('Format kompresi browser tidak didukung.');
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const path=`assets/uploads/${digest}.${blob.type==='image/png'?'png':'webp'}`;
    if(!pending.has(path))pending.set(path,{blob,preview:URL.createObjectURL(blob),uploaded:false});
    return path;
  }finally{bitmap.close();}
}

export function photoFields(item){
  const mode=item.mediaMode||(photoList(item).length?'photos':'none');
  return `<fieldset class="photo-editor"><legend>Foto & galeri</legend><div class="photo-options"><label><input type="radio" name="mediaMode" value="none" ${mode==='none'?'checked':''}> Tanpa foto <small>Tampilan bawaan dengan ikon atau ilustrasi.</small></label><label><input type="radio" name="mediaMode" value="photos" ${mode==='photos'?'checked':''}> Dengan foto <small>Minimal 1 foto. Foto pertama menjadi sampul.</small></label></div><div id="photo-upload-area" ${mode==='none'?'hidden':''}><label class="photo-drop" for="photo-files"><strong>+ Tambah foto</strong><span>Pilih satu atau banyak foto dari perangkatmu.</span><input id="photo-files" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Upload foto"></label><p class="form-note">JPG, PNG, WebP · Maks. 25 MB per foto. Dikompres otomatis. Tidak ada batas jumlah khusus; mengikuti kapasitas penyimpanan situs.</p><p id="photo-status" role="status" aria-live="polite"></p><div id="photo-list" class="photo-thumbnails"></div></div></fieldset>`;
}

export function mountPhotoEditor(form,item,onChange,onBusy){
  let photos=[...photoList(item)],working=false,disposed=false;
  const list=form.querySelector('#photo-list'),area=form.querySelector('#photo-upload-area'),input=form.querySelector('#photo-files'),status=form.querySelector('#photo-status');
  const mode=()=>form.querySelector('[name="mediaMode"]:checked').value;
  const render=()=>{area.hidden=mode()!=='photos';list.innerHTML=photos.map((path,i)=>`<div class="photo-thumb"><img src="${e(photoPreview(path))}" alt="Foto ${i+1}" loading="lazy"><span>${i===0?'SAMPUL':String(i+1).padStart(2,'0')}</span><div><button class="small-button" type="button" data-photo-action="up" data-index="${i}" aria-label="Majukan foto ${i+1}" ${i===0?'disabled':''}>←</button><button class="small-button" type="button" data-photo-action="down" data-index="${i}" aria-label="Mundurkan foto ${i+1}" ${i===photos.length-1?'disabled':''}>→</button><button class="small-button danger" type="button" data-photo-action="remove" data-index="${i}" aria-label="Hapus foto ${i+1}">Hapus</button></div></div>`).join('');};
  form.querySelectorAll('[name="mediaMode"]').forEach(radio=>radio.addEventListener('change',()=>{render();status.textContent=mode()==='photos'&&!photos.length?'Tambahkan minimal 1 foto sebelum menyimpan.':'';}));
  list.addEventListener('click',event=>{const button=event.target.closest('[data-photo-action]');if(!button||working)return;const i=Number(button.dataset.index);if(button.dataset.photoAction==='remove')photos.splice(i,1);else{const j=i+(button.dataset.photoAction==='up'?-1:1);if(j>=0&&j<photos.length)[photos[i],photos[j]]=[photos[j],photos[i]];}onChange();render();});
  input.addEventListener('change',async()=>{
    const files=[...input.files];if(!files.length||working)return;working=true;input.disabled=true;onBusy(true);const errors=[];
    try{for(let i=0;i<files.length;i++){if(disposed)break;status.textContent=`Menyiapkan foto ${i+1} dari ${files.length}…`;try{const path=await preparePhoto(files[i]);if(disposed)break;if(!photos.includes(path)){photos.push(path);onChange();}render();}catch(error){errors.push(error.message);}}}
    finally{working=false;if(!disposed){input.disabled=false;input.value='';onBusy(false);render();status.textContent=errors.length?errors.join(' '):`${photos.length} foto siap. Foto akan diunggah saat Terbitkan perubahan.`;}}
  });
  render();
  return {value(){if(working)throw new Error('Tunggu sampai foto selesai disiapkan.');const images=mode()==='photos'?[...photos]:[];if(mode()==='photos'&&!images.length)throw new Error('Pilih minimal 1 foto untuk opsi Dengan foto.');return {mediaMode:mode(),images,image:images[0]||''};},dispose(){disposed=true;}};
}
