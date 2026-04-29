# WebView2 Host

ConverseTek is now hosted in a WinForms `WebView2` shell rather than the old Chromely/CefSharp shell.

## Runtime Shape

- `Program.cs` starts WinForms and opens `Host/WebViewHostForm`.
- `WebViewHostForm` owns the WebView2 control.
- If `CT_WEB_URL` is set, the host navigates to that URL instead of the built `dist/` assets. This is the Vite development path used by `CT: Fast Dev`.
- The built frontend is loaded from `dist/` through a WebView2 virtual host mapping:
  - `dist/` -> `https://conversetek.local/`
  - entry point -> `https://conversetek.local/index.html`
- Backend logging goes through `Infrastructure/Log.cs`.

## Bridge Shape

The frontend still uses the existing typed API stack:

```text
components/stores
  -> app/src/services/api.ts
    -> app/src/services/rest.ts
      -> window.chrome.webview.postMessage(...)
```

`rest.ts` sends messages shaped like:

```json
{
  "id": "request id",
  "method": "GET",
  "url": "/definitions",
  "parameters": {},
  "body": {}
}
```

The host replies with:

```json
{
  "id": "same request id",
  "status": 200,
  "data": "{...json payload...}",
  "error": ""
}
```

The request id lets the frontend keep multiple bridge requests in flight without changing callers in `api.ts`.

## Backend Routing

Routes are registered explicitly in `Host/AppRoutes.cs`.

`Host/AppRouteDispatcher` keys routes by method and path, so `GET /thing` and `POST /thing` are distinct. Duplicate registration throws during startup.

Controllers expose `RegisterRoutes(AppRouteDispatcher dispatcher)` and receive app-owned request/response DTOs:

- `AppRequest`
- `AppResponse`

This keeps the backend route surface close to the previous desktop bridge while removing Chromely-specific controller inheritance and request types.

## Frontend Development

The normal fast frontend loop is:

```text
CT: Fast Dev
  -> starts or reuses Vite on http://127.0.0.1:5173/
  -> starts ConverseTek with CT_WEB_URL=http://127.0.0.1:5173/
```

The WebView2 runtime still supplies `window.chrome.webview`, so the typed frontend/backend bridge works while Vite handles hot reloads.
When `CT: Fast Dev` starts Vite itself, it leaves that server running so later runs can reuse the same hot reload process.

`CT: UI Build` remains the static build path. It runs the Vite production build and copies `dist/` into the debug output folder for the normal desktop run tasks.

## Notes

- PUT and DELETE style actions are still sent as POSTs with a `method` value in the payload because the frontend API layer already uses that convention.
- The old `Handlers/` folder is excluded from compilation while the branch migrates away from the CEF-specific handlers.
- The BattleTech/Shadowrun conversation DLLs are intentionally unchanged in this branch.
