/* H:\TCG Group\TCGProject\design-system\CommandPalette.js
   TCG Design System — portable Ctrl+K command palette.

   Ported from OneSource/renderer/shell/CommandPalette.ts. Removed:
   - Electron `window.tcg.readJsonFile` seed loader (web surfaces fetch instead)
   - import { apiBase, roleAtLeast } — apiBase becomes opt-in via init({ apiBase })
   - hard TypeScript types

   Depends on:
     - components.css (.tcg-cmd-* classes)
     - components.js  (tcg.commandPalette registry, tcg.kbd, tcg._esc)

   Usage:
     <script src="/static/design-system/components.js"></script>
     <script src="/static/design-system/CommandPalette.js"></script>
     <script>
       tcg.commandPalette.init({
         apiBase: "https://api.tcg.solutions",
         currentRole: "admin",
         onPick: function (target) { console.log("picked", target); },
         seedUrl: "/api/admin/onesource/command-search?seed=1"
       });
       tcg.kbd.bind("ctrl+k", function () { tcg.commandPalette.open(); },
                   { description: "Open command palette", scope: "global" });
     </script>
*/

(function () {
  "use strict";
  if (typeof window === "undefined" || !window.tcg) return;
  if (window.tcg.commandPalette && window.tcg.commandPalette._impl) return; // idempotent

  var tcg = window.tcg;
  var registry = tcg.commandPalette;

  var ROLE_RANK = { guest: 0, family: 10, cam: 20, ops: 30, agent: 40, admin: 100 };
  function roleAtLeast(have, need) {
    if (!need) return true;
    return (ROLE_RANK[have] || 0) >= (ROLE_RANK[need] || 0);
  }

  var state = {
    apiBase: "",
    currentRole: "admin",
    onPick: null,
    seedUrl: null,
    seed: [],
    seedLoaded: false,
    overlay: null,
    inputEl: null,
    resultsEl: null,
    results: [],
    selectedIdx: 0,
    liveAbort: null,
    debounceTimer: null,
    bearerLookup: null
  };

  registry.init = function (opts) {
    opts = opts || {};
    if (opts.apiBase != null) state.apiBase = opts.apiBase;
    if (opts.currentRole)     state.currentRole = opts.currentRole;
    if (typeof opts.onPick === "function") state.onPick = opts.onPick;
    if (opts.seedUrl != null) state.seedUrl = opts.seedUrl;
    if (typeof opts.bearerLookup === "function") state.bearerLookup = opts.bearerLookup;
    if (Array.isArray(opts.seedTargets)) {
      state.seed = opts.seedTargets.filter(Boolean);
      state.seedLoaded = true;
    }
    if (!state.seedLoaded && state.seedUrl) void loadSeed();
  };

  registry.setRole = function (role) { state.currentRole = role; };

  registry._impl = {
    open:  openPalette,
    close: closePalette
  };
  registry.open  = openPalette;
  registry.close = closePalette;

  function authHeaders() {
    var token = "";
    try {
      if (state.bearerLookup) token = state.bearerLookup() || "";
      else token = sessionStorage.getItem("tcg-bearer") || "";
    } catch (e) { token = ""; }
    return token ? { authorization: "Bearer " + token } : {};
  }

  function loadSeed() {
    if (!state.seedUrl) { state.seedLoaded = true; return Promise.resolve(); }
    var url = state.seedUrl;
    if (state.apiBase && url.indexOf("http") !== 0 && url.indexOf("/") === 0) url = state.apiBase + url;
    return fetch(url, { headers: authHeaders() })
      .then(function (res) { return res.ok ? res.json() : { targets: [] }; })
      .then(function (doc) { state.seed = (doc && doc.targets ? doc.targets : []).filter(Boolean); state.seedLoaded = true; })
      .catch(function () { state.seed = []; state.seedLoaded = true; });
  }

  function openPalette() {
    if (state.overlay) {
      if (state.inputEl) { state.inputEl.focus(); state.inputEl.select(); }
      return;
    }
    var run = function () {
      var overlay = document.createElement("div");
      overlay.className = "tcg-cmd-overlay";
      overlay.innerHTML =
        '<div class="tcg-cmd-palette" role="dialog" aria-label="command palette">' +
          '<input type="search" class="tcg-cmd-input" placeholder="Type a command, module, service, or site…" autocomplete="off" />' +
          '<div class="tcg-cmd-results" role="listbox"></div>' +
        '</div>';
      overlay.addEventListener("click", function (e) { if (e.target === overlay) closePalette(); });
      (document.body || document.documentElement).appendChild(overlay);

      state.overlay = overlay;
      state.inputEl = overlay.querySelector(".tcg-cmd-input");
      state.resultsEl = overlay.querySelector(".tcg-cmd-results");

      state.inputEl.addEventListener("input", debounceSearch);
      state.inputEl.addEventListener("keydown", handleKeydown);
      state.inputEl.focus();
      doSearch("");
    };
    if (!state.seedLoaded && state.seedUrl) loadSeed().then(run);
    else run();
  }

  function closePalette() {
    if (!state.overlay) return;
    state.overlay.parentNode && state.overlay.parentNode.removeChild(state.overlay);
    state.overlay = null;
    state.inputEl = null;
    state.resultsEl = null;
    state.results = [];
    state.selectedIdx = 0;
    if (state.liveAbort) { try { state.liveAbort.abort(); } catch (e) {} state.liveAbort = null; }
  }

  function debounceSearch() {
    if (state.debounceTimer != null) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(function () { doSearch(state.inputEl ? state.inputEl.value : ""); }, 90);
  }

  function doSearch(q) {
    var trimmed = (q || "").trim().toLowerCase();
    var corpus = state.seed.concat(registry.allTargets()).filter(function (t) {
      return roleAtLeast(state.currentRole, t.roleMin);
    });
    var local = trimmed === "" ? corpus.slice(0, 30) : fuzzy(corpus, trimmed).slice(0, 30);
    state.results = local;
    state.selectedIdx = 0;
    render();

    // live tail — only if apiBase + seedUrl pattern available
    if (trimmed.length >= 2 && state.seedUrl) {
      if (state.liveAbort) { try { state.liveAbort.abort(); } catch (e) {} }
      try { state.liveAbort = new AbortController(); } catch (e) { state.liveAbort = null; }
      var url = state.seedUrl.split("?")[0] + "?q=" + encodeURIComponent(trimmed) + "&limit=20";
      if (state.apiBase && url.indexOf("http") !== 0 && url.indexOf("/") === 0) url = state.apiBase + url;
      var fetchOpts = { headers: authHeaders() };
      if (state.liveAbort) fetchOpts.signal = state.liveAbort.signal;
      fetch(url, fetchOpts)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (body) {
          if (!body || !body.targets) return;
          var seen = {};
          state.results.forEach(function (r) { seen[r.id] = true; });
          var merged = state.results.concat(body.targets.filter(function (t) {
            return !seen[t.id] && roleAtLeast(state.currentRole, t.roleMin);
          }));
          state.results = merged.slice(0, 50);
          render();
        })
        .catch(function () { /* aborted or unavailable */ });
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") { e.preventDefault(); closePalette(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); move(-1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      var pick = state.results[state.selectedIdx];
      if (pick) {
        if (state.onPick) try { state.onPick(pick); } catch (err) { /* ignore */ }
        if (typeof pick.run === "function") try { pick.run(); } catch (err) { /* ignore */ }
        closePalette();
      }
    }
  }

  function move(delta) {
    if (state.results.length === 0) return;
    state.selectedIdx = (state.selectedIdx + delta + state.results.length) % state.results.length;
    render();
  }

  function render() {
    if (!state.resultsEl) return;
    if (state.results.length === 0) {
      state.resultsEl.innerHTML = '<div class="tcg-cmd-empty">no matches</div>';
      return;
    }
    var esc = tcg._esc;
    state.resultsEl.innerHTML = state.results.map(function (r, idx) {
      return '<div class="tcg-cmd-result" role="option" data-idx="' + idx + '"' +
             (idx === state.selectedIdx ? ' data-selected="true"' : '') + '>' +
               '<span class="tcg-cmd-kind">' + esc(r.kind || "") + '</span>' +
               '<span class="tcg-cmd-label">' + esc(r.label || "") + '</span>' +
               (r.hint ? '<span class="tcg-cmd-hint">' + esc(r.hint) + '</span>' : '') +
             '</div>';
    }).join("");
    var nodes = state.resultsEl.querySelectorAll(".tcg-cmd-result");
    Array.prototype.forEach.call(nodes, function (el) {
      el.addEventListener("click", function () {
        var idx = parseInt(el.getAttribute("data-idx") || "-1", 10);
        var pick = state.results[idx];
        if (pick) {
          if (state.onPick) try { state.onPick(pick); } catch (err) {}
          if (typeof pick.run === "function") try { pick.run(); } catch (err) {}
          closePalette();
        }
      });
      el.addEventListener("mouseenter", function () {
        var idx = parseInt(el.getAttribute("data-idx") || "-1", 10);
        if (idx >= 0) { state.selectedIdx = idx; render(); }
      });
    });
  }

  function fuzzy(corpus, q) {
    var scored = [];
    for (var i = 0; i < corpus.length; i++) {
      var t = corpus[i];
      var hay = ((t.label || "") + " " + ((t.keywords || []).join(" ")) + " " + (t.target || "")).toLowerCase();
      var score = 0;
      if (hay.indexOf(q) === 0) score += 20;
      if (hay.indexOf(" " + q) !== -1) score += 8;
      if (hay.indexOf(q) !== -1) score += 4;
      // sub-sequence
      var j = 0;
      for (var k = 0; k < hay.length; k++) {
        if (hay.charAt(k) === q.charAt(j)) j++;
        if (j === q.length) break;
      }
      if (j === q.length) score += 1;
      if (score > 0) scored.push({ t: t, s: score });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.map(function (x) { return x.t; });
  }
})();
