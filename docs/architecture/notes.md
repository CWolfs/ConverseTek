# Notes, Quirks, and Conventions

Things worth knowing that aren't obvious from the code or other docs. Read this before making non-trivial changes.

## Wire protocol quirks

### Only GET and POST are supported on the JS bridge
Chromely's pinned version doesn't expose PUT or DELETE on the JS-to-C# bridge. Anywhere the frontend wants those semantics it sends a POST with a `method` field in the body, e.g.:
```ts
post('/conversations/put', { id }, { method: 'PUT', conversationAsset: ... });
```
The backend ignores the `method` field — it's vestigial and only useful if you read the JSON dump in logs. Don't introduce a real PUT/DELETE without first upgrading Chromely.

### Snake_case ↔ camelCase translation crosses the wire
The .NET side uses BattleTech's snake_case fields (`default_speaker_id`, `int_value`, `call_value`); the React side uses camelCase. Translation is hand-rolled in `app/src/services/mappings/`:
- Incoming reads use `fullConversationAssetMapping` via `mapToType<T>`.
- Outgoing writes use `reversedFullConversationAssetMapping`.
- Definitions use `lowercasePropertyNames(obj, true)` because the .NET response is PascalCase across the board.

If you add a new field that crosses the wire, **update both directions of the mapping** — you'll get silent dropped fields otherwise.

### Response envelope
The Chromely response comes back as `{ ResponseText: JSON.stringify({ ReadyState, Status, Data }) }`. `app/src/services/rest.ts:promiseSupportedCallback` unwraps it. Don't bypass `rest.ts` — call the bridge through `get()` / `post()`.

## Persistence

### `*.bytes` is the source of truth
Folder Open scans only `*.bytes` and `*.cvsl.bytes`. JSON exports are read-only archives — they're **not** auto-loaded. If you make a change in JSON and want it reflected, use `Import Conversation from JSON` to write it back as a `.bytes` file.

### Speaker lists are separate files
`*.cvsl.bytes` files are loaded by `ConversationService.LoadSpeakersList()` and exposed as `SpeakerListAsset`s. They live alongside conversations in the working directory.

### Working directory is a singleton state on the backend
`FileSystemService.WorkingDirectory` is set by `POST /working-directory` and read by every subsequent conversation load. The frontend has its own copy in `dataStore.workingDirectory`. Keep them in sync if you add a new code path that changes one.

## Backend gotchas

### Controllers register routes in their constructors
Don't expect attribute-based action discovery. Each controller calls `RegisterPostRequest("/path", method)` or `RegisterGetRequest(...)` in its constructor. If you add an action, register it explicitly.

### Singleton services
All services use a `getInstance()` static factory. Don't `new` them. Some (e.g. `ConfigService`) do first-run setup like creating `config/quicklinks.json` — that runs the first time `getInstance()` is called.

### `protobuf-net` is the only thing that understands `.bytes`
Reading or writing a `.bytes` file outside of `ConversationService` is almost certainly wrong. The `isogame` types from `ShadowrunDTO.dll` are the schema; protobuf-net is the codec. There's no schema file in this repo to refer to — the types are compiled into the DLL.

### Game DLLs are external & gitignored
`libs/ShadowrunDTO.dll` and `libs/ShadowrunSerializer.dll` come from a local BattleTech install (`BATTLETECH/BattleTech_Data/Managed/`). The build won't run without them. The frontend asks `/dependency-status` on startup and surfaces a missing-DLL warning if either is absent.

## Frontend gotchas

### Always wrap observers
Components that read MobX observables must be wrapped in `observer(...)` from `mobx-react`, otherwise they won't re-render. The `Header` container does this via `export const ObservingHeader = observer(Header)` — follow the same pattern.

### `unsavedActiveConversationAsset` vs `activeConversationAsset`
`activeConversationAsset` is the last-saved state; `unsavedActiveConversationAsset` is what the user is editing. Save handlers always send the *unsaved* one. Dirty-tracking compares against the saved one.

### Dynamic UI from `defs/`
Adding an action / condition / preset / tag is *just* dropping a JSON file into the right `defs/` subdirectory and rebuilding (so the file is copied into `bin/.../defs/`). No frontend code change. Inputs render automatically based on the `types`, `values`, and `viewlabel` fields. See `domain-model.md` for the JSON shape.

### Path aliases
Imports use webpack/tsconfig aliases (`components/...`, `containers/...`, `services/...`, `stores/...`, `hooks/...`, `types/...`, `utils/...`). Don't use relative paths like `../../components/Foo` — the alias is the convention.

## Build & run

### Frontend bundle has to be copied next to the exe
`npm run build` produces `dist/`. The `Fast Run` task launches `bin/x64/Debug/net472/ConverseTek.exe`, which loads the bundle from `bin/x64/Debug/net472/dist/`. The `UI Build` task does both (`npm run build` + `xcopy`). If you build the frontend manually you have to copy the bundle yourself.

### Pre-push hook runs ts-check
`app/package.json` `simple-git-hooks` runs `npm run verify` (= `ts-check`) on `pre-push`. To install the hook locally, run `npm run generate:hooks` once from `app/`. Don't push with TypeScript errors.

### Tasks are VS Code-specific
The build tasks live in `.vscode/tasks.json` and depend on the `actboy168.tasks` extension to surface as buttons. They don't work in Visual Studio. If you're not using VS Code, run the underlying commands directly.

## Workflow conventions

- Branches: `CT-{issue#}-{kebab-name}` off `master`.
- PRs target `develop`, never `master`. `master` only receives the periodic release PR.
- Issue / PR style is short and conversational (`Area: description`). PR bodies are typically just `Adds #{issue}`.
- Use UK English spelling in prose, comments, and new identifiers (the codebase already follows this — `ColourConfig`, `colours.json`, `minimised`).
