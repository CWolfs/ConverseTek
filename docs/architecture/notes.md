# Notes, Quirks, and Conventions

Things worth knowing that are not obvious from the code or other docs. Read this before making non-trivial changes.

## Wire Protocol

### Bridge requests are typed WebView2 messages

Frontend calls go through `app/src/services/rest.ts`, which posts request objects to `window.chrome.webview`. Each request has an id, method, url, parameters, and body. The host replies with the same id, a status code, data, and optional error text.

Do not bypass `rest.ts`; use `get()` / `post()` from there or higher-level helpers in `app/src/services/api.ts`.

### PUT and DELETE are still API conventions

The bridge itself currently exposes `GET` and `POST` helpers. Some frontend calls emulate PUT/DELETE semantics by sending a POST with a `method` field in the body, e.g.:

```ts
post('/conversations/put', { id }, { method: 'PUT', conversationAsset: ... });
```

Keep that convention unless you are deliberately changing the API surface end to end.

### Snake_case <-> camelCase translation crosses the wire

The .NET side uses BattleTech's snake_case fields (`default_speaker_id`, `int_value`, `call_value`); the React side uses camelCase. Translation is hand-rolled in `app/src/services/mappings/`:

- Incoming reads use `fullConversationAssetMapping` via `mapToType<T>`.
- Outgoing writes use `reversedFullConversationAssetMapping`.
- Definitions use `lowercasePropertyNames(obj, true)` because the .NET response is PascalCase across the board.

If you add a new field that crosses the wire, **update both directions of the mapping** or fields may be silently dropped.

## Persistence

### `*.bytes` is the source of truth

Folder Open scans only `*.bytes` and `*.cvsl.bytes`. JSON exports are read-only archives; they are **not** auto-loaded. If you make a change in JSON and want it reflected, use `Import Conversation from JSON` to write it back as a `.bytes` file.

### Speaker lists are separate files

`*.cvsl.bytes` files are loaded by `ConversationService.LoadSpeakersList()` and exposed as `SpeakerListAsset`s. They live alongside conversations in the working directory.

### Working directory is singleton backend state

`FileSystemService.WorkingDirectory` is set by `POST /working-directory` and read by every subsequent conversation load. The frontend has its own copy in `dataStore.workingDirectory`. Keep them in sync if you add a new code path that changes one.

## Backend Gotchas

### Controllers register routes explicitly

Do not expect attribute-based action discovery. Controllers expose `RegisterRoutes(AppRouteDispatcher dispatcher)` and register each route there. If you add an action, register it explicitly in the controller and in `Host/AppRoutes.cs` if a new controller is involved.

### Singleton services

All services use a `getInstance()` static factory. Do not `new` them. Some, such as `ConfigService`, do first-run setup like creating `config/quicklinks.json`; that runs the first time `getInstance()` is called.

### `protobuf-net` is the only thing that understands `.bytes`

Reading or writing a `.bytes` file outside of `ConversationService` is almost certainly wrong. The `isogame` types from `ShadowrunDTO.dll` are the schema; protobuf-net is the codec. There is no schema file in this repo to refer to because the types are compiled into the DLL.

### Game DLLs are external and gitignored

`libs/ShadowrunDTO.dll` and `libs/ShadowrunSerializer.dll` come from a local BattleTech install (`BATTLETECH/BattleTech_Data/Managed/`). The build will not run without them. The frontend asks `/dependency-status` on startup and surfaces a missing-DLL warning if either is absent.

## Frontend Gotchas

### Modern CSS is available

The production desktop shell is WebView2 / Edge Chromium, so app UI can use modern CSS. Prefer clear flex/grid layouts, `gap`, logical properties, and current sizing functions where they make the interface simpler.

### Always wrap observers

Components that read MobX observables must be wrapped in `observer(...)` from `mobx-react`, otherwise they will not re-render.

### `unsavedActiveConversationAsset` vs `activeConversationAsset`

`activeConversationAsset` is the last-saved state; `unsavedActiveConversationAsset` is what the user is editing. Save handlers always send the unsaved one. Dirty-tracking compares against the saved one.

### Dynamic UI from `defs/`

Adding an action / condition / preset / tag is usually just dropping a JSON file into the right `defs/` subdirectory and rebuilding so the file is copied into `bin/.../defs/`. Inputs render automatically based on the `types`, `values`, and `viewlabel` fields.

### Path aliases

Imports use Vite/tsconfig aliases (`components/...`, `containers/...`, `services/...`, `stores/...`, `hooks/...`, `types/...`, `utils/...`). Do not use relative paths like `../../components/Foo` when an alias is available.

## Build & Run

### Fast development uses Vite inside WebView2

`CT: Fast Dev` starts or reuses Vite at `http://127.0.0.1:5173/`, sets `CT_WEB_URL`, and launches `bin/x64/Debug/net472/ConverseTek.exe`. This gives hot reload while keeping the desktop backend bridge available.

Backend changes still require rebuilding the exe. If `CT: Fast Dev` is already running, restart the app process after `CT: Build Server`.

### Static builds are still available

`npm run build` produces `dist/`. `CT: UI Build` runs that build and copies `dist/` to `bin/x64/Debug/net472/dist/`. `CT: Fast Run` launches the exe against that copied static bundle.

### Pre-push hook runs ts-check

`app/package.json` `simple-git-hooks` runs `npm run verify` on `pre-push`. To install the hook locally, run `npm run generate:hooks` once from `app/`. Do not push with TypeScript errors.

### Tasks are VS Code-specific

The build tasks live in `.vscode/tasks.json` and depend on the `actboy168.tasks` extension to surface as buttons. They do not work in Visual Studio. If you are not using VS Code, run the underlying commands directly.

## Workflow Conventions

- Branches: `CT-{issue#}-{kebab-name}` off `master`.
- PRs target `develop`, never `master`. `master` only receives the periodic release PR.
- Issue / PR style is short and conversational (`Area: description`). PR bodies are typically just `Adds #{issue}`.
- Use UK English spelling in prose, comments, and new identifiers. The codebase already follows this in names like `ColourConfig`, `colours.json`, and `minimised`.
