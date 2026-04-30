// Seymour Hub — shared client utilities.
// Loaded on every page; renders the topbar, footer, and freshness chips.

(function () {
  'use strict';

  const NAV = [
    { href: '/index.html',       label: 'Home' },
    { href: '/events.html',      label: 'Events' },
    { href: '/weather.html',     label: 'Weather' },
    { href: '/traffic.html',     label: 'Traffic' },
    { href: '/news.html',        label: 'News' },
    { href: '/schools.html',     label: 'Schools' },
    { href: '/businesses.html',  label: 'Places' },
    { href: '/reviews.html',     label: 'Reviews' },
    { href: '/map.html',         label: 'Map' },
    { href: '/qa.html',          label: 'Q&A' },
    { href: '/blog.html',        label: 'Porch' },
    { href: '/tip.html',         label: 'Tip' },
    { href: '/about.html',       label: 'About' },
    { href: '/hub.html',         label: 'Hub' }
  ];

  const FAMILY = [
    { url: 'https://thatcomputerguy26.org',          label: 'TCG Solutions' },
    { url: 'https://ibetcg.netlify.app',             label: 'Indiana Businesses Exposed' },
    { url: 'https://tcgpredictions.netlify.app',     label: 'TCG Predictions' },
    { url: 'https://ibetcg.netlify.app/civic-hub.html', label: 'Civic Hub' },
    { url: 'https://southern-indiana-justice.netlify.app', label: 'Southern Indiana Justice' }
  ];

  function buildHeader() {
    const path = location.pathname.replace(/\/$/, '/index.html').toLowerCase();
    const links = NAV.map(n => {
      const active = n.href.toLowerCase() === path ? ' class="active"' : '';
      return `<a href="${n.href}"${active}>${n.label}</a>`;
    }).join('');

    return `
<div class="status-bar">
  <span id="liveChip" class="chip chip-info"><span class="dot"></span> That Seymour Page &middot; live</span>
  <span class="muted">Local &middot; checks in every couple of hours &middot; not for sale</span>
  <span class="muted" id="lastUpdate"></span>
</div>
<header class="topbar">
  <a class="brand" href="/">
    <span class="brand-mark">TSP</span>
    <div class="brand-text">
      <span class="brand-title">That Seymour Page</span>
      <span class="brand-sub">Hosted by <a href="https://thatcomputerguy26.org" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">That Computer Guy 26</a></span>
    </div>
  </a>
  <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" id="navToggle">&#9776;</button>
  <nav class="topbar-nav" id="topNav">${links}</nav>
</header>`;
  }

  // ===== Top ticker — most popular destinations, page-specific =====
  // Plain-language picks. Each item is what a typical visitor would want next.
  const TICKER_BY_PATH = {
    '/index.html':       ['Today\'s weather →/weather.html', 'What\'s coming up →/events.html', 'Storm cleanup → /events.html', 'Top 20 places → /businesses.html', 'Drop a tip → /tip.html'],
    '/events.html':      ['City Council May 11 → /events.html', 'BurgerFest Sep 19 → /events.html', 'Submit your event → /tip.html', 'Schools calendar → /schools.html'],
    '/weather.html':     ['Storm alerts (live) → /weather.html', 'Traffic cams → /traffic.html', 'Storm cleanup events → /events.html'],
    '/traffic.html':     ['Jackson County cams → /traffic.html', 'I-65 cams → /traffic.html', 'Weather → /weather.html', 'Map of town → /map.html'],
    '/news.html':        ['Indiana headlines → /news.html', 'Storm coverage → /weather.html', 'Local events → /events.html', 'IBE reviews → /reviews.html'],
    '/schools.html':     ['Budget re-vote May 1 → /schools.html', 'Volleyball tryouts May 29 → /schools.html', 'Live alerts → https://www.scsc.k12.in.us/alerts', 'SHS calendar → https://shs.seymourschools.org/shs-calendar'],
    '/businesses.html':  ['Map view → /map.html', 'IBE reviews → /reviews.html', 'Top-rated places → /businesses.html', 'Manufacturers → /businesses.html'],
    '/reviews.html':     ['IBE articles → /reviews.html', 'Gary\'s picks → /reviews.html', 'Map view → /map.html', 'Submit a tip → /tip.html'],
    '/map.html':         ['Top 20 places → /businesses.html', 'IBE reviews → /reviews.html', 'Traffic cams → /traffic.html', 'Submit a place → /tip.html'],
    '/qa.html':          ['Submit a question → /tip.html', 'Events list → /events.html', 'Schools info → /schools.html'],
    '/blog.html':        ['Recent posts → /blog.html', 'Submit a tip → /tip.html', 'Today\'s events → /events.html'],
    '/tip.html':         ['Call 812-414-9097 → tel:8124149097', 'Email Gary → mailto:gary.amick0614@gmail.com', 'Add an event → /tip.html'],
    '/about.html':       ['TCG main site → https://thatcomputerguy26.org', 'Indiana Businesses Exposed → https://ibetcg.netlify.app', 'Call Gary → tel:8124149097'],
    '/hub.html':         ['Everything in one place → /hub.html', 'TCG Solutions → https://thatcomputerguy26.org', 'IBE → https://ibetcg.netlify.app']
  };

  function buildTicker() {
    const path = location.pathname.replace(/\/$/, '/index.html').toLowerCase();
    const items = TICKER_BY_PATH[path] || TICKER_BY_PATH['/index.html'];
    const links = items.map(s => {
      const idx = s.lastIndexOf('→');
      const label = s.slice(0, idx).trim();
      const href = s.slice(idx + 1).trim();
      return `<a href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label} <span class="t-arrow">&rarr;</span></a>`;
    }).join('<span class="t-sep">&middot;</span>');
    return `<div class="ticker" aria-label="Popular links"><div class="ticker-track">${links}${'<span class="t-sep">&middot;</span>' + links}</div></div>`;
  }

  function buildDisclaimer() {
    return `
<aside class="gary-disclaimer" style="max-width:880px;margin:24px auto 8px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="font-size:22px">&#x1F44B;</span><strong class="tag">From Gary at TCG</strong></div>
  <p style="margin:6px 0">Hey Seymour folks &mdash; if our polished articles rub you the wrong way, it's because we use local AI tools + multi-LLM research to dig deep and fact-check fast. I'm <strong>Gary from That Computer Guy 26 / TCG Solutions</strong> in Seymour: hardware repairs, AI automations, custom websites/software, pentesting, business IT, and exposing shady Indiana businesses via <a href="https://ibetcg.netlify.app" target="_blank" rel="noopener" style="color:#22d3ee;text-decoration:none">Indiana Businesses Exposed</a>. No slop here &mdash; just human-guided insights to save you time on real problems like virus removal, data recovery, network setups, or contractor scams.</p>
  <p style="margin:6px 0">Not your style? Skip it, no hard feelings. We respect the &ldquo;real job&rdquo; grind (CompTIA A+/Network+/Security+, CCNA, serving Jackson/Bartholomew counties) and keep it real with local stories too. Questions? Call/text <a href="tel:8124149097" style="color:#fbbf24;text-decoration:none;font-weight:600">812-414-9097</a> or hit me up &mdash; happy to explain my setup.</p>
</aside>`;
  }

  function buildFooter() {
    const fam = FAMILY.map(f => `<li><a href="${f.url}" target="_blank" rel="noopener">${f.label}</a></li>`).join('');
    return `
<footer class="site-foot">
  <div class="container">
    <div class="foot-grid">
      <div>
        <h4>That Seymour Page</h4>
        <ul>
          <li><a href="/index.html">Home</a></li>
          <li><a href="/events.html">Events</a></li>
          <li><a href="/weather.html">Weather</a></li>
          <li><a href="/news.html">News</a></li>
          <li><a href="/schools.html">Schools</a></li>
          <li><a href="/businesses.html">Businesses</a></li>
        </ul>
      </div>
      <div>
        <h4>Community</h4>
        <ul>
          <li><a href="/blog.html">Blog</a></li>
          <li><a href="/qa.html">Q&amp;A</a></li>
          <li><a href="/tip.html">Submit a tip</a></li>
          <li><a href="/hub.html">Hub card</a></li>
        </ul>
      </div>
      <div>
        <h4>TCG Family</h4>
        <ul>${fam}</ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="tel:8124149097">812-414-9097</a></li>
          <li><a href="mailto:gary.amick0614@gmail.com">gary.amick0614@gmail.com</a></li>
          <li class="muted small" style="color:var(--muted);font-size:12px;margin-top:6px">
            Gary Amick &mdash; Seymour, IN
          </li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      &copy; ${new Date().getFullYear()} That Seymour Page &middot; Hosted by That Computer Guy 26 / TCG Solutions &middot;
      Independent &middot; Source-cited &middot; Non-commercial
    </div>
  </div>
</footer>`;
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'just now';
    const m = Math.floor(ms / 60_000);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }

  async function loadJSON(path) {
    try {
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Modal — used by interactive placecards to show full details.
  function ensureModal() {
    let host = document.getElementById('shModal');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'shModal';
    host.className = 'modal-backdrop';
    host.innerHTML = '<div class="modal" role="dialog" aria-modal="true">'
      + '<button class="modal-close" aria-label="Close">&times;</button>'
      + '<div class="modal-inner"></div>'
      + '</div>';
    document.body.appendChild(host);
    host.addEventListener('click', e => { if (e.target === host) closeModal(); });
    host.querySelector('.modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && host.classList.contains('open')) closeModal();
    });
    return host;
  }
  function openModal(html) {
    const host = ensureModal();
    host.querySelector('.modal-inner').innerHTML = html;
    host.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    const host = document.getElementById('shModal');
    if (!host) return;
    host.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bindMobileNav() {
    const t = document.getElementById('navToggle');
    const n = document.getElementById('topNav');
    if (!t || !n) return;
    t.addEventListener('click', () => {
      const open = n.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu on link click (mobile UX)
    n.addEventListener('click', e => {
      if (e.target.tagName === 'A' && n.classList.contains('open')) {
        n.classList.remove('open');
        t.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function init() {
    const headerHost = document.getElementById('site-header');
    const footerHost = document.getElementById('site-footer');
    if (headerHost) headerHost.innerHTML = buildHeader() + buildTicker();
    if (footerHost) footerHost.innerHTML = buildDisclaimer() + buildFooter();
    bindMobileNav();

    // Stamp last update from any data file the page registered.
    const stamp = document.querySelector('[data-update-from]');
    if (stamp) {
      const src = stamp.getAttribute('data-update-from');
      loadJSON(src).then(d => {
        const el = document.getElementById('lastUpdate');
        if (el && d && d.updatedAt) el.textContent = 'Updated ' + timeAgo(d.updatedAt);
      });
    }
  }

  // Expose helpers for page scripts.
  window.SH = { loadJSON, timeAgo, escapeHTML, openModal, closeModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
