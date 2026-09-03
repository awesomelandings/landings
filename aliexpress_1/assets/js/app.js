/* DELTA 3 Max Plus landing ------------------------------------------------ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the outage schedule this page is built around: 4 hours on, 4 hours off */
  var DARK = [0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19];
  var USABLE = 1741;           // 2048 Wh minus inverter losses
  var AC_LIMIT = 3000;
  var BOOST_LIMIT = 3800;

  /* ------------------------------------------------------------- the day */
  function buildStrip(el) {
    var cells = [];
    for (var h = 0; h < 24; h++) {
      var i = document.createElement('i');
      if (DARK.indexOf(h) !== -1) i.className = 'out';
      el.appendChild(i);
      cells.push(i);
    }
    return cells;
  }

  var strips = {};
  [].forEach.call(document.querySelectorAll('[data-strip]'), function (el) {
    strips[el.getAttribute('data-strip')] = { el: el, cells: buildStrip(el) };
  });

  function light(strip, hours) {
    var n = 0;
    strip.cells.forEach(function (c, h) {
      if (DARK.indexOf(h) === -1) return;
      var lit = n < hours;
      c.classList.toggle('on', lit);
      n++;
    });
  }

  /* hero: fill the dark hours once, on arrival */
  if (strips.hero) {
    var heroFill = function () {
      if (reduced) { light(strips.hero, DARK.length); return; }
      var n = 0;
      strips.hero.cells.forEach(function (c, h) {
        if (DARK.indexOf(h) === -1) return;
        var d = n++;
        setTimeout(function () { c.classList.add('on'); }, 700 + d * 90);
      });
    };
    window.addEventListener('load', heroFill);
  }

  /* -------------------------------------------------------------- header */
  var hdr = document.getElementById('hdr');
  var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------- reveals */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  [].forEach.call(document.querySelectorAll('.rv'), function (el) { io.observe(el); });

  /* --------------------------------------------------------- count-up -- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced) { el.textContent = target.toLocaleString('uk-UA') + suffix; return; }
    var start = performance.now(), dur = 1300;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * e).toLocaleString('uk-UA') + (t === 1 ? suffix : '');
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  /* markup carries the final figure for the no-JS case; zero it before it scrolls into view */
  [].forEach.call(document.querySelectorAll('[data-count]'), function (el) { el.textContent = '0'; });

  var ioNum = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countUp(e.target);
      ioNum.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  [].forEach.call(document.querySelectorAll('[data-count]'), function (el) { ioNum.observe(el); });

  /* ----------------------------------------------------------- bar fills */
  var ioBar = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var b = e.target;
      setTimeout(function () { b.style.width = b.getAttribute('data-fill') + '%'; }, 120);
      ioBar.unobserve(b);
    });
  }, { threshold: 0.4 });
  [].forEach.call(document.querySelectorAll('[data-fill]'), function (el) { ioBar.observe(el); });

  /* ------------------------------------------------------------ ups demo */
  var demo = document.getElementById('upsDemo');
  var upsBtn = document.getElementById('upsBtn');
  if (demo && upsBtn) {
    var offP = demo.querySelector('[data-ups-off]');
    var onP = demo.querySelector('[data-ups-on]');
    var read = document.getElementById('upsRead');
    var lampOn = demo.querySelector('.lamp--on');
    var down = false;

    upsBtn.addEventListener('click', function () {
      down = !down;
      demo.classList.toggle('is-dark', down);
      upsBtn.textContent = down ? 'Повернути мережу' : 'Вимкнути мережу';
      offP.textContent = down ? '0 В · темрява' : '230 В · мережа';
      onP.textContent = down ? '230 В · резерв станції' : '230 В · мережа';
      read.innerHTML = down
        ? 'перемикання зайняло <b>8 мс</b> · залишок 2048 Вт·год'
        : 'мережа повернулась, станція знову заряджається';
      if (down && !reduced) {
        lampOn.classList.add('is-blip');
        setTimeout(function () { lampOn.classList.remove('is-blip'); }, 200);
      }
    });
  }

  /* ---------------------------------------------------------- calculator */
  var LOADS = [
    { id: 'fridge', name: 'Холодильник',        w: 60 },
    { id: 'router', name: 'Wi-Fi роутер',       w: 12 },
    { id: 'light',  name: 'Світло, 5 LED-ламп', w: 40 },
    { id: 'phones', name: 'Зарядки телефонів',  w: 25 },
    { id: 'laptop', name: 'Ноутбук',            w: 65 },
    { id: 'tv',     name: 'Телевізор 55"',      w: 110 },
    { id: 'boiler', name: 'Котел і насос',      w: 130 },
    { id: 'pump',   name: 'Свердловинний насос', w: 750 },
    { id: 'wash',   name: 'Пральна машина',     w: 600 },
    { id: 'micro',  name: 'Мікрохвильова піч',  w: 1000 },
    { id: 'coffee', name: 'Кавомашина',         w: 1200 },
    { id: 'heater', name: 'Обігрівач',          w: 1500 },
    { id: 'kettle', name: 'Електрочайник',      w: 2000 }
  ];
  var PRESETS = {
    min:   ['fridge', 'router', 'light', 'phones'],
    work:  ['fridge', 'router', 'light', 'phones', 'laptop', 'tv'],
    home:  ['fridge', 'router', 'light', 'phones', 'boiler', 'tv', 'wash'],
    clear: []
  };

  var box = document.getElementById('loads');
  if (box) {
    LOADS.forEach(function (l) {
      var label = document.createElement('label');
      label.className = 'load';
      label.innerHTML =
        '<input type="checkbox" value="' + l.w + '" data-id="' + l.id + '">' +
        '<i aria-hidden="true"></i><span>' + l.name + '</span><em>' + l.w + ' Вт</em>';
      box.appendChild(label);
    });

    var elHrs = document.getElementById('hrs');
    var elMins = document.getElementById('mins');
    var elWatts = document.getElementById('watts');
    var elCov = document.getElementById('covered');
    var elNote = document.getElementById('note');
    var boxes = box.querySelectorAll('input');

    function plural(n, one, few, many) {
      var a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    }

    function update() {
      var watts = 0;
      [].forEach.call(boxes, function (i) { if (i.checked) watts += parseInt(i.value, 10); });

      var runtime = watts > 0 ? USABLE / watts : 0;
      var h = Math.floor(runtime);
      var m = Math.round((runtime - h) * 60);
      if (m === 60) { h++; m = 0; }
      if (h > 99) { h = 99; m = 0; }

      elWatts.textContent = watts.toLocaleString('uk-UA');
      elHrs.textContent = watts ? h : 0;
      elMins.textContent = watts ? m : 0;

      var covered = watts ? Math.min(DARK.length, Math.floor(runtime)) : 0;
      elCov.textContent = covered + ' з ' + DARK.length;
      if (strips.calc) light(strips.calc, covered);

      elNote.classList.toggle('is-warn', watts > AC_LIMIT);
      if (!watts) {
        elNote.textContent = 'Оберіть прилади зліва або скористайтесь готовим набором.';
      } else if (watts > BOOST_LIMIT) {
        elNote.textContent = 'Разом це ' + watts.toLocaleString('uk-UA') + ' Вт. Забагато навіть для X-Boost - вимкніть щось із нагрівальних приладів.';
      } else if (watts > AC_LIMIT) {
        elNote.textContent = 'Разом це ' + watts.toLocaleString('uk-UA') + ' Вт. Запуститься лише через X-Boost і лише якщо надлишок дає нагрівальний прилад.';
      } else if (covered >= DARK.length) {
        elNote.textContent = 'Цього вистачає на весь графік відключень, і ще лишається запас на ранок.';
      } else {
        var left = DARK.length - covered;
        elNote.textContent = 'Не вистачає на ' + left + ' ' + plural(left, 'темну годину', 'темні години', 'темних годин') +
          '. Зніміть щось важке або додайте другу батарею.';
      }
    }

    function applyPreset(key) {
      var set = PRESETS[key] || [];
      [].forEach.call(boxes, function (i) { i.checked = set.indexOf(i.getAttribute('data-id')) !== -1; });
      update();
    }

    [].forEach.call(boxes, function (i) { i.addEventListener('change', update); });
    [].forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
      b.addEventListener('click', function () { applyPreset(b.getAttribute('data-preset')); });
    });

    applyPreset('min');
  }
})();
