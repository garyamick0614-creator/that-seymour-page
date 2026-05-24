/* H:\TCG Group\TCGProject\design-system\HelpModule.js
   TCG Design System — Glossary / Help modal.

   Triggered by `?` key (when not in an input). Searchable modal pulling
   /api/public/help/glossary. Live search with debounce, category-chip
   filters, "did you mean" suggestion when no match. Idempotent attach to
   window.tcg.help — open(), close(), searchFor(term).

   Contract:
   - No bundler, no modules, classic <script> load.
   - Depends on tokens.css + components.css + components.js (tcg.modal not used —
     we build our own larger modal because the glossary needs a tall body).
   - Optional config:
       tcg.help.configure({
         apiBase: "https://api.tcg.solutions",  // default: ""
         path:    "/api/public/help/glossary",  // default
         seedDoc: { ... }                        // skip fetch; preload local JSON
       });

   v0.1.0 — 2026-05-11 — Phase 4 of OneSource unification plan.
*/
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.tcg && window.tcg.help && window.tcg.help.__hmVersion) return;

  var tcg = window.tcg || (window.tcg = {});
  var help = tcg.help = tcg.help || {};
  help.__hmVersion = "0.1.0";

  var cfg = {
    apiBase: "",
    path: "/api/public/help/glossary",
    seedDoc: null
  };
  var state = {
    doc: null,          // { glossary, categories }
    loading: false,
    loadedAt: 0,
    overlay: null,
    inputEl: null,
    listEl: null,
    activeCategory: null,
    activeQuery: "",
    debounceTimer: 0
  };

  // ───────── public API ─────────
  help.configure = function (opts) {
    opts = opts || {};
    if (typeof opts.apiBase === "string") cfg.apiBase = opts.apiBase.replace(/\/+$/, "");
    if (typeof opts.path === "string")    cfg.path    = opts.path;
    if (opts.seedDoc && opts.seedDoc.glossary) {
      state.doc = normalizeDoc(opts.seedDoc);
      state.loadedAt = Date.now();
    }
  };
  help.open = function (initialQuery) {
    if (state.overlay) {
      if (initialQuery) help.searchFor(initialQuery);
      return;
    }
    ensureDoc().then(function () { render(initialQuery || ""); });
  };
  help.close = function () {
    if (!state.overlay) return;
    var ov = state.overlay;
    state.overlay = null;
    state.inputEl = null;
    state.listEl  = null;
    state.activeCategory = null;
    state.activeQuery    = "";
    document.removeEventListener("keydown", onEscKey, true);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  };
  help.searchFor = function (term) {
    if (!state.overlay) { help.open(term); return; }
    state.inputEl.value = term || "";
    state.activeQuery = term || "";
    paintResults();
  };
  help.isOpen = function () { return !!state.overlay; };
  help.refresh = function () {
    state.doc = null;
    state.loadedAt = 0;
    return ensureDoc();
  };

  // ───────── data ─────────
  function normalizeDoc(doc) {
    var d = doc || {};
    d.glossary  = Array.isArray(d.glossary) ? d.glossary : [];
    d.categories = Array.isArray(d.categories) ? d.categories : uniqueCategories(d.glossary);
    return d;
  }
  function uniqueCategories(arr) {
    var s = {};
    (arr || []).forEach(function (e) { if (e.category) s[e.category] = 1; });
    return Object.keys(s).sort();
  }
  function ensureDoc() {
    if (state.doc) return Promise.resolve(state.doc);
    if (state.loading) {
      return new Promise(function (resolve) {
        var t = setInterval(function () {
          if (!state.loading) { clearInterval(t); resolve(state.doc); }
        }, 50);
      });
    }
    state.loading = true;
    var url = (cfg.apiBase || "") + cfg.path;
    return fetch(url, { credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (body) {
        state.doc = normalizeDoc(body);
        state.loadedAt = Date.now();
        state.loading = false;
        return state.doc;
      })
      .catch(function (err) {
        state.loading = false;
        // Last-ditch: empty doc so render() still shows the modal with an error
        state.doc = normalizeDoc({ glossary: [], categories: [], __error: String(err) });
        return state.doc;
      });
  }

  // ───────── render ─────────
  function $(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c == null) continue;
      el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render(initialQuery) {
    var overlay = $("div", {
      class: "tcg-modal__overlay tcg-help__overlay",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Glossary"
    });
    var dialog = $("div", { class: "tcg-modal tcg-help__dialog", style: "max-width:760px;width:92vw;max-height:84vh;display:flex;flex-direction:column;" });

    var head = $("div", { class: "tcg-modal__head" }, [
      $("h2", { class: "tcg-modal__title", text: "Glossary" }),
      $("button", { class: "tcg-modal__close", "aria-label": "close", text: "×", onClick: help.close })
    ]);

    var searchWrap = $("div", { class: "tcg-search", style: "margin:0 18px 10px;" }, [
      $("span", { class: "tcg-search__icon", text: "⌕" })
    ]);
    var input = $("input", {
      class: "tcg-search__input",
      type: "search",
      placeholder: "Search glossary…  (Esc to close)",
      autocomplete: "off"
    });
    searchWrap.appendChild(input);
    state.inputEl = input;
    state.activeQuery = initialQuery || "";
    if (initialQuery) input.value = initialQuery;

    // Category chip row
    var chipBar = $("div", { class: "tcg-help__chips", style: "display:flex;flex-wrap:wrap;gap:6px;padding:0 18px 10px;" });
    var allChip = makeChip("All", null);
    allChip.setAttribute("data-active", "true");
    chipBar.appendChild(allChip);
    (state.doc.categories || []).forEach(function (cat) {
      chipBar.appendChild(makeChip(cat, cat));
    });

    var list = $("div", {
      class: "tcg-help__list",
      style: "flex:1;overflow-y:auto;padding:0 18px 18px;display:flex;flex-direction:column;gap:8px;"
    });
    state.listEl = list;

    dialog.appendChild(head);
    dialog.appendChild(searchWrap);
    dialog.appendChild(chipBar);
    dialog.appendChild(list);
    overlay.appendChild(dialog);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) help.close();
    });
    input.addEventListener("input", function () {
      state.activeQuery = input.value;
      if (state.debounceTimer) clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(paintResults, 100);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); help.close(); }
    });
    document.addEventListener("keydown", onEscKey, true);

    (document.body || document.documentElement).appendChild(overlay);
    state.overlay = overlay;
    setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 30);
    paintResults();
  }
  function onEscKey(e) {
    if (e.key === "Escape" && state.overlay) {
      e.preventDefault();
      help.close();
    }
  }

  function makeChip(label, cat) {
    var c = $("button", {
      class: "tcg-help__chip tcg-btn tcg-btn--ghost tcg-btn--sm",
      type: "button",
      "data-cat": cat == null ? "" : cat,
      text: label
    });
    c.addEventListener("click", function () {
      // mark active
      var parent = c.parentNode;
      if (parent) Array.prototype.forEach.call(parent.children, function (n) { n.removeAttribute("data-active"); });
      c.setAttribute("data-active", "true");
      state.activeCategory = cat;
      paintResults();
    });
    return c;
  }

  function matches(entry, q) {
    if (!q) return true;
    q = q.toLowerCase();
    if (entry.term && entry.term.toLowerCase().indexOf(q) >= 0) return true;
    if (entry.definition && entry.definition.toLowerCase().indexOf(q) >= 0) return true;
    if (entry.synonyms) {
      for (var i = 0; i < entry.synonyms.length; i++) {
        if (entry.synonyms[i].toLowerCase().indexOf(q) >= 0) return true;
      }
    }
    return false;
  }

  function scoreEntry(entry, q) {
    if (!q) return 0;
    q = q.toLowerCase();
    var t = entry.term.toLowerCase();
    if (t === q) return 1000;
    if (t.indexOf(q) === 0) return 500;
    if (t.indexOf(q) > 0) return 200;
    if (entry.synonyms) {
      for (var i = 0; i < entry.synonyms.length; i++) {
        var s = entry.synonyms[i].toLowerCase();
        if (s === q) return 800;
        if (s.indexOf(q) === 0) return 300;
        if (s.indexOf(q) > 0) return 100;
      }
    }
    return 1; // matched somewhere in definition
  }

  function didYouMean(q) {
    if (!q || !state.doc) return [];
    q = q.toLowerCase();
    var out = [];
    state.doc.glossary.forEach(function (e) {
      var t = e.term.toLowerCase();
      // simple prefix / substring suggest
      if (t.length >= 2 && q.length >= 2) {
        if (t.indexOf(q.slice(0, Math.min(3, q.length))) >= 0) out.push(e.term);
        else if (q.indexOf(t.slice(0, 3)) >= 0) out.push(e.term);
      }
    });
    return Array.prototype.slice.call(new Set(out)).slice(0, 5);
  }

  function paintResults() {
    if (!state.listEl) return;
    var list = state.listEl;
    list.innerHTML = "";
    var doc = state.doc || { glossary: [] };
    if (doc.__error) {
      list.appendChild($("div", { class: "tcg-empty-state", html:
        '<div class="tcg-empty-state__title">Glossary unavailable</div>' +
        '<div class="tcg-empty-state__desc">' + esc(doc.__error) + '</div>'
      }));
      return;
    }

    var q = (state.activeQuery || "").trim();
    var cat = state.activeCategory;

    var filtered = doc.glossary
      .filter(function (e) { return !cat || e.category === cat; })
      .filter(function (e) { return matches(e, q); })
      .map(function (e) { return { e: e, score: scoreEntry(e, q) }; })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.e.term.localeCompare(b.e.term);
      });

    if (!filtered.length) {
      var dym = didYouMean(q);
      var html =
        '<div class="tcg-empty-state__title">No glossary entries match</div>' +
        '<div class="tcg-empty-state__desc">No term matches “' + esc(q || "") + '”' + (cat ? ' in category “' + esc(cat) + '”' : '') + '.</div>';
      if (dym.length) {
        html += '<div class="tcg-empty-state__desc" style="margin-top:10px;">Did you mean: ' +
          dym.map(function (t) { return '<a href="#" data-dym="' + esc(t) + '" style="color:var(--accent);text-decoration:underline;">' + esc(t) + '</a>'; }).join(", ") + '?</div>';
      }
      var empty = $("div", { class: "tcg-empty-state", html: html });
      empty.querySelectorAll('a[data-dym]').forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          help.searchFor(a.getAttribute("data-dym"));
        });
      });
      list.appendChild(empty);
      return;
    }

    // Cap render at 200 results to keep DOM small
    filtered.slice(0, 200).forEach(function (row) {
      list.appendChild(renderEntry(row.e, q));
    });

    // Footer count
    list.appendChild($("div", {
      class: "tcg-help__count",
      style: "color:var(--tx-muted);font-size:var(--size-xs);padding:6px 2px;text-align:right;",
      text: filtered.length + " term" + (filtered.length === 1 ? "" : "s") + (doc.version ? " · v" + doc.version : "")
    }));
  }

  function renderEntry(e, q) {
    var card = $("div", {
      class: "tcg-card tcg-help__entry",
      style: "padding:10px 12px;"
    });
    var headRow = $("div", { style: "display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px;" }, [
      $("strong", { style: "color:var(--tx-primary);font-size:var(--size-md);", html: highlight(e.term, q) }),
      $("span", {
        class: "tcg-status-pill",
        "data-state": "idle",
        style: "font-size:var(--size-xs);",
        text: e.category || "—"
      })
    ]);
    card.appendChild(headRow);
    card.appendChild($("div", { style: "color:var(--tx-secondary);font-size:var(--size-base);line-height:var(--line-normal);", html: highlight(e.definition || "", q) }));
    if (e.synonyms && e.synonyms.length) {
      card.appendChild($("div", {
        style: "color:var(--tx-muted);font-size:var(--size-xs);margin-top:4px;",
        html: "also: " + e.synonyms.map(function (s) { return '<span class="tcg-kbd">' + esc(s) + '</span>'; }).join(" ")
      }));
    }
    if (e.links && e.links.length) {
      var linksRow = $("div", { style: "margin-top:6px;font-size:var(--size-xs);" });
      e.links.forEach(function (l, i) {
        if (i) linksRow.appendChild(document.createTextNode(" · "));
        var a = $("a", { href: l, target: "_blank", rel: "noopener", style: "color:var(--accent);", text: l });
        linksRow.appendChild(a);
      });
      card.appendChild(linksRow);
    }
    return card;
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    var safe = esc(text);
    try {
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      return safe.replace(re, '<mark style="background:var(--accent-soft);color:var(--tx-primary);padding:0 2px;border-radius:2px;">$1</mark>');
    } catch (e) { return safe; }
  }

  // ───────── auto-prime: load doc lazily once tcg-ds-ready fires ─────────
  document.addEventListener("tcg-ds-ready", function () {
    // Best-effort preload; failures stay silent until user presses `?`
    setTimeout(function () { ensureDoc(); }, 200);
  });
})();
