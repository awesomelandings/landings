(() => {
  const hdr = document.getElementById('hdr');
  const hero = document.getElementById('top');
  const mbar = document.getElementById('mbar');

  // header turns solid after the hero top, mobile buy bar appears after the hero
  const onScroll = () => {
    const y = window.scrollY;
    const heroEnd = hero.offsetTop + hero.offsetHeight;
    hdr.classList.toggle('solid', y > 40);
    const nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 320;
    mbar.classList.toggle('show', y > heroEnd - 60 && !nearEnd);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // real seller video: play only while visible
  const video = document.getElementById('live');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (video && 'IntersectionObserver' in window) {
    if (still) video.setAttribute('controls', '');
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
          if (!still) video.play().catch(() => video.setAttribute('controls', ''));
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 }).observe(video);
  }

  // buttons and ports: pins on the photo and rows in the list light up together
  document.querySelectorAll('.panel').forEach(panel => {
    const pins = [...panel.querySelectorAll('.pin')];
    const rows = [...panel.querySelectorAll('.keys li')];
    const set = k => {
      pins.forEach(p => p.classList.toggle('on', p.dataset.k === k));
      rows.forEach(r => r.classList.toggle('on', r.dataset.k === k));
    };
    pins.forEach(p => {
      p.addEventListener('mouseenter', () => set(p.dataset.k));
      p.addEventListener('focus', () => set(p.dataset.k));
      p.addEventListener('click', () => set(p.dataset.k));
    });
    rows.forEach(r => {
      r.addEventListener('mouseenter', () => set(r.dataset.k));
      r.addEventListener('click', () => set(r.dataset.k));
    });
    panel.addEventListener('mouseleave', () => set(null));
  });
})();
