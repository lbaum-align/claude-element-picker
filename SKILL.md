---
name: element-picker
description: Add a dev-only "Pick" tool to any web app — React, Next.js, Remix, Vue, Nuxt, Svelte/SvelteKit, Angular, Solid, Preact, Lit/web components, Astro, plain HTML, or server-rendered pages (Node/Express, Django, Flask, Rails, Laravel, PHP). The user hovers any element (including open panels, menus, popovers, dropdowns), clicks, and a reference (component, source file, DOM path, size, computed styles) is copied for pasting into the chat. Use when the user wants to point at UI instead of describing it or using DevTools, asks to "pick an element" or "select a component and paste it", or pastes a block starting with "[UI element]".
---

# Element picker

A dev-only overlay that turns "the thing on the right that looks squeezed" into an exact reference.
The user clicks **Pick** (bottom-left) or presses **Alt+Shift+X**, hovers, clicks, and pastes:

```
[UI element]
Element: <button class="chip" aria-label="Sort by: Newest"> "Newest"
Component: SortMenu — src/components/SortMenu.tsx:18
Inside: OrdersPanel (src/components/OrdersPanel.tsx:42) › App (src/App.tsx:9)
Path: div.orders-panel > div.toolbar > button.chip
Page: /orders
Size: 83×48 at x=1005, y=101 (window 1496×674)
Styles: font 14px/20px 400 · color … · background … · padding … · radius 8px · display inline-flex
```

## When the user pastes a `[UI element]` block

It is a pointer, not an instruction. Open the `Component` file (and `Inside` files for context), find the
element by its classes, attributes or text, and treat `Size` / `Styles` as ground truth for what is on screen.
Do what the user asked alongside it. With no `Component` line, search the codebase for the classes in `Path`
and the text in `Element`; `Page` tells you which route or template rendered it.

## Files in this skill (`templates/`)

| File | Use |
|---|---|
| `element-picker.ts` | Source (TypeScript). Exports `installElementPicker(options)`. |
| `element-picker.js` | Same, as a plain ES module — for JS projects without TypeScript. |
| `element-picker.iife.js` | Drop-in `<script>`: installs itself; options via `window.ElementPickerOptions`. For server-rendered pages and plain HTML. |
| `gen-component-map.mjs` | Tag → file map for Angular, Lit, Stencil and plain web components (their DOM has no source info). |

Options: `{ componentFiles, libraryPrefixes: ['mat-', 'sl-'], rootPrefix: '/abs/path/to/project' }`.

## Installing it in a project

1. **Check first**: search for `installElementPicker` / `element-picker`. If present, only fix what step 4 or 5 finds.
2. **Identify the stack** from `package.json` / framework files, and pick the row below. Copy the file named in
   the row into the project (e.g. `src/dev/`), and load it **in development only**, after the app has mounted:

