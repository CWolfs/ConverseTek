---
name: conversetek-live-ui-inspection
description: Use when changing, debugging, or reviewing ConverseTek frontend styling, AntD component appearance, WebView2-rendered UI, text colour, layout, hover/focus states, modals, menus, buttons, or any visual bug where live DOM or computed CSS would prevent guessing.
---

# ConverseTek Live UI Inspection

Use this skill for ConverseTek UI styling work before choosing CSS selectors, AntD props, or theme fixes.

## Core Rule

Before patching visual CSS or AntD styling, inspect the live rendered element whenever practical. Do not rely only on source code when the problem involves colour, spacing, cascade, generated AntD classes, disabled/loading states, portal content, or WebView2-only behaviour.

## Workflow

1. Find the component and local CSS that likely own the element.
2. Inspect the live UI:
   - Prefer `CT: Fast Dev` with the Vite page at `http://127.0.0.1:5173/` and the Browser Use plugin when the backend bridge is not required for the specific screen.
   - For WebView2-only flows, use the user-provided DOM/computed-style dump, F12 DevTools observations, or a debug route if one exists.
   - If live inspection is blocked, say so and make the fallback explicit.
3. Capture the useful facts before editing:
   - element tag and full class list
   - relevant parent classes
   - computed `color`, `background`, `border`, `display`, sizing, and state classes
   - which CSS rule wins when cascade order is the likely issue
4. Patch the smallest stable surface:
   - Prefer app-owned classes over generated AntD classes.
   - Prefer scoped CSS in the component stylesheet for normal styling.
   - Use AntD props or `styles` only when they express component intent better than CSS.
   - Use inline style only for narrow local overrides where AntD generated CSS wins the cascade and the value is truly state-local.
5. Verify with at least one of:
   - live DOM/computed-style re-check
   - screenshot/browser check
   - targeted TypeScript/lint/test commands where relevant

## ConverseTek Notes

- The desktop shell is WebView2/Edge Chromium; modern CSS is available.
- `CT: Fast Dev` runs Vite at `http://127.0.0.1:5173/` inside the desktop shell with `CT_WEB_URL` set.
- F12 opens WebView2 DevTools in debug/dev builds.
- AntD 6 often emits generated classes and CSS variables; inspect the rendered DOM before overriding colours or variants.
- Static AntD feedback APIs such as `message.*` can miss dynamic theme context; inside React components prefer `App.useApp()` when the app is wrapped in AntD `<App>`.
