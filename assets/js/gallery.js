import {escapeHTML as e,safeUrl,photoList} from './shared.js?v=photos1';

export function gallery(item) {
  const photos=photoList(item).filter(src=>safeUrl(src,{image:true}));
  if(!photos.length)return '';
  return `<section class="photo-gallery" aria-label="Galeri foto ${e(item.title)}" tabindex="0"><div class="gallery-stage">${photos.map((src,i)=>`<figure class="gallery-slide" ${i?'hidden':''}><img src="${e(src)}" alt="${e(item.title)} — foto ${i+1} dari ${photos.length}" ${i?'loading="lazy"':''} decoding="async" referrerpolicy="no-referrer"></figure>`).join('')}</div><div class="gallery-controls"><button type="button" class="gallery-arrow" data-step="-1" aria-label="Foto sebelumnya" ${photos.length<2?'hidden':''}>← <span>Sebelumnya</span></button><span class="gallery-count" aria-live="polite" aria-atomic="true">1 / ${photos.length}</span><button type="button" class="gallery-arrow" data-step="1" aria-label="Foto berikutnya" ${photos.length<2?'hidden':''}><span>Berikutnya</span> →</button></div></section>`;
}

export function initGalleries(root) {
  for(const container of root.querySelectorAll('.photo-gallery')){
    const slides=[...container.querySelectorAll('.gallery-slide')];let index=0,startX=null,startY=null;
    const move=step=>{if(slides.length<2)return;slides[index].hidden=true;index=(index+step+slides.length)%slides.length;slides[index].hidden=false;container.querySelector('.gallery-count').textContent=`${index+1} / ${slides.length}`;};
    container.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>move(Number(button.dataset.step))));
    container.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}});
    container.addEventListener('touchstart',event=>{if(event.touches.length!==1){startX=null;return;}startX=event.touches[0].clientX;startY=event.touches[0].clientY;},{passive:true});
    container.addEventListener('touchend',event=>{if(startX===null)return;const dx=event.changedTouches[0].clientX-startX,dy=event.changedTouches[0].clientY-startY;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);startX=null;},{passive:true});
    container.addEventListener('touchcancel',()=>{startX=null;},{passive:true});
  }
}
