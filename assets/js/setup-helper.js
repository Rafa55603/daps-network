// Generates a local encryption key only when the user clicks. Never sent or stored.
document.querySelector('#make-secret')?.addEventListener('click',()=>{
  const field=document.querySelector('#generated-secret');
  field.value=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  document.querySelector('#copy-secret').disabled=false;
  document.querySelector('#secret-status').textContent='Kunci dibuat di browser. Simpan sebagai Secret TOKEN_SECRET di Cloudflare; jangan masukkan ke repo.';
});
document.querySelector('#copy-secret')?.addEventListener('click',async()=>{
  const field=document.querySelector('#generated-secret');
  try{await navigator.clipboard.writeText(field.value);document.querySelector('#secret-status').textContent='Tersalin. Tempel ke Secret TOKEN_SECRET pada Worker.';}
  catch{field.type='text';field.focus();field.select();document.querySelector('#secret-status').textContent='Tekan Ctrl+C untuk menyalin kunci yang dipilih.';}
});
