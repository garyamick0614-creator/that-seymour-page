// Seymour Hub — shared client utilities.
// Loaded on every page; renders the topbar, footer, and freshness chips.

(function () {
  'use strict';

  const NAV = [
    { href: '/index.html',       label: 'Home' },
    { href: '/events.html',      label: 'Events' },
    { href: '/weather.html',     label: 'Weather' },
    { href: '/news.html',        label: 'News' },
    { href: '/schools.html',     label: 'Schools' },
    { href: '/businesses.html',  label: 'Businesses' },
    { href: '/qa.html',          label: 'Q&A' },
    { href: '/blog.html',        label: 'Blog' },
    { href: '/tip.html',         label: 'Submit Tip' },
    { href: '/hub.html',         label: 'Seymour Hub' }
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
  <span class="muted">Local &middot; auto-refreshed every 2h &middot; non-commercial</span>
  <span class="muted" id="lastUpdate"></span>
</div>
<header class="topbar">
  <a class="brand" href="/">
    <span class="brand-mark">TSP</span>
    <div class="brand-text">
      <span class="brand-title">That Seymour Page</span>
      <span class="brand-sub">Hosted by That Computer Guy 26</span>
    </div>
  </a>
  <nav class="topbar-nav">${links}</nav>
</header>`;
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
          <li><a href="mailto:gary@thatcomputerguy26.org">gary@thatcomputerguy26.org</a></li>
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

  function init() {
    const headerHost = document.getElementById('site-header');
    const footerHost = document.getElementById('site-footer');
    if (headerHost) headerHost.innerHTML = buildHeader();
    if (footerHost) footerHost.innerHTML = buildFooter();

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
  window.SH = { loadJSON, timeAgo, escapeHTML };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
