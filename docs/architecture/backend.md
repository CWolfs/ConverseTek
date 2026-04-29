# Backend Architecture

The backend is C# on **.NET Framework 4.7.2**, hosted by a WinForms **WebView2 / Edge Chromium** desktop shell. It reads and writes BattleTech's binary `.bytes` conversation files, exposes the local file system to the UI, serves JSON definition packs, and provides the local route bridge used by the React app.

Repo root contains the `.csproj`, `Program.cs`, and the source folders described below.

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

- Reads/writes BattleTech conversation files.
- `LoadConversations()` scans `WorkingDirectory` for `*.bytes`, deserialises each via `protobuf-net`'s `RuntimeTypeModel`, and wraps it in `ConversationAsset`. Files matching `.cvsl.bytes` are loaded as speaker lists instead.
- `SaveConversation(asset, FileFormat)` writes either binary (`.bytes`) or JSON (`.json`) depending on the enum.
- `ImportConversation(path)` parses an external JSON file into a `Conversation` object.
- `DeleteConversation(path)` removes the file.
- `LoadSpeakersList()` / `SaveSpeakersList()` handle `.cvsl.bytes`.
- Depends on `isogame.Conversation` from `ShadowrunDTO.dll` and `protobuf-net.dll`.

### `DefinitionService`

- `LoadDefinitions()` reads every JSON file under `defs/operations/`, `defs/presets/`, and `defs/tags/`.
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

DTOs and enums consumed by controllers/services:

- `ConversationAsset` - `{ FileName, FilePath, Conversation }` where `Conversation` comes from `isogame`.
- `SpeakerListAsset` - `{ FileName, FilePath, ConversationSpeakerList }`.
- `FileFormat` - enum `JSON | BINARY`.
- `Definition` -> `OperationDefinition`, `PresetDefinition`, `TagDefinition`.
- `OperationInput`, `OperationInputValue` - sub-types for operation argument schema.
- `FsDirectory`, `FsFile`, `FsView` - filesystem listing structs.

## JSON Helpers - `Json/`

- `PresetDefinitionJsonConverter` - Newtonsoft converter that handles the case where a preset value is a scalar instead of an object.

## External Assemblies - `libs/`

Referenced from `ConverseTek.csproj`:

- `ShadowrunDTO.dll` - defines `isogame.Conversation`, `isogame.ConversationSpeakerList`, and the rest of BattleTech's serialisable game types.
- `ShadowrunSerializer.dll` - protobuf-related serialisation infrastructure.
- `protobuf-net.dll` - used directly by `ConversationService` for binary read/write via `RuntimeTypeModel`.
- `Newtonsoft.Json.dll` - JSON serialisation everywhere.

The two Shadowrun DLLs are **not in the repo**; users copy them from their own BattleTech install (`BATTLETECH/BattleTech_Data/Managed/`) into `libs/` before building. The `/dependency-status` endpoint surfaces a missing-DLL warning to the UI on startup.
