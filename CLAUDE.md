# CLAUDE.md

Guidance for Claude Code when working in this repository. `AGENTS.md` is the canonical local guidance for coding agents; keep this file compatible with it.

## What this project is

ConverseTek is a tree-based dialogue editor for HBS BattleTech. It is a desktop app: a **React + TypeScript + MobX** frontend (`app/`) hosted in a **WebView2 / Edge Chromium shell** with a **C# / .NET Framework 4.7.2 backend** at the repo root. The backend reads/writes BattleTech's binary protobuf `.bytes` conversation files using the game's own assemblies (`ShadowrunDTO.dll`, `ShadowrunSerializer.dll`).

For architecture detail, read the docs under [`docs/architecture/`](./docs/architecture/) - start with `overview.md`, then drop into `webview2-host.md`, `frontend.md`, `backend.md`, `domain-model.md`, `data-flow.md`, or `notes.md` as needed.

## Language

**Use UK English spelling** in all prose, comments, commit messages, PR/issue text, and any new identifiers where there is a choice. The codebase already uses this (`ColourConfig`, `colours.json`, `minimised`, `organised`). Examples: *colour* not color, *behaviour* not behavior, *organise* not organize, *centralised* not centralized, *serialise* not serialize. Keep existing code identifiers as-is even if they use US spelling - do not rename for spelling alone.

## Working directory & build

- Frontend lives in `app/`. Run npm scripts from there (`cd app && npm run build`, `npm start`, `npm run ts-check`).
- Backend builds with `dotnet build /t:BuildDebug` from repo root, or use the VS Code Task Runner tasks (`CT: Build All`, `CT: Build Server`, `CT: UI Build`, `CT: Fast Run`, `CT: Fast Dev`, `CT: UI Install`) defined in `.vscode/tasks.json`.
- Use `CT: Fast Dev` for the usual UI loop. It starts or reuses Vite, then runs the WebView2 desktop shell with the backend bridge available.
- The frontend bundle lands in `dist/`. The `CT: UI Build` task copies it into `bin/x64/Debug/net472/dist/` so `CT: Fast Run` can use the static bundle.
- `app/package.json` `pre-push` hook runs `ts-check` - keep TypeScript clean before pushing.
- Game DLLs (`ShadowrunDTO.dll`, `ShadowrunSerializer.dll`) must be present in `libs/` for the backend to compile and run; they are sourced from a local BattleTech install and are gitignored.

## Branch & PR workflow

- Branches: `CT-{github-issue-number}-{kebab-sensible-name}` off `master`.
- **PRs target `develop`**, never `master` directly. `master` only receives a periodic release PR (`develop -> master`, e.g. PR #191 "v1.7.0").
- File a GitHub issue first via `gh` - the user's issues are short and conversational with `Area: description` titles (see `cwolfs/ConverseTek` issues for tone).
- PR body is one line, typically `Adds #{issue}`.

## Code conventions

- Frontend uses module-aliased imports (`components/...`, `containers/...`, `services/...`, `stores/...`, `hooks/...`, `types/...`, `utils/...`) - see `app/vite.config.ts` and `app/tsconfig.json`. Prefer the alias over relative paths.
- Vite is the normal frontend dev/build path. Use `CT: Fast Dev` for hot reload inside the WebView2 desktop shell.
- WebView2 runs current Edge Chromium, so modern CSS is acceptable in production UI code.
- Stores are MobX singletons exported from `app/src/stores/index.ts` and accessed in components via `useStore<T>(key)` from `app/src/hooks/useStore`.
- API calls go through `app/src/services/api.ts`, which wraps the WebView2 bridge in `app/src/services/rest.ts`. Do not call the bridge directly from components.
- Backend controllers live in `Controllers/`, services in `Services/`, and the WebView2 route dispatcher lives in `Host/`. Services follow a singleton `getInstance()` pattern.
- Prefer editing existing files over creating new ones. Do not add comments that explain *what* the code does - only *why* when non-obvious.

## AI drafting

- AI-assisted drafting is advisory until accepted. Keep draft preview data outside `dataStore.unsavedActiveConversationAsset`.
- Global AI settings live in `config/ai.json`; workspace AI context is keyed by conversation folder inside that file. Do not write loose AI settings into a mod `conversations/` folder.
- Workspace cast personalities live in `config/ai.json`; built-in default personalities live in `config/ai-personalities.json`. Defaults should remain editable, explicit empty lists should be preserved, and character voice rules should be applied through provider prompts.
- Backend AI providers go through `Services/AiProviderService.cs`; Codex CLI is the first provider, but provider names should stay generic for future CLIs.
- Frontend draft conversion lives in `app/src/utils/ai-draft-utils.ts` and should return fresh conversation assets or explicit patch objects.
- Full drafts use "Turn Into Real Conversation"; node/branch suggestions use "Accept" / "Reject".

## Important quirks

- The desktop bridge exposes typed `GET` and `POST` messages over `window.chrome.webview.postMessage`. PUT/DELETE style actions are emulated as POSTs with a `method` field - see `app/src/services/api.ts` calls like `post(url, params, { method: 'PUT', ... })`.
- The frontend uses camelCase, but the backend serialises to/from BattleTech-flavoured snake_case and PascalCase. Translation happens via `app/src/services/mappings/` (`fullConversationAssetMapping`, `reversedFullConversationAssetMapping`, `lowercasePropertyNames`). When you add a new field that crosses the wire, update the mapping in both directions.
- Source-of-truth conversation files are `*.bytes` (protobuf). JSON files are export-only, *not* auto-loaded on folder open.
- WebView2 route paths in JS look like `/conversations/export` and are dispatched through the app-owned route dispatcher under `Host/` - see `Controllers/` and `docs/architecture/backend.md`.

## When in doubt

- Read the architecture doc covering the area you are touching before making changes.
- If a memory file under `~/.claude/projects/K--Modding-ConverseTek/memory/` references something specific (workflow, issue style, branch conventions), follow it.
