/* CTOLITY AP400 landing - калькулятор автономності і дрібниці інтерфейсу.
   Без скриптів сторінка повністю читається, калькулятор показує стартовий розрахунок. */
(function () {
  'use strict';

  /* ------------------------------------------------ шапка при прокрутці */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var stuck = false;
    var onScroll = function () {
      var s = window.scrollY > 8;
      if (s !== stuck) { stuck = s; hdr.classList.toggle('stuck', s); }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------- калькулятор */
  var calc = document.getElementById('calc');
  if (!calc) return;

  // Втрати інвертора і BMS: виробник рахує 80 Вт холодильника як 20 год
  // на 2048 Вт·год, тобто реально доступно близько 78-80% ємності.
  var USABLE = 0.8;

  var models = calc.querySelectorAll('input[name="model"]');
  var items = calc.querySelectorAll('input[name="load"]');
  var outHours = document.getElementById('calc-hours');
  var outUnit = document.getElementById('calc-unit');
  var outWatts = document.getElementById('calc-watts');
  var outNote = document.getElementById('calc-note');
  var bar = document.getElementById('calc-bar');

  function current(list) {
    for (var i = 0; i < list.length; i++) if (list[i].checked) return list[i];
    return list[0];
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function render() {
    var m = current(models);
    var wh = +m.dataset.wh;
    var max = +m.dataset.max;
    var watts = 0;
    for (var i = 0; i < items.length; i++) if (items[i].checked) watts += +items[i].dataset.w;

    outWatts.textContent = watts;
    bar.style.setProperty('--load', Math.min(watts / max, 1));
    calc.classList.toggle('over', watts > max);

    if (!watts) {
      outHours.textContent = '-';
      outUnit.textContent = '';
      outNote.textContent = 'Оберіть хоча б один прилад.';
      return;
    }
    if (watts > max) {
      outHours.textContent = '';
      outUnit.textContent = 'не потягне';
      outNote.textContent = 'Разом ' + watts + ' Вт, а ця модель видає до ' + max +
        ' Вт. Потужні прилади вмикайте по черзі або оберіть старшу модель.';
      return;
    }

    var h = wh * USABLE / watts;
    if (h >= 48) {
      var d = Math.floor(h / 24);
      outHours.textContent = d;
      outUnit.textContent = plural(d, 'доба', 'доби', 'діб');
    } else if (h >= 1) {
      var r = h < 10 ? Math.round(h * 2) / 2 : Math.round(h);
      outHours.textContent = String(r).replace('.', ',');
      outUnit.textContent = r % 1 ? 'години' : plural(r, 'година', 'години', 'годин');
    } else {
      var min = Math.max(5, Math.round(h * 60 / 5) * 5);
      outHours.textContent = min;
      outUnit.textContent = 'хвилин';
    }
    outNote.textContent = 'Навантаження ' + Math.round(watts / max * 100) +
      '% від максимуму. Розрахунок з урахуванням ~20% втрат на інверторі.';
  }

  calc.addEventListener('change', render);
  render();
})();
