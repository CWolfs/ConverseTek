# ConverseTek Agent Guidance

This file is the canonical local guidance for coding agents in this repository. Also follow the workspace-level `AGENTS.md` when working from the multi-root ConverseTek workspace.

## Language

Use UK English in prose, docs, comments, commit messages, PR text, and issue text. Keep existing identifiers as-is when they already use US spelling.

## Project Shape

ConverseTek is a React + TypeScript + MobX frontend in `app/`, hosted by a C#/.NET Framework 4.7.2 Chromely backend at the repository root. The backend reads and writes BattleTech protobuf `.bytes` conversation files through the game DLLs in `libs/`.

Read `docs/architecture/overview.md` before larger changes, then the specific architecture document for the area being touched.

## Chromely Routing

Do not register GET and POST handlers on the exact same route path. This Chromely version can collide or shadow routes by path even when the HTTP verb differs, causing frontend GET promises to never resolve. Use distinct paths such as `GET /ai/settings/current` and `POST /ai/settings`.

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
