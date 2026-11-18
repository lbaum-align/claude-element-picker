/* element-picker (dev only) — plain <script> build; installs itself. Options: set window.ElementPickerOptions before this script. Source: element-picker.ts */
(() => {
  var ATTR = "data-element-picker";
  var KEPT_ATTRS = ["aria-label", "role", "placeholder", "title", "type", "name", "href", "data-testid"];
  var opts = {};
  var active = false;
  var hovered = null;
  var trail = [];
  var collected = [];
  var box;
  var tag;
  var toggle;
  var toast;
  function installElementPicker(options = {}) {
    if (document.querySelector(`[${ATTR}="toggle"]`)) return;
    opts = options;
    injectStyles();
    box = el("div", "box");
    tag = el("div", "tag");
    toast = el("div", "toast");
    toggle = el("button", "toggle");
    toggle.type = "button";
    toggle.title = "Pick an element to copy a reference for Claude (Alt+Shift+X)";
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg><span>Pick</span>';
    document.body.append(box, tag, toast, toggle);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("mousemove", onMove, true);
    window.addEventListener("click", onClick, true);
    for (const type of ["mousedown", "mouseup", "pointerdown", "pointerup", "focusin", "touchstart"]) {
      window.addEventListener(
        type,
        (e) => {
          if (isOwn(e.target) || active) {
            if (type !== "focusin") e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        { capture: true, passive: false }
      );
    }
  }
  function setActive(on) {
    active = on;
    toggle.classList.toggle("on", on);
    document.documentElement.classList.toggle("element-picking", on);
    if (!on) {
      hovered = null;
      trail = [];
      box.style.display = tag.style.display = "none";
    } else {
      flash("Picking: hover an element and click it. \u2191 picks the parent. Esc stops.");
    }
  }
  function onKey(e) {
    if (e.altKey && e.shiftKey && e.code === "KeyX") {
      e.preventDefault();
      e.stopImmediatePropagation();
      setActive(!active);
      return;
    }
    if (!active) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      setActive(false);
    } else if (e.key === "ArrowUp" && hovered?.parentElement && hovered.parentElement !== document.body) {
      e.preventDefault();
      trail.push(hovered);
      show(hovered.parentElement);
    } else if (e.key === "ArrowDown" && trail.length) {
      e.preventDefault();
      show(trail.pop());
    }
  }
  function onMove(e) {
    if (!active) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || isOwn(target) || target === hovered || trail.includes(target)) return;
    trail = [];
    show(target);
  }
  function onClick(e) {
    if (isOwn(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.target.closest(`[${ATTR}="toggle"]`)) setActive(!active);
      return;
    }
    if (!active) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!hovered) return;
    const ref = describe(hovered);
    collected = e.shiftKey ? [...collected, ref] : [ref];
    copy(collected.join("\n\n"));
    const n = collected.length;
    flash(n > 1 ? `Copied ${n} elements. Paste them into the chat.` : "Copied. Paste it into the chat.");
    if (!e.shiftKey) setActive(false);
  }
  function show(target) {
    hovered = target;
    const r = target.getBoundingClientRect();
    Object.assign(box.style, { display: "block", top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
    const comp = owners(target).find((o) => !o.library);
    tag.textContent = `${comp ? comp.name + " \u203A " : ""}${short(target)}  ${Math.round(r.width)}\xD7${Math.round(r.height)}`;
    tag.style.display = "block";
    tag.style.top = `${r.top < 28 ? r.bottom + 4 : r.top - 24}px`;
    tag.style.left = `${Math.max(4, Math.min(r.left, innerWidth - tag.offsetWidth - 4))}px`;
  }
  function owners(node) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (o) => {
      if (o.file) o.file = cleanPath(o.file);
      const key = `${o.name}|${o.file ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(o);
      }
    };
    for (let n = node; n && n !== document.body; n = n.parentElement) {
      const t = n.tagName.toLowerCase();
      const any = n;
      const src = n.getAttribute("data-source") ?? n.getAttribute("data-source-file");
      const comp = n.getAttribute("data-component");
      if (src || comp) push({ name: comp ?? src.split("/").pop(), file: src ?? void 0 });
      const known = opts.componentFiles?.[t];
      if (known) push({ name: known.name, file: known.file, tag: t });
      else if (opts.libraryPrefixes?.some((p) => t.startsWith(p))) push({ name: t, tag: t, library: true });
      else if (t.includes("-") && typeof customElements !== "undefined" && customElements.get(t)) {
        push({ name: customElements.get(t).name || t, tag: t });
      }
      const vue = any.__vueParentComponent;
      if (vue?.type) push({ name: vue.type.__name || vue.type.name || "Anonymous", file: vue.type.__file });
      const svelte = any.__svelte_meta;
      if (svelte?.loc?.file) push({ name: svelte.loc.file.split("/").pop().replace(/\.svelte$/, ""), file: `${svelte.loc.file}:${svelte.loc.line}` });
      const fiberKey = Object.keys(n).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
      if (fiberKey && n === node) {
        for (let f = any[fiberKey]; f; f = f.return) {
          if (typeof f.type !== "function" && typeof f.type?.render !== "function") continue;
          const type = typeof f.type === "function" ? f.type : f.type.render;
          const name = f.type.displayName || type.displayName || type.name || "Anonymous";
          const file = f._debugSource ? `${f._debugSource.fileName}:${f._debugSource.lineNumber}` : fromStack(f._debugStack?.stack);
          push({ name, file });
        }
      }
    }
    return out;
  }
  function fromStack(stack) {
    if (!stack) return void 0;
    for (const line of stack.split("\n").slice(1)) {
      const m = /((?:https?|file|webpack-internal|rsc):\/\/\S+?):(\d+):\d+\)?$/.exec(line.trim());
      if (!m) continue;
      const url = m[1];
      if (/node_modules|react-dom|react-jsx|jsx-dev-runtime|\/chunks?\/|\.vite\/deps|next\/dist|_next\/static/.test(url)) continue;
      return `${url}:${m[2]}`;
    }
    return void 0;
  }
  function cleanPath(file) {
    let f = file.replace(/^webpack-internal:\/\/\/(\([^)]*\)\/)?/, "").replace(/^rsc:\/\/[^/]+\/[^/]+\//, "");
    f = f.replace(/^file:\/\//, "").replace(/^https?:\/\/[^/]+\//, "").replace(/\?[^:]*(?=(:\d+)?$)/, "").replace(/^\.\//, "");
    if (opts.rootPrefix && f.startsWith(opts.rootPrefix)) f = f.slice(opts.rootPrefix.length).replace(/^\//, "");
    return decodeURIComponent(f);
  }
  function describe(node) {
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    const own = owners(node);
    const app = own.filter((o) => !o.library);
    const lib = own.find((o) => o.library);
    const lines = ["[UI element]", `Element: ${open(node)}${textOf(node)}`];
    if (lib && own[0] === lib) lines.push(`Library component: ${lib.tag}`);
    if (app[0]) lines.push(`Component: ${app[0].name}${app[0].tag ? ` <${app[0].tag}>` : ""}${app[0].file ? ` \u2014 ${app[0].file}` : ""}`);
    if (app.length > 1) lines.push(`Inside: ${app.slice(1, 4).map((o) => o.name + (o.file ? ` (${o.file})` : "")).join(" \u203A ")}`);
    lines.push(`Path: ${path(node)}`);
    lines.push(`Page: ${location.pathname}${location.hash}`);
    lines.push(`Size: ${Math.round(r.width)}\xD7${Math.round(r.height)} at x=${Math.round(r.left)}, y=${Math.round(r.top)} (window ${innerWidth}\xD7${innerHeight})`);
    lines.push(
      `Styles: font ${cs.fontSize}/${cs.lineHeight} ${cs.fontWeight} \xB7 color ${cs.color} \xB7 background ${cs.backgroundColor} \xB7 padding ${cs.padding} \xB7 margin ${cs.margin} \xB7 radius ${cs.borderRadius} \xB7 display ${cs.display}`
    );
    return lines.join("\n");
  }
  function open(node) {
    const cls = typeof node.className === "string" ? node.className.trim().replace(/\s+/g, " ") : "";
    const attrs = [cls ? `class="${cls}"` : "", ...KEPT_ATTRS.filter((a) => node.hasAttribute(a)).map((a) => `${a}="${node.getAttribute(a)}"`)].filter(Boolean);
    return `<${node.tagName.toLowerCase()}${attrs.length ? " " + attrs.join(" ") : ""}>`;
  }
  function textOf(node) {
    const text = (node.innerText || node.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
    return text ? ` "${text.length > 80 ? text.slice(0, 80) + "\u2026" : text}"` : "";
  }
  function short(node) {
    const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("ng-")).slice(0, 3) : [];
    return node.tagName.toLowerCase() + cls.map((c) => "." + c).join("");
  }
  function path(node) {
    const parts = [];
    for (let n = node; n && n !== document.body && parts.length < 8; n = n.parentElement) {
      parts.unshift(short(n));
      if (n !== node && opts.componentFiles?.[n.tagName.toLowerCase()]) break;
    }
    return parts.join(" > ");
  }
  function copy(text) {
    navigator.clipboard?.writeText(text).catch(() => fallbackCopy(text)) ?? fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute(ATTR, "clip");
    ta.style.cssText = "position:fixed;opacity:0;";
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  var toastTimer;
  function flash(msg) {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), 2600);
  }
  function isOwn(t) {
    return t instanceof Element && !!t.closest(`[${ATTR}]`);
  }
  function el(name, role) {
    const n = document.createElement(name);
    n.setAttribute(ATTR, role);
    return n;
  }
  function injectStyles() {
    const s = document.createElement("style");
    s.setAttribute(ATTR, "style");
    s.textContent = `
    html.element-picking, html.element-picking * { cursor: crosshair !important; }
    [${ATTR}="box"] { position: fixed; display: none; z-index: 2147483000; pointer-events: none;
      outline: 2px solid #7c3aed; background: rgba(124, 58, 237, 0.08); border-radius: 2px; }
    [${ATTR}="tag"] { position: fixed; display: none; z-index: 2147483001; pointer-events: none; max-width: 90vw;
      padding: 2px 8px; border-radius: 4px; background: #7c3aed; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font: 500 12px/20px ui-monospace, SFMono-Regular, Menlo, monospace; }
    [${ATTR}="toggle"] { position: fixed; left: 12px; bottom: 12px; z-index: 2147483002; display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 12px; border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; background: #fff; color: #333;
      font: 500 12px/1 system-ui, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.12); cursor: pointer; opacity: 0.7; }
    [${ATTR}="toggle"]:hover, [${ATTR}="toggle"].on { opacity: 1; }
    [${ATTR}="toggle"].on { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    [${ATTR}="toast"] { position: fixed; left: 50%; bottom: 20px; z-index: 2147483002; transform: translate(-50%, 8px); opacity: 0;
      padding: 8px 14px; border-radius: 8px; background: #1f1f1f; color: #fff; font: 13px/18px system-ui, sans-serif;
      pointer-events: none; transition: opacity 0.2s, transform 0.2s; }
    [${ATTR}="toast"].on { opacity: 1; transform: translate(-50%, 0); }
  `;
    document.head.append(s);
  }

  installElementPicker(window.ElementPickerOptions || {});
})();
