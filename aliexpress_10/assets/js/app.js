(function () {
  'use strict';

  var AE = 'https://www.aliexpress.com/item/1005012561811189.html?pdp_ext_f=';
  var SHIP = 5255.96;
  var MODELS = [
    { id: '3', kw: '3', w: 3000, start: 'ручний старт', price: 14011.32, sku: '12000058735718131' },
    { id: '3.5', kw: '3,5', w: 3500, start: 'електростарт', price: 15102.70, sku: '12000058735718132' },
    { id: '5.5', kw: '5,5', w: 5500, start: 'електростарт', price: 30980.42, sku: '12000058735718133' },
    { id: '6.5', kw: '6,5', w: 6500, start: 'електростарт', price: 32538.84, sku: '12000058735718134' },
    { id: '8', kw: '8', w: 8000, start: 'ручний старт', price: 38764.40, sku: '12000058735718135' }
  ];
  MODELS.forEach(function (m) {
    m.cont = m.w * 0.9;
    m.url = AE + encodeURIComponent(JSON.stringify({ sku_id: m.sku }));
  });

  // running watts and start multiplier (motor loads pull 2-3x for a moment)
  var GROUPS = [
    { name: 'Дім', items: [
      ['fridge', 'Холодильник', 150, 3],
      ['boiler', 'Газовий котел', 150, 1.5],
      ['light', 'Світло по дому', 100, 1],
      ['router', 'Роутер і зарядки', 50, 1],
      ['tv', 'Телевізор', 120, 1],
      ['pc', 'Комп’ютер', 250, 1]
    ] },
    { name: 'Вода і тепло', items: [
      ['pump', 'Насос свердловини', 750, 3],
      ['bojler', 'Бойлер', 1500, 1],
      ['washer', 'Пральна машина', 2000, 1],
      ['heater', 'Обігрівач', 1500, 1]
    ] },
    { name: 'Кухня', items: [
      ['kettle', 'Чайник', 2000, 1],
      ['micro', 'Мікрохвильовка', 1300, 1],
      ['coffee', 'Кавомашина', 1500, 1]
    ] },
    { name: 'Майстерня і бізнес', items: [
      ['grinder', 'Болгарка', 1100, 2],
      ['drill', 'Дриль', 700, 1.5],
      ['saw', 'Циркулярка', 1800, 2],
      ['compr', 'Компресор', 1500, 2.5],
      ['freezer', 'Морозильний ларь', 200, 3]
    ] }
  ];
  var PRESETS = {
    min: ['fridge', 'boiler', 'light', 'router', 'tv'],
    house: ['fridge', 'boiler', 'light', 'router', 'tv', 'pc', 'pump', 'bojler'],
    shop: ['light', 'router', 'grinder', 'drill', 'compr'],
    kiosk: ['coffee', 'freezer', 'fridge', 'light', 'router'],
    none: []
  };

  var ITEMS = {};
  GROUPS.forEach(function (g) {
    g.items.forEach(function (it) { ITEMS[it[0]] = { id: it[0], name: it[1], w: it[2], k: it[3] }; });
  });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nbsp = ' ';
  function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, nbsp); }
  function uah(n) { return num(n) + nbsp + 'грн'; }
  function byId(id) { for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === id) return MODELS[i]; return MODELS[0]; }

  /* header + dock */
  var hdr = $('#hdr');
  var dock = $('#dock');
  var hero = $('#top');
  var fin = $('#zamovyty');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('solid', y > 30);
    if (dock && hero) {
      var past = hero.getBoundingClientRect().bottom < 80;
      var atEnd = fin && fin.getBoundingClientRect().top < window.innerHeight * 0.75;
      var show = past && !atEnd;
      dock.classList.toggle('show', show);
      dock.setAttribute('aria-hidden', show ? 'false' : 'true');
      $('#dockLink').tabIndex = show ? 0 : -1;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* reveal + schedule */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target.id === 'sched' ? 'run' : 'in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }) : null;

  var sched = $('#sched');
  if (sched) {
    $$('.sched-grid li.off', sched).forEach(function (li, i) {
      li.style.setProperty('--d', (0.6 + i * 0.13).toFixed(2) + 's');
    });
  }
  if (io) {
    $$('.rv').forEach(function (el) { io.observe(el); });
    if (sched) io.observe(sched);
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
    if (sched) sched.classList.add('run');
  }

  /* selected model: models list, receipt, dock */
  var current = '3';
  function setModel(id) {
    var m = byId(id);
    current = m.id;
    $$('.rcpt-tabs button').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-m') === m.id ? 'true' : 'false'); });
    var name = 'Генератор ' + m.kw + ' кВт, ' + m.start;
    $('#rName').textContent = name;
    $('#rPrice').textContent = uah(m.price);
    $('#rSum').textContent = uah(m.price + SHIP);
    $('#rLink').href = m.url;
    $('#dockKw').textContent = m.kw + ' кВт';
    $('#dockPr').textContent = uah(m.price) + ' + доставка';
    $('#dockLink').href = m.url;
  }
  $$('.rcpt-tabs button').forEach(function (b) {
    b.addEventListener('click', function () { setModel(b.getAttribute('data-m')); });
    b.addEventListener('keydown', function (e) {
      var tabs = $$('.rcpt-tabs button');
      var i = tabs.indexOf(b);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); i = (i + 1) % tabs.length; }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); i = (i - 1 + tabs.length) % tabs.length; }
      else return;
      tabs[i].focus(); setModel(tabs[i].getAttribute('data-m'));
    });
  });

  /* shchytok */
  var box = $('#box');
  var sel = {};
  if (box) {
    GROUPS.forEach(function (g) {
      var rail = document.createElement('div');
      rail.className = 'rail';
      rail.innerHTML = '<p class="rail-l">' + g.name + '</p><div class="rail-row"></div>';
      var row = rail.lastChild;
      g.items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'brk';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('data-id', it[0]);
        b.setAttribute('aria-label', it[1] + ', ' + it[2] + ' ват');
        b.innerHTML = '<span class="brk-w">' + num(it[2]) + nbsp + 'Вт</span><span class="brk-slot"><span class="brk-lever"></span></span><span class="brk-flag"></span><span class="brk-tape">' + it[1] + '</span>';
        b.addEventListener('click', function () {
          sel[it[0]] = !sel[it[0]];
          markPreset(null);
          render();
        });
        row.appendChild(b);
      });
      box.appendChild(rail);
    });

    // gauge ticks
    var ticks = $('#gTicks');
    var svgNS = 'http://www.w3.org/2000/svg';
    for (var v = 0; v <= 9000; v += 500) {
      var a = Math.PI - (v / 9000) * Math.PI;
      var maj = v % 1000 === 0;
      var r1 = 116, r2 = maj ? 100 : 107;
      var l = document.createElementNS(svgNS, 'line');
      l.setAttribute('x1', (150 + r1 * Math.cos(a)).toFixed(1));
      l.setAttribute('y1', (160 - r1 * Math.sin(a)).toFixed(1));
      l.setAttribute('x2', (150 + r2 * Math.cos(a)).toFixed(1));
      l.setAttribute('y2', (160 - r2 * Math.sin(a)).toFixed(1));
      l.setAttribute('class', 'g-tick' + (maj ? ' maj' : ''));
      ticks.appendChild(l);
      if (maj) {
        var t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', (150 + 86 * Math.cos(a)).toFixed(1));
        t.setAttribute('y', (160 - 86 * Math.sin(a) + 4).toFixed(1));
        t.setAttribute('class', 'g-lab');
        t.textContent = v / 1000;
        ticks.appendChild(t);
      }
    }
  }

  function arc(to) {
    var v = Math.max(0, Math.min(9000, to));
    var a = Math.PI - (v / 9000) * Math.PI;
    return 'M20 160 A130 130 0 0 1 ' + (150 + 130 * Math.cos(a)).toFixed(2) + ' ' + (160 - 130 * Math.sin(a)).toFixed(2);
  }
  function rot(v) { return Math.max(-93, Math.min(93, (v / 9000) * 180 - 90)); }

  function markPreset(key) {
    $$('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-preset') === key && key !== 'none' ? 'true' : 'false'); });
  }
  $$('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      var key = c.getAttribute('data-preset');
      sel = {};
      (PRESETS[key] || []).forEach(function (id) { sel[id] = true; });
      markPreset(key);
      render();
    });
  });

  function render() {
    if (!box) return;
    var run = 0, surge = 0, on = [];
    Object.keys(ITEMS).forEach(function (id) {
      if (!sel[id]) return;
      var it = ITEMS[id];
      on.push(it);
      run += it.w;
      surge = Math.max(surge, it.w * (it.k - 1));
    });
    var peak = run + surge;
    $$('.brk').forEach(function (b) { b.setAttribute('aria-pressed', sel[b.getAttribute('data-id')] ? 'true' : 'false'); });

    var status = MODELS.map(function (m) {
      if (run <= m.cont * 0.8 && peak <= m.w) return 'ok';
      if (run <= m.cont && peak <= m.w) return 'tight';
      return 'no';
    });
    var idx = status.indexOf('ok');
    var tight = false;
    if (idx < 0) { idx = status.indexOf('tight'); tight = idx >= 0; }
    var none = idx < 0;
    var rec = none ? MODELS[MODELS.length - 1] : MODELS[idx];

    // gauge
    $('#runW').textContent = num(run);
    $('#peakW').textContent = num(peak);
    $('#gNeedle').style.transform = 'rotate(' + rot(run) + 'deg)';
    $('#gPeak').style.transform = 'rotate(' + rot(peak) + 'deg)';
    $('#gPeak').style.opacity = peak > run ? '1' : '0';
    var cap = $('#gCap');
    cap.setAttribute('d', arc(none ? 9000 : rec.cont));
    cap.classList.toggle('bad', none);

    // pick
    var pick = $('#pick');
    pick.classList.toggle('warn', none || tight);
    $('#pickKw').textContent = rec.kw + ' кВт';
    $('#pickStart').textContent = rec.start;
    $('#pickPrice').textContent = uah(rec.price);
    $('#pickLink').href = rec.url;
    var k, why;
    if (!on.length) {
      k = 'Щиток порожній';
      why = 'Клацніть автомати техніки, яку хочете живити під час відключень, і тут з’явиться потрібна модель.';
      pick.classList.remove('warn');
    } else if (none) {
      k = 'Забагато одночасно';
      why = 'Навіть 8 кВт не потягне все разом. Вмикайте бойлер, чайник, обігрівач і пральну машину по черзі, і вистачить меншої моделі.';
    } else if (tight) {
      k = 'Впритул';
      why = 'Генератор працюватиме на межі тривалої потужності. Краще не вмикати все одночасно або взяти модель потужніше.';
    } else {
      k = 'Вистачить із запасом';
      var room = rec.cont - run;
      why = 'Запас ' + num(Math.floor(room / 50) * 50) + nbsp + 'Вт тривалої потужності.';
      var fitMore = Object.keys(ITEMS).map(function (id) { return ITEMS[id]; }).filter(function (it) {
        return !sel[it.id] && run + it.w <= rec.cont * 0.8 && run + it.w + Math.max(surge, it.w * (it.k - 1)) <= rec.w;
      }).sort(function (a, b) { return b.w - a.w; })[0];
      if (fitMore) why += ' Влізе ще, наприклад, ' + fitMore.name.toLowerCase() + '.';
      if (idx > 0 && status[idx - 1] === 'tight') why += ' Модель ' + MODELS[idx - 1].kw + nbsp + 'кВт теж потягне, але без запасу.';
    }
    $('#pickK').textContent = k;
    var mini = $('#mini');
    if (mini) {
      $('#miniW').textContent = num(run);
      $('#miniK').textContent = !on.length ? 'щиток порожній' : none ? 'забагато' : tight ? 'впритул' : 'вистачить';
      $('#miniKw').textContent = on.length ? rec.kw + nbsp + 'кВт' : '';
      mini.classList.toggle('warn', on.length > 0 && (none || tight));
    }
    $('#pickWhy').textContent = why;

    // fit list
    var fit = $('#fit');
    var labels = { ok: 'вистачить', tight: 'впритул', no: 'мало' };
    fit.innerHTML = MODELS.map(function (m, i) {
      var pct = Math.min(100, (run / m.cont) * 100);
      return '<li class="' + status[i] + (i === idx && on.length ? ' rec' : '') + '"><span class="fit-n">' + m.kw + nbsp + 'кВт</span><span class="fit-bar"><i style="width:' + pct.toFixed(1) + '%"></i></span><span class="fit-s">' + labels[status[i]] + '</span></li>';
    }).join('');

    // highlight in the models list and sync the receipt
    $$('.m').forEach(function (el) { el.classList.toggle('is-rec', on.length > 0 && !none && el.getAttribute('data-m') === rec.id); });
    if (on.length) setModel(rec.id);
  }

  if (box) {
    PRESETS.min.forEach(function (id) { sel[id] = true; });
    markPreset('min');
    // start the needle from zero so the first swing is visible
    requestAnimationFrame(function () { requestAnimationFrame(render); });
  }

  /* panel hotspots */
  var hs = $$('.hs');
  var pl = $$('#pnlList li');
  function hsOn(n) {
    hs.forEach(function (h) { h.classList.toggle('on', h.getAttribute('data-hs') === n); });
    pl.forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-hs') === n); });
  }
  hs.forEach(function (h) {
    h.addEventListener('click', function () { hsOn(h.getAttribute('data-hs')); });
    h.addEventListener('mouseenter', function () { hsOn(h.getAttribute('data-hs')); });
  });
  pl.forEach(function (li) {
    li.addEventListener('mouseenter', function () { hsOn(li.getAttribute('data-hs')); });
    li.addEventListener('click', function () { hsOn(li.getAttribute('data-hs')); });
  });
  if (hs.length) hsOn('3');

  setModel(current);
})();
