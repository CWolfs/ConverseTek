# Frontend Architecture

The frontend is a React + TypeScript SPA using MobX for state and Ant Design for UI primitives. It runs inside the WebView2 / Edge Chromium desktop shell and talks to the .NET backend through `window.chrome.webview`.

Source root: `app/src/`. Build with `npm run build` from `app/`, or use `CT: Fast Dev` for the normal hot reload workflow inside the desktop shell.

## Directory Layout (`app/src/`)

| Directory | Role |
|---|---|
| `assets/` | Static images |
| `components/` | Presentational, reusable widgets such as `EditableLogic`, `ViewableLogic`, `FileTree`, `DialogEditor`, and modals |
| `containers/` | Smart components that consume stores (`Header`, `Conversations`, `ConversationTree`, `ConversationEditor`, `Footer`, `GlobalModal`, `SplashScreen`) |
| `css/` | Global styles, colour tokens, Ant Design overrides |
| `hooks/` | `useStore`, `useControlWheel`, `useWindowSize` |
| `layouts/` | `MainLayout` |
| `services/` | Backend bridge (`rest.ts`), high-level API (`api.ts`), and snake_case <-> camelCase mappings (`mappings/`) |
| `stores/` | MobX singletons: `dataStore`, `nodeStore`, `modalStore`, `defStore`, `errorStore` |
| `types/` | Domain TypeScript types |
| `utils/` | Pure helpers for trees, nodes, conversations, numbers, and draft conversion |

## Bootstrap

1. `app/src/index.tsx` mounts `<App />` to `#root`.
2. `app/src/App.tsx` instantiates the store map, wraps the tree in MobX `<Provider {...stores}>`, runs initial dependency / colour-config checks, and exports as `observer(App)`.
3. `app/src/stores/index.ts` defines the singletons.
4. `app/src/hooks/useStore.ts` provides the typed store accessor.

## State Management

Stores are MobX singletons. Containers consume stores by key with `useStore<T>('data')`, `useStore<T>('node')`, etc. Wrap any component that reads observables in `observer(...)` from `mobx-react`.

| Store | Owns |
|---|---|
| `DataStore` | Working directory, loaded conversations, active/unsaved assets, dirty state |
| `NodeStore` | Selected tree node, expansion state, clipboard, tree rebuild signal |
| `ModalStore` | Global modal stack |
| `DefStore` | Operation, preset, and tag definitions |
| `ErrorStore` | Auth / HTTP error map |

## Major UI Surfaces

- `Header` - File menu, AI menu, top navigation.
- `AiDraftModal` - Drafting, suggestion review, provider settings, and workspace cast-personality editing. Draft preview state stays local until accepted.
- `Conversations` - Top-level layout; loads conversations + definitions on mount.
- `ConversationTree` - Left sidebar list of conversations.
- `ConversationEditor` - Main workspace; hosts conversation metadata, actions, conditions, and the dialogue tree.
- `GlobalModal` - Renders modals from `modalStore`.
- `Footer`, `SplashScreen` - Status bar and empty state.

## Backend Communication

`app/src/services/rest.ts`

- Exports `get<T>(url, params?)` and `post<T>(url, params, postData?)`.
- Sends a bridge request through `window.chrome.webview.postMessage(...)`.
- Each request includes an id, method, url, parameters, and body.
- Responses include the same id plus status, data, and optional error text. This lets multiple requests be in flight at the same time.
- PUT / DELETE style actions are still emulated by sending POST with a `method: 'PUT'` or `method: 'DELETE'` field in `postData`.

`app/src/services/api.ts`

- High-level operations layered over `rest.ts`. It owns the route names used by the UI.
- Wraps conversation, definition, file-system, colour config, dependency, and AI routes.
- Handles preprocessing (`consolidateSpeaker`, `removeAllOldFillerNodes`, `rebuildNodeIndexes`) before sending writes.
- Updates stores after responses (`dataStore.setConversations`, `defStore.setDefinitions`, etc.).

## AI Drafting Flow

- Whole-conversation drafts are opened from the Header `AI` menu. Node rewrites and branch expansion are opened from the dialogue tree context menu.
- AI entry points are gated by `config/ai.json` `Enabled`/`enabled`, defaulting to on.
- The model selector loads the saved provider catalogue first, polls the provider CLI when no cache exists, and only repolls on `Refresh`.
- Workspace AI settings include context paths, house style notes, campaign brief, and editable cast personalities. Cast personalities link rules to cast ids and speaker ids so generated dialogue can stay in character for vanilla and custom casts; built-in restore defaults are supplied by `config/ai-personalities.json`.
- AI responses are parsed as `AiConversationDraftType`, rendered as a read-only tree preview where possible, and validated before acceptance. Prompt and response diagnostics can be opened from the draft metadata panel.
- `app/src/utils/ai-draft-utils.ts` converts drafts with pure functions. Full drafts produce a fresh `ConversationAssetType`; branch expansion produces a patch; node suggestions produce replacement text.
- Accepting a draft is the only point where MobX state changes.

## Snake_case <-> CamelCase Mapping

`app/src/services/mappings/`

- The .NET backend uses PascalCase / snake_case for BattleTech-flavoured fields such as `default_speaker_id`, `int_value`, and `call_value`; the frontend uses camelCase.
- `mapToType<T>(obj, mapping)` recursively renames keys.
- `fullConversationAssetMapping` - incoming (snake_case -> camelCase), used after GET `/conversations`.
- `reversedFullConversationAssetMapping` - outgoing (camelCase -> snake_case), used before POST `/conversations/put` and `/conversations/export`.
- `lowercasePropertyNames(obj, firstCharLower)` - used for PascalCase responses such as definitions.

If you add a field that crosses the wire, update both directions.

## CSS Runtime

The desktop shell runs modern Edge Chromium through WebView2. Production UI code can use current CSS features such as flex/grid gaps, container-friendly sizing, logical properties, `min()`/`max()`/`clamp()`, and modern selectors. Prefer the simpler modern CSS when it makes layout clearer.

## Build & Tooling

- **Vite** - `app/vite.config.ts` is the normal dev and build path. `npm start` starts Vite on `http://127.0.0.1:5173/`; `CT: Fast Dev` starts or reuses that server and launches the desktop shell with `CT_WEB_URL` set.
- **Static build** - `npm run build` runs verification and emits `dist/`. `CT: UI Build` copies `dist/` to `bin/x64/Debug/net472/dist/` for `CT: Fast Run`.
- **TypeScript** - `app/tsconfig.json`. Strict mode, no emit. Path aliases mirror Vite aliases (`components/*`, `containers/*`, `services/*`, `stores/*`, `hooks/*`, `types/*`, `utils/*`).
- **Babel/PostCSS** - Vite uses the configured React/Babel and PostCSS pipeline.
- **Linting** - TypeScript via `npm run ts-check`, ESLint via `npm run lint`, and Prettier via `prettier.config.js`.
- **React DevTools** - `CT: RTool` starts the standalone React DevTools process. In Vite dev mode the app injects the connector script so it can attach inside WebView2.
- **Pre-push hook** - `app/package.json` `simple-git-hooks` runs `npm run verify`.
