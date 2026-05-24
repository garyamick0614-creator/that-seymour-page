/* H:\TCG Group\TCGProject\design-system\components.js
   TCG Design System — framework-free vanilla JS helpers.

   Contract decisions:
   - No bundler. No modules. No IIFE wrap.
   - Single global namespace: window.tcg
   - Sub-namespaces: tcg.toast, tcg.modal, tcg.copy, tcg.kbd, tcg.statusPill, tcg.commandPalette
   - Idempotent: re-evaluating this file does not double-bind.
   - Every public function is safe to call before DOM ready
     (queues until tcg-app element appears or document.body exists).

   Usage:
     <script src="/static/design-system/components.js"></script>
     <script>
       tcg.toast.success("Service started");
       tcg.modal.open({ title: "Confirm", body: "Restart Caddy?", actions: [...] });
       tcg.copy.attach(myEl);   // adds copy button to right of element
     </script>

   v0.1.0 — 2026-05-11 — Phase 0 of OneSource unification plan.
*/

(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.tcg && window.tcg.__dsVersion) return; // idempotent

  var tcg = window.tcg || (window.tcg = {});
  tcg.__dsVersion = "0.1.0";

  /* ═════════════ utilities (private) ══════════════════ */
  function $make(tag, attrs, children) {
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
  function $esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }
  tcg._make = $make;
  tcg._esc  = $esc;

  /* ═════════════ tcg.toast ════════════════════════════ */
  var toast = tcg.toast = tcg.toast || {};
  var toastStack = null;
  var toastRecent = [];      // for 2s dedupe
  var TOAST_DEFAULT_TTL = 4000;
  var TOAST_DEDUPE_WINDOW = 2000;

  function ensureToastStack() {
    if (toastStack && document.body.contains(toastStack)) return toastStack;
    toastStack = document.querySelector(".tcg-toast-stack");
    if (!toastStack) {
      toastStack = $make("div", { class: "tcg-toast-stack", role: "region", "aria-label": "notifications", "aria-live": "polite" });
      (document.body || document.documentElement).appendChild(toastStack);
    }
    return toastStack;
  }

  toast.show = function (opts) {
    opts = opts || {};
    var kind = opts.kind || "info";   // ok | warn | err | info
    var msg  = opts.message || opts.body || "";
    var title = opts.title || "";
    var ttl  = opts.ttl == null ? TOAST_DEFAULT_TTL : opts.ttl;
    var key  = kind + "|" + title + "|" + msg;

    // dedupe within 2s
    var now = Date.now();
    toastRecent = toastRecent.filter(function (r) { return now - r.t < TOAST_DEDUPE_WINDOW; });
    if (toastRecent.some(function (r) { return r.k === key; })) return null;
    toastRecent.push({ k: key, t: now });

    $onReady(function () {
      var stack = ensureToastStack();
      var bodyEl = $make("div", { class: "tcg-toast__body" });
      if (title) bodyEl.appendChild($make("div", { class: "tcg-toast__title", text: title }));
      bodyEl.appendChild($make("div", { text: msg }));
      var closeBtn = $make("button", { class: "tcg-toast__close", "aria-label": "dismiss", text: "×" });
      var el = $make("div", { class: "tcg-toast", "data-kind": kind, role: "status" }, [bodyEl, closeBtn]);

      var dismiss = function () {
        if (!el.parentNode) return;
        el.setAttribute("data-leaving", "true");
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
      };
      closeBtn.addEventListener("click", dismiss);
      if (ttl > 0) {
        var timer = setTimeout(dismiss, ttl);
        el.addEventListener("mouseenter", function () { clearTimeout(timer); });
      }
      stack.appendChild(el);
      el.__dismiss = dismiss;
    });
    return { dismiss: function () { /* queued case */ } };
  };
  toast.success = function (msg, opts) { return toast.show(Object.assign({ kind: "ok",   message: msg }, opts || {})); };
  toast.error   = function (msg, opts) { return toast.show(Object.assign({ kind: "err",  message: msg, ttl: 8000 }, opts || {})); };
  toast.warn    = function (msg, opts) { return toast.show(Object.assign({ kind: "warn", message: msg }, opts || {})); };
  toast.info    = function (msg, opts) { return toast.show(Object.assign({ kind: "info", message: msg }, opts || {})); };
  toast.dismissAll = function () {
    if (!toastStack) return;
    Array.prototype.forEach.call(toastStack.querySelectorAll(".tcg-toast"), function (el) {
      if (el.__dismiss) el.__dismiss();
    });
  };

  /* ═════════════ tcg.modal ════════════════════════════ */
  var modal = tcg.modal = tcg.modal || {};
  var modalStack = [];

  modal.open = function (opts) {
    opts = opts || {};
    var title = opts.title || "";
    var bodyContent = opts.body || "";
    var actions = opts.actions || [];   // [{ label, kind?, onClick?, dismiss? }]
    var dismissable = opts.dismissable !== false;

    var bodyEl = $make("div", { class: "tcg-modal__body" });
    if (typeof bodyContent === "string") bodyEl.innerHTML = bodyContent;
    else if (bodyContent && bodyContent.nodeType) bodyEl.appendChild(bodyContent);

    var headEl = $make("div", { class: "tcg-modal__head" }, [
      $make("h2", { class: "tcg-modal__title", text: title }),
      dismissable ? $make("button", { class: "tcg-modal__close", "aria-label": "close", text: "×" }) : null
    ]);

    var actionsEl = null;
    if (actions.length) {
      actionsEl = $make("div", { class: "tcg-modal__actions" });
      actions.forEach(function (a) {
        var cls = "tcg-btn" + (a.kind === "primary" ? " tcg-btn--primary" : a.kind === "danger" ? " tcg-btn--danger" : a.kind === "ghost" ? " tcg-btn--ghost" : "");
        var btn = $make("button", { class: cls, text: a.label });
        btn.addEventListener("click", function () {
          var keepOpen = a.onClick && a.onClick() === false;
          if (!keepOpen && a.dismiss !== false) close();
        });
        actionsEl.appendChild(btn);
      });
    }

    var dialog = $make("div", { class: "tcg-modal", role: "dialog", "aria-modal": "true", "aria-label": title }, [
      headEl, bodyEl, actionsEl
    ]);
    var overlay = $make("div", { class: "tcg-modal__overlay" }, [dialog]);

    function close() {
      if (!overlay.parentNode) return;
      overlay.parentNode.removeChild(overlay);
      modalStack = modalStack.filter(function (m) { return m !== handle; });
      document.removeEventListener("keydown", onKey);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape" && dismissable && modalStack[modalStack.length - 1] === handle) { e.preventDefault(); close(); }
    }
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay && dismissable) close();
    });
    var closeBtn = overlay.querySelector(".tcg-modal__close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    $onReady(function () { (document.body || document.documentElement).appendChild(overlay); });
    document.addEventListener("keydown", onKey);

    var handle = { close: close, el: overlay, dialog: dialog, body: bodyEl };
    modalStack.push(handle);
    return handle;
  };

  modal.close = function () {
    var top = modalStack[modalStack.length - 1];
    if (top) top.close();
  };
  modal.closeAll = function () {
    while (modalStack.length) modalStack[modalStack.length - 1].close();
  };
  modal.confirm = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      modal.open({
        title: opts.title || "Confirm",
        body:  opts.body  || opts.message || "Are you sure?",
        dismissable: opts.dismissable !== false,
        actions: [
          { label: opts.cancelLabel || "Cancel", kind: "ghost",  onClick: function () { resolve(false); } },
          { label: opts.okLabel     || "OK",     kind: opts.danger ? "danger" : "primary", onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  };

  /* ═════════════ tcg.copy ═════════════════════════════ */
  var copy = tcg.copy = tcg.copy || {};

  copy.toClipboard = function (text) {
    text = String(text == null ? "" : text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
  };

  // shorthand: copy(el) — wires a copy-button next to el, copies its textContent
  copy.attach = function (el, opts) {
    opts = opts || {};
    var btn = $make("button", { class: "tcg-copy-button", type: "button", text: opts.label || "copy" });
    btn.addEventListener("click", function () {
      var text = opts.getText ? opts.getText() : (el.value != null ? el.value : el.textContent);
      copy.toClipboard(text).then(function () {
        btn.setAttribute("data-copied", "true");
        btn.textContent = opts.copiedLabel || "copied";
        setTimeout(function () {
          btn.removeAttribute("data-copied");
          btn.textContent = opts.label || "copy";
        }, 1200);
      });
    });
    if (el.parentNode) el.parentNode.insertBefore(btn, el.nextSibling);
    return btn;
  };

  /* ═════════════ tcg.kbd (keyboard hints) ═════════════ */
  var kbd = tcg.kbd = tcg.kbd || {};
  var kbdBindings = [];

  // tcg.kbd.bind("ctrl+k", fn, { description: "Open command palette", scope: "global" })
  // tcg.kbd.bind("?", fn, { description: "Show shortcuts" })
  kbd.bind = function (combo, handler, meta) {
    var spec = parseCombo(combo);
    var entry = { spec: spec, handler: handler, meta: meta || {}, combo: combo };
    kbdBindings.push(entry);
    return function unbind() { kbdBindings = kbdBindings.filter(function (e) { return e !== entry; }); };
  };
  kbd.list = function () { return kbdBindings.map(function (e) { return { combo: e.combo, description: e.meta.description || "", scope: e.meta.scope || "global" }; }); };

  function parseCombo(s) {
    var parts = String(s).toLowerCase().split("+").map(function (p) { return p.trim(); });
    var key = parts.pop();
    var mods = { ctrl: false, alt: false, shift: false, meta: false };
    parts.forEach(function (p) {
      if (p === "ctrl" || p === "control") mods.ctrl = true;
      else if (p === "alt") mods.alt = true;
      else if (p === "shift") mods.shift = true;
      else if (p === "meta" || p === "cmd" || p === "command") mods.meta = true;
    });
    return { key: key, mods: mods };
  }
  function matchesCombo(e, spec) {
    var k = (e.key || "").toLowerCase();
    if (k !== spec.key && !(spec.key === "?" && e.key === "?")) return false;
    // on mac, ctrl-shortcut also fires for meta — accept either
    var ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (spec.mods.ctrl  && !ctrlOrMeta) return false;
    if (!spec.mods.ctrl &&  ctrlOrMeta && (spec.key !== "?" )) return false;
    if (spec.mods.alt   !== e.altKey)   return false;
    if (spec.mods.shift !== e.shiftKey && spec.key !== "?") return false;
    return true;
  }
  function isTypingTarget(target) {
    if (!target) return false;
    var t = target.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  document.addEventListener("keydown", function (e) {
    for (var i = 0; i < kbdBindings.length; i++) {
      var b = kbdBindings[i];
      if (!matchesCombo(e, b.spec)) continue;
      if (b.meta.allowInInput !== true && isTypingTarget(e.target)) continue;
      try { b.handler(e); } catch (err) { /* ignore */ }
      if (b.meta.preventDefault !== false) e.preventDefault();
      return;
    }
  });

  // Render a hint-bar of registered shortcuts into an element
  kbd.renderHintBar = function (host) {
    host.innerHTML = "";
    host.className = (host.className || "") + " tcg-hint-bar";
    kbdBindings.forEach(function (b) {
      if (!b.meta.description) return;
      var combo = b.combo.split("+").map(function (p) { return '<span class="tcg-kbd">' + $esc(p) + '</span>'; }).join("+");
      var span = $make("span", { class: "tcg-hint-bar__item", html: combo + " " + $esc(b.meta.description) });
      host.appendChild(span);
    });
  };

  /* ═════════════ tcg.statusPill ═══════════════════════ */
  var statusPill = tcg.statusPill = tcg.statusPill || {};

  // Build a pill element from data
  statusPill.create = function (state, label) {
    return $make("span", { class: "tcg-status-pill", "data-state": state || "idle" }, [label || ""]);
  };
  // Update an existing pill element in place — preserves identity
  statusPill.update = function (el, state, label) {
    if (!el) return;
    if (state) el.setAttribute("data-state", state);
    if (label != null) {
      // preserve no children — text content only
      el.textContent = label;
    }
  };

  /* ═════════════ tcg.commandPalette (registry only — UI lives in CommandPalette.js) */
  var palette = tcg.commandPalette = tcg.commandPalette || {};
  palette._targets = palette._targets || [];   // [{ id, kind, label, target, keywords?, roleMin?, run? }]
  palette._providers = palette._providers || []; // fns returning targets[] dynamically

  palette.register = function (target) {
    if (!target || !target.id) return;
    palette._targets = palette._targets.filter(function (t) { return t.id !== target.id; });
    palette._targets.push(target);
  };
  palette.registerMany = function (arr) { (arr || []).forEach(palette.register); };
  palette.unregister = function (id) {
    palette._targets = palette._targets.filter(function (t) { return t.id !== id; });
  };
  palette.registerProvider = function (fn) {
    if (typeof fn === "function") palette._providers.push(fn);
  };
  palette.allTargets = function () {
    var dyn = [];
    palette._providers.forEach(function (fn) {
      try { var got = fn(); if (Array.isArray(got)) dyn = dyn.concat(got); } catch (e) { /* ignore */ }
    });
    return palette._targets.concat(dyn);
  };
  // open / close delegated to CommandPalette.js
  palette.open  = function () { if (palette._impl && palette._impl.open)  palette._impl.open(); };
  palette.close = function () { if (palette._impl && palette._impl.close) palette._impl.close(); };

  /* ═════════════ skeleton helper ══════════════════════ */
  tcg.skeleton = function (shape) {
    return $make("div", { class: "tcg-skeleton", "data-shape": shape || "line" });
  };

  /* ═════════════ empty-state helper ═══════════════════ */
  tcg.emptyState = function (opts) {
    opts = opts || {};
    var children = [];
    if (opts.icon)  children.push($make("div", { class: "tcg-empty-state__icon",  html: opts.icon }));
    if (opts.title) children.push($make("div", { class: "tcg-empty-state__title", text: opts.title }));
    if (opts.desc || opts.description) children.push($make("div", { class: "tcg-empty-state__desc", text: opts.desc || opts.description }));
    if (opts.cta) {
      var ctaWrap = $make("div", { class: "tcg-empty-state__cta" });
      (Array.isArray(opts.cta) ? opts.cta : [opts.cta]).forEach(function (c) {
        if (c && c.nodeType) { ctaWrap.appendChild(c); return; }
        var btn = $make("button", { class: "tcg-btn tcg-btn--primary", text: c.label });
        if (c.onClick) btn.addEventListener("click", c.onClick);
        ctaWrap.appendChild(btn);
      });
      children.push(ctaWrap);
    }
    return $make("div", { class: "tcg-empty-state" }, children);
  };

  /* ═════════════ ready signal ═════════════════════════ */
  if (typeof CustomEvent === "function") {
    $onReady(function () { document.dispatchEvent(new CustomEvent("tcg-ds-ready", { detail: { version: tcg.__dsVersion } })); });
  }
})();