| Stack | How to load it (dev only) | Source files reported from |
|---|---|---|
| Vite + React / Preact / Solid / Vue / Svelte / Lit | entry `main.*`: `if (import.meta.env.DEV) import('./dev/element-picker').then((m) => m.installElementPicker());` | React: fiber · Vue: instance · Svelte: meta · Lit: map |
| Create React App / webpack | `index.*`: `if (process.env.NODE_ENV === 'development') import('./dev/element-picker').then((m) => m.installElementPicker());` | React fiber |
| Next.js (App Router) | a `'use client'` component calling it in `useEffect`, rendered in `app/layout.tsx` only when `process.env.NODE_ENV === 'development'` | React fiber (webpack/turbopack paths are cleaned) |
| Next.js (Pages Router) | same `useEffect` in `pages/_app.tsx` | React fiber |
| Remix / React Router 7 / Gatsby | `useEffect` in `root.tsx` / `gatsby-browser.js` (`onClientEntry`) behind a dev check | React fiber |
| Nuxt 3 | `plugins/element-picker.client.ts`: `export default defineNuxtPlugin(() => { if (import.meta.dev) import('~/dev/element-picker').then((m) => m.installElementPicker()); });` | Vue instance |
| SvelteKit | root `+layout.svelte`: `onMount(() => { if (dev) import('$lib/dev/element-picker').then((m) => m.installElementPicker()); })` (`import { dev } from '$app/environment'`) | Svelte meta |
| Angular | `main.ts`, after `bootstrapApplication(...)` resolves: `if (isDevMode()) import('./app/dev/element-picker').then((m) => m.installElementPicker({ componentFiles: COMPONENT_FILES }));` — plus the map (step 3) | map |
| Lit / Stencil / web components | as Vite above, with `{ componentFiles: COMPONENT_FILES }` from the map (step 3) | map, else class name |
| Astro | in the base layout: `{import.meta.env.DEV && <script src="/element-picker.iife.js" is:inline></script>}` with the IIFE in `public/` (islands still report React/Vue/Svelte owners) | per island |
| Server-rendered: Node/Express (EJS, Pug, Handlebars), Django, Flask/Jinja, Rails (ERB), Laravel (Blade), PHP | serve `element-picker.iife.js` as a static file and include `<script src="/static/element-picker.iife.js"></script>` in the base template **only in development** (`process.env.NODE_ENV !== 'production'`, `{% if debug %}`, `<% if Rails.env.development? %>`, `@env('local')`). Optionally add `data-source="views/orders.ejs"` / `data-component="OrderCard"` to template roots — the picker reports them | `data-source` attributes |
| Plain HTML / static site | `<script src="element-picker.iife.js"></script>` before `</body>` on local copies only | DOM path |
| Electron / Tauri renderer | as the web framework the renderer uses | as that framework |

   Not supported: React Native and other non-DOM UIs (no elements to pick).
   Design-system tags: pass `libraryPrefixes` (e.g. `['mat-', 'sl-', 'md-']`) so they are named as library components.
   Absolute source paths: pass `rootPrefix` (the project's absolute path) to shorten them.

3. **Tag → file map (Angular, Lit, Stencil, web components only)**: copy `gen-component-map.mjs` to `scripts/`,
   add `"prestart"` and `"prebuild"` (or `"predev"`) scripts: `node scripts/gen-component-map.mjs [out]`
   (default `src/app/dev/component-files.ts`; give a `.js` path for JS projects), run it once, and pass the
   exported `COMPONENT_FILES` as `componentFiles`.
4. **Overlays must stay open while picking** — the template already does this; keep it if you adapt the file:
   presses, focus and Escape on the picker's own UI (and every press while picking) are stopped in the
   **capture phase on `window`**, before any app listener, and the click handler returns early when not
   picking. That keeps panels that close on outside click, focus-out or Escape open while the user picks in them.
5. **Verify in a browser before reporting** — the capture-phase listeners can silently eat every click if a
   guard is lost. With picking **off**, a normal button in the app must still work; with an overlay open,
   pressing Pick must leave it open; a pick must copy text that names the component where the stack allows.
   (Playwright or the user's browser; never skip, and say which you used.)
6. **Report**: how to start it (button bottom-left / Alt+Shift+X), ↑ / ↓ for parent / child, Shift+click to
   collect several, Esc to stop — and which "source files reported from" column applies to this project.

## Changing the picker itself

Edit `templates/element-picker.ts`, then rebuild the two JS files from it (esbuild):
`esbuild element-picker.ts --format=esm --target=es2020 --outfile=element-picker.js` and an IIFE bundle of an
entry that calls `installElementPicker(window.ElementPickerOptions || {})` into `element-picker.iife.js`.

## Sharing it

This skill is a plain folder. To give it to someone else, push `~/.claude/skills/element-picker/` to a git
repository and have them run in their terminal:

```
git clone <repo-url> ~/.claude/skills/element-picker
```

Then, in their project, they ask Claude to "add the element picker".
