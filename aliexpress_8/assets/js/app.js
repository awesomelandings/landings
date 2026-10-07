(function () {
  'use strict';

  var ITEM = 'https://www.aliexpress.com/item/1005012932516408.html';
  var VARIANTS = [
    { v: 2800, nom: 2500, peak: 2800, tank: 6.5, sku: '12000059751493173' },
    { v: 3200, nom: 3000, peak: 3200, tank: 6, sku: '12000059751493174' },
    { v: 3500, nom: 3200, peak: 3500, tank: 6, sku: '12000059751493175' },
    { v: 3800, nom: 3500, peak: 3800, tank: 6, sku: '12000059751493176' }
  ];
  var SCALE = 4000;          // ширина шкали навантаження, Вт
  var COMFORT = 0.8;         // тривале навантаження до 80% номіналу
  var BASE_LPH = 0.35;       // л/год майже без навантаження, Eco
  var LPH_PER_KW = 0.33;     // плюс л/год на кожен кВт середнього навантаження

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function skuUrl(sku) {
    return ITEM + '?pdp_ext_f=' + encodeURIComponent('{"sku_id":"' + sku + '"}');
  }
  function fmtInt(n) {
    n = Math.round(n);
    return n < 10000 ? String(n) : n.toLocaleString('uk-UA');
  }
  function fmtDec(n) {
    return n.toFixed(1).replace('.', ',');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  function byV(v) {
    for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].v === v) return VARIANTS[i];
    return null;
  }

  /* ---------------------------------------------------------- шапка і мобільна панель */
  var hdr = $('#hdr');
  var mbar = $('#mbar');
  var hero = $('#top');
  var finalSec = $('#order');
  var finalVisible = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (hdr) hdr.classList.toggle('is-solid', y > 40);
    if (mbar && hero) mbar.classList.toggle('is-on', y > hero.offsetHeight * 0.75 && !finalVisible);
  }
  if ('IntersectionObserver' in window && finalSec) {
    new IntersectionObserver(function (entries) {
      finalVisible = entries[0].isIntersecting;
      onScroll();
    }, { threshold: 0.15 }).observe(finalSec);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- фінальний вибір версії */
  var pick = $('#pick');
  var finalCta = $('#final-cta');
  var finalV = $('#final-v');
  var userPicked = false;

  function setPick(v) {
    var vv = byV(v);
    if (!vv || !pick) return;
    $$('button', pick).forEach(function (b) {
      var on = +b.getAttribute('data-v') === v;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    if (finalCta) finalCta.href = skuUrl(vv.sku);
    if (finalV) finalV.textContent = v + '\u00a0Вт';
  }
  if (pick) {
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      userPicked = true;
      setPick(+b.getAttribute('data-v'));
    });
    pick.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var btns = $$('button', pick);
      var i = btns.indexOf(document.activeElement);
      var d = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
      var n = btns[(i + d + btns.length) % btns.length];
      userPicked = true;
      setPick(+n.getAttribute('data-v'));
      n.focus();
    });
    setPick(2800);
  }

  /* ---------------------------------------------------------- калькулятор навантаження */
  var apps = $$('#apps .app');
  var oRun = $('#o-run'), oPeak = $('#o-peak'), oFill = $('#o-fill'), oPeakMark = $('#o-peakmark');
  var oVerdict = $('#o-verdict');
  var fits = $$('#fits li');
  var vtCells = $$('#vt [data-v]');
  var LABEL = { ok: 'з запасом', edge: 'на межі', no: 'не потягне' };
  var state = { run: 0, peak: 0, avg: 0, rec: null };

  function readLoad() {
    var run = 0, extra = 0, avg = 0;
    apps.forEach(function (b) {
      if (b.getAttribute('aria-pressed') !== 'true') return;
      var w = +b.getAttribute('data-w'), s = +b.getAttribute('data-s'), d = +b.getAttribute('data-d');
      run += w;
      avg += w * d;
      extra = Math.max(extra, s - w);
    });
    return { run: run, peak: run + extra, avg: avg };
  }

  function judge(v, load) {
    if (load.run <= v.nom * COMFORT && load.peak <= v.peak) return 'ok';
    if (load.run <= v.nom && load.peak <= v.peak) return 'edge';
    return 'no';
  }

  function updateLoad() {
    var load = readLoad();
    var states = VARIANTS.map(function (v) { return judge(v, load); });
    var rec = null, i;
    if (load.run > 0) {
      for (i = 0; i < VARIANTS.length; i++) if (states[i] === 'ok') { rec = VARIANTS[i]; break; }
      if (!rec) for (i = 0; i < VARIANTS.length; i++) if (states[i] === 'edge') { rec = VARIANTS[i]; break; }
    }
    state.run = load.run; state.peak = load.peak; state.avg = load.avg; state.rec = rec;

    if (oRun) oRun.textContent = fmtInt(load.run);
    if (oPeak) oPeak.textContent = fmtInt(load.peak);
    if (oFill) {
      oFill.style.width = Math.min(load.run / SCALE, 1) * 100 + '%';
      oFill.classList.toggle('is-over', load.run > 0 && !rec);
    }
    if (oPeakMark) oPeakMark.style.left = Math.min(load.peak / SCALE, 1) * 100 + '%';

    fits.forEach(function (li, k) {
      li.setAttribute('data-state', load.run > 0 ? states[k] : '');
      li.classList.toggle('is-rec', !!rec && rec.v === VARIANTS[k].v);
      li.querySelector('em').textContent = load.run > 0 ? LABEL[states[k]] : '-';
    });

    vtCells.forEach(function (c) {
      c.classList.toggle('is-rec', !!rec && +c.getAttribute('data-v') === rec.v);
    });

    var html;
    if (load.run === 0) {
      html = 'Позначте хоча б один прилад.';
    } else if (!rec) {
      html = fmtInt(load.run) + ' Вт разом забагато для одного генератора. Вмикайте потужні прилади по черзі або з’єднайте два генератори паралельно.';
    } else {
      var pct = Math.round(load.run / rec.nom * 100);
      var stRec = states[VARIANTS.indexOf(rec)];
      if (stRec === 'edge') {
        html = 'Впритул потягне <b>' + rec.v + ' Вт</b> (номінал ' + fmtInt(rec.nom) + ' Вт), але без запасу. Потужні прилади краще вмикати по черзі.';
      } else if (rec.v === 2800) {
        html = 'Вистачить найменшої версії, <b>2800 Вт</b>: навантаження займе ' + pct + '% її номіналу.' +
          (pct <= 40 ? ' Здебільшого генератор працюватиме в режимі Eco, тихо й економно.' : '');
      } else {
        html = 'Беріть <b>' + rec.v + ' Вт</b> (номінал ' + fmtInt(rec.nom) + ' Вт): навантаження займе ' + pct + '% номіналу. Молодші версії працюватимуть на межі або не потягнуть.';
      }
    }
    if (oVerdict) oVerdict.innerHTML = html;

    if (rec && !userPicked) setPick(rec.v);
    updateFuel();
  }

  apps.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      updateLoad();
    });
  });

  /* ---------------------------------------------------------- графік і пальне */
  var hoursBox = $('#hours');
  var presets = $$('.presets .chip');
  var fH = $('#f-h'), fL = $('#f-l'), fT = $('#f-t'), fC = $('#f-c'), fP = $('#f-p');
  var fLem = fL ? fL.nextElementSibling : null;
  var hourBtns = [];
  var PRESET = {
    '4-8': function (h) { return ((h + 22) % 12) < 4; },
    '4-4': function (h) { return (h % 8) < 4; },
    '8-4': function (h) { return (h % 12) < 8; },
    'none': function () { return false; }
  };

  if (hoursBox) {
    var now = new Date().getHours();
    for (var h = 0; h < 24; h++) {
      var b = document.createElement('button');
      var hh = (h < 10 ? '0' : '') + h;
      var nx = ((h + 1) % 24 < 10 ? '0' : '') + ((h + 1) % 24);
      b.type = 'button';
      b.className = 'hr' + (h === now ? ' is-now' : '');
      b.textContent = hh;
      b.setAttribute('aria-label', hh + ':00-' + nx + ':00' + (h === now ? ', зараз' : ''));
      b.setAttribute('aria-pressed', 'false');
      hoursBox.appendChild(b);
      hourBtns.push(b);
    }
    hoursBox.addEventListener('click', function (e) {
      var t = e.target.closest('.hr');
      if (!t) return;
      t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      presets.forEach(function (p) { p.removeAttribute('aria-pressed'); });
      updateFuel();
    });
  }

  function applyPreset(name) {
    var fn = PRESET[name];
    if (!fn) return;
    hourBtns.forEach(function (b, h) { b.setAttribute('aria-pressed', fn(h) ? 'true' : 'false'); });
    presets.forEach(function (p) {
      if (p.getAttribute('data-preset') === name && name !== 'none') p.setAttribute('aria-pressed', 'true');
      else p.removeAttribute('aria-pressed');
    });
    updateFuel();
  }
  presets.forEach(function (p) {
    p.addEventListener('click', function () { applyPreset(p.getAttribute('data-preset')); });
  });

  function updateFuel() {
    if (!fH) return;
    var hoursOff = hourBtns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
    var v = state.rec || VARIANTS[VARIANTS.length - 1];
    var avgKw = Math.min(state.avg, v.nom) / 1000;
    var lph = BASE_LPH + LPH_PER_KW * avgKw;
    var liters = hoursOff * lph;
    var perTank = v.tank / lph;
    var price = parseFloat(String(fP && fP.value || '0').replace(',', '.')) || 0;
    var tanks = liters / v.tank;

    fH.textContent = hoursOff;
    fL.textContent = fmtDec(liters);
    if (fLem) {
      var t1 = Math.round(tanks * 10) / 10;
      var tankTxt = t1 % 1 === 0 ? t1 + ' ' + plural(t1, 'бак', 'баки', 'баків') : fmtDec(t1) + ' бака';
      fLem.textContent = hoursOff ? 'л на добу, це ' + tankTxt : 'л на добу';
    }
    fT.textContent = perTank >= 10 ? Math.round(perTank) : fmtDec(perTank);
    fC.textContent = fmtInt(liters * price);
  }
  if (fP) fP.addEventListener('input', updateFuel);

  applyPreset('4-4');
  updateLoad();

  /* ---------------------------------------------------------- будова: піни і список */
  var pins = $$('.pin');
  var items = $$('#anat-list li');
  function setOn(i) {
    pins.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-i') === i); });
    items.forEach(function (li) { li.classList.toggle('is-on', li.getAttribute('data-i') === i); });
  }
  pins.forEach(function (p) {
    var i = p.getAttribute('data-i');
    p.addEventListener('mouseenter', function () { setOn(i); });
    p.addEventListener('focus', function () { setOn(i); });
    p.addEventListener('click', function () {
      setOn(i);
      var li = items.filter(function (x) { return x.getAttribute('data-i') === i; })[0];
      if (!li) return;
      var r = li.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
  items.forEach(function (li) {
    li.addEventListener('mouseenter', function () { setOn(li.getAttribute('data-i')); });
  });
})();
