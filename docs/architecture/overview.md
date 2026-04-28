# Architecture Overview

ConverseTek is a desktop dialogue editor for HBS BattleTech. It edits BattleTech's binary `.bytes` conversation files in a tree-based UI and is used by modders to author dialogue, actions, and conditions for the game.

This document is the entry point. Drill into the area-specific docs for detail:

- [`frontend.md`](./frontend.md) — React + TypeScript + MobX UI in `app/`
- [`backend.md`](./backend.md) — C# / .NET Framework 4.7.2 backend at the repo root
- [`domain-model.md`](./domain-model.md) — Conversation, node, operation, and definition types
- [`data-flow.md`](./data-flow.md) — End-to-end flows: open folder, edit, save, export
- [`notes.md`](./notes.md) — Quirks, conventions, and traps

## Shape of the system

```
+-----------------------------------+
|  React + TS + MobX (app/src/)     |
|  - Containers, components, stores |
|  - app/src/services/rest.ts       |
+----------------|------------------+
                 |  boundControllerAsync.{getJson, postJson}
                 |  (Chromely JS bridge — only GET / POST supported)
                 v
+-----------------------------------+
|  Chromely (CefSharp) host shell   |
|  Program.cs                       |
|  - Resolves /local/dist/index.html|
|  - Routes JS calls to controllers |
+----------------|------------------+
                 |  ChromelyRequest -> Controllers/*.cs
                 v
+-----------------------------------+
|  .NET 4.7.2 backend               |
|  - Controllers/  (route handlers) |
|  - Services/     (singletons)     |
|  - Data/, Json/, Handlers/        |
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

## Why Chromely (not Electron)

Chromely is lightweight and lets the backend stay in C# / .NET so it can reuse BattleTech's own pre-compiled assemblies (`ShadowrunDTO.dll`, `ShadowrunSerializer.dll`) for binary serialisation. This avoids reimplementing the protobuf schema in JavaScript.

## Where things live

| Area | Path | Notes |
|---|---|---|
| Frontend source | `app/src/` | TS + React + MobX |
| Frontend build output | `dist/` | Copied into `bin/.../dist/` by the `UI Build` task |
| Backend source | `Controllers/`, `Services/`, `Handlers/`, `Data/`, `Json/`, `Program.cs` | Auto-discovered by Chromely's `ScanAssemblies()` |
| Definition packs | `defs/operations/`, `defs/presets/`, `defs/tags/` | JSON, drives dynamic UI (see `domain-model.md`) |
| Game DLLs | `libs/` | `ShadowrunDTO.dll`, `ShadowrunSerializer.dll` (gitignored) |
| User config | `config/quicklinks.json`, `config/colours.json`, `config/ai.json` | Created on first run where needed |
| Logs | `logs/conversetek-*.log` | Interface and Chromely core logs |
| Build tasks | `.vscode/tasks.json` | `Build All`, `UI Build`, `UI Install`, `Fast Run`, `Release` |

## Key innovations

- **Definition-driven UI.** Actions, conditions, presets, and tag scopes are defined as JSON under `defs/`. The backend loads them at startup and the frontend renders argument inputs dynamically from these definitions — no UI code change is needed to add a new action. See `domain-model.md`.
- **Reuse of game assemblies.** Binary `.bytes` files are read/written through BattleTech's own protobuf types via `protobuf-net`, sidestepping a from-scratch reverse engineering effort.
- **Tree-based dialogue editor.** Nodes are PromptNodes (NPC/game-spoken) with `branches[]` of ElementNodes (player responses). Loops are expressed as link nodes pointing back to existing nodes.
- **Advisory AI drafting.** Codex CLI can draft whole conversations, node rewrites, or branch expansions through a generic provider layer. Drafts stay outside the MobX conversation graph until the user accepts them.

## Build & run, briefly

1. `npm install` in `app/` (`UI Install` task).
2. `npm run build` in `app/` produces `dist/`.
3. `dotnet build /t:BuildDebug` from the repo root produces `bin/x64/Debug/net472/ConverseTek.exe`.
4. The `UI Build` task does step 2 and copies `dist/` next to the exe.
5. `Fast Run` task launches the exe.

Full setup: `docs/development.md`.
