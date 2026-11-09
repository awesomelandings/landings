(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header shadow */
  var hdr = document.getElementById('hdr');
  function onScroll() { hdr.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile buy bar: visible once the hero button is gone, hidden over the final block */
  var mbar = document.getElementById('mbar');
  var heroCta = document.getElementById('hero-cta');
  var finalSec = document.getElementById('final');
  if (mbar && 'IntersectionObserver' in window) {
    var heroGone = false, finalIn = false;
    var sync = function () {
      var show = heroGone && !finalIn;
      mbar.classList.toggle('show', show);
      mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
      var a = mbar.querySelector('a');
      if (a) a.tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (e) {
      heroGone = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; sync();
    }).observe(heroCta);
    new IntersectionObserver(function (e) { finalIn = e[0].isIntersecting; sync(); }).observe(finalSec);
  }

  /* dock demo */
  var dock = document.getElementById('dock');
  if (dock) {
    var NS = 'http://www.w3.org/2000/svg';
    var g = document.getElementById('dust');
    var fill = document.getElementById('bagfill');
    var btn = document.getElementById('dock-btn');
    var timeEl = document.getElementById('dock-time');
    var statusEl = document.getElementById('dock-status');
    var steps = document.querySelectorAll('#steps li');
    var N = 36, D = 4250, BAG_BOTTOM = 482, BAG_H = 106, STEP = 1 / 6;
    var colors = ['#6F6B76', '#8E8A93', '#5B5862', '#B59C7C', '#C9792E', '#7A7681'];
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var parts = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'p');
      c.setAttribute('r', (1.8 + rnd() * 2.4).toFixed(1));
      c.setAttribute('fill', colors[i % colors.length]);
      g.appendChild(c);
      parts.push({ el: c, x0: 0, y0: 0, x1: 0, y1: 0 });
    }
    var level = 0, state = 'full';

    function place() {
      parts.forEach(function (p) {
        var side = rnd();
        p.x0 = side < .25 ? 220 + rnd() * 16 : side < .5 ? 264 + rnd() * 16 : 222 + rnd() * 56;
        p.y0 = side < .5 ? 214 + rnd() * 64 : 256 + rnd() * 24;
        p.el.setAttribute('cx', p.x0.toFixed(1));
        p.el.setAttribute('cy', p.y0.toFixed(1));
      });
    }
    function setFill() {
      var h = Math.min(1, level) * BAG_H;
      fill.setAttribute('y', (BAG_BOTTOM - h).toFixed(1));
      fill.setAttribute('height', h.toFixed(1));
    }
    function fmt(s) { return s + ' с'; }
    function setSteps(on) {
      steps.forEach(function (li) { li.classList.toggle('on', on.indexOf(+li.dataset.step) > -1); });
    }
    function setState(s) {
      state = s;
      dock.classList.toggle('running', s === 'running');
      dock.classList.toggle('bagfull', s === 'bagfull');
      btn.disabled = s === 'running';
      if (s === 'full') {
        btn.textContent = 'Поставити на базу';
        statusEl.textContent = 'У контейнері пил і шерсть після прибирання.';
        timeEl.textContent = fmt(0);
        setSteps([1]);
      } else if (s === 'running') {
        btn.textContent = 'База працює';
        statusEl.textContent = 'База висмоктує пил з контейнера в мішок.';
        setSteps([2, 3]);
      } else if (s === 'empty') {
        btn.textContent = 'Пропилососити ще раз';
        statusEl.textContent = 'Готово: контейнер порожній, пил у закритому мішку.';
        setSteps([3]);
      } else if (s === 'bagfull') {
        btn.textContent = 'Поставити новий мішок';
        statusEl.textContent = 'Мішок повний, на базі загорівся індикатор. Його виймають закритим і викидають.';
        setSteps([4]);
      }
    }
    function refill() {
      place();
      parts.forEach(function (p) { p.el.style.opacity = '0'; });
      requestAnimationFrame(function () { parts.forEach(function (p) { p.el.style.opacity = '1'; }); });
      setState('full');
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function run() {
      setState('running');
      var top = BAG_BOTTOM - Math.min(1, level + STEP) * BAG_H;
      parts.forEach(function (p) {
        p.x1 = 198 + rnd() * 104;
        p.y1 = Math.min(BAG_BOTTOM - 4, top + 2 + rnd() * 12);
        p.done = false;
      });
      if (reduce) {
        parts.forEach(function (p) { p.el.style.opacity = '0'; });
        finish();
        return;
      }
      var t0 = performance.now(), TRAVEL = 1100;
      function frame(now) {
        var t = now - t0;
        timeEl.textContent = fmt(Math.min(17, Math.floor(t / D * 17)));
        parts.forEach(function (p, i) {
          if (p.done) return;
          var start = 250 + (i / N) * (D - TRAVEL - 400);
          var k = (t - start) / TRAVEL;
          if (k <= 0) return;
          if (k >= 1) { p.done = true; p.el.style.opacity = '0'; return; }
          var x, y;
          if (k < .4) { var a = ease(k / .4); x = lerp(p.x0, 250, a); y = lerp(p.y0, 296, a); }
          else if (k < .62) { var b = (k - .4) / .22; x = 250; y = lerp(296, 361, b); }
          else { var d = ease((k - .62) / .38); x = lerp(250, p.x1, d); y = lerp(361, p.y1, d); }
          p.el.setAttribute('cx', x.toFixed(1));
          p.el.setAttribute('cy', y.toFixed(1));
        });
        if (t < D) requestAnimationFrame(frame); else finish();
      }
      requestAnimationFrame(frame);
    }
    function finish() {
      level = Math.min(1, level + STEP);
      if (level > .99) level = 1;
      setFill();
      timeEl.textContent = fmt(17);
      setState(level >= 1 ? 'bagfull' : 'empty');
    }
    btn.addEventListener('click', function () {
      if (state === 'full') run();
      else if (state === 'empty') refill();
      else if (state === 'bagfull') { level = 0; setFill(); refill(); }
    });
    place();
    setFill();
    setState('full');
  }

  /* power levels */
  var modes = [
    { kpa: 10, time: 'до 45 хвилин від батареї', use: 'Щоденне прибирання ламінату, плитки й паркету. Найтихіший рівень і найдовша робота.' },
    { kpa: 20, time: 'близько 20 хвилин від батареї', use: 'Килими, доріжки, шерсть і пісок у передпокої. Тягне вдвічі сильніше, але й батарея сідає більш ніж удвічі швидше.' },
    { kpa: 35, time: '15 секунд на одне натискання', use: 'Turbo для плями на килимі чи розсипаної крупи. Через 15 секунд пилосос сам повертається в економний режим, тож для наступного проходу кнопку натискають знову.' }
  ];
  var mbtns = document.querySelectorAll('.mode');
  var kpaEl = document.getElementById('mode-kpa');
  var mtime = document.getElementById('mode-time');
  var muse = document.getElementById('mode-use');
  var meter = document.getElementById('meter-fill');
  mbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var m = modes[+b.dataset.mode];
      mbtns.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      kpaEl.textContent = m.kpa;
      mtime.textContent = m.time;
      muse.textContent = m.use;
      meter.style.setProperty('--p', (m.kpa / 35).toFixed(2));
    });
  });
})();
