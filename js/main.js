/* Casa Nueve — pantalla de carga, idioma, header, visor de fotos y apariciones. */
(function () {
  var D = document, H = D.documentElement, N = window.NUEVE;
  var $ = function (s, c) { return (c || D).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); };

  /* ── idioma ── */
  var lang = 'es';
  try { lang = localStorage.getItem('lang') || ((navigator.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es'); } catch (e) {}
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'es';
    H.lang = lang;
    $$('[data-' + lang + ']').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (el.hasAttribute('data-html')) el.innerHTML = v; else el.textContent = v;
    });
    $$('.lang button').forEach(function (b) { var on = b.dataset.lang === lang; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    $$('.lang').forEach(function (l) { l.classList.toggle('is-en', lang === 'en'); });
    var href = 'https://wa.me/' + N.wa + '?text=' + encodeURIComponent(N.waMsg[lang]);
    $$('[data-wa]').forEach(function (a) { a.href = href; });
    try { localStorage.setItem('lang', lang); } catch (e) {}
    D.dispatchEvent(new CustomEvent('langchange'));
  }
  D.addEventListener('click', function (e) {
    var b = e.target.closest('.lang button'); if (b) { setLang(b.dataset.lang); return; }
    if (e.target.closest('.lang')) setLang(lang === 'en' ? 'es' : 'en'); // tocar el interruptor lo cambia
  });
  setLang(lang);

  /* ── pantalla de carga ── */
  var loader = $('#loader');
  function done() {
    if (H.classList.contains('is-loaded')) return;
    H.classList.add('is-loaded');
    if (loader) loader.classList.add('is-out');
    D.dispatchEvent(new CustomEvent('loaderdone'));
  }
  if (loader) {
    var ld = $('.ld', loader), t0 = Date.now();
    requestAnimationFrame(function () { requestAnimationFrame(function () { ld.classList.add('go'); }); });
    var ready = function () { setTimeout(done, Math.max(0, 2900 - (Date.now() - t0))); };
    if (D.readyState === 'complete') ready(); else addEventListener('load', ready);
    setTimeout(done, 6000);
  } else done();

  /* ── header: píldora deslizante (colores de las puertas), se oculta al bajar ── */
  var header = $('#header'), nav = $('.header__nav');
  if (nav) {
    var links = $$('a', nav), pill = D.createElement('span'), hover = null, active = null;
    pill.className = 'nav__pill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill);
    var place = function () {
      var a = hover || active;
      links.forEach(function (l) { l.classList.toggle('is-pill', l === a); });
      if (!a) { pill.style.opacity = 0; return; }
      var first = pill.style.opacity !== '1';
      if (first) pill.style.transition = 'none';
      pill.style.width = a.offsetWidth + 'px';
      pill.style.height = a.offsetHeight + 'px';
      pill.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)';
      pill.dataset.c = links.indexOf(a) % 4;
      if (first) { pill.offsetWidth; pill.style.transition = ''; }
      pill.style.opacity = 1;
    };
    links.forEach(function (a) {
      a.addEventListener('pointerenter', function () { hover = a; place(); });
      a.addEventListener('focus', function () { hover = a; place(); });
      a.addEventListener('blur', function () { hover = null; place(); });
    });
    nav.addEventListener('pointerleave', function () { hover = null; place(); });
    var secs = links.map(function (a) { var h = a.getAttribute('href'); return h.charAt(0) === '#' ? [a, $(h)] : null; }).filter(function (x) { return x && x[1]; });
    if (secs.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var hit = secs.filter(function (s) { return s[1] === e.target; })[0];
          if (e.isIntersecting) active = hit[0]; else if (active === hit[0]) active = null;
        });
        place();
      }, { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach(function (s) { io.observe(s[1]); });
    }
    if (nav.dataset.current) { active = links[+nav.dataset.current]; }
    addEventListener('resize', place);
    D.addEventListener('langchange', function () { setTimeout(place, 30); });
    (D.fonts && D.fonts.ready || Promise.resolve()).then(place);
  }

  var hero = $('#inicio'), fwa = $('#float-wa'), lastY = scrollY;
  function onScroll() {
    var y = scrollY, heroEnd = hero ? hero.offsetHeight - innerHeight : 0;
    if (header) {
      header.classList.toggle('is-solid', y > Math.max(10, heroEnd));
      header.classList.toggle('is-hidden', y > lastY && y > heroEnd + 120);
    }
    if (hero) hero.classList.toggle('is-built', y > heroEnd * .85);
    if (fwa) fwa.classList.toggle('is-on', y > (hero ? heroEnd : 300));
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── los puntos del logo en Ubicación: una línea de lápiz los va uniendo con el scroll,
        cada punto se traza y se rellena cuando la línea llega a él; al final la línea se retira ── */
  var mdots = $('#mapa-dots');
  if (mdots) {
    var circles = $$('circle', mdots), mline = $('.md-line', mdots), sec = $('#ubicacion');
    var us = circles.map(function (c) { return +c.dataset.u; });
    var cur = -1, goal = 0, raf2 = 0, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var target2 = function () {
      var r = $('.mapa__hd').getBoundingClientRect();
      // empieza cuando el título asoma (88 % de la pantalla) y termina al llegar al 38 %
      goal = Math.min(1, Math.max(0, (innerHeight * .88 - r.top) / (innerHeight * .5)));
      if (RM) goal = goal > 0 ? 1 : 0;
    };
    var paint = function (p) {
      var line = Math.min(1, p / .8);
      mline.style.setProperty('--l', line.toFixed(4));
      mline.style.setProperty('--lo', (.7 * (1 - Math.max(0, (p - .86) / .14))).toFixed(3));
      circles.forEach(function (c, i) {
        var k = Math.min(1, Math.max(0, (p / .8 - us[i] + .02) * 7 + (i === 0 ? .3 : 0)));
        c.style.setProperty('--k', Math.min(1, k * 1.7).toFixed(3));
        c.style.setProperty('--f', Math.max(0, k * 2 - 1).toFixed(3));
      });
    };
    var tick = function () {
      raf2 = 0;
      cur += (goal - cur) * .12;
      if (Math.abs(goal - cur) < .0008) cur = goal; else raf2 = requestAnimationFrame(tick);
      paint(cur);
    };
    var kick = function () { target2(); if (!raf2) raf2 = requestAnimationFrame(tick); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    target2(); cur = goal; paint(cur);
  }

  /* ── apariciones ── */
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv, .rv-img').forEach(function (el, i) {
      var sib = el.parentElement ? $$(':scope > .rv', el.parentElement).indexOf(el) : 0;
      el.style.transitionDelay = Math.max(0, sib) * 70 + 'ms';
      rio.observe(el);
    });
  } else $$('.rv, .rv-img').forEach(function (el) { el.classList.add('in'); });

  /* ── video del recorrido: se reproduce en silencio cuando se ve ── */
  var vbtn = $('#video-btn');
  var vid = vbtn && $('video', vbtn);
  if (vid) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { vid.preload = 'auto'; var p = vid.play(); if (p) p.catch(function () {}); } else vid.pause(); });
    }, { threshold: .3 }).observe(vbtn);
  }

  /* ── visor ── */
  var lb = $('#lb');
  if (!lb) return;
  var lbImg = $('#lb-img'), lbVid = $('#lb-video'), lbCap = $('#lb-cap'), lbCount = $('#lb-count');
  var byF = {}; N.fotos.forEach(function (p) { byF[p.f] = p; });
  var list = [], idx = 0, lastFocus = null;
  function show(i) {
    idx = (i + list.length) % list.length;
    var it = list[idx];
    if (it.video) {
      lbImg.hidden = true; lbVid.hidden = false; lbVid.src = 'img/casa/recorrido.mp4'; lbVid.play().catch(function () {});
      lbCap.textContent = lang === 'en' ? 'Walkthrough of the house' : 'Recorrido por la casa';
    } else {
      lbVid.pause(); lbVid.hidden = true; lbImg.hidden = false;
      lbImg.src = 'img/casa/' + it.f + '.jpg'; lbImg.alt = it[lang];
      lbCap.textContent = it[lang];
    }
    lbCount.textContent = (idx + 1) + ' / ' + list.length;
    var multi = list.length > 1;
    $('#lb-prev').hidden = $('#lb-next').hidden = !multi;
  }
  function open(arr, i) {
    list = arr; lastFocus = D.activeElement;
    lb.hidden = false; D.body.style.overflow = 'hidden';
    show(i || 0); $('#lb-x').focus();
  }
  function close() { lb.hidden = true; lbVid.pause(); D.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  window.nueveOpen = function (f) { var i = N.fotos.map(function (p) { return p.f; }).indexOf(f); open(N.fotos, Math.max(0, i)); };
  D.addEventListener('click', function (e) {
    var s = e.target.closest('[data-set]');
    if (s) { open(N.sets[s.dataset.set].map(function (f) { return byF[f]; }), 0); return; }
    var f = e.target.closest('[data-foto]');
    if (f) { window.nueveOpen(f.dataset.foto); return; }
    if (e.target.closest('#video-btn')) open([{ video: true }], 0);
  });
  $('#lb-x').addEventListener('click', close);
  $('#lb-prev').addEventListener('click', function () { show(idx - 1); });
  $('#lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  D.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  var tx = 0;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); });
  D.addEventListener('langchange', function () { if (!lb.hidden) show(idx); });
})();
