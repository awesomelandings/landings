(() => {
  'use strict';

  const RATED = 3200;   // Вт тривало при 50 Гц
  const PEAK = 3500;    // Вт на пуску
  const TANK = 6;       // л
  // Оцінка витрати: 0,45 л/год на холостих у LOW IDLE + 0,29 л на кожен кВт.
  // На ~400 Вт дає ≈ 10,5 год з бака, що збігається з «до 10 год» від продавця.
  const lph = w => (w > 0 ? 0.45 + 0.29 * w / 1000 : 0);

  const fmt = n => Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ');
  const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------------------------------------------------- шапка і мобільна кнопка */
  const hdr = $('#hdr');
  const bar = $('#bar-cta');
  const onScroll = () => hdr.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (bar && 'IntersectionObserver' in window) {
    const seen = new Map();
    const upd = () => {
      const hide = seen.get('top') || seen.get('order') || seen.get('load');
      bar.classList.toggle('is-on', !hide);
      bar.setAttribute('aria-hidden', hide ? 'true' : 'false');
      $('a', bar).tabIndex = hide ? -1 : 0;
    };
    const io = new IntersectionObserver(es => {
      es.forEach(e => seen.set(e.target.id, e.isIntersecting));
      upd();
    }, { threshold: 0.05 });
    ['top', 'order', 'load'].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------------------------------------------------------- калькулятор */
  const apps = $$('.app');
  const presets = $$('.preset');
  const disp = $('#disp');
  const mini = $('#mini');
  const o = {
    w: $('#o-w'), p: $('#o-p'), peak: $('#o-peak'), h: $('#o-h'), l: $('#o-l'), msg: $('#o-msg'),
    mw: $('#m-w'), mp: $('#m-p'), mh: $('#m-h'),
  };
  const bars = $$('.bar li');

  const name = b => b.dataset.s;

  function calc() {
    const on = apps.filter(b => b.getAttribute('aria-pressed') === 'true');
    let run = 0, surge = 0, surgeBy = null, biggest = null;
    on.forEach(b => {
      const w = +b.dataset.w, k = +b.dataset.k;
      run += w;
      const extra = w * (k - 1);
      if (extra > surge) { surge = extra; surgeBy = b; }
      if (!biggest || w > +biggest.dataset.w) biggest = b;
    });
    const peak = run + surge;
    const pct = run / RATED * 100;
    const over = run > RATED;
    const peakOver = !over && peak > PEAK;

    o.w.textContent = fmt(run);
    o.p.textContent = Math.round(pct);
    o.peak.textContent = fmt(peak);
    o.peak.parentElement.classList.toggle('warn', peak > PEAK);

    let hTxt = '-';
    if (run > 0 && !over) {
      const h = Math.floor(TANK / lph(run) * 2) / 2;
      hTxt = `≈ ${dec(h)} год`;
      o.l.textContent = `≈ ${dec(lph(run), 2)} л/год`;
    } else {
      o.l.textContent = '-';
    }
    o.h.textContent = hTxt;

    bars.forEach(li => li.classList.toggle('on', run > 0 && pct > +li.dataset.p - 25));
    disp.classList.toggle('is-over', over);
    disp.classList.toggle('is-off', run === 0);

    let msg;
    if (run === 0) msg = 'Позначте техніку, і дисплей покаже навантаження, пік на пуску і скільки протримається бак.';
    else if (over) msg = `Перевантаження: ${fmt(run)} Вт, а генератор тримає 3200. Він відключить розетки, щоб не згоріти. Приберіть щось потужне, наприклад «${name(biggest)}».`;
    else if (peakOver) msg = `Тривало потягне, але на пуску (${name(surgeBy)}) навантаження підскочить до ${fmt(peak)} Вт. Спершу ввімкніть цей прилад, а решту після нього.`;
    else if (pct < 50 && surge >= 1000) msg = `Запас є. Але для пуску (${name(surgeBy)}) LOW IDLE краще вимкнути, щоб двигун одразу тримав оберти.`;
    else if (pct < 50) msg = 'Запас великий. Увімкніть LOW IDLE, і генератор скине оберти: тихіше і менше бензину.';
    else if (pct < 85) msg = 'Працює впевнено, запас ще є. Потужну техніку вмикайте по черзі.';
    else msg = 'Майже на межі. Нічого потужного більше не додавайте, а LOW IDLE вимкніть.';
    o.msg.textContent = msg;

    if (mini) {
      o.mw.textContent = fmt(run);
      o.mp.textContent = Math.round(pct);
      o.mh.textContent = over ? 'перевантаження' : hTxt;
      mini.classList.toggle('is-over', over || peakOver);
    }

    const ids = on.map(b => b.dataset.id).sort().join(',');
    presets.forEach(p => p.classList.toggle('is-on', !!p.dataset.set && p.dataset.set.split(',').sort().join(',') === ids));
  }

  apps.forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    calc();
  }));
  presets.forEach(p => p.addEventListener('click', () => {
    const set = p.dataset.set ? p.dataset.set.split(',') : [];
    apps.forEach(b => b.setAttribute('aria-pressed', set.includes(b.dataset.id) ? 'true' : 'false'));
    calc();
  }));
  if (apps.length) {
    const start = presets[0].dataset.set.split(',');
    apps.forEach(b => b.setAttribute('aria-pressed', start.includes(b.dataset.id) ? 'true' : 'false'));
    calc();
  }

  /* ---------------------------------------------------------- панель: точки і список */
  const hots = $$('.hot');
  const items = $$('.anat-list li');
  let pinned = null;
  const light = n => {
    hots.forEach(h => h.classList.toggle('is-on', h.dataset.n === n));
    items.forEach(li => li.classList.toggle('is-on', li.dataset.n === n));
  };
  hots.forEach(h => {
    h.addEventListener('mouseenter', () => light(h.dataset.n));
    h.addEventListener('focus', () => light(h.dataset.n));
    h.addEventListener('mouseleave', () => light(pinned));
    h.addEventListener('click', () => {
      pinned = h.dataset.n; light(pinned);
      if (window.matchMedia('(max-width: 900px)').matches) {
        const li = items.find(i => i.dataset.n === pinned);
        li && li.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
  items.forEach(li => {
    li.addEventListener('mouseenter', () => light(li.dataset.n));
    li.addEventListener('mouseleave', () => light(pinned));
  });

  /* ---------------------------------------------------------- поява при скролі */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const els = $$('.sec-head, .hz-card, .disp, .anat-img, .side-note, .inv-c, .scene, .pair-fig, .steps li, .danger, .spec-g, .faq, .final-text');
    els.forEach(el => el.classList.add('rv'));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(el => io.observe(el));
  }
})();
