# Backend Architecture

The backend is C# on **.NET Framework 4.7.2**, hosted by a WinForms **WebView2 / Edge Chromium** desktop shell. It reads and writes BattleTech's binary `.bytes` conversation files, exposes the local file system to the UI, serves JSON definition packs, and provides the local route bridge used by the React app.

Repo root contains the `.csproj`, `Program.cs`, and the source folders described below. Conversation file handling, definition loading and diagnostics live in the shared `Core/` library (see [Shared Core](#shared-core---core)), which the desktop app and the `ctek` command line tool (`Cli/`, see [docs/cli.md](../cli.md)) both reference.

## Entry Point - `Program.cs`

- `Program.Main()` starts WinForms and opens `Host/WebViewHostForm`.
- **Development URL**: when `CT_WEB_URL` is set, WebView2 navigates to that URL. `CT: Fast Dev` uses `http://127.0.0.1:5173/` so Vite hot reload works inside the desktop shell with the backend bridge still available.
- **Static URL**: otherwise, WebView2 loads the bundled app from `dist/` through the virtual host `https://conversetek.local/index.html`.
- **Window**: 1720x1000 default, responsive to screen size.
- **Logging**: `Infrastructure/Log.cs` writes app logs and mirrors backend logs into the WebView2 DevTools console in debug/dev builds.
- **DevTools**: F12 opens the WebView2 inspector in debug/dev builds.
- **Route registration**: `Host/AppRoutes.cs` explicitly registers controller routes into `Host/AppRouteDispatcher`.

## Routing: How a JS Call Reaches C#

1. Frontend code calls `get()` or `post()` in `app/src/services/rest.ts`, normally via `app/src/services/api.ts`.
2. `rest.ts` sends a typed message through `window.chrome.webview.postMessage(...)`.
3. `Host/WebViewHostForm` receives the message and passes it to `Host/AppRouteDispatcher`.
4. `AppRouteDispatcher` looks up the route by method and path.
5. The matched controller method receives an `AppRequest` and returns an `AppResponse`.
6. WebView2 posts the response back to the frontend with the same request id so `rest.ts` can resolve the correct promise.

The dispatcher keys routes by both method and path, so `GET /thing` and `POST /thing` are distinct. Existing PUT/DELETE-style calls still travel as POST payloads with a `method` field because the frontend API layer already uses that convention.

## Controllers - `Controllers/`

Controllers expose `RegisterRoutes(AppRouteDispatcher dispatcher)` and register routes explicitly.

### `ConversationController`

- `GET  /conversations` -> loads all `*.bytes` and `.cvsl.bytes` speaker lists from the working directory.
- `POST /conversations/put` -> persists a single asset as binary `.bytes`.
- `POST /conversations/export` -> writes a single asset as `.json`.
- `POST /conversations/export-all` -> reloads all conversations from disk, writes each as `.json`, and optionally saves a posted asset first.
- `POST /conversations/import` -> reads an external JSON file and writes it as `.bytes` into the working directory.
- `POST /conversations/delete` -> deletes a conversation file.

### `DefinitionController`

- `GET /definitions` -> returns a `Dictionary<string, List<Definition>>` with keys `"operations"`, `"presets"`, and `"tags"`.

### `FileSystemController`

- `GET  /filesystem` -> root drive list.
- `GET  /directories` -> directory listing for a given path; resolves shortcuts such as Desktop, My Documents, and Favourites.
- `GET  /quicklinks` / `POST /add-quicklink` / `POST /remove-quicklink` -> CRUD on `config/quicklinks.json`.
- `GET  /colour-config` -> reads `config/colours.json`.
- `POST /working-directory` -> sets `FileSystemService.WorkingDirectory`, the folder used for subsequent conversation loads.
- `GET  /dependency-status` -> checks for `ShadowrunDTO.dll` and `ShadowrunSerializer.dll` in `BaseDirectory`.

### `AiController`

- `GET  /ai/settings/current` -> returns provider and workspace settings from `config/ai.json`.
- `POST /ai/settings` -> saves either global settings or one workspace settings block keyed by conversation folder.
- `POST /ai/models` -> polls the selected provider CLI for the current model catalogue. Codex uses `codex debug models`.
- `POST /ai/draft` -> runs the selected provider and returns an advisory structured draft plus diagnostic file paths.
- `POST /ai/draft-artifact` -> reads prompt/response diagnostics from `logs/ai-drafts` for review in the UI. It must remain restricted to that folder.
- `POST /ai/validate-conversation` -> serialises and reloads a posted conversation asset to check it can round-trip as BattleTech protobuf data before a full draft is accepted.

## Host - `Host/`

- `WebViewHostForm` owns the WebView2 control, chooses the dev/static frontend URL, handles bridge messages, opens DevTools, and mirrors backend logs to DevTools.
- `AppRoutes` registers all controller routes.
- `AppRouteDispatcher` matches `GET`/`POST` routes by method and path and invokes controller delegates.
- `AppRequest` / `AppResponse` are app-owned bridge DTOs used by controllers.

## Services - `Services/`

All services use a singleton `getInstance()` pattern.

### `ConversationService`

- Reads/writes BattleTech conversation files through `Core/Conversations/ConversationFiles`, adding the app's logging and file-extension handling.
- `LoadConversations()` scans `WorkingDirectory` for `*.bytes`, deserialises each, and wraps it in `ConversationAsset`. Files matching `.cvsl.bytes` are loaded as speaker lists instead.
- `SaveConversation(asset, FileFormat)` writes either binary (`.bytes`) or JSON (`.json`) depending on the enum.
- `ImportConversation(path)` parses an external JSON file into a `Conversation` object.
- `DeleteConversation(path)` removes the file.
- `LoadSpeakersList()` / `SaveSpeakersList()` handle `.cvsl.bytes`.
- Depends on `isogame.Conversation` from `ShadowrunDTO.dll` and `protobuf-net.dll`.

### `DefinitionService`

- `LoadDefinitions()` loads `defs/` next to the executable through `Core/Definitions/DefinitionSet`, which reads every JSON file under `defs/operations/`, `defs/presets/`, and `defs/tags/`.
- Deserialises definitions into `OperationDefinition`, `PresetDefinition`, and `TagDefinition`.
- Returns one combined dictionary, served by `DefinitionController.GetDefinitions()`.

### `FileSystemService`

- Holds the current `WorkingDirectory` consumed by `ConversationService`.
- `GetRootDrives()`, `GetDirectories(path)`, and `GetFiles(path)` provide the folder picker data.
- Directory reads skip known system folders and guard against access exceptions.

### `ConfigService`

- Reads/writes user prefs: `config/quicklinks.json`, `config/colours.json`, and `config/ai.json`.
- Initialises the `config/` directory and placeholder JSON on first use.
- Workspace AI settings are stored inside `config/ai.json` by normalised conversation-folder key; do not create per-mod settings files under `conversations/`.
- `config/ai.json` has a top-level `Enabled`/`enabled` flag. Missing values default to `true`; setting it to `false` hides AI UI entry points and blocks provider actions.
- AI model catalogues are cached per provider in `config/ai.json`. Saving other AI settings preserves that cache.
- Workspace AI settings also store editable cast personalities. Missing personality lists are seeded from `config/ai-personalities.json`; explicit empty lists are preserved so modders can remove them.

### `AiProviderService`

- Dispatches draft requests to the selected provider. The first provider is `codex`; other provider names are reserved for later CLI integrations.
- Polls provider model catalogues for the settings UI. Normal requests use the saved provider cache when available; explicit refresh repolls the CLI. An empty model override means "provider default/latest".
- Loads configured context files/folders as read-only prompt context, with extension and size limits.
- Adds relevant workspace cast-personality rules to the provider prompt by matching the brief, active conversation, and selected node against configured cast ids, speaker ids, labels, and default keys.
- Writes diagnostics under `logs/ai-drafts/<timestamp>/`: request JSON, prompt, command, stdout, stderr, and the final `draft.json`.
- Providers return suggestions only. They do not write conversation files or mutate active conversation state.

## Data Types - `Data/`

App-only DTOs consumed by controllers/services:

- `FsDirectory`, `FsFile`, `FsView` - filesystem listing structs.
- `AiDraft*`, `AiSettings` - AI drafting request, result and settings types.

The conversation and definition types moved to `Core/Data/` and keep the `ConverseTek.Data` namespace.

## Shared Core - `Core/`

`ConverseTek.Core.csproj` is a .NET Framework 4.7.2 class library with no UI or singleton state. Methods throw on failure and leave logging to the caller. The app's `ConverseTek.csproj` excludes `Core\**` and `Cli\**` from its own compile globs and takes a project reference instead.

- `Data/` - `ConversationAsset`, `SpeakerListAsset`, `FileFormat`, `Definition` -> `OperationDefinition` / `PresetDefinition` / `TagDefinition`, `OperationInput`, `OperationInputValue`.
- `Json/PresetDefinitionJsonConverter` - Newtonsoft converter that handles the case where a preset value is a scalar instead of an object.
- `Conversations/ConversationFiles` - load/save `.bytes` (protobuf via `RuntimeTypeModel`) and JSON, speaker lists, folder loading and `RoundTrip()` (serialise then read back).
- `Conversations/ConversationIds` - the `conversationId:id` comparison rules, matching the frontend's `getId`.
- `Conversations/OperationArgs` - works out which `TsVariant` field an arg uses, matching the editor's def-store typing and BattleTech's raw reading.
- `Conversations/OperationFormatter`, `ConversationScriptWriter` - the readable script view used by `ctek export`.
- `Definitions/DefinitionSet` - loads a defs folder and looks up operations and presets.
- `Diagnostics/ConversationDiagnostics` - C# port of `app/src/utils/conversation-diagnostics-utils.ts`. **Keep the two in step**: a check added or changed in one must be mirrored in the other. The deliberate differences are listed at the top of the C# file and in [docs/cli.md](../cli.md).
- `References/ConversationReferences` - tag, stat and conversation id usage across a set of conversations, driven by operation input labels.

## Command Line Tool - `Cli/`

`ConverseTek.Cli.csproj` builds `ctek.exe` (`export`, `import`, `check`, `refs`) on top of `Core/`. It is built separately from the app and is not part of `BuildServer`. Usage is documented in [docs/cli.md](../cli.md).

## Code Quality - `Directory.Build.props`, `.editorconfig`, `Analyzers/`

`Directory.Build.props` applies to every C# project in the repo. It turns on `EnforceCodeStyleInBuild` and the .NET analysers (CA1502 complexity, threshold in `CodeMetricsConfig.txt`), sets `LangVersion` to `latest` for file-scoped namespaces, and adds `Analyzers/ConverseTek.Analyzers.csproj` as an analyser to every project except itself. That project (netstandard2.0, Roslyn) holds `FileLengthAnalyzer`: CTK0001 warns above 700 lines and CTK0002 fails above 800. The rules themselves are in the root `.editorconfig`; see `AGENTS.md` "Code Style and Linting".

## External Assemblies - `libs/`

Referenced from `ConverseTek.csproj`:

- `ShadowrunDTO.dll` - defines `isogame.Conversation`, `isogame.ConversationSpeakerList`, and the rest of BattleTech's serialisable game types.
- `ShadowrunSerializer.dll` - protobuf-related serialisation infrastructure.
- `protobuf-net.dll` - used by `Core/Conversations/ConversationFiles` for binary read/write via `RuntimeTypeModel`.
- `Newtonsoft.Json.dll` - JSON serialisation everywhere.

The two Shadowrun DLLs are **not in the repo**; users copy them from their own BattleTech install (`BATTLETECH/BattleTech_Data/Managed/`) into `libs/` before building. The `/dependency-status` endpoint surfaces a missing-DLL warning to the UI on startup.
