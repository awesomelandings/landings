(function () {
  'use strict';

  /* ---------- header + mobile buy bar ---------- */
  var hdr = document.getElementById('hdr');
  var mbar = document.getElementById('mbar');
  var hero = document.getElementById('top');
  var tsina = document.getElementById('tsina');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('is-solid', y > 40);
    if (mbar && hero) {
      var past = y > hero.offsetTop + hero.offsetHeight - 120;
      var r = tsina ? tsina.getBoundingClientRect() : null;
      var atPrice = r && r.top < window.innerHeight && r.bottom > 0;
      mbar.classList.toggle('show', past && !atPrice);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- case diagram ---------- */
  var svg = document.getElementById('dg');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  var NAMES = {};
  function piece(id, name) {
    NAMES[id] = name;
    var g = el('g', { 'class': 'pc', 'data-id': id }, svg);
    el('title', {}, g).textContent = name;
    return g;
  }

  /* case shell: lid on top, base below, hinge between (24 x 12.5 cm halves, 40 px per cm) */
  el('rect', { 'class': 'case', x: 20, y: 30, width: 960, height: 500, rx: 34 }, svg);
  el('rect', { 'class': 'case', x: 420, y: 6, width: 160, height: 34, rx: 8 }, svg);
  el('rect', { 'class': 'tray', x: 48, y: 58, width: 904, height: 444, rx: 18 }, svg);
  el('rect', { 'class': 'case', x: 20, y: 546, width: 960, height: 500, rx: 34 }, svg);
  el('rect', { 'class': 'tray', x: 48, y: 574, width: 904, height: 444, rx: 18 }, svg);
  el('line', { 'class': 'hinge', x1: 120, y1: 538, x2: 880, y2: 538 }, svg);
  var t1 = el('text', { 'class': 'tag', x: 66, y: 86 }, svg); t1.textContent = 'КРИШКА · 21 БІТА';
  var t2 = el('text', { 'class': 'tag', x: 66, y: 602 }, svg); t2.textContent = 'ОСНОВА';

  /* bit sockets: side view, standing upright */
  function bit(id, name, label, type, cx, top) {
    var g = piece(id, name);
    el('rect', { 'class': 'hit', x: cx - 30, y: top - 6, width: 60, height: 210 }, g);
    // bit shank
    el('rect', { 'class': 'm', x: cx - 7, y: top + 34, width: 14, height: 66 }, g);
    // tip
    var tip;
    if (type === 'sl') tip = 'M' + (cx - 7) + ' ' + (top + 34) + ' L' + (cx - 6) + ' ' + (top + 6) + ' L' + (cx + 6) + ' ' + (top + 6) + ' L' + (cx + 7) + ' ' + (top + 34) + ' Z';
    else if (type === 'ph' || type === 'pz') tip = 'M' + (cx - 7) + ' ' + (top + 34) + ' L' + (cx - 2) + ' ' + (top + 4) + ' L' + (cx + 2) + ' ' + (top + 4) + ' L' + (cx + 7) + ' ' + (top + 34) + ' Z';
    else tip = 'M' + (cx - 7) + ' ' + (top + 34) + ' L' + (cx - 7) + ' ' + (top + 8) + ' L' + (cx + 7) + ' ' + (top + 8) + ' L' + (cx + 7) + ' ' + (top + 34) + ' Z';
    el('path', { 'class': 'm', d: tip }, g);
    if (type === 'tx') { el('line', { 'class': 'ln', x1: cx - 2.5, y1: top + 10, x2: cx - 2.5, y2: top + 32 }, g); el('line', { 'class': 'ln', x1: cx + 2.5, y1: top + 10, x2: cx + 2.5, y2: top + 32 }, g); }
    if (type === 'pz') { el('line', { 'class': 'ln', x1: cx - 4, y1: top + 26, x2: cx + 4, y2: top + 26 }, g); }
    if (type === 'hx') { el('line', { 'class': 'ln', x1: cx, y1: top + 10, x2: cx, y2: top + 32 }, g); }
    // socket body
    el('rect', { 'class': 'm', x: cx - 19, y: top + 98, width: 38, height: 74, rx: 5 }, g);
    el('line', { 'class': 'ln', x1: cx - 19, y1: top + 124, x2: cx + 19, y2: top + 124 }, g);
    var t = el('text', { 'class': 'lbl', x: cx, y: top + 196 }, g); t.textContent = label;
    return g;
  }
  var row1 = [
    ['sl4', 'Біта шліцьова SL 4', 'SL4', 'sl'], ['sl55', 'Біта шліцьова SL 5,5', 'SL5.5', 'sl'], ['sl7', 'Біта шліцьова SL 7', 'SL7', 'sl'],
    ['ph1', 'Біта хрестова PH1', 'PH1', 'ph'], ['ph2', 'Біта хрестова PH2', 'PH2', 'ph'], ['ph3', 'Біта хрестова PH3', 'PH3', 'ph'],
    ['pz1', 'Біта Pozidriv PZ1', 'PZ1', 'pz'], ['pz2', 'Біта Pozidriv PZ2', 'PZ2', 'pz'], ['pz3', 'Біта Pozidriv PZ3', 'PZ3', 'pz'],
    ['h3', 'Біта шестигранна HEX 3', 'H3', 'hx']
  ];
  var row2 = [
    ['h4', 'Біта шестигранна HEX 4', 'H4', 'hx'], ['h5', 'Біта шестигранна HEX 5', 'H5', 'hx'], ['h6', 'Біта шестигранна HEX 6', 'H6', 'hx'],
    ['h7', 'Біта шестигранна HEX 7', 'H7', 'hx'], ['h8', 'Біта шестигранна HEX 8', 'H8', 'hx'],
    ['t10', 'Біта Torx T10', 'T10', 'tx'], ['t15', 'Біта Torx T15', 'T15', 'tx'], ['t20', 'Біта Torx T20', 'T20', 'tx'],
    ['t25', 'Біта Torx T25', 'T25', 'tx'], ['t30', 'Біта Torx T30', 'T30', 'tx'], ['t40', 'Біта Torx T40', 'T40', 'tx']
  ];
  row1.forEach(function (b, i) { bit(b[0], b[1], b[2], b[3], 112 + i * 86, 96); });
  row2.forEach(function (b, i) { bit(b[0], b[1], b[2], b[3], 96 + i * 80.8, 300); });

  /* 3 L hex keys at the far left of the base */
  (function () {
    var g = piece('keys', 'Г-подібні ключі 1,5, 2 і 2,5 мм');
    el('rect', { 'class': 'hit', x: 56, y: 618, width: 56, height: 160 }, g);
    [0, 1, 2].forEach(function (i) {
      var x = 70 + i * 11, w = 5 + i * 1.5;
      el('path', { 'class': 'd', d: 'M' + x + ' 632 h' + (24 - i * 4) + ' v' + w + ' h-' + (24 - i * 4 - w) + ' v' + (130 - i * 14) + ' h-' + w + ' Z' }, g);
    });
  })();

  /* 13 sockets, side view, 14 mm on the left down to 4 mm */
  var sizes = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5.5, 5, 4.5, 4];
  var x = 128;
  sizes.forEach(function (s) {
    var w = (0.9 * s + 7) * 3.6; // outer diameter in mm, scaled
    var id = 's' + String(s).replace('.', '');
    var lab = String(s).replace('.', ',');
    var g = piece(id, 'Головка ' + lab + ' мм');
    el('rect', { 'class': 'hit', x: x - 3, y: 618, width: w + 6, height: 140 }, g);
    el('rect', { 'class': 'm', x: x, y: 630, width: w, height: 92, rx: 6 }, g);
    el('line', { 'class': 'ln', x1: x, y1: 660, x2: x + w, y2: 660 }, g);
    el('line', { 'class': 'ln', x1: x + w / 2, y1: 664, x2: x + w / 2, y2: 716 }, g);
    var t = el('text', { 'class': 'lbl', x: x + w / 2, y: 748 }, g); t.textContent = lab;
    x += w + 7;
  });

  /* tools lying flat */
  (function () { // ratchet
    var g = piece('ratchet', 'Тріскачка 1/4″');
    el('rect', { 'class': 'hit', x: 220, y: 770, width: 700, height: 70 }, g);
    el('rect', { 'class': 'm', x: 300, y: 793, width: 110, height: 24, rx: 8 }, g);
    el('circle', { 'class': 'm', cx: 278, cy: 805, r: 30 }, g);
    el('circle', { 'class': 'd', cx: 278, cy: 805, r: 13 }, g);
    el('rect', { 'class': 'r', x: 400, y: 786, width: 500, height: 38, rx: 19 }, g);
    el('rect', { 'class': 'ins', x: 560, y: 794, width: 250, height: 22, rx: 11 }, g);
    el('circle', { 'class': 'd', cx: 872, cy: 805, r: 8 }, g);
  })();
  (function () { // universal joint
    var g = piece('ujoint', 'Кардан');
    el('rect', { 'class': 'hit', x: 66, y: 782, width: 130, height: 46 }, g);
    el('rect', { 'class': 'm', x: 72, y: 792, width: 46, height: 26, rx: 5 }, g);
    el('circle', { 'class': 'm', cx: 131, cy: 805, r: 12 }, g);
    el('rect', { 'class': 'm', x: 144, y: 792, width: 46, height: 26, rx: 5 }, g);
  })();
  (function () { // bit adapter
    var g = piece('adapter', 'Адаптер під звичайні біти 1/4″');
    el('rect', { 'class': 'hit', x: 66, y: 846, width: 110, height: 44 }, g);
    el('rect', { 'class': 'm', x: 72, y: 856, width: 70, height: 24, rx: 5 }, g);
    el('rect', { 'class': 'm', x: 142, y: 861, width: 26, height: 14, rx: 2 }, g);
    el('line', { 'class': 'ln', x1: 90, y1: 862, x2: 90, y2: 874 }, g);
  })();
  (function () { // spinner handle
    var g = piece('spinner', 'Вороток-викрутка 150 мм');
    el('rect', { 'class': 'hit', x: 220, y: 842, width: 700, height: 56 }, g);
    el('rect', { 'class': 'm', x: 232, y: 861, width: 16, height: 16, rx: 2 }, g);
    el('rect', { 'class': 'm', x: 246, y: 863, width: 300, height: 12, rx: 3 }, g);
    el('rect', { 'class': 'r', x: 540, y: 849, width: 360, height: 40, rx: 20 }, g);
  })();
  (function () { // 100 mm extension
    var g = piece('ext100', 'Подовжувач 100 мм');
    el('rect', { 'class': 'hit', x: 66, y: 904, width: 430, height: 40 }, g);
    el('rect', { 'class': 'm', x: 72, y: 917, width: 16, height: 14, rx: 2 }, g);
    el('rect', { 'class': 'm', x: 86, y: 918, width: 370, height: 12, rx: 3 }, g);
    el('rect', { 'class': 'm', x: 452, y: 911, width: 36, height: 26, rx: 4 }, g);
  })();
  (function () { // T-bar
    var g = piece('tbar', 'Т-вороток');
    el('rect', { 'class': 'hit', x: 520, y: 898, width: 400, height: 56 }, g);
    el('rect', { 'class': 'm', x: 530, y: 919, width: 380, height: 11, rx: 5 }, g);
    el('rect', { 'class': 'm', x: 700, y: 906, width: 40, height: 38, rx: 5 }, g);
    el('rect', { 'class': 'm', x: 712, y: 944, width: 16, height: 10, rx: 2 }, g);
  })();
  (function () { // flexible extension
    var g = piece('flex', 'Гнучкий подовжувач 150 мм');
    el('rect', { 'class': 'hit', x: 66, y: 958, width: 640, height: 46 }, g);
    el('rect', { 'class': 'm', x: 72, y: 973, width: 16, height: 14, rx: 2 }, g);
    el('rect', { 'class': 'm', x: 86, y: 966, width: 40, height: 28, rx: 4 }, g);
    el('rect', { 'class': 'm', x: 126, y: 971, width: 520, height: 18, rx: 6 }, g);
    for (var i = 0; i < 40; i++) el('line', { 'class': 'ln', x1: 134 + i * 12.7, y1: 972, x2: 128 + i * 12.7, y2: 988 }, g);
    el('rect', { 'class': 'm', x: 646, y: 966, width: 46, height: 28, rx: 4 }, g);
  })();
  (function () { // 50 mm extension
    var g = piece('ext50', 'Подовжувач 50 мм');
    el('rect', { 'class': 'hit', x: 724, y: 958, width: 210, height: 46 }, g);
    el('rect', { 'class': 'm', x: 734, y: 974, width: 16, height: 14, rx: 2 }, g);
    el('rect', { 'class': 'm', x: 748, y: 975, width: 150, height: 12, rx: 3 }, g);
    el('rect', { 'class': 'm', x: 892, y: 968, width: 36, height: 26, rx: 4 }, g);
  })();

  /* ---------- tasks ---------- */
  var TASKS = [
    { k: 'battery', t: 'Клема акумулятора', p: ['s10', 's13', 'ratchet', 'ext50', 'ext100'],
      d: 'Гайка на клемі в більшості легковиків під 10 мм, притискна планка тримається на болті 10 або 13 мм. Коротка тріскачка з подовжувачем пролазить туди, де звичайний ключ не провертається.' },
    { k: 'clamps', t: 'Хомути патрубків', p: ['s7', 's8', 'spinner', 'flex'],
      d: 'Черв\'ячні хомути на патрубках зазвичай мають голівку 7 або 8 мм. Вороток-викрутка крутить їх швидко, а гнучкий подовжувач дістає ті, що сховані за іншими деталями.' },
    { k: 'trim', t: 'Пластик салону', p: ['t20', 't25', 't30', 'ph2', 's10', 'spinner', 'ratchet'],
      d: 'Обшивку дверей, накладки, ручки й полички тримають гвинти під Torx або хрестову біту, а в багатьох авто ще й болти на 10. Біти тут сидять у головках, тож працюють і з воротком, і з тріскачкою.' },
    { k: 'bike', t: 'Велосипед і самокат', p: ['h3', 'h4', 'h5', 'h6', 't25', 'spinner', 'ratchet'],
      d: 'Винос керма, підсідельний хомут, гальма й тримач фляги зазвичай під шестигранник 4-6 мм, болти гальмівних дисків під Torx T25. У самокатах часто трапляються шестигранники 3-5 мм.' },
    { k: 'furniture', t: 'Меблі', p: ['h4', 'h5', 'h6', 'ph2', 'tbar'],
      d: 'Меблеві стяжки й конфірмати зазвичай під шестигранник 4-6 мм, ручки й петлі під хрестову біту PH2. Т-вороток дає більше зусилля, ніж Г-подібний ключик з коробки, і не натирає пальці.' },
    { k: 'small', t: 'Змішувач і ручки', p: ['keys', 'h3'],
      d: 'Ручку змішувача, дверну ручку чи кронштейн карниза часто тримає маленький настановний гвинт під шестигранник 2-3 мм. Для таких у кейсі є три Г-подібні ключі: 1,5, 2 і 2,5 мм, і біта HEX 3.' },
    { k: 'pc', t: 'Комп\'ютер і техніка', p: ['ph1', 'ph2', 'sl4', 'sl55', 's5', 'spinner'],
      d: 'Корпус ПК, кришки побутової техніки, розетки й вимикачі: хрестові PH1-PH2 і шліц. Стійки під материнську плату мають шестигранник 5 мм, для них є головка на 5.' }
  ];

  var chips = document.getElementById('chips');
  var tTitle = document.getElementById('taskTitle');
  var tText = document.getElementById('taskText');
  var tNeed = document.getElementById('taskNeed');
  var probe = document.getElementById('probe');
  var pieces = svg.querySelectorAll('.pc');
  var btns = [];

  function select(i) {
    var task = TASKS[i];
    btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    svg.classList.add('has-sel');
    for (var n = 0; n < pieces.length; n++) {
      pieces[n].classList.toggle('on', task.p.indexOf(pieces[n].getAttribute('data-id')) !== -1);
    }
    tTitle.textContent = task.t;
    tText.textContent = task.d;
    tNeed.innerHTML = '';
    task.p.forEach(function (id) {
      var li = document.createElement('li');
      li.textContent = NAMES[id];
      tNeed.appendChild(li);
    });
  }

  TASKS.forEach(function (task, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = task.t;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { select(i); });
    chips.appendChild(b);
    btns.push(b);
  });
  select(0);

  /* tap / hover on a piece shows its name */
  var hov = null;
  function show(g) {
    if (hov) hov.classList.remove('hov');
    hov = g;
    if (!g) return;
    g.classList.add('hov');
    var id = g.getAttribute('data-id');
    var used = TASKS.filter(function (t) { return t.p.indexOf(id) !== -1; }).map(function (t) { return t.t.toLowerCase(); });
    probe.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = NAMES[id];
    probe.appendChild(b);
    probe.appendChild(document.createTextNode(used.length ? '. Знадобиться: ' + used.join(', ') + '.' : '.'));
  }
  svg.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('.pc') : null;
    if (g) show(g);
  });
  svg.addEventListener('mouseover', function (e) {
    var g = e.target.closest ? e.target.closest('.pc') : null;
    if (g && g !== hov) show(g);
  });
})();
