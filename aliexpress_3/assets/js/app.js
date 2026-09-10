/* =========================================================================
   Vention PowerHive - landing behaviour
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- header */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------- reveal on scroll in */
  var revealSel = [
    '.band .eyebrow', '.band .h-lg', '.band .lede', '.band .two',
    '.grid3', '.grid4', '.tests', '.cmp', '.rig', '.faces',
    '.charges', '.window', '.size', '.specs-tbl dl', '.faq-list',
    '.shot', '.cta-in > *'
  ].join(',');

  var targets = Array.prototype.slice.call(document.querySelectorAll(revealSel));
  targets.forEach(function (el) { el.setAttribute('data-reveal', ''); });

  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------- TFT faces */
  /* Мордочки з режиму Emotions. Малюємо самі, щоб масштабувались без втрат. */
  var FACE = {
    low:   '<path d="M14 26q6-7 12 0M46 26q6-7 12 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
           '<path d="M24 58q12-11 24 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>',
    mid:   '<circle cx="20" cy="27" r="5" fill="C"/><circle cx="52" cy="27" r="5" fill="C"/>' +
           '<path d="M24 50q12 10 24 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>',
    high:  '<path d="M13 30q7-11 14 0M45 30q7-11 14 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
           '<path d="M20 46q16 18 32 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>',
    turbo: '<path d="M12 22l14 8-14 8M60 22l-14 8 14 8" stroke="C" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<path d="M26 54h20" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>',
    hot:   '<path d="M13 22l13 10M26 22l-13 10M46 22l13 10M59 22l-13 10" stroke="C" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
           '<path d="M24 56q6-8 12 0t12 0" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
           '<path d="M63 44c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8z" fill="C" opacity=".85"/>',
    sleep: '<path d="M13 30h14M45 30h14" stroke="C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
           '<path d="M28 54h16" stroke="C" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>' +
           '<path d="M56 12h10l-10 12h10" stroke="C" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>'
  };

  function faceSvg(mood, color) {
    var body = (FACE[mood] || FACE.mid).replace(/"C"/g, '"' + color + '"');
    return '<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-faces] li'), function (li) {
    var mood = li.getAttribute('data-mood');
    var color = (mood === 'hot' || mood === 'turbo') ? '#FF8A1F' : '#B6F236';
    li.querySelector('span').innerHTML = faceSvg(mood, color);
  });

  /* ------------------------------------------------- port power allocator */
  /* Реальна таблиця розподілу з датащита Vention. */
  var COMBOS = {
    '':       { c1: 0,   c2: 0,  a: 0,  total: 0,   shared: false },
    'c1':     { c1: 100, c2: 0,  a: 0,  total: 100, shared: false },
    'c2':     { c1: 0,   c2: 100, a: 0, total: 100, shared: false },
    'a':      { c1: 0,   c2: 0,  a: 60, total: 60,  shared: false },
    'c1c2':   { c1: 100, c2: 65, a: 0,  total: 165, shared: false },
    'c1a':    { c1: 100, c2: 0,  a: 60, total: 160, shared: false },
    'c2a':    { c1: 0,   c2: 24, a: 24, total: 24,  shared: true },
    'c1c2a':  { c1: 100, c2: 24, a: 24, total: 124, shared: true }
  };

  var USABLE_WH = 74 * 0.88; /* мінус втрати перетворення */

  var rig = document.querySelector('[data-rig]');
  if (rig) {
    var ports = Array.prototype.slice.call(rig.querySelectorAll('.port'));
    var tft = rig.querySelector('.tft');
    var elWatt = rig.querySelector('[data-watt]');
    var elMode = rig.querySelector('[data-mode]');
    var elEta = rig.querySelector('[data-eta]');
    var elBar = rig.querySelector('[data-loadbar]');
    var elFace = rig.querySelector('[data-face]');
    var elHint = rig.querySelector('[data-hint]');
    var elLabel = rig.querySelector('[data-tft-label]');
    var animTimer = null;

    function eta(total) {
      if (!total) return 'очікує навантаження';
      var h = USABLE_WH / total;
      var mins = Math.round(h * 60);
      if (mins >= 60) {
        var hh = Math.floor(mins / 60), mm = mins % 60;
        return '≈ ' + hh + ' год ' + (mm ? mm + ' хв' : '') + ' на такій віддачі';
      }
      return '≈ ' + mins + ' хв на такій віддачі';
    }

    function state(total) {
      if (!total) return { mood: 'sleep', mode: 'режим сну', hot: false };
      if (total <= 30) return { mood: 'mid', mode: 'малий струм', hot: false };
      if (total <= 100) return { mood: 'high', mode: 'робоче навантаження', hot: false };
      if (total < 165) return { mood: 'turbo', mode: 'висока потужність', hot: true };
      return { mood: 'turbo', mode: 'максимум', hot: true };
    }

    function hint(key, c) {
      if (!key) return 'Натисніть на порт, щоб під\'єднати пристрій.';
      if (c.shared && key === 'c2a') return 'USB-C2 і USB-A сидять на одному перетворювачі й ділять 24 Вт на двох. Ноутбук сюди краще не чіпляти.';
      if (c.shared) return 'Вбудований кабель тримає свої 100 Вт, а USB-C2 з USB-A ділять решту 24 Вт.';
      if (key === 'c1c2') return 'Ті самі 165 Вт із заголовка: два ноутбуки одночасно, 100 і 65 Вт.';
      if (key === 'c1a') return 'Найпрактичніша пара: ноутбук на вбудованому кабелі, телефон на USB-A.';
      return 'Один пристрій отримує максимум, який здатен віддати цей порт.';
    }

    function animateTo(target) {
      if (animTimer) cancelAnimationFrame(animTimer);
      var from = parseInt(elWatt.textContent, 10) || 0;
      if (reduced || from === target) { elWatt.textContent = target; return; }
      var t0 = performance.now(), dur = 420;
      var step = function (now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        elWatt.textContent = Math.round(from + (target - from) * e);
        if (p < 1) animTimer = requestAnimationFrame(step);
      };
      animTimer = requestAnimationFrame(step);
    }

    function render() {
      var on = ports.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; })
                    .map(function (p) { return p.getAttribute('data-port'); });
      var key = ['c1', 'c2', 'a'].filter(function (k) { return on.indexOf(k) > -1; }).join('');
      var c = COMBOS[key] || COMBOS[''];
      var s = state(c.total);

      /* коли C2 та A ділять один перетворювач, підписуємо це явно,
         інакше два однакові числа читаються як сума */
      var sharedPorts = c.shared ? ['c2', 'a'] : [];
      ports.forEach(function (p) {
        var k = p.getAttribute('data-port');
        var w = p.querySelector('[data-pw]');
        var live = p.getAttribute('aria-pressed') === 'true';
        if (!live) { w.textContent = '—'; return; }
        w.textContent = c[k] + ' Вт';
        if (sharedPorts.indexOf(k) > -1) {
          var em = document.createElement('em');
          em.textContent = 'на двох';
          w.appendChild(em);
        }
      });

      animateTo(c.total);
      elMode.textContent = s.mode;
      elEta.textContent = eta(c.total);
      elBar.style.setProperty('--w', Math.round(c.total / 165 * 100) + '%');
      elFace.innerHTML = faceSvg(s.mood, s.hot ? '#FF8A1F' : '#B6F236');
      tft.classList.toggle('is-hot', s.hot);
      elHint.textContent = hint(key, c);
      elLabel.setAttribute('aria-label',
        'Екран павербанка: ' + s.mode + ', сумарна віддача ' + c.total + ' ват');
    }

    ports.forEach(function (p) {
      p.addEventListener('click', function () {
        p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        render();
      });
    });

    render();

    /* перший показ: самі вмикаємо ноутбук, щоб віджет не виглядав мертвим */
    if ('IntersectionObserver' in window) {
      var seeded = false;
      var rigIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || seeded) return;
          seeded = true;
          rigIo.disconnect();
          setTimeout(function () {
            ports[0].setAttribute('aria-pressed', 'true');
            render();
          }, reduced ? 0 : 550);
        });
      }, { threshold: 0.35 });
      rigIo.observe(rig);
    }
  }
})();
