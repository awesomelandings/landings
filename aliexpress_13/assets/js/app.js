(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header state + mobile buy dock */
  var hdr = document.getElementById('hdr');
  var dock = document.getElementById('dock');
  var hero = document.querySelector('.hero');
  var order = document.getElementById('cina');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('is-down', y > 40);
    if (!dock || !hero) return;
    var pastHero = hero.getBoundingClientRect().bottom < 0;
    var r = order.getBoundingClientRect();
    var atOrder = r.top < window.innerHeight && r.bottom > 0;
    var on = pastHero && !atOrder;
    dock.classList.toggle('is-on', on);
    dock.setAttribute('aria-hidden', on ? 'false' : 'true');
    var a = dock.querySelector('a');
    if (a) a.tabIndex = on ? 0 : -1;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* port map: USB-C / USB-A tabs, ports on the drawing select their type */
  var face = document.getElementById('face');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function select(k, focus) {
    face.setAttribute('data-k', k);
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-k') === k;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
  }
  if (face && tabs.length) {
    select('c');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t.getAttribute('data-k')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(n.getAttribute('data-k'), true);
      });
    });
    Array.prototype.forEach.call(face.querySelectorAll('.p'), function (p) {
      p.addEventListener('click', function () { select(p.getAttribute('data-k')); });
    });
  }

  /* outage schedule strip: hours with power light up once when it scrolls in */
  var row = document.getElementById('sched');
  if (row) {
    var onHours = [6, 7, 13, 14, 20, 21];
    var cells = [];
    for (var h = 0; h < 24; h++) {
      var c = document.createElement('i');
      row.appendChild(c);
      cells.push(c);
    }
    var light = function () {
      onHours.forEach(function (hr, j) {
        if (reduce) { cells[hr].className = 'on'; return; }
        setTimeout(function () { cells[hr].className = 'on'; }, 180 + j * 140);
      });
    };
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { light(); io.disconnect(); }
      }, { threshold: 0.6 });
      io.observe(row);
    } else {
      light();
    }
  }
})();
