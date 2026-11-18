# element-picker — a Claude Code skill

Point at UI instead of describing it.

This skill adds a dev-only **Pick** button to your web app. Hover any element — including open panels, menus,
popovers and dropdowns — click it, and a reference is copied to your clipboard. Paste it into Claude Code with
what you want changed:

```
[UI element]
Element: <button class="chip" aria-label="Sort by: Newest"> "Newest"
Component: SortMenu — src/components/SortMenu.tsx:18
Inside: OrdersPanel (src/components/OrdersPanel.tsx:42) › App (src/App.tsx:9)
Path: div.orders-panel > div.toolbar > button.chip
Page: /orders
Size: 83×32 at x=1005, y=101 (window 1496×674)
Styles: font 14px/20px 400 · color … · background … · padding … · radius 8px · display inline-flex
```

Claude opens the right file, finds the element, and uses the measured size and styles as what's really on screen.

## Install

**1. Add the skill to Claude Code** — paste this into your terminal:

```bash
git clone https://github.com/lbaum-align/claude-element-picker.git ~/.claude/skills/element-picker
```

**2. Add the picker to a project** — open Claude Code in your project and say:

> add the element picker

Claude detects your stack, copies the picker in, loads it in development only, and checks in a browser that
your app's own clicks still work.

**3. Start a new Claude Code session** if the skill doesn't show up right away (`/skills` lists it).

### Update

```bash
git -C ~/.claude/skills/element-picker pull
```

### Uninstall

```bash
rm -rf ~/.claude/skills/element-picker
```

…and remove the `element-picker` import from your project.

## Use

| | |
|---|---|
| **Pick** button (bottom-left) or **Alt+Shift+X** | start picking |
| Hover | outlines the element and names it |
| **↑ / ↓** | pick the parent / go back to the child |
| **Click** | copy the reference |
| **Shift+click** | collect several, copied together |
| **Esc** | stop picking — open panels stay open |

While picking, the app doesn't react: menus and panels that close on an outside click or Escape stay open, so you
can pick inside them. Picking off, the app works normally.

## Works with

| Stack | Source file in the reference |
|---|---|
| React, Next.js, Remix, Gatsby, Preact | ✓ component + file (React 16–19) |
| Vue, Nuxt | ✓ component + `.vue` file |
| Svelte, SvelteKit | ✓ component + file:line |
| Angular, Lit, Stencil, web components | ✓ via a generated tag → file map |
| Astro | ✓ for framework islands |
| Node/Express (EJS, Pug, Handlebars), Django, Flask, Rails, Laravel, PHP | ✓ when templates carry `data-source="views/x.ejs"` |
| Plain HTML, static sites | DOM path, size and styles |

Every page also gets the DOM path, page URL, size and computed styles. Not supported: React Native and other
non-DOM UIs. The picker is only loaded in development builds.

## What's inside

```
SKILL.md                         instructions Claude follows (install per stack, how to read a reference)
templates/element-picker.ts      the picker (TypeScript source)
templates/element-picker.js      same, plain ES module
templates/element-picker.iife.js drop-in <script> for server-rendered pages and plain HTML
templates/gen-component-map.mjs  tag → file map for Angular, Lit, Stencil, web components
```

To share it with a teammate, send them this page — the install is the one `git clone` line above.
