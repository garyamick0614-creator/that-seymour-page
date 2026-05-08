/* TCG WOW v2 — visual polish helper. Vanilla, ~7KB.
   Honors prefers-reduced-motion. Pauses on hidden tab. No data fabrication. */
(function () {
  'use strict';
  if (window.__tcgWowV2) return; window.__tcgWowV2 = true;

  var doc = document, win = window;
  var rm = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = function (el, ev, fn, o) { el.addEventListener(ev, fn, o || false); };
  var raf = win.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  var qs = function (s, r) { return (r || doc).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* ---------- 10. Scroll progress bar (cyan -> purple -> amber) ---------- */
  function scrollBar() {
    var b = doc.createElement('div');
    b.id = 'tcg-wow-scrollbar';
    b.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(b);
    var ticking = false;
    function upd() {
      var h = doc.documentElement;
      var st = h.scrollTop || doc.body.scrollTop || 0;
      var sh = (h.scrollHeight - h.clientHeight) || 1;
      var p = Math.max(0, Math.min(1, st / sh));
      b.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    }
    on(win, 'scroll', function () { if (!ticking) { raf(upd); ticking = true; } }, { passive: true });
    on(win, 'resize', upd);
    upd();
  }

  /* ---------- 1. Animated number counters (data-count or auto-detect) ---------- */
  function countUp() {
    if (rm) return;
    var io = ('IntersectionObserver' in win) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 }) : null;
    function pickTargets() {
      var explicit = qsa('[data-count],[data-tcg-count]');
      var auto = qsa('.stat-num,.metric-num,.kpi-num,.bignum,.big,.stat-value,.tile-num,.count-up,.hero-stat .num,.stats .num,.stat .num,.cat-card-pred,.cat-stat');
      var all = explicit.concat(auto);
      var seen = [];
      all.forEach(function (el) {
        if (seen.indexOf(el) !== -1) return; seen.push(el);
        if (el.__tcgCount) return; el.__tcgCount = true;
        var raw = (el.getAttribute('data-count') || el.textContent || '').trim();
        var m = raw.match(/^([£$€]?)(-?[\d,\.]+)([%kKmMbB+]?)$/);
        if (!m) return;
        var prefix = m[1], num = parseFloat(m[2].replace(/,/g, '')), suffix = m[3] || '';
        if (!isFinite(num) || Math.abs(num) < 5) return; // not worth animating
        el.__tcgFinalText = el.textContent;
        el.__tcgPrefix = prefix; el.__tcgNum = num; el.__tcgSuffix = suffix;
        el.textContent = prefix + '0' + suffix;
        if (io) io.observe(el); else animate(el);
      });
    }
    function animate(el) {
      var dur = 1200, t0 = 0, hadDecimal = String(el.__tcgNum).indexOf('.') > -1;
      function fmt(v) {
        var s = hadDecimal ? v.toFixed(1) : Math.round(v).toLocaleString('en-US');
        return el.__tcgPrefix + s + el.__tcgSuffix;
      }
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        el.textContent = fmt(el.__tcgNum * eased);
        if (p < 1) raf(step); else el.textContent = el.__tcgFinalText || fmt(el.__tcgNum);
      }
      raf(step);
    }
    pickTargets();
    // re-scan once after late content
    setTimeout(pickTargets, 1500);
  }

  /* ---------- 2. Particle hero (canvas), parallax on mouse ---------- */
  function particles() {
    if (rm) return;
    var hero = qs('section.hero, .hero, header.hero, [data-hero]');
    if (!hero) return;
    var cs = win.getComputedStyle(hero);
    if (cs.position === 'static') hero.style.position = 'relative';
    var c = doc.createElement('canvas');
    c.className = 'tcg-wow-stars';
    c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, hero.firstChild);
    var ctx = c.getContext('2d'), dpr = Math.min(2, win.devicePixelRatio || 1);
    var w = 0, h = 0, dots = [], mx = 0, my = 0, running = true;
    function size() {
      var r = hero.getBoundingClientRect();
      w = c.width = Math.max(1, Math.floor(r.width * dpr));
      h = c.height = Math.max(1, Math.floor(r.height * dpr));
      c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
      var n = Math.min(80, Math.floor(r.width * r.height / 14000));
      dots = []; for (var i = 0; i < n; i++) dots.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12 * dpr, vy: (Math.random() - 0.5) * 0.12 * dpr,
        r: (0.6 + Math.random() * 1.4) * dpr, a: 0.25 + Math.random() * 0.5
      });
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx + mx * 0.3; d.y += d.vy + my * 0.3;
        if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10; if (d.y > h + 10) d.y = -10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(125,211,252,' + d.a + ')';
        ctx.fill();
      }
      raf(frame);
    }
    on(win, 'resize', size);
    on(hero, 'mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      my = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
    on(hero, 'mouseleave', function () { mx = 0; my = 0; });
    on(doc, 'visibilitychange', function () { running = !doc.hidden; if (running) raf(frame); });
    size(); raf(frame);
  }

  /* ---------- 3. Magnetic buttons ---------- */
  function magnetic() {
    if (rm || ('ontouchstart' in win)) return;
    var sel = '.btn-p,.btn-o,a.cta,button.cta,.tcg-magnet,[data-tcg-magnet]';
    qsa(sel).forEach(function (el) {
      if (el.__mag) return; el.__mag = true;
      on(el, 'mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        var max = 6;
        el.style.transform = 'translate3d(' + (dx * max).toFixed(2) + 'px,' + (dy * max).toFixed(2) + 'px,0)';
        el.style.boxShadow = '0 ' + (10 + dy * 6).toFixed(0) + 'px ' + (24 + Math.abs(dx + dy) * 12).toFixed(0) + 'px -12px rgba(125,211,252,.45)';
      });
      on(el, 'mouseleave', function () { el.style.transform = ''; el.style.boxShadow = ''; });
    });
  }

  /* ---------- 4. Card flip on hover (opt-in via data attr) ---------- */
  function cardFlip() {
    qsa('[data-tcg-flip]').forEach(function (el) {
      if (el.__flip) return; el.__flip = true;
      var back = el.getAttribute('data-tcg-flip');
      var front = el.innerHTML;
      el.classList.add('tcg-flip');
      el.innerHTML = '<div class="tcg-flip-i"><div class="tcg-flip-f">' + front + '</div><div class="tcg-flip-b">' + back + '</div></div>';
    });
  }

  /* ---------- 5. Live metric pulse on chips ---------- */
  function livePulse() {
    var els = qsa('.pill,.chip,.badge,[data-tcg-live]');
    els.forEach(function (el) {
      var t = (el.textContent || '').toLowerCase();
      if (/\blive\b|\bupdated\b|\bpulse\b|\bnow\b/.test(t) || el.hasAttribute('data-tcg-live')) {
        el.classList.add('tcg-pulse');
      }
    });
  }

  /* ---------- 6. Cinematic page-load reveal (hero + cards stagger) ---------- */
  function cinematicReveal() {
    if (rm) return;
    var hero = qs('section.hero, .hero, header.hero, [data-hero]');
    if (hero) hero.classList.add('tcg-rise');
    var cards = qsa('.card,.tile,.cell,.fcard,.ext-card,.tool-card');
    cards.slice(0, 30).forEach(function (el, i) {
      el.style.animationDelay = (i * 40) + 'ms';
      el.classList.add('tcg-stagger');
    });
  }

  /* ---------- 9. Footer fabric badge ---------- */
  function fabricBadge() {
    if (qs('#tcg-fabric-badge')) return;
    var b = doc.createElement('div');
    b.id = 'tcg-fabric-badge';
    b.setAttribute('aria-label', 'Powered by TCG fabric');
    b.innerHTML = '<span class="tcg-fb-dot"></span> Powered by TCG fabric · v5.x' +
      '<span class="tcg-fb-tip">Services: api.thatcomputerguy26.org · Ollama · Cloudflare</span>';
    doc.body.appendChild(b);
  }

  /* ---------- Boot ---------- */
  function boot() {
    try { scrollBar(); } catch (e) {}
    try { countUp(); } catch (e) {}
    try { particles(); } catch (e) {}
    try { magnetic(); } catch (e) {}
    try { cardFlip(); } catch (e) {}
    try { livePulse(); } catch (e) {}
    try { cinematicReveal(); } catch (e) {}
    try { fabricBadge(); } catch (e) {}
  }
  if (doc.readyState === 'loading') on(doc, 'DOMContentLoaded', boot); else boot();
})();
