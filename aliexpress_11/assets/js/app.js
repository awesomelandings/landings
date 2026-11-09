(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header border after scroll */
  var hdr = document.getElementById('hdr');
  function onScroll() { hdr.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile dock: visible after the hero price, hidden near the order blocks */
  var dock = document.getElementById('dock');
  var heroBuy = document.querySelector('.hero-buy');
  if (dock && heroBuy && 'IntersectionObserver' in window) {
    var heroGone = false, nearOrder = new Set();
    var sync = function () {
      var on = heroGone && nearOrder.size === 0;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', on ? 'false' : 'true');
      dock.querySelector('a').tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; });
      sync();
    }).observe(heroBuy);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) nearOrder.add(e.target); else nearOrder.delete(e.target); });
      sync();
    }, { rootMargin: '0px 0px -30% 0px' });
    ['tsina', 'zamovyty'].forEach(function (id) { var n = document.getElementById(id); if (n) io.observe(n); });
  }

  /* seven weeks of one dust bag */
  var wg = document.getElementById('weeksGrid');
  if (wg) {
    var days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    var html = '<span></span>' + days.map(function (d) { return '<span class="wk-h">' + d + '</span>'; }).join('');
    for (var w = 0; w < 7; w++) {
      html += '<span class="wk-r">' + (w + 1) + ' тиж.</span>';
      for (var d = 0; d < 7; d++) {
        var i = w * 7 + d;
        if (i === 48) {
          html += '<span class="wk-cell is-bag"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M6 8h12l-1.2 12H7.2z"/><path d="M9 8V5.5h6V8"/></svg></span>';
        } else {
          html += '<span class="wk-cell" style="--p:' + Math.round(6 + (i / 47) * 88) + '%"></span>';
        }
      }
    }
    wg.innerHTML = html;
  }

  /* ---------- apartment map ---------- */
  var svg = document.getElementById('plan');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var mqP = window.matchMedia('(max-width: 640px)');
  var portrait = mqP.matches;

  function P(p) { return portrait ? [640 - p[1], p[0]] : [p[0], p[1]]; }
  function R(r) { return portrait ? { x: 640 - r[1] - r[3], y: r[0], w: r[3], h: r[2] } : { x: r[0], y: r[1], w: r[2], h: r[3] }; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // plan in centimetres-ish units: 100 = 1 m, outer walls 40..960 x 40..600
  var ROOMS = [
    { id: 'hall', name: 'Коридор', area: 9.1, r: [260, 360, 380, 240], fill: 'var(--r5)', L: [480, 474], Pp: [150, 470] },
    { id: 'kitchen', name: 'Кухня', area: 7.7, r: [640, 360, 320, 240], fill: 'var(--r2)', L: [835, 560], Pp: [205, 682] },
    { id: 'bed', name: 'Спальня', area: 14.1, r: [520, 40, 440, 320], fill: 'var(--r3)', L: [805, 180], Pp: [440, 628] },
    { id: 'living', name: 'Вітальня', area: 15.4, r: [40, 40, 480, 320], fill: 'var(--r4)', L: [400, 100], Pp: [430, 452] },
    { id: 'bath', name: 'Ванна', area: 5.3, r: [40, 360, 220, 240], fill: 'var(--r1)', L: [193, 470], Pp: [160, 182] }
  ];
  var TOTAL = 51.6, MINUTES = 26;
  var WALLS = [
    [40, 40, 960, 40], [960, 40, 960, 600], [40, 600, 440, 600], [520, 600, 960, 600], [40, 40, 40, 600],
    [40, 360, 400, 360], [480, 360, 540, 360], [610, 360, 960, 360], [520, 40, 520, 360],
    [260, 360, 260, 470], [260, 540, 260, 600], [640, 360, 640, 400], [640, 470, 640, 600]
  ];
  var WINDOWS = [[130, 40, 330, 40], [660, 40, 860, 40], [960, 420, 960, 540]];
  var OBST = [[60, 58, 240, 78], [140, 332, 200, 22], [530, 52, 56, 230], [900, 368, 54, 226], [48, 368, 82, 224], [270, 368, 130, 38]];
  var UNDER = [[690, 90, 230, 190], [730, 430, 120, 80]];
  var ZONES = [
    { r: [110, 170, 290, 140], kind: 'mop', t: ['Без миття'] },
    { r: [648, 512, 120, 82], kind: 'no', t: ['Миски кота'], tp: ['Миски', 'кота'] }
  ];
  var S = [315, 560];

  // vertical boustrophedon lanes inside a box with trimmed ends near obstacles
  function lanes(box, cuts, fromRight, entry) {
    var xs = [], x;
    for (x = box[0]; x < box[1]; x += 32) xs.push(x);
    if (xs[xs.length - 1] !== box[1]) xs.push(box[1]);
    if (fromRight) xs.reverse();
    var pts = [], down = Math.abs(entry[1] - box[2]) <= Math.abs(entry[1] - box[3]);
    xs.forEach(function (lx) {
      var y0 = box[2], y1 = box[3];
      cuts.forEach(function (c) {
        if (lx > c[0] - 18 && lx < c[1] + 18) {
          if (c[4] === 'top') y0 = Math.max(y0, c[3] + 20); else y1 = Math.min(y1, c[2] - 20);
        }
      });
      if (down) { pts.push([lx, y0], [lx, y1]); } else { pts.push([lx, y1], [lx, y0]); }
      down = !down;
    });
    return pts;
  }

  var ROUTE = (function () {
    var seq = [];   // {pts, room}
    var hall = lanes([282, 618, 382, 578], [[270, 400, 368, 406, 'top'], [300, 330, 582, 596, 'bottom']], false, S);
    seq.push({ room: 'hall', pts: [S].concat(hall) });
    var kit = lanes([662, 882, 382, 578], [[648, 768, 512, 594, 'bottom']], false, [662, 435]);
    seq.push({ room: 'kitchen', pts: [[618, 435], [662, 435]].concat(kit, [[882, 382], [662, 382], [662, 435], [618, 435]]) });
    var bed = lanes([604, 938, 62, 338], [], false, [575, 338]);
    seq.push({ room: 'bed', pts: [[575, 382], [575, 338]].concat(bed, [[938, 338], [575, 338], [575, 382]]) });
    var liv = lanes([62, 498, 62, 338], [[60, 300, 58, 136, 'top'], [140, 340, 332, 354, 'bottom']], true, [440, 338]);
    seq.push({ room: 'living', pts: [[440, 382], [440, 338]].concat(liv, [[62, 312], [440, 312], [440, 338], [440, 382], [440, 505]]) });
    var bath = lanes([148, 238, 382, 578], [], true, [238, 505]);
    seq.push({ room: 'bath', pts: [[282, 505], [238, 505]].concat(bath, [[148, 505], [238, 505], [282, 505], S]) });
    var all = [], marks = [], len = 0, prev = null;
    seq.forEach(function (s) {
      s.pts.forEach(function (p) {
        if (prev) len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        all.push({ p: p, d: len });
        prev = p;
      });
      marks.push({ room: s.room, d: len });
    });
    return { pts: all, marks: marks, len: len };
  })();
  var SCAN = [S, [330, 470], [430, 470], S];

  function pointAt(list, d) {
    for (var i = 1; i < list.length; i++) {
      if (list[i].d >= d) {
        var a = list[i - 1], b = list[i], t = b.d === a.d ? 1 : (d - a.d) / (b.d - a.d);
        return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
      }
    }
    return list[list.length - 1].p;
  }
  function withDist(pts) {
    var out = [], len = 0;
    pts.forEach(function (p, i) { if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); out.push({ p: p, d: len }); });
    return out;
  }
  var SCANL = withDist(SCAN);

  var g = {};
  function build() {
    portrait = mqP.matches;
    while (svg.lastChild && svg.lastChild.nodeName !== 'title') svg.removeChild(svg.lastChild);
    svg.setAttribute('viewBox', portrait ? '0 0 640 1000' : '0 0 1000 640');
    var fs = portrait ? { n: 32, a: 24, z: 24 } : { n: 26, a: 19, z: 20 };

    var defs = el('defs', {}, svg);
    var hn = el('pattern', { id: 'hNo', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 10, height: 10, fill: 'rgba(217,52,74,.12)' }, hn);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#D9344A', 'stroke-width': 3 }, hn);
    var hm = el('pattern', { id: 'hMop', width: 10, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' }, defs);
    el('rect', { width: 10, height: 10, fill: 'rgba(43,89,255,.08)' }, hm);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#2B59FF', 'stroke-width': 2, 'stroke-opacity': '.55' }, hm);
    var mask = el('mask', { id: 'scanMask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1000, height: 1000 }, defs);
    el('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: '#000' }, mask);
    g.maskC = el('circle', { cx: 0, cy: 0, r: 0, fill: '#fff' }, mask);

    g.rooms = el('g', {}, svg);
    g.roomEls = ROOMS.map(function (rm) {
      var b = R(rm.r);
      return el('rect', { class: 'p-room', x: b.x, y: b.y, width: b.w, height: b.h, fill: rm.fill, opacity: 0 }, g.rooms);
    });

    var pathD = ROUTE.pts.map(function (o, i) { var q = P(o.p); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
    g.swath = el('path', { class: 'p-swath', d: pathD, 'stroke-width': 36, pathLength: 1000, 'stroke-dasharray': '1000 1000', 'stroke-dashoffset': 1000 }, svg);

    g.scan = el('g', { mask: 'url(#scanMask)' }, svg);
    UNDER.forEach(function (r) { var b = R(r); el('rect', { class: 'p-under', x: b.x, y: b.y, width: b.w, height: b.h, rx: 6 }, g.scan); });
    OBST.forEach(function (r) { var b = R(r); el('rect', { class: 'p-furn', x: b.x, y: b.y, width: b.w, height: b.h, rx: 6 }, g.scan); });
    WALLS.forEach(function (w) { var a = P([w[0], w[1]]), b = P([w[2], w[3]]); el('line', { class: 'p-wall', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, g.scan); });
    WINDOWS.forEach(function (w) { var a = P([w[0], w[1]]), b = P([w[2], w[3]]); el('line', { class: 'p-win', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, g.scan); });
    var d1 = P([440, 600]), d2 = P([520, 600]);
    el('line', { class: 'p-door', x1: d1[0], y1: d1[1], x2: d2[0], y2: d2[1] }, g.scan);

    g.zones = el('g', { class: 'p-fade', opacity: 0 }, svg);
    ZONES.forEach(function (z) {
      var b = R(z.r);
      el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, fill: z.kind === 'no' ? 'url(#hNo)' : 'url(#hMop)', stroke: z.kind === 'no' ? '#D9344A' : '#2B59FF', 'stroke-width': 3 }, g.zones);
      var lines = portrait && z.tp ? z.tp : z.t, cx = b.x + b.w / 2, cy = b.y + b.h / 2 - (lines.length - 1) * fs.z * 0.55;
      var t = el('text', { class: 'p-zone-t', x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs.z, fill: z.kind === 'no' ? '#A8162B' : '#1C42D8', stroke: '#fff', 'stroke-width': 5, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, g.zones);
      lines.forEach(function (s, i) { var ts = el('tspan', { x: cx, dy: i ? fs.z * 1.1 : 0 }, t); ts.textContent = s; });
    });

    g.line = el('path', { class: 'p-line', d: pathD, pathLength: 1000, 'stroke-dasharray': '1000 1000', 'stroke-dashoffset': 1000 }, svg);

    g.labels = el('g', {}, svg);
    g.lblEls = ROOMS.map(function (rm) {
      var q = portrait ? rm.Pp : rm.L;
      var grp = el('g', { class: 'p-fade', opacity: 0 }, g.labels);
      var n = el('text', { class: 'p-lbl', x: q[0], y: q[1], 'text-anchor': 'middle', 'font-size': fs.n }, grp);
      n.textContent = rm.name;
      var a = el('text', { class: 'p-area', x: q[0], y: q[1] + fs.a * 1.25, 'text-anchor': 'middle', 'font-size': fs.a }, grp);
      a.textContent = String(rm.area).replace('.', ',') + ' м²';
      return grp;
    });

    var st = R([300, 582, 30, 14]);
    el('rect', { class: 'p-station', x: st.x, y: st.y, width: st.w, height: st.h, rx: 3 }, svg);

    g.rays = el('g', { opacity: 0 }, svg);
    g.rayRot = el('g', {}, g.rays);
    [0, 120, 240].forEach(function (a) {
      var rad = a * Math.PI / 180;
      el('line', { class: 'p-ray', x1: 0, y1: 0, x2: Math.cos(rad) * 420, y2: Math.sin(rad) * 420, 'stroke-opacity': '.45' }, g.rayRot);
    });
    el('circle', { r: 30, fill: 'none', stroke: '#2B59FF', 'stroke-opacity': '.35', 'stroke-width': 2 }, g.rays);

    g.robot = el('g', { class: 'p-robot' }, svg);
    el('circle', { class: 'b', r: 17 }, g.robot);
    el('circle', { class: 't', r: 6.5 }, g.robot);
    placeRobot(S);
  }

  function placeRobot(p) {
    var q = P(p);
    g.robot.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
    g.rays.setAttribute('transform', 'translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')');
    return q;
  }

  var hudStatus = document.getElementById('hudStatus');
  var hudArea = document.getElementById('hudArea');
  var hudTime = document.getElementById('hudTime');
  var stepBtns = Array.prototype.slice.call(document.querySelectorAll('#steps .step'));
  var DONE_TEXT = ['Готовий до першого виїзду', 'Карту побудовано', 'П\'ять кімнат, 51,6 м²', 'Збережено: миски кота і килим без миття', 'Готово: 51,6 м² за 26 хв, пил вивантажено в станцію'];
  var RUN_TEXT = ['', 'Сканує квартиру…', 'Ділить план на кімнати…', 'Додає ваші заборонені зони…', 'Прибирає'];
  var ROOM_NAME = {};
  ROOMS.forEach(function (r) { ROOM_NAME[r.id] = r; });

  function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  function setDash(prog) {
    var off = (1000 * (1 - prog)).toFixed(2);
    g.swath.setAttribute('stroke-dashoffset', off);
    g.line.setAttribute('stroke-dashoffset', off);
  }
  function setHud(area, mins) { hudArea.textContent = fmt(area); hudTime.textContent = Math.round(mins); }
  function markSteps(active, done) {
    stepBtns.forEach(function (b, i) {
      b.setAttribute('aria-pressed', i + 1 === active ? 'true' : 'false');
      b.classList.toggle('is-done', i + 1 <= done && i + 1 !== active);
    });
  }

  // put the map in the finished state of step n (0..4)
  function setStatic(n) {
    var scanned = n >= 1;
    g.maskC.setAttribute('r', scanned ? 2000 : 0);
    g.rays.setAttribute('opacity', 0);
    g.roomEls.forEach(function (e) { e.style.transitionDelay = '0ms'; e.setAttribute('opacity', n >= 2 ? 1 : 0); });
    g.lblEls.forEach(function (e) { e.style.transitionDelay = '0ms'; e.setAttribute('opacity', n >= 2 ? 1 : 0); });
    g.zones.setAttribute('opacity', n >= 3 ? 1 : 0);
    setDash(n >= 4 ? 1 : 0);
    placeRobot(S);
    setHud(n >= 4 ? TOTAL : 0, n >= 4 ? MINUTES : 0);
    hudStatus.textContent = DONE_TEXT[n];
  }

  var token = 0, auto = false;
  function anim(ms, fn, done) {
    var my = token, t0 = null;
    function f(ts) {
      if (my !== token) return;
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / ms);
      fn(t);
      if (t < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function later(ms, fn) { var my = token; setTimeout(function () { if (my === token) fn(); }, ms); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function play(n) {
    token++;
    setStatic(n - 1);
    markSteps(n, n - 1);
    hudStatus.textContent = RUN_TEXT[n];
    var next = function () {
      markSteps(0, n);
      hudStatus.textContent = DONE_TEXT[n];
      if (auto && n < 4) later(650, function () { play(n + 1); });
      else auto = false;
    };
    if (reduce) { setStatic(n); next(); return; }

    if (n === 1) {
      g.rays.setAttribute('opacity', 1);
      anim(3000, function (t) {
        var q = placeRobot(pointAt(SCANL, SCANL[SCANL.length - 1].d * t));
        g.maskC.setAttribute('cx', q[0]); g.maskC.setAttribute('cy', q[1]);
        g.maskC.setAttribute('r', 30 + 1150 * ease(t));
        g.rayRot.setAttribute('transform', 'rotate(' + (t * 1080).toFixed(1) + ')');
      }, function () { g.rays.setAttribute('opacity', 0); g.maskC.setAttribute('r', 2000); next(); });
    } else if (n === 2) {
      g.roomEls.forEach(function (e, i) { e.style.transitionDelay = i * 160 + 'ms'; e.setAttribute('opacity', 1); });
      g.lblEls.forEach(function (e, i) { e.style.transitionDelay = i * 160 + 'ms'; e.setAttribute('opacity', 1); });
      later(1500, next);
    } else if (n === 3) {
      g.zones.setAttribute('opacity', 1);
      later(1300, next);
    } else {
      var area = 0, mi = 0;
      anim(9000, function (t) {
        var d = ROUTE.len * t;
        setDash(t);
        placeRobot(pointAt(ROUTE.pts, d));
        while (mi < ROUTE.marks.length && ROUTE.marks[mi].d <= d) { area += ROOM_NAME[ROUTE.marks[mi].room].area; mi++; }
        var cur = ROUTE.marks[Math.min(mi, ROUTE.marks.length - 1)].room;
        hudStatus.textContent = RUN_TEXT[4] + ': ' + ROOM_NAME[cur].name.toLowerCase();
        setHud(Math.min(area, TOTAL), MINUTES * t);
      }, function () { setHud(TOTAL, MINUTES); next(); });
    }
  }

  build();
  setStatic(0);
  markSteps(0, 0);

  var current = 0;
  stepBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      current = Number(b.getAttribute('data-step'));
      auto = true;
      play(current);
    });
  });

  var started = false;
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !started) { started = true; obs.disconnect(); auto = true; play(1); }
      });
    }, { threshold: 0.35 });
    obs.observe(document.getElementById('planBox'));
  } else { setStatic(4); markSteps(0, 4); }

  var onMq = function () {
    token++;
    var doneSteps = stepBtns.filter(function (b) { return b.classList.contains('is-done') || b.getAttribute('aria-pressed') === 'true'; }).length;
    build();
    setStatic(doneSteps);
    markSteps(0, doneSteps);
    auto = false;
  };
  if (mqP.addEventListener) mqP.addEventListener('change', onMq); else mqP.addListener(onMq);
})();
