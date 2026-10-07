/* Складна сонячна панель 10 Вт - сонце зараз, калькулятор, вироблення по місяцях і дрібниці інтерфейсу.
   Без скриптів сторінка повністю читається: у розмітці вже стоїть стартовий стан (смартфон, ясно, Київ, вересень). */
(function () {
  'use strict';

  function fmt(n, digits) {
    return n.toFixed(digits).replace('.', ',');
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /* ------------------------------------------------ шапка і мобільна кнопка */
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

  var mbar = document.getElementById('mbar');
  var hero = document.getElementById('top');
  var order = document.getElementById('order');
  if (mbar && hero && order && 'IntersectionObserver' in window) {
    var seen = { top: true, order: false };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      mbar.classList.toggle('on', !seen.top && !seen.order);
    }).observe(hero);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      mbar.classList.toggle('on', !seen.top && !seen.order);
    }).observe(order);
  }

  /* ------------------------------------------------------- ваги */
  var scale = document.getElementById('scale');
  if (scale) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { scale.classList.add('in'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(scale);
    } else {
      scale.classList.add('in');
    }
  }

  /* ------------------------------------------------------- сонце зараз */
  // Висота сонця над Києвом за спрощеним алгоритмом (точність до градуса, тут більше не треба),
  // далі чисте небо: пряме сонце за Мейнелом + ~10% розсіяного, 22% втрат до USB.
  // На полудневому літньому сонці виходить близько 8 Вт, як і міряли покупці.
  var KYIV = { lat: 50.45, lon: 30.52 };
  var RAD = Math.PI / 180;

  function sunAltitude(date, lat, lon) {
    var d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    var g = (357.529 + 0.98560028 * d) * RAD;
    var q = 280.459 + 0.98564736 * d;
    var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    var e = (23.439 - 0.00000036 * d) * RAD;
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var dec = Math.asin(Math.sin(e) * Math.sin(L));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    var ha = (gmst * 15 + lon) * RAD - ra;
    return Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(ha)) / RAD;
  }

  function clearSkyWatts(alt) {
    if (alt <= 0) return 0;
    var am = 1 / (Math.sin(alt * RAD) + 0.50572 * Math.pow(alt + 6.07995, -1.6364));
    var g = 1.1 * 1353 * Math.pow(0.7, Math.pow(am, 0.678));
    return Math.min(8, 10 * g / 1000 * 0.78);
  }

  var kyivClock = null;
  try {
    kyivClock = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (err) {
    try {
      kyivClock = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kiev', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (err2) { kyivClock = null; }
  }
  function kyivTime(now) {
    return kyivClock ? kyivClock.format(now) : pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  var sunBox = document.getElementById('sunnow');
  var sunText = document.getElementById('sunnow-text');
  function renderSun() {
    var now = new Date();
    var alt = sunAltitude(now, KYIV.lat, KYIV.lon);
    var t = kyivTime(now);
    if (alt <= 0) {
      sunBox.classList.add('is-night');
      sunText.innerHTML = 'Київ, ' + t + '. Сонце за горизонтом. Панель відпочиває до ранку, а павербанк, заряджений удень, працює.';
      return;
    }
    sunBox.classList.remove('is-night');
    var w = clearSkyWatts(alt);
    var tail = alt < 8
      ? ' Сонце ще низько, тож поки це крихти.'
      : '';
    sunText.innerHTML = 'Київ, ' + t + '. Сонце на <b>' + Math.round(alt) + '°</b> над горизонтом: якщо небо ясне, повернута до нього панель дає зараз <b>≈' + fmt(w, 1) + '&nbsp;Вт</b>.' + tail;
  }
  if (sunBox && sunText) {
    renderSun();
    setInterval(renderSun, 60000);
  }

  /* ------------------------------------------------------- калькулятор */
  var EFF = 0.8; // втрати на саму зарядку: перетворювач у пристрої, кабель, нагрів
  var SKY = { sun: 7, haze: 3.5, clouds: 1 };
  var DEV = {
    phone: { wh: 19.25, label: 'Смартфон з нуля до повного', small: true },   // 5000 мА·год × 3,85 В
    pb10:  { wh: 37,    label: 'Павербанк 10 000 мА·год з нуля' },            // × 3,7 В
    pb20:  { wh: 74,    label: 'Павербанк 20 000 мА·год з нуля' },
    lamp:  { wh: 10.8,  label: 'Налобний ліхтар з нуля', small: true },       // 3000 мА·год × 3,6 В
    buds:  { wh: 1.9,   label: 'Навушники разом з кейсом', small: true },
    watch: { wh: 1.2,   label: 'Годинник з нуля', small: true }
  };
  var DAY_FROM = 6, DAY_SPAN = 15, START = 9, SUN_HOURS = 8;

  var form = document.getElementById('calc-form');
  var outLabel = document.getElementById('calc-label');
  var outNum = document.getElementById('calc-num');
  var outWhen = document.getElementById('calc-when');
  var outWarn = document.getElementById('calc-warn');
  var dayFill = document.getElementById('day-fill');

  function checked(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function renderCalc() {
    var dev = DEV[checked('dev')];
    var sky = checked('sky');
    var h = dev.wh / (SKY[sky] * EFF);

    outLabel.textContent = dev.label;

    if (h < 1) {
      var m = Math.max(5, Math.round(h * 60 / 5) * 5);
      outNum.innerHTML = '≈' + m + '<small>хв</small>';
    } else if (h < 10) {
      outNum.innerHTML = '≈' + fmt(Math.round(h * 2) / 2, Math.round(h * 2) % 2 ? 1 : 0) + '<small>год</small>';
    } else if (h <= 30) {
      outNum.innerHTML = '≈' + Math.round(h) + '<small>год</small>';
    } else {
      outNum.innerHTML = '30+<small>год</small>';
    }

    if (h <= SUN_HOURS) {
      var end = START + h;
      var mins = Math.round(end * 12) * 5;        // до 5 хвилин, як і сам час зарядки
      var hh = Math.floor(mins / 60), mm = mins % 60;
      outWhen.textContent = 'Поклали о 9:00, готово близько ' + hh + ':' + pad(mm);
    } else {
      var days = Math.ceil(h / SUN_HOURS);
      outWhen.textContent = 'Це ' + days + ' ' + plural(days, 'день', 'дні', 'днів') + ' такого неба по 8 годин світла';
    }

    var to = Math.min(START + h, DAY_FROM + DAY_SPAN);
    dayFill.style.setProperty('--from', ((START - DAY_FROM) / DAY_SPAN * 100) + '%');
    dayFill.style.setProperty('--to', ((to - DAY_FROM) / DAY_SPAN * 100).toFixed(1) + '%');
    dayFill.classList.toggle('is-over', START + h > DAY_FROM + DAY_SPAN);

    var warn = '';
    if (sky === 'clouds' && dev.small) {
      warn = 'Від ≈1 Вт багато телефонів і гаджетів не починають заряджатися зовсім або постійно перериваються. У похмурий день заряджайте павербанк, а вже від нього все інше.';
    } else if (sky === 'clouds') {
      warn = 'Павербанк такий струм прийме, але дуже повільно. Похмурий день для цієї панелі бонус, а не план.';
    }
    outWarn.textContent = warn;
    outWarn.hidden = !warn;
  }
  if (form) {
    form.addEventListener('change', renderCalc);
    renderCalc();
  }

  /* ------------------------------------------------------- по місяцях */
  // Вт·год на добу на виході USB: PVGIS для 10 Вт під 40° на південь, 30% втрат.
  var SUN = {
    kyiv:    [ 9.9, 16.6, 25.2, 32.1, 35.4, 37.3, 36.4, 35.5, 30.5, 21.3,  9.9,  7.3],
    lviv:    [10.7, 16.8, 24.7, 30.9, 32.3, 33.8, 34.4, 34.1, 29.2, 22.3, 12.1,  8.8],
    odesa:   [13.8, 19.2, 28.4, 34.4, 37.6, 38.5, 39.9, 39.8, 34.7, 25.9, 13.8, 11.2],
    kharkiv: [10.8, 17.2, 24.7, 31.4, 35.6, 37.7, 37.5, 37.5, 31.5, 21.5, 11.0,  6.8],
    dnipro:  [10.7, 17.9, 26.0, 32.1, 36.2, 38.0, 38.6, 39.1, 33.4, 24.1, 13.0,  8.4]
  };
  var SCALE = 40; // фіксована шкала, щоб стовпці не стрибали між містами
  var CITY_IN = { kyiv: 'в Києві', lviv: 'у Львові', odesa: 'в Одесі', kharkiv: 'в Харкові', dnipro: 'в Дніпрі' };
  var MONTH_IN = ['У січні', 'У лютому', 'У березні', 'У квітні', 'У травні', 'У червні',
                  'У липні', 'У серпні', 'У вересні', 'У жовтні', 'У листопаді', 'У грудні'];
  var PHONE_WH = DEV.phone.wh;

  var month = new Date().getMonth();
  var cityBox = document.getElementById('cities');
  var say = document.getElementById('season-say');
  var bars = document.querySelectorAll('#months li');

  function renderSeason() {
    var el = cityBox.querySelector('input:checked');
    var city = el ? el.value : 'kyiv';
    var data = SUN[city];
    for (var i = 0; i < bars.length; i++) {
      bars[i].style.setProperty('--h', (data[i] / SCALE * 100).toFixed(1) + '%');
      bars[i].querySelector('b').textContent = Math.round(data[i]);
      bars[i].classList.toggle('is-now', i === month);
    }
    var wh = data[month];
    var charges = wh * EFF / PHONE_WH;
    say.innerHTML = MONTH_IN[month] + ' ' + CITY_IN[city] +
      ' панель, що весь день дивиться на південь, у середньому збирає <b>≈' + Math.round(wh) + '&nbsp;Вт·год</b> на день, враховуючи й хмарні дні. Це <b>≈' +
      fmt(charges, 1) + '</b> зарядки смартфона.';
  }
  if (cityBox && say && bars.length === 12) {
    cityBox.addEventListener('change', renderSeason);
    renderSeason();
  }
})();
