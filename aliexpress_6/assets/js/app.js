/* Сонячний набір 6000W - графік сонця по містах, калькулятор і дрібниці інтерфейсу.
   Без скриптів сторінка повністю читається: у розмітці вже стоїть стартовий стан (Київ, вересень). */
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

  /* ------------------------------------------------------- спільне */

  // Вт·год на добу в акумулятор: PVGIS для 110 Вт під 35° на південь,
  // 14% стандартних втрат і ще x0,75 на PWM-контролер, округлено до 10.
  var SUN = {
    kyiv:         [100, 160, 250, 350, 370, 390, 380, 370, 320, 200,  90,  70],
    lviv:         [110, 150, 230, 320, 330, 350, 350, 350, 300, 220, 120,  90],
    odesa:        [140, 190, 290, 370, 390, 410, 410, 410, 350, 250, 140, 110],
    kharkiv:      [100, 160, 240, 330, 370, 400, 390, 380, 320, 210, 110,  60],
    dnipro:       [110, 170, 260, 350, 380, 400, 400, 410, 340, 240, 130,  80],
    zaporizhzhia: [110, 170, 260, 350, 380, 410, 410, 410, 350, 250, 140,  90],
    vinnytsia:    [100, 140, 230, 340, 370, 390, 380, 380, 320, 220, 110,  80],
    chernihiv:    [ 90, 160, 230, 340, 370, 400, 380, 370, 310, 200,  80,  70],
    uzhhorod:     [110, 170, 270, 350, 350, 380, 380, 380, 320, 230, 140,  80]
  };
  var CITY_NAME = {
    kyiv: 'Київ', lviv: 'Львів', odesa: 'Одеса', kharkiv: 'Харків', dnipro: 'Дніпро',
    zaporizhzhia: 'Запоріжжя', vinnytsia: 'Вінниця', chernihiv: 'Чернігів', uzhhorod: 'Ужгород'
  };
  var CITY_IN = {
    kyiv: 'в Києві', lviv: 'у Львові', odesa: 'в Одесі', kharkiv: 'у Харкові', dnipro: 'у Дніпрі',
    zaporizhzhia: 'в Запоріжжі', vinnytsia: 'у Вінниці', chernihiv: 'у Чернігові', uzhhorod: 'в Ужгороді'
  };
  var MONTH = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
               'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  var MONTH_IN = ['у січні', 'у лютому', 'у березні', 'у квітні', 'у травні', 'у червні',
                  'у липні', 'у серпні', 'у вересні', 'у жовтні', 'у листопаді', 'у грудні'];
  var SCALE = 450;      // фіксована шкала графіка, щоб стовпці не стрибали між містами
  var INV_EFF = 0.85;   // ККД інвертора
  var INV_IDLE = 5;     // власне споживання інвертора, Вт
  var USB_EFF = 0.8;    // зарядка телефону від USB
  var PHONE_WH = 15;    // батарея смартфона

  var state = { city: 'kyiv', month: new Date().getMonth() };
  var listeners = [];

  function fmt(n) {
    return String(n).replace('.', ',');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  // до 10 годин показуємо з кроком 0,5, далі цілими
  function roundHours(h) {
    return h < 10 ? Math.round(h * 2) / 2 : Math.round(h);
  }
  function sunWh() {
    return SUN[state.city][state.month];
  }

  /* ------------------------------------------------------- сонце */
  var cols = document.querySelectorAll('#cols .col');
  var cities = document.querySelectorAll('#cities input[name="city"]');
  var outWhere = document.getElementById('sun-where');
  var outWh = document.getElementById('sun-wh');
  var eqRouter = document.getElementById('eq-router');
  var eqLaptop = document.getElementById('eq-laptop');
  var eqPhone = document.getElementById('eq-phone');

  function renderSun() {
    var data = SUN[state.city];
    for (var i = 0; i < cols.length; i++) {
      var on = i === state.month;
      cols[i].style.setProperty('--h', (data[i] / SCALE * 100).toFixed(2) + '%');
      cols[i].querySelector('.val').textContent = data[i];
      cols[i].classList.toggle('on', on);
      cols[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      cols[i].setAttribute('aria-label', MONTH[i] + ': ' + data[i] + ' Вт·год на добу');
    }
    var wh = data[state.month];
    outWhere.textContent = MONTH[state.month] + ' · ' + CITY_NAME[state.city];
    outWh.textContent = wh;

    var r = Math.round(wh * INV_EFF / 15);
    var l = roundHours(wh * INV_EFF / 60);
    var p = Math.floor(wh * USB_EFF / PHONE_WH);
    eqRouter.innerHTML = r + '&nbsp;год';
    eqLaptop.innerHTML = fmt(l) + '&nbsp;год';
    eqPhone.innerHTML = p + '&nbsp;' + plural(p, 'раз', 'рази', 'разів');

    for (var k = 0; k < listeners.length; k++) listeners[k]();
  }

  if (cols.length === 12 && outWh) {
    for (var c = 0; c < cols.length; c++) {
      (function (idx) {
        var pick = function () {
          if (state.month === idx) return;
          state.month = idx;
          renderSun();
        };
        cols[idx].addEventListener('click', pick);
        cols[idx].addEventListener('mouseenter', pick);
        cols[idx].addEventListener('focus', pick);
      })(c);
    }
    for (var j = 0; j < cities.length; j++) {
      cities[j].addEventListener('change', function (e) {
        state.city = e.target.value;
        renderSun();
      });
    }
    renderSun();
  }

  /* ------------------------------------------------------- калькулятор */
  var calc = document.getElementById('calc');
  if (!calc) return;

  var MAX_W = 300;
  var CIG_W = 150;

  var bats = calc.querySelectorAll('input[name="bat"]');
  var items = calc.querySelectorAll('input[name="load"]');
  var led = document.getElementById('calc-led');
  var outHours = document.getElementById('calc-hours');
  var outUnit = document.getElementById('calc-unit');
  var outWatts = document.getElementById('calc-watts');
  var outNote = document.getElementById('calc-note');
  var outSun = document.getElementById('calc-sun');
  var bar = document.getElementById('calc-bar');

  var NOTE_OK = 'Враховано ~15% втрат в інверторі і його власне споживання. ' +
    'Свинцеві акумулятори рахуємо лише до половини, інакше вони не переживуть і сезону.';

  // «примари» незасвічених сегментів під цифрами, як на справжньому табло
  function setLed(text) {
    var g = String(text).replace(/[^.]/g, '8');
    while (g.replace('.', '').length < 3) g = '8' + g;
    outHours.textContent = text;
    outHours.setAttribute('data-ghost', g);
  }

  function current(list) {
    for (var i = 0; i < list.length; i++) if (list[i].checked) return list[i];
    return list[0];
  }

  function showHours(h) {
    if (h >= 48) {
      var d = Math.floor(h / 24);
      setLed(String(d));
      outUnit.textContent = plural(d, 'доба', 'доби', 'діб');
    } else {
      var r = roundHours(h);
      setLed(r % 1 ? r.toFixed(1) : String(r));
      outUnit.textContent = 'год';
    }
  }

  function renderCalc() {
    var usable = +current(bats).dataset.wh;
    var watts = 0;
    for (var i = 0; i < items.length; i++) if (items[i].checked) watts += +items[i].dataset.w;

    outWatts.textContent = watts;
    bar.style.setProperty('--load', Math.min(watts / MAX_W, 1));
    calc.classList.toggle('over', watts > MAX_W);
    led.classList.toggle('over', watts > MAX_W || !watts);

    if (!watts) {
      setLed('--');
      outUnit.textContent = '';
      outNote.textContent = 'Оберіть хоча б один прилад.';
      outSun.hidden = true;
      return;
    }
    if (watts > MAX_W) {
      setLed('OL');
      outUnit.textContent = '';
      outNote.textContent = 'Разом ' + watts + ' Вт, а інвертор тривало видає близько ' + MAX_W +
        ' Вт. Він просто вимкнеться від перевантаження. Потужні прилади вмикайте по черзі або приберіть зі списку.';
      outSun.hidden = true;
      return;
    }

    var draw = watts / INV_EFF + INV_IDLE;   // що реально бере з акумулятора, Вт
    showHours(usable / draw);
    outNote.textContent = watts > CIG_W
      ? 'Понад ' + CIG_W + ' Вт підключайте інвертор клемами напряму до акумулятора, прикурювач стільки не дасть. ' + NOTE_OK
      : NOTE_OK;

    var sun = sunWh();
    var when = MONTH_IN[state.month] + ' ' + CITY_IN[state.city];
    outSun.hidden = false;
    if (sun >= usable) {
      outSun.innerHTML = 'Середній день <b>' + when + '</b> заряджає такий акумулятор <b>повністю</b>.';
    } else {
      var sh = roundHours(sun / draw);
      outSun.innerHTML = 'Середній день <b>' + when + '</b> поверне ще <b>~' + fmt(sh) +
        '&nbsp;год</b> такої роботи.';
    }
  }

  for (var b = 0; b < bats.length; b++) bats[b].addEventListener('change', renderCalc);
  for (var t = 0; t < items.length; t++) items[t].addEventListener('change', renderCalc);
  listeners.push(renderCalc);
  renderCalc();
})();
