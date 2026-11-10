(() => {
  'use strict';

  /* ---------- outage schedule simulator ---------- */
  const CAP = 1056;          // Wh
  const EFF = 0.85;          // inverter + conversion losses on AC loads
  const FAST = 1000;         // Wh per hour into the battery up to 80% (1200 W from the socket)
  const TAIL = 400;          // Wh per hour from 80% to 100%
  const STEP = 1 / 12;       // 5 minutes
  const PRESETS = {
    two: [8, 9, 10, 11, 18, 19, 20, 21],
    three: [0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19],
    long: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
  };

  const hoursEl = document.getElementById('hours');
  const chips = document.getElementById('chips');
  if (!hoursEl || !chips) return;
  const seg = document.querySelectorAll('.seg [role="radio"]');
  const customBtn = document.querySelector('.seg [data-preset="custom"]');
  const colsEl = document.getElementById('cols');
  const lineEl = document.getElementById('line');
  const areaEl = document.getElementById('area');
  const deadEl = document.getElementById('dead');
  const roMin = document.getElementById('roMin');
  const roHours = document.getElementById('roHours');
  const roLoad = document.getElementById('roLoad');
  const verdict = document.getElementById('verdict');
  const SVGNS = 'http://www.w3.org/2000/svg';

  let off = new Array(24).fill(false);
  PRESETS.three.forEach(h => { off[h] = true; });

  const pad = n => String(n).padStart(2, '0');
  const clock = t => { const m = Math.round(t * 60) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const X = t => (t / 24) * 720;
  const Y = e => 215 - (e / CAP) * 195;

  const btns = [];
  for (let h = 0; h < 24; h++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = pad(h);
    b.dataset.h = h;
    b.addEventListener('click', () => {
      off[h] = !off[h];
      setPreset('custom');
      render();
    });
    hoursEl.appendChild(b);
    btns.push(b);
  }

  function setPreset(name) {
    seg.forEach(s => s.setAttribute('aria-checked', String(s.dataset.preset === name)));
    if (name === 'custom') customBtn.disabled = false;
  }
  seg.forEach((s, i) => {
    s.addEventListener('click', () => {
      const p = s.dataset.preset;
      if (p === 'custom') return;
      off = new Array(24).fill(false);
      PRESETS[p].forEach(h => { off[h] = true; });
      setPreset(p);
      render();
    });
    s.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const list = [...seg].filter(x => !x.disabled);
      const j = list.indexOf(s);
      const next = list[(j + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
    });
  });
  chips.addEventListener('change', render);

  function load() {
    return [...chips.querySelectorAll('input:checked')].reduce((s, i) => s + Number(i.value), 0);
  }

  function simulate(L) {
    const steps = 24 / STEP;
    const anyOn = off.some(v => !v);
    const days = anyOn ? 2 : 1;          // second day = steady state; with no grid at all start full
    let e = CAP;
    const pts = [], dead = [];
    let fullAtStart = true;
    for (let d = 0; d < days; d++) {
      const rec = d === days - 1;
      for (let k = 0; k < steps; k++) {
        const t = k * STEP, h = Math.floor(t + 1e-9);
        if (rec) pts.push([t, e]);
        if (off[h]) {
          const prevOff = k === 0 ? off[23] : off[Math.floor((k - 1) * STEP + 1e-9)];
          if (rec && !prevOff && e < CAP - 1) fullAtStart = false;
          const need = (L / EFF) * STEP;
          if (e >= need) e -= need;
          else { if (rec && L > 0) dead.push(t); e = 0; }
        } else {
          e += (e < 0.8 * CAP ? FAST : TAIL) * STEP;
          if (e > CAP) e = CAP;
        }
      }
      if (rec) pts.push([24, e]);
    }
    return { pts, dead, fullAtStart };
  }

  function spans(dead) {
    const out = [];
    dead.forEach(t => {
      const last = out[out.length - 1];
      if (last && Math.abs(t - last[1]) < STEP * 1.5) last[1] = t + STEP;
      else out.push([t, t + STEP]);
    });
    return out;
  }

  function render() {
    btns.forEach((b, h) => {
      b.setAttribute('aria-pressed', String(off[h]));
      b.setAttribute('aria-label', `${pad(h)}:00-${pad((h + 1) % 24)}:00, ${off[h] ? 'світла немає' : 'світло є'}`);
    });
    // columns
    colsEl.textContent = '';
    for (let h = 0; h < 24; h++) {
      if (off[h]) continue;
      let end = h;
      while (end + 1 < 24 && !off[end + 1]) end++;
      for (const [cls, ht] of [['col-on', 230], ['col-on-top', 4]]) {
        const r = document.createElementNS(SVGNS, 'rect');
        r.setAttribute('x', h * 30); r.setAttribute('y', 0);
        r.setAttribute('width', (end - h + 1) * 30); r.setAttribute('height', ht);
        r.setAttribute('class', cls);
        colsEl.appendChild(r);
      }
      h = end;
    }

    const L = load();
    const { pts, dead, fullAtStart } = simulate(L);
    const d = pts.map(([t, e], i) => (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(e).toFixed(1)).join(' ');
    lineEl.setAttribute('d', d);
    areaEl.setAttribute('d', d + ` L720 215 L0 215 Z`);
    const ds = spans(dead);
    deadEl.setAttribute('d', ds.map(([a, b]) => `M${X(a).toFixed(1)} 213 L${X(b).toFixed(1)} 213`).join(' '));

    let minE = CAP, minT = 0;
    pts.forEach(([t, e]) => { if (e < minE - 0.01) { minE = e; minT = t; } });
    const minPct = Math.max(0, Math.round((minE / CAP) * 100));
    roMin.textContent = String(minPct);
    roMin.classList.toggle('is-bad', ds.length > 0);
    roLoad.textContent = String(L);
    roHours.textContent = L ? Math.min(99.9, (CAP * EFF) / L).toFixed(1) : '--';

    const offCount = off.filter(Boolean).length;
    let html;
    if (!L) {
      html = 'Виберіть хоча б один прилад зі списку.';
    } else if (!offCount) {
      html = '<b>Світло є цілу добу.</b> Станція просто стоїть повна і чекає на відключення.';
    } else if (ds.length) {
      let [a, b] = ds[0];
      const last = ds[ds.length - 1];
      if (ds.length > 1 && a < STEP / 2 && last[1] > 24 - 1e-6) { a = last[0]; b = ds[0][1]; }  // outage runs over midnight
      const till = b > 24 - 1e-6 ? 'до кінця доби' : `до ${clock(b)}`;
      html = `<b class="bad">Не вистачає.</b> О ${clock(a)} станція сяде, і ${till} техніка залишиться без живлення. Приберіть щось зі списку або вмикайте найпотужніше лише частину часу.`;
    } else if (minPct < 20) {
      html = `<b>Впритул.</b> Найнижче заряд опуститься до ${minPct}% о ${clock(minT)}. Працюватиме, але без запасу на випадок, якщо відключення затягнеться.`;
    } else {
      const tail = offCount === 24
        ? ' Це доба без жодної підзарядки.'
        : fullAtStart
          ? ' Між відключеннями станція встигає зарядитися до 100%.'
          : ' Між відключеннями до 100% вона не встигає, але запасу вистачає.';
      html = `<b>Вистачає з запасом.</b> Найнижче заряд опуститься до ${minPct}% о ${clock(minT)}.${tail}`;
    }
    verdict.innerHTML = html;
  }
  render();
})();

(() => {
  'use strict';
  /* ---------- ports: link pins on the photo with the list ---------- */
  const front = document.getElementById('front');
  const ports = document.getElementById('ports');
  if (!front || !ports) return;
  const pins = [...front.querySelectorAll('.pin')];
  const items = [...ports.querySelectorAll('li')];
  const set = k => {
    front.classList.toggle('has-active', !!k);
    pins.forEach(p => p.classList.toggle('is-on', p.dataset.k === k));
    items.forEach(i => i.classList.toggle('is-on', i.dataset.k === k));
  };
  pins.forEach(p => {
    p.setAttribute('aria-label', p.textContent.trim());
    p.addEventListener('mouseenter', () => set(p.dataset.k));
    p.addEventListener('mouseleave', () => set(null));
    p.addEventListener('focus', () => set(p.dataset.k));
    p.addEventListener('blur', () => set(null));
    p.addEventListener('click', () => {
      set(p.dataset.k);
      const li = items.find(i => i.dataset.k === p.dataset.k);
      if (li && window.matchMedia('(max-width: 1100px)').matches) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
  items.forEach(i => {
    i.addEventListener('mouseenter', () => set(i.dataset.k));
    i.addEventListener('mouseleave', () => set(null));
  });
})();

(() => {
  'use strict';
  /* ---------- mobile buy bar: after the hero button scrolls away, hidden on the buy block ---------- */
  const bar = document.getElementById('mbar');
  const heroBuy = document.getElementById('heroBuy');
  const buy = document.getElementById('kupyty');
  if (!bar || !heroBuy || !buy) return;
  const a = bar.querySelector('a');
  let shown = null, ticking = false;
  const upd = () => {
    ticking = false;
    const vh = window.innerHeight;
    const pastHero = heroBuy.getBoundingClientRect().bottom < 0;
    const r = buy.getBoundingClientRect();
    const onBuy = r.top < vh * 0.8 && r.bottom > 0;
    const show = pastHero && !onBuy;
    if (show === shown) return;
    shown = show;
    bar.classList.toggle('on', show);
    bar.setAttribute('aria-hidden', String(!show));
    if (a) a.tabIndex = show ? 0 : -1;
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  upd();
})();
