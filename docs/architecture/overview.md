# Architecture Overview

ConverseTek is a desktop dialogue editor for HBS BattleTech. It edits BattleTech's binary `.bytes` conversation files in a tree-based UI and is used by modders to author dialogue, actions, and conditions for the game.

This document is the entry point. Drill into the area-specific docs for detail:

- [`webview2-host.md`](./webview2-host.md) - WebView2 desktop host, route bridge, DevTools, and Vite dev loop
- [`frontend.md`](./frontend.md) - React + TypeScript + MobX UI in `app/`
- [`backend.md`](./backend.md) - C# / .NET Framework 4.7.2 backend at the repo root
- [`domain-model.md`](./domain-model.md) - Conversation, node, operation, and definition types
- [`data-flow.md`](./data-flow.md) - End-to-end flows: open folder, edit, save, export
- [`notes.md`](./notes.md) - Quirks, conventions, and traps

## Shape of the System

```text
+-----------------------------------+
|  React + TS + MobX (app/src/)     |
|  - Containers, components, stores |
|  - app/src/services/rest.ts       |
+----------------|------------------+
                 |  window.chrome.webview.postMessage
                 |  typed request/response bridge
                 v
+-----------------------------------+
|  WebView2 / Edge Chromium shell   |
|  Host/WebViewHostForm.cs          |
|  - Loads Vite or built dist/      |
|  - Routes JS calls to dispatcher  |
+----------------|------------------+
                 |  AppRequest -> Controllers/*.cs
                 v
+-----------------------------------+
|  .NET Framework 4.7.2 backend     |
|  - Controllers/  (route handlers) |
|  - Services/     (singletons)     |
|  - Host/, Data/, Json/            |
|  - libs/ ShadowrunDTO,            |
|         ShadowrunSerializer,      |
|         protobuf-net              |
+----------------|------------------+
                 |  protobuf-net <-> isogame.Conversation
                 v
+-----------------------------------+
|  Working directory on disk        |
|  - *.bytes        (source format) |
|  - *.cvsl.bytes   (speakers)      |
|  - *.json         (export only)   |
|  config/, defs/                   |
+-----------------------------------+
```

## Why WebView2

WebView2 keeps the app as a lightweight Windows desktop tool while giving the frontend a current Edge Chromium runtime. That means modern CSS and modern DevTools are available in the same runtime users run, without moving the backend away from C# / .NET Framework 4.7.2 or losing access to BattleTech's own pre-compiled assemblies (`ShadowrunDTO.dll`, `ShadowrunSerializer.dll`) for binary serialisation.

## Where Things Live

| Area | Path | Notes |
|---|---|---|
| Frontend source | `app/src/` | TS + React + MobX |
| Frontend build output | `dist/` | Copied into `bin/.../dist/` by `CT: UI Build` |
| Backend source | `Controllers/`, `Services/`, `Host/`, `Data/`, `Json/`, `Program.cs` | Routes are registered in `Host/AppRoutes.cs` |
| Definition packs | `defs/operations/`, `defs/presets/`, `defs/tags/` | JSON, drives dynamic UI |
| Game DLLs | `libs/` | `ShadowrunDTO.dll`, `ShadowrunSerializer.dll` (gitignored) |
| User config | `config/quicklinks.json`, `config/colours.json`, `config/ai.json`, `config/ai-personalities.json` | Created or copied where needed |
| Logs | `logs/` | App logs and AI draft diagnostics |
| Build tasks | `.vscode/tasks.json` | `CT: Build All`, `CT: Build Server`, `CT: UI Build`, `CT: Fast Run`, `CT: Fast Dev`, `CT: RTool`, `CT: Release` |

## Key Systems

- **Definition-driven UI.** Actions, conditions, presets, and tag scopes are defined as JSON under `defs/`. The backend loads them and the frontend renders argument inputs dynamically from those definitions.
- **Reuse of game assemblies.** Binary `.bytes` files are read/written through BattleTech's own protobuf types via `protobuf-net`, sidestepping a from-scratch reverse engineering effort.
- **Tree-based dialogue editor.** Nodes are PromptNodes with `branches[]` of ElementNodes. Loops are expressed as link nodes pointing back to existing nodes.
- **Advisory drafting.** Codex CLI can draft whole conversations, node rewrites, or branch expansions through a generic provider layer. Drafts stay outside the MobX conversation graph until the user accepts them.

## Build & Run, Briefly

1. `npm install` in `app/` (`CT: UI Install` task).
2. `dotnet build ConverseTek.csproj /t:BuildServer` from the repo root builds the desktop backend.
3. `CT: Fast Dev` starts or reuses Vite and launches the WebView2 shell for hot reload with the backend bridge available.
4. `CT: UI Build` runs the static Vite build and copies `dist/` next to the debug exe.
5. `CT: Fast Run` launches the exe against the copied static bundle.

Full setup: [`docs/development.md`](../development.md).
