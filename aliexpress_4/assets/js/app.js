/* Essager KR-W002 landing - мінімум скриптів, нічого критичного для контенту */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------- тінь/лінія під шапкою */
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

  /* ------------------------------------------------- поява блоків і смуг */
  var targets = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || reduced) {
    for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
  }

  /* ------------------------------------- підсвітка активного пункту меню */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = Object.create(null);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) {
        var r = visible[s.id] || 0;
        if (r > bestRatio) { bestRatio = r; best = s.id; }
      });
      links.forEach(function (a) {
        a.classList.toggle('on', best !== null && a.getAttribute('href') === '#' + best);
      });
    }, { rootMargin: '-72px 0px -45% 0px', threshold: [0, 0.15, 0.4, 0.75] });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --------------------------------- акордеон: відкрите питання одне за раз */
  var faq = document.querySelectorAll('.faq details');
  Array.prototype.forEach.call(faq, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      Array.prototype.forEach.call(faq, function (o) { if (o !== d) o.open = false; });
    });
  });
})();
