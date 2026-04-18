# Frontend Architecture

The frontend is a React + TypeScript SPA using MobX for state and Ant Design for UI primitives. It runs inside the Chromely Chromium shell and talks to the .NET backend via a JS bridge object (`boundControllerAsync`).

Source root: `app/src/`. Build with `npm run build` (or `start` for dev server) from `app/`.

## Directory layout (`app/src/`)

| Directory | Role |
|---|---|
| `assets/` | Static images |
| `components/` | Presentational, reusable widgets (e.g. `EditableLogic`, `ViewableLogic`, `FileTree`, `DialogEditor`, `Modals`) |
| `containers/` | Smart components that consume stores (`Header`, `Conversations`, `ConversationTree`, `ConversationEditor`, `ConversationActions`, `ConversationConditions`, `Footer`, `GlobalModal`, `SplashScreen`) |
| `css/` | Global styles, colour tokens, ant overrides |
| `hooks/` | `useStore`, `useControlWheel`, `useWindowSize` |
| `layouts/` | `MainLayout` |
| `services/` | Backend bridge (`rest.ts`), high-level API (`api.ts`), and snake_case ↔ camelCase mappings (`mappings/`) |
| `stores/` | MobX singletons: `dataStore`, `nodeStore`, `modalStore`, `defStore`, `errorStore` |
| `types/` | Domain TypeScript types |
| `utils/` | Pure helpers for trees, nodes, conversations, numbers |

## Bootstrap

1. `app/src/index.tsx` — mounts `<App />` to `#root`.
2. `app/src/App.tsx` — instantiates the store map, wraps the tree in MobX `<Provider {...stores}>`, runs initial dependency / colour-config checks, exports as `observer(App)`.
3. `app/src/stores/index.ts` — defines the singletons (`export const dataStore = new DataStore()` etc.).
4. `app/src/hooks/useStore.ts` — typed accessor: `const data = useStore<DataStore>('data')`.

## State management (MobX)

Five stores, all singletons:

| Store | File | Owns | Notable observables / actions |
|---|---|---|---|
| `DataStore` | `stores/dataStore/data-store.ts` | Working directory, all loaded conversations, the active + unsaved-active assets, dirty flag | `workingDirectory`, `conversationAssets` (Map), `activeConversationAsset`, `unsavedActiveConversationAsset`, `isConversationDirty`; `setConversations`, `setActiveConversation`, `createNewConversation`, Ctrl+S handler |
| `NodeStore` | `stores/nodeStore/node-store.ts` | Currently selected tree node, expansion state, clipboard, tree rebuild signal | `activeNode`, `expandMap`, `clipboard`, `rebuild`; `setActiveNode`, `addPromptNode`, `addResponseNode`, `deleteNodeCascade`, `pasteAsLinkFromClipboard` |
| `ModalStore` | `stores/modalStore/modal-store.tsx` | Global modal stack | `modals`, `options`; `setModelContent`, `closeModal`, `setOnOk`, `setOnCancel` |
| `DefStore` | `stores/defStore/def-store.ts` | Loaded operation / preset / tag definitions | `operations`, `presets`, `tags`, `definitionCount`; `setDefinitions`, `getDefinition`, `setArgValue`, `setOperation` |
| `ErrorStore` | `stores/errorStore/error-store.ts` | Auth / HTTP error map | `authErrors`; `setError`, `reset` |

Containers consume stores by key: `useStore<DataStore>('data')`, `useStore<NodeStore>('node')`, etc. Wrap any container or component that reads observables in `observer(...)` from `mobx-react`.

## Major UI surfaces (containers)

- `Header` — File menu (Open Folder, Save, Import/Export, Export All), top nav. Reads `dataStore.workingDirectory`, `dataStore.activeConversationAsset`.
- `Conversations` — Top-level layout; loads conversations + definitions on mount; switches between `ConversationEditor` and `SplashScreen`.
- `ConversationTree` — Left sidebar list of conversations.
- `ConversationEditor` — Main workspace; hosts `ConversationGeneral`, `ConversationActions`, `ConversationConditions` and the dialogue tree.
- `ConversationActions` / `ConversationConditions` — Edit operation lists on the active node, driven by `defStore`.
- `GlobalModal` — Renders modals from `modalStore`.
- `Footer`, `SplashScreen` — Status bar / empty state.

## Backend communication

`app/src/services/rest.ts`
- Exports `get<T>(url, params?)` and `post<T>(url, params, postData?)`.
- Both delegate to `boundControllerAsync.getJson(...)` / `postJson(...)` — a JS object exposed by Chromely's `UseDefautJsHandler("boundControllerAsync", true)` (see `Program.cs:84`).
- Responses come back wrapped: `{ ResponseText: JSON.stringify({ ReadyState, Status, Data }) }` and are unwrapped by `promiseSupportedCallback`.
- Chromely's pinned version only supports GET and POST. PUT / DELETE are emulated by sending POST with a `method: 'PUT'` field in `postData`, which the backend reads.

`app/src/services/api.ts`
- High-level operations layered over `rest.ts`. Knows the routes (`/conversations`, `/conversations/put`, `/conversations/export`, `/conversations/export-all`, `/conversations/import`, `/conversations/delete`, `/definitions`, `/filesystem`, `/directories`, `/quicklinks`, `/colour-config`, `/working-directory`, `/dependency-status`).
- Handles preprocessing (`consolidateSpeaker`, `removeAllOldFillerNodes`, `rebuildNodeIndexes`) before sending writes.
- Updates stores after responses (`dataStore.setConversations`, `defStore.setDefinitions`, etc.).

## Snake_case ↔ camelCase mapping

`app/src/services/mappings/`
- The .NET backend uses PascalCase / snake_case (BattleTech names like `default_speaker_id`, `int_value`); the frontend uses camelCase.
- `mapToType<T>(obj, mapping)` recursively renames keys.
- `fullConversationAssetMapping` — incoming (snake_case → camelCase), used after GET `/conversations`.
- `reversedFullConversationAssetMapping` — outgoing (camelCase → snake_case), used before POST `/conversations/put` and `/conversations/export`.
- `lowercasePropertyNames(obj, firstCharLower)` — used for the definitions response which is PascalCase across the board.

If you add a field that crosses the wire, update both directions.

## Build & tooling

- **Webpack** — `app/webpack.config.js` plus mode-specific files in `app/webpack/`. Three modes via `CT_ENV`: `local` (dev server), `development` (debug bundle to `dist/`), `production` (minified bundle to `dist/`).
- **TypeScript** — `app/tsconfig.json`. Strict mode, no emit (Babel/webpack handle output). Path aliases mirror the webpack aliases (`components/*`, `containers/*`, `services/*`, `stores/*`, `hooks/*`, `types/*`, `utils/*`).
- **Babel** — `.babelrc` with preset-env, preset-react, preset-typescript, decorators, class properties.
- **PostCSS** — `postcss.config.js` (autoprefixer, nested, simple-vars).
- **Linting** — Prettier (`prettier.config.js`) and TypeScript via `npm run ts-check`.
- **Pre-push hook** — `app/package.json` `simple-git-hooks` runs `npm run verify` (which runs `ts-check`).
