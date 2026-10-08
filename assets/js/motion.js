// Motion is progressive enhancement: content stays usable without these effects.
export function initMotion(root) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let dispose = () => {};
  const refresh = () => { dispose(); dispose = preference.matches ? () => {} : mount(root); };
  refresh();
  preference.addEventListener('change', refresh);
  return () => { preference.removeEventListener('change', refresh); dispose(); };
}

function mount(root) {
  const scope = new AbortController();
  const animations = new Map();
  const seen = new WeakSet();
  const selectors = '.section > .section-number,.section-heading,.project-card,.article-card,.lab-banner,.identity-card,.about-copy,.contact-banner,.page-heading,.detail,.contact-card';
  let observer, mutations, hoverCard, hoverFrame = 0;
  const show = (element, immediate = false) => {
    element.classList.remove('reveal-pending');
    observer?.unobserve(element);
    if (immediate || !element.animate) { animations.get(element)?.cancel(); animations.delete(element); return; }
    const siblings = [...element.parentElement.children].filter(node => node.matches('.project-card,.article-card'));
    const delay = Math.max(0, siblings.indexOf(element) % 4) * 75;
    const animation = element.animate([
      { opacity: 0, transform: 'translate3d(0,30px,0)', filter: 'blur(3px)' },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0)' }
    ], { duration: 650, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    animations.set(element, animation);
    animation.finished.then(() => { animation.cancel(); animations.delete(element); }).catch(() => {});
  };
  const scan = element => {
    if (!(element instanceof Element)) return;
    const nodes = [...(element.matches(selectors) ? [element] : []), ...element.querySelectorAll(selectors)];
    for (const node of nodes) {
      if (seen.has(node)) continue;
      seen.add(node);
      node.classList.add('reveal-pending');
      observer.observe(node);
    }
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) show(entry.target);
    }, { threshold: 0, rootMargin: '0px 0px -12px 0px' });
    scan(root);
    mutations = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) scan(node);
    });
    mutations.observe(root, { childList: true, subtree: true });
    root.addEventListener('focusin', event => {
      let node = event.target;
      while (node && node !== root) { if (node.classList?.contains('reveal-pending')) show(node, true); node = node.parentElement; }
    }, { signal: scope.signal });
  }
  const resetCard = () => {
    cancelAnimationFrame(hoverFrame);
    if (!hoverCard) return;
    for (const key of ['--pointer-x','--pointer-y','--tilt-x','--tilt-y']) hoverCard.style.removeProperty(key);
    hoverCard.classList.remove('pointer-active');
    hoverCard = null;
  };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const card = event.target.closest('.project-card,.article-card');
      if (card !== hoverCard) { resetCard(); hoverCard = card; }
      if (!card || animations.has(card)) return;
      cancelAnimationFrame(hoverFrame);
      const x = event.clientX, y = event.clientY;
      hoverFrame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (x - box.left) / box.width));
        const py = Math.min(1, Math.max(0, (y - box.top) / box.height));
        card.style.setProperty('--pointer-x', `${px * 100}%`);
        card.style.setProperty('--pointer-y', `${py * 100}%`);
        card.style.setProperty('--tilt-x', `${(0.5 - py) * 4}deg`);
        card.style.setProperty('--tilt-y', `${(px - 0.5) * 4}deg`);
        card.classList.add('pointer-active');
      });
    }, { passive: true, signal: scope.signal });
    root.addEventListener('pointerleave', resetCard, { signal: scope.signal });
    root.addEventListener('pointerout', event => { if (hoverCard && !hoverCard.contains(event.relatedTarget)) resetCard(); }, { signal: scope.signal });
  }
  const hero = root.querySelector('.hero');
  const stopAmbient = hero ? ambient(hero, scope.signal) : () => {};
  return () => {
    scope.abort(); observer?.disconnect(); mutations?.disconnect(); resetCard(); stopAmbient();
    for (const animation of animations.values()) animation.cancel();
    animations.clear(); root.querySelectorAll('.reveal-pending').forEach(node => node.classList.remove('reveal-pending'));
  };
}

function ambient(hero, signal) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles'; canvas.setAttribute('aria-hidden', 'true');
  const scan = document.createElement('div'); scan.className = 'hero-scan'; scan.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas, scan);
  const context = canvas.getContext('2d');
  if (!context) { canvas.remove(); scan.remove(); return () => {}; }
  let width = 1, height = 1, particles = [], frame = 0, previous = 0, visible = true, dead = false;
  const resize = () => {
    width = hero.clientWidth; height = hero.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: width < 700 ? 18 : 40 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - .5) * 14, vy: -5 - Math.random() * 9,
      size: Math.random() > .85 ? 4 : 2, phase: Math.random() * Math.PI * 2
    }));
  };
  const draw = time => {
    if (dead || !visible || document.hidden) { frame = 0; return; }
    frame = requestAnimationFrame(draw);
    if (time - previous < 33) return;
    const dt = Math.min((time - (previous || time)) / 1000, .06); previous = time;
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x = (p.x + p.vx * dt + width) % width; p.y = (p.y + p.vy * dt + height) % height;
      const brightness = .3 + (Math.sin(time / 1700 + p.phase) + 1) * .15;
      context.fillStyle = `rgba(255,91,44,${brightness})`;
      context.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j], distance = Math.hypot(p.x - other.x, p.y - other.y);
        if (distance > 155) continue;
        context.strokeStyle = `rgba(255,91,44,${(1 - distance / 155) * .16})`;
        context.lineWidth = .7; context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(other.x, other.y); context.stroke();
      }
    }
  };
  const resume = () => {
    if (!dead && visible && !document.hidden && !frame) { previous = 0; frame = requestAnimationFrame(draw); }
    hero.classList.toggle('motion-paused', !visible || document.hidden);
  };
  const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; }
    resume();
  }) : null;
  const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  resize(); sizeObserver?.observe(hero); visibility?.observe(hero);
  if (!sizeObserver) window.addEventListener('resize', resize, { signal });
  document.addEventListener('visibilitychange', resume, { signal });
  resume();
  return () => { dead = true; cancelAnimationFrame(frame); visibility?.disconnect(); sizeObserver?.disconnect(); canvas.remove(); scan.remove(); hero.classList.remove('motion-paused'); };
}
