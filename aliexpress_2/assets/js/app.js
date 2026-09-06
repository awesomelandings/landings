/* =========================================================================
   UGREEN Nexode 10000 / 55W - landing behaviour
   ========================================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- header */
  var hdr = $('#hdr');
  if (hdr) {
    var onScrollHdr = function () { hdr.classList.toggle('stuck', window.scrollY > 24); };
    addEventListener('scroll', onScrollHdr, { passive: true });
    onScrollHdr();
  }

  /* ------------------------------------------------------ reveal on scroll */
  var revealables = $$('.rv');
  if (revealables.length) {
    if (!('IntersectionObserver' in window) || reduce) {
      revealables.forEach(function (el) { el.classList.add('in'); });
    } else {
      var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          revObs.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { revObs.observe(el); });
    }
  }

  /* =======================================================================
     Seven-segment display
     Segment layout:   a
                     f   b
                       g
                     e   c
                       d
     ===================================================================== */
  var SEG_PATH = {
    a: '8,8 13,3 47,3 52,8 47,13 13,13',
    b: '52,8 57,13 57,47 52,52 47,47 47,13',
    c: '52,52 57,57 57,91 52,96 47,91 47,57',
    d: '8,96 13,91 47,91 52,96 47,101 13,101',
    e: '8,52 13,57 13,91 8,96 3,91 3,57',
    f: '8,8 13,13 13,47 8,52 3,47 3,13',
    g: '8,52 13,47 47,47 52,52 47,57 13,57'
  };
  var SEG_ORDER = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  var GLYPH = {
    '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
    '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
    ' ': ''
  };
  var SVGNS = 'http://www.w3.org/2000/svg';

  function makeDigit() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 60 104');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var segs = {};
    SEG_ORDER.forEach(function (k) {
      var p = document.createElementNS(SVGNS, 'polygon');
      p.setAttribute('points', SEG_PATH[k]);
      p.setAttribute('class', 'off');
      svg.appendChild(p);
      segs[k] = p;
    });
    return { el: svg, segs: segs, shown: null };
  }

  function makeDot() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 104');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', '10'); c.setAttribute('cy', '96'); c.setAttribute('r', '5.5');
    c.setAttribute('class', 'on');
    svg.appendChild(c);
    return svg;
  }

  /* Turns <span data-digits data-len="3" data-dot="2">55.0</span> into segments. */
  function mountDigits(host) {
    var len = parseInt(host.getAttribute('data-len'), 10) || 2;
    var dot = host.hasAttribute('data-dot') ? parseInt(host.getAttribute('data-dot'), 10) : -1;
    var seed = (host.textContent || '').replace(/[^0-9]/g, '');
    host.textContent = '';
    var slots = [];
    for (var i = 0; i < len; i++) {
      var d = makeDigit();
      host.appendChild(d.el);
      slots.push(d);
      if (i === dot - 1) host.appendChild(makeDot());
    }
    host._slots = slots;
    setDigits(host, seed);
    return host;
  }

  function setDigits(host, value) {
    var slots = host._slots;
    if (!slots) return;
    var s = String(value).replace(/[^0-9]/g, '');
    while (s.length < slots.length) s = ' ' + s;
    if (s.length > slots.length) s = s.slice(-slots.length);
    for (var i = 0; i < slots.length; i++) {
      var ch = s.charAt(i);
      if (slots[i].shown === ch) continue;
      slots[i].shown = ch;
      var lit = GLYPH[ch] || '';
      SEG_ORDER.forEach(function (k) {
        slots[i].segs[k].setAttribute('class', lit.indexOf(k) > -1 ? 'on' : 'off');
      });
    }
  }

  $$('[data-digits]').forEach(mountDigits);

  /* ------------------------------------------------------------- hero LCD */
  var heroLcd = $('[data-lcd="hero"]');
  if (heroLcd && !reduce) {
    var heroFields = $$('[data-digits]', heroLcd);
    var wField = heroFields[1];
    var tick = 0;
    setInterval(function () {
      tick++;
      /* real chargers never sit on a round number - let the watts breathe */
      var w = 541 + Math.round(Math.sin(tick / 2.4) * 6 + (Math.random() * 4 - 2));
      setDigits(wField, w);
    }, 900);
  }

  /* =======================================================================
     Blackout: scroll-driven stage
     ===================================================================== */
  var bo = $('[data-blackout]');
  if (bo) {
    var boSteps  = $$('.bo-step', bo);
    var boPct    = $('[data-bo-lcd] [data-digits]', bo);
    var boLcd    = $('[data-bo-lcd]', bo);
    var boClock  = $('[data-bo-clock]', bo);
    var boState  = $('[data-bo-state]', bo);
    var boEta    = $('[data-bo-eta]', bo);
    var boVisible = false;
    var lastP = -1;

    var stageObs = new IntersectionObserver(function (e) { boVisible = e[0].isIntersecting; },
      { threshold: 0 });
    stageObs.observe(bo);

    function clock(min) {
      var h = Math.floor(min / 60) % 24, m = Math.round(min % 60);
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function paint(p) {
      bo.style.setProperty('--p', p.toFixed(4));

      var step = p < 0.30 ? 0 : (p < 0.66 ? 1 : 2);
      boSteps.forEach(function (el, i) {
        if (i === step) el.removeAttribute('data-hidden');
        else el.setAttribute('data-hidden', '');
      });

      var pct, minutes, state, eta, mood;
      if (step === 0) {
        pct = 34; minutes = 19 * 60 + 4; state = 'розряджається'; eta = '2 год 40 хв'; mood = 'drain';
      } else if (step === 1) {
        var t = (p - 0.30) / 0.36;                       /* 0 -> 1 across step 1 */
        pct = Math.round(34 - 31 * Math.min(1, t));
        minutes = 19 * 60 + 4 + Math.round(191 * Math.min(1, t));
        state = pct > 10 ? 'розряджається' : 'критично';
        eta = pct > 10 ? Math.max(1, Math.round(pct * 4.7)) + ' хв' : 'лічені хвилини';
        mood = pct > 10 ? 'drain' : 'crit';
      } else {
        var t2 = Math.min(1, (p - 0.66) / 0.30);
        pct = Math.round(3 + 97 * t2);
        minutes = 22 * 60 + 15 + Math.round(42 * t2);
        state = pct < 100 ? 'заряджається · 45 Вт' : 'повний';
        eta = pct < 100 ? Math.max(1, Math.round((100 - pct) * 0.42)) + ' хв' : 'готово';
        mood = '';
      }

      setDigits(boPct, pct);
      boClock.textContent = clock(minutes);
      boState.textContent = state;
      boEta.textContent = eta;
      if (mood) boLcd.setAttribute('data-state', mood);
      else boLcd.removeAttribute('data-state');
    }

    function measure() {
      var rect = bo.getBoundingClientRect();
      var travel = bo.offsetHeight - window.innerHeight;
      if (travel <= 0) return 0;
      return Math.max(0, Math.min(1, -rect.top / travel));
    }

    var queued = false;
    function onScrollBo() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        if (!boVisible) return;
        var p = measure();
        if (Math.abs(p - lastP) < 0.002) return;
        lastP = p;
        paint(p);
      });
    }

    addEventListener('scroll', onScrollBo, { passive: true });
    addEventListener('resize', function () { lastP = -1; onScrollBo(); }, { passive: true });
    paint(measure());
  }

  /* =======================================================================
     Calculator: 30 Wh of usable energy against real device batteries
     ===================================================================== */
  var DEVICES = [
    { n: 'iPhone 16',        wh: 12.9, i: 27, note: '0-50% приблизно за 25 хвилин' },
    { n: 'iPhone 16 Pro Max', wh: 18.1, i: 27, note: '0-50% приблизно за 30 хвилин' },
    { n: 'Galaxy S24 Ultra', wh: 19.3, i: 45, note: '0-65% приблизно за 30 хвилин' },
    { n: 'Pixel 8',          wh: 17.4, i: 27, note: 'бере близько 27 Вт на піку' },
    { n: 'AirPods з кейсом', wh: 2.0,  i: 5,  note: 'режим малого струму не дає павербанку заснути' },
    { n: 'Nintendo Switch',  wh: 16.0, i: 18, note: 'плюс приблизно 2,5 години гри' },
    { n: 'iPad Air',         wh: 28.9, i: 30, note: 'майже повний цикл планшета' },
    { n: 'MacBook Air M2',   wh: 52.6, i: 55, note: 'плюс приблизно 5 годин роботи' },
    { n: 'USB-лампа 3 Вт',   wh: 3.0,  i: 3,  note: 'світло на кухні на цілу чергу', hours: true }
  ];
  var USABLE_WH = 30;

  var calc = $('[data-calc]');
  if (calc) {
    var pick    = $('[data-calc-pick]', calc);
    var outNum  = $('[data-calc-num]', calc);
    var outUnit = $('[data-calc-unit]', calc);
    var outName = $('[data-calc-name]', calc);
    var outWh   = $('[data-calc-wh]', calc);
    var outIn   = $('[data-calc-in]', calc);
    var outNote = $('[data-calc-note]', calc);
    var outBar  = $('[data-calc-bar]', calc);

    function plural(n, one, few, many) {
      var i = Math.floor(n), r10 = i % 10, r100 = i % 100;
      if (n !== i) return few;                       /* 1,7 заряду */
      if (r10 === 1 && r100 !== 11) return one;
      if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14)) return few;
      return many;
    }

    function show(idx) {
      var d = DEVICES[idx];
      $$('button', pick).forEach(function (b, i) { b.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });

      if (d.hours) {
        var hrs = Math.round(USABLE_WH / d.wh);
        outNum.textContent = hrs;
        outUnit.textContent = plural(hrs, 'година світла', 'години світла', 'годин світла');
        outBar.style.width = '100%';
      } else {
        var times = USABLE_WH / d.wh;
        if (times >= 1) {
          /* "2,3 × повний заряд" sidesteps the fractional-genitive trap */
          outNum.textContent = String(Math.round(times * 10) / 10).replace('.', ',');
          outUnit.textContent = '× повний заряд';
        } else {
          outNum.textContent = Math.round(times * 100) + '%';
          outUnit.textContent = 'від повного заряду';
        }
        outBar.style.width = Math.min(100, times * 100 / 2.5) + '%';
      }

      outName.textContent = d.n;
      outWh.textContent   = String(d.wh).replace('.', ',') + ' Вт·год';
      outIn.textContent   = d.i + ' Вт';
      outNote.textContent = d.note;
    }

    DEVICES.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = d.n;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { show(i); });
      pick.appendChild(b);
    });
    show(0);
  }

  /* =======================================================================
     Race: 30 minutes of mains power, 45 W against 22.5 W
     ===================================================================== */
  var race = $('[data-race]');
  if (race) {
    var TARGET = { fast: 65, slow: 35 };
    var DURATION = 4200;
    var bars = { fast: $('[data-race-bar="fast"]', race), slow: $('[data-race-bar="slow"]', race) };
    var pcts = { fast: $('[data-race-pct="fast"]', race), slow: $('[data-race-pct="slow"]', race) };
    var rClock = $('[data-race-clock]', race);
    var raf = null;

    /* lithium charging tapers off, it is not a straight line */
    function curve(t) { return (1 - Math.exp(-3.1 * t)) / (1 - Math.exp(-3.1)); }

    function settle() {
      Object.keys(TARGET).forEach(function (k) {
        bars[k].style.width = TARGET[k] + '%';
        pcts[k].textContent = TARGET[k] + '%';
      });
      rClock.textContent = '30:00';
    }

    function run() {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { settle(); return; }
      var start = null;
      (function frame(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / DURATION);
        var e = curve(t);
        Object.keys(TARGET).forEach(function (k) {
          var v = TARGET[k] * e;
          bars[k].style.width = v + '%';
          pcts[k].textContent = Math.round(v) + '%';
        });
        var mins = 30 * t;
        rClock.textContent = (Math.floor(mins) < 10 ? '0' : '') + Math.floor(mins) + ':' +
          (Math.floor((mins % 1) * 60) < 10 ? '0' : '') + Math.floor((mins % 1) * 60);
        if (t < 1) raf = requestAnimationFrame(frame);
      })(performance.now());
    }

    if ('IntersectionObserver' in window) {
      var raceObs = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        run();
        raceObs.disconnect();
      }, { threshold: 0.35 });
      raceObs.observe(race);
    } else {
      settle();
    }
    $('[data-race-replay]', race).addEventListener('click', run);
  }

  /* --------------------------------------------------- FAQ: one open at a time */
  var faq = $('.faq');
  if (faq) {
    var items = $$('details', faq);
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }
})();
