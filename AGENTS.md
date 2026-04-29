# ConverseTek Agent Guidance

This file is the canonical local guidance for coding agents in this repository. Also follow the workspace-level `AGENTS.md` when working from the multi-root ConverseTek workspace.

## Language

Use UK English in prose, docs, comments, commit messages, PR text, and issue text. Keep existing identifiers as-is when they already use US spelling.

## Project Shape

ConverseTek is a React + TypeScript + MobX frontend in `app/`, hosted by a C#/.NET Framework 4.7.2 WebView2 desktop shell at the repository root. The backend reads and writes BattleTech protobuf `.bytes` conversation files through the game DLLs in `libs/`.

Read `docs/architecture/overview.md` before larger changes, then the specific architecture document for the area being touched.

## Desktop Bridge Routing

Frontend calls go through `app/src/services/rest.ts`, which sends typed bridge messages to the WebView2 host. Backend routes are registered in the app-owned dispatcher under `Host/`; keep route registration keyed by method and path, and keep frontend API calls inside `app/src/services/api.ts`.

## Frontend CSS

The desktop host uses WebView2/Edge Chromium. Modern CSS is available, but keep CEF-era margin fallbacks in older UI code until the relevant views have been smoke tested in the WebView2 runtime.

## Frontend Workflow

The frontend uses Vite. Use `CT: Fast Dev` for the normal hot reload workflow; it starts or reuses the Vite server, then starts the WebView2 desktop shell with `CT_WEB_URL=http://127.0.0.1:5173/` so the backend bridge remains available. Keep `CT: UI Build` for static builds into `dist/` and the debug output folder. Webpack remains available through `npm run webpack-build` only as a fallback while the migration settles.

## AI Drafting

AI-assisted conversation drafting is advisory only. Drafts must stay outside `dataStore.unsavedActiveConversationAsset` until the user accepts them.

- Global AI settings live in `config/ai.json`.
- Workspace AI settings are keyed by conversation folder inside `config/ai.json`; do not create loose settings files in mod `conversations/` folders.
- Workspace cast personalities live inside `config/ai.json`; built-in default personalities live in `config/ai-personalities.json`. Keep defaults editable, preserve explicit empty lists, and apply them through provider prompts rather than hard-coding character voice into draft conversion.
- Backend provider work goes through `Services/AiProviderService.cs`; keep provider names generic so Codex, Claude Code, and future CLIs can share the interface.
- Frontend draft conversion lives in `app/src/utils/ai-draft-utils.ts`; keep these functions pure and return fresh conversation assets or explicit patch objects.
- Accepting a full draft must use "Turn Into Real Conversation"; node or branch suggestions must remain "Accept" / "Reject" until accepted.

## Verification

Always run the relevant lint and test commands before handing work back. For frontend changes, run `npm run ts-check` from `app/`, the configured lint command if present, and the relevant Vitest suite. For backend changes, run `dotnet build ConverseTek.csproj /t:BuildServer` from the repo root when game DLLs are available. If a lint or test command is missing, blocked, or not relevant to the touched area, say that explicitly in the final response.
