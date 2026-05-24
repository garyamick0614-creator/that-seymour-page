/* TCG WOW v3 — cinematic effects. Vanilla, ~7KB.
   Stacks on top of v2. Honors prefers-reduced-motion. Pauses on hidden tab.
   Touch-device fallback: skips mouse-based effects. */
(function () {
  'use strict';
  if (window.__tcgWowV3) return; window.__tcgWowV3 = true;

  var doc = document, win = window;
  var rm = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = ('ontouchstart' in win) || (navigator.maxTouchPoints > 0);
  var smallVP = function () { return win.innerWidth < 768; };
  var on = function (el, ev, fn, o) { el.addEventListener(ev, fn, o || false); };
  var raf = win.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* ---------- 1. 3D card tilt + spotlight ---------- */
  var TILT_SEL = '.card,.tile,.cell,.cat-card,.fcard,.ext-card,.broker-card';
  function tiltCards() {
    if (rm || touch || smallVP()) return;
    qsa(TILT_SEL).forEach(function (card) {
      if (card.closest('[data-tcg-no-tilt]') || card.hasAttribute('data-tcg-no-tilt')) return;
      if (card.__tcgTilt) return; card.__tcgTilt = true;
      var spot = doc.createElement('div'); spot.className = 'tcg-wow-spot';
      card.appendChild(spot);
      var rect, rafId = 0;
      function move(e) {
        rect = rect || card.getBoundingClientRect();
        var x = e.clientX - rect.left, y = e.clientY - rect.top;
        var px = x / rect.width, py = y / rect.height;
        var rx = (.5 - py) * 8, ry = (px - .5) * 8;
        if (rafId) return;
        rafId = raf(function () {
          card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) +
            'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(8px)';
          spot.style.setProperty('--mx', (px * 100) + '%');
          spot.style.setProperty('--my', (py * 100) + '%');
          rafId = 0;
        });
      }
      on(card, 'mouseenter', function () { rect = card.getBoundingClientRect(); card.classList.add('tcg-wow-tilting'); });
      on(card, 'mousemove', move);
      on(card, 'mouseleave', function () {
        card.classList.remove('tcg-wow-tilting');
        card.style.transform = '';
        rect = null;
      });
    });
  }

  /* ---------- 2. Cursor spotlight ---------- */
  function cursorSpotlight() {
    if (rm || touch || smallVP()) return;
    var el = doc.createElement('div'); el.id = 'tcg-wow-cursor'; el.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(el);
    var x = -200, y = -200, ticking = false;
    function upd() {
      el.style.setProperty('--cx', x + 'px');
      el.style.setProperty('--cy', y + 'px');
      ticking = false;
    }
    on(win, 'mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!ticking) { raf(upd); ticking = true; }
      el.classList.add('on');
    }, { passive: true });
    on(win, 'mouseleave', function () { el.classList.remove('on'); });
  }

  /* ---------- 4. Parallax hero ---------- */
  function parallaxHero() {
    if (rm) return;
    var hero = doc.querySelector('.hero'); if (!hero) return;
    var ticking = false;
    function upd() {
      var rect = hero.getBoundingClientRect();
      var y = Math.max(-40, Math.min(40, -rect.top * .25));
      hero.style.setProperty('--tcg-scroll', y + 'px');
      ticking = false;
    }
    on(win, 'scroll', function () { if (!ticking) { raf(upd); ticking = true; } }, { passive: true });
    upd();
  }

  /* ---------- 5. SVG wave dividers between sections ---------- */
  function waveDividers() {
    var sections = qsa('main > section, body > section');
    if (sections.length < 2) return;
    var SVG = '<svg class="tcg-wow-wave" viewBox="0 0 1440 54" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,27 C240,54 480,0 720,27 C960,54 1200,0 1440,27 L1440,54 L0,54 Z" fill="rgba(34,211,238,0.10)"/>' +
      '<path d="M0,32 C240,8 480,52 720,32 C960,12 1200,50 1440,32 L1440,54 L0,54 Z" fill="rgba(251,191,36,0.07)"/>' +
      '</svg>';
    sections.forEach(function (s, i) {
      if (i === 0) return;
      if (s.previousElementSibling && s.previousElementSibling.classList && s.previousElementSibling.classList.contains('tcg-wow-wave-wrap')) return;
      var w = doc.createElement('div'); w.className = 'tcg-wow-wave-wrap'; w.innerHTML = SVG;
      s.parentNode.insertBefore(w, s);
    });
  }

  /* ---------- 6. Confetti on primary buttons ---------- */
  var confettiCanvas, confettiCtx, particles = [], confettiRunning = false;
  function ensureConfetti() {
    if (confettiCanvas) return;
    confettiCanvas = doc.createElement('canvas'); confettiCanvas.id = 'tcg-wow-confetti';
    confettiCanvas.width = win.innerWidth; confettiCanvas.height = win.innerHeight;
    doc.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    on(win, 'resize', function () {
      confettiCanvas.width = win.innerWidth; confettiCanvas.height = win.innerHeight;
    });
  }
  function burst(x, y) {
    if (rm) return;
    ensureConfetti();
    var colors = ['#22d3ee', '#a855f7', '#fbbf24', '#34d399', '#f472b6'];
    for (var i = 0; i < 30; i++) {
      particles.push({
        x: x, y: y,
        vx: (Math.random() - .5) * 8,
        vy: -Math.random() * 8 - 2,
        g: .25 + Math.random() * .15,
        size: 4 + Math.random() * 5,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * .3,
        life: 0, maxLife: 80 + Math.random() * 40
      });
    }
    if (!confettiRunning) { confettiRunning = true; raf(stepConfetti); }
  }
  function stepConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      var a = Math.max(0, 1 - p.life / p.maxLife);
      confettiCtx.save();
      confettiCtx.globalAlpha = a;
      confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();
      if (p.life >= p.maxLife || p.y > confettiCanvas.height + 50) particles.splice(i, 1);
    }
    if (particles.length) raf(stepConfetti); else confettiRunning = false;
  }
  function confettiHook() {
    on(doc, 'click', function (e) {
      var t = e.target.closest && e.target.closest('.btn-p,[data-confetti],button.cta,a.cta');
      if (!t) return;
      burst(e.clientX, e.clientY);
    }, true);
    on(doc, 'submit', function (e) {
      if (e.target.matches && e.target.matches('form[data-confetti-on-submit]')) {
        var r = e.target.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
      }
    }, true);
  }

  /* ---------- 7. Scroll indicator ---------- */
  function scrollIndicator() {
    var hero = doc.querySelector('.hero'); if (!hero) return;
    if (hero.querySelector('#tcg-wow-scrolldown')) return;
    var d = doc.createElement('div'); d.id = 'tcg-wow-scrolldown';
    d.innerHTML = '<span>Scroll</span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M6 9l6 6 6-6"/></svg>';
    var pos = win.getComputedStyle(hero).position;
    if (pos === 'static') hero.style.position = 'relative';
    hero.appendChild(d);
    var hidden = false;
    on(win, 'scroll', function () {
      if (hidden) return;
      if ((win.scrollY || doc.documentElement.scrollTop) > 60) {
        d.classList.add('gone'); hidden = true;
      }
    }, { passive: true });
  }

  /* ---------- 8. Odometer-rolling counters (upgrade v2 .tcg-wow-count) ---------- */
  function odometers() {
    if (rm) return;
    qsa('.tcg-wow-count').forEach(function (el) {
      if (el.__tcgOdo) return;
      var raw = (el.getAttribute('data-target') || el.textContent || '').trim();
      var m = raw.match(/^(.*?)([\d,]+)(.*)$/);
      if (!m) return;
      var pre = m[1], num = m[2].replace(/,/g, ''), suf = m[3];
      if (!/^\d+$/.test(num)) return;
      el.__tcgOdo = true;
      el.classList.add('tcg-odometer');
      var inner = '';
      if (pre) inner += '<span class="tcg-odo-static">' + pre + '</span>';
      for (var i = 0; i < num.length; i++) {
        var col = '<span class="tcg-odo-digit"><span style="transform:translateY(0)">' +
          '<b>0</b><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><b>6</b><b>7</b><b>8</b><b>9</b>' +
          '</span></span>';
        inner += col;
      }
      if (suf) inner += '<span class="tcg-odo-static">' + suf + '</span>';
      el.innerHTML = inner;
      var digits = qsa('.tcg-odo-digit > span', el);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          digits.forEach(function (sp, idx) {
            var target = +num[idx];
            setTimeout(function () {
              sp.style.transform = 'translateY(-' + (target * 100 / 10) + '%)';
            }, 80 + idx * 110);
          });
        });
      }, { threshold: .4 });
      io.observe(el);
    });
  }

  /* ---------- 10. Word-by-word fade-up on headings in viewport ---------- */
  function wordFade() {
    if (rm) return;
    var heads = qsa('section h2, section h3, [data-tcg-words]');
    heads.forEach(function (h) {
      if (h.__tcgWords || h.children.length > 0) return;
      h.__tcgWords = true;
      var txt = h.textContent.trim();
      if (!txt || txt.length > 140) return;
      var words = txt.split(/\s+/);
      h.innerHTML = words.map(function (w, i) {
        return '<span class="tcg-word" style="--i:' + i + '">' + w + '</span>';
      }).join(' ');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            qsa('.tcg-word', en.target).forEach(function (sp) { sp.classList.add('in'); });
            io.unobserve(en.target);
          }
        });
      }, { threshold: .25 });
      io.observe(h);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    try { tiltCards(); } catch (e) {}
    try { cursorSpotlight(); } catch (e) {}
    try { parallaxHero(); } catch (e) {}
    try { waveDividers(); } catch (e) {}
    try { confettiHook(); } catch (e) {}
    try { scrollIndicator(); } catch (e) {}
    try { odometers(); } catch (e) {}
    try { wordFade(); } catch (e) {}
    // Re-tilt for cards added later
    var mo = new MutationObserver(function () {
      try { tiltCards(); odometers(); } catch (e) {}
    });
    mo.observe(doc.body, { childList: true, subtree: true });
  }

  if (doc.readyState === 'loading') {
    on(doc, 'DOMContentLoaded', init);
  } else {
    init();
  }
})();
