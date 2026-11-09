(() => {
  const hdr = document.getElementById('hdr');
  const hero = document.getElementById('top');
  const mbar = document.getElementById('mbar');

  // header turns solid after the hero, mobile buy bar appears
  const onScroll = () => {
    const y = window.scrollY;
    const heroEnd = hero.offsetTop + hero.offsetHeight;
    hdr.classList.toggle('solid', y > heroEnd - 70);
    const nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 260;
    mbar.classList.toggle('show', y > heroEnd - 40 && !nearEnd);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // touch-control demo
  const bud = document.getElementById('bud');
  const out = document.getElementById('padout');
  const rows = [...document.querySelectorAll('#gest button')];
  const ripples = bud.querySelector('.ripples');
  const text = {
    1: '1 дотик: пауза чи відтворення. Під час дзвінка: відповісти',
    2: '2 дотики: наступний трек. Під час дзвінка: відхилити',
    3: '3 дотики: гучність тихіше чи голосніше, залежно від навушника',
    0: 'Утримання 5 секунд: увімкнути чи вимкнути навушник'
  };
  const ripple = () => {
    const i = document.createElement('i');
    ripples.appendChild(i);
    setTimeout(() => i.remove(), 700);
  };
  const show = n => {
    out.textContent = text[n];
    rows.forEach(r => r.classList.toggle('on', r.dataset.n === String(n)));
  };

  let count = 0, timer = null, holdTimer = null, held = false;
  bud.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    held = false;
    bud.classList.add('press');
    holdTimer = setTimeout(() => {
      held = true; count = 0; clearTimeout(timer);
      ripple(); show(0);
    }, 900);
  });
  const release = () => { bud.classList.remove('press'); clearTimeout(holdTimer); };
  bud.addEventListener('pointerup', release);
  bud.addEventListener('pointerleave', release);
  bud.addEventListener('pointercancel', release);
  bud.addEventListener('click', e => {
    if (held) { held = false; return; }
    ripple();
    count = Math.min(count + 1, 3);
    out.textContent = count === 1 ? 'Раз…' : count === 2 ? 'Два…' : 'Три';
    clearTimeout(timer);
    timer = setTimeout(() => { show(count); count = 0; }, count >= 3 ? 250 : 520);
  });
  bud.addEventListener('contextmenu', e => e.preventDefault());

  rows.forEach(r => r.addEventListener('click', () => {
    const n = +r.dataset.n;
    clearTimeout(timer); count = 0;
    const times = n || 1;
    for (let k = 0; k < times; k++) setTimeout(ripple, k * 180);
    show(n);
  }));
})();
