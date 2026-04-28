# Backend Architecture

The backend is C# on **.NET Framework 4.7.2**, hosted by **Chromely (CefSharp)** as a Chromium desktop app. Its job is to read and write BattleTech's binary `.bytes` conversation files, expose the file system to the UI, and serve the JSON definition packs that drive the dynamic action/condition editor.

Repo root contains the `.csproj`, `Program.cs`, and the source folders described below.

## Entry point — `Program.cs`

- `Program.Main()` (lines ~59–136) bootstraps a Chromely CefSharp WinForms host (.NET 4.7.2, win10-x64).
- **Start URL**: `local://dist/index.html` — serves the React bundle copied to `bin/x64/Debug/net472/dist/` (or release equivalent).
- **Window**: 1720x1000 default, responsive to screen size.
- **Logging**: `logs/conversetek-interface.log` and `logs/conversetek-core.log`.
- **Scheme handlers**:
  - `UseDefaultResourceSchemeHandler("local", ...)` — serves bundle assets.
  - `UseDefaultHttpSchemeHandler("http", "chromely.com")` — fallback.
  - `UseDefautJsHandler("boundControllerAsync", true)` — exposes the `boundControllerAsync` JS object that the frontend calls into.
- **Custom handlers**: `ConverseTekContextMenuHandler` (suppresses right-click in release), `ConverseTekKeyboardHandler` (tilde toggles DevTools in Debug builds).
- **Service registration**: `RegisterServiceAssembly(Assembly.GetExecutingAssembly())` then `ScanAssemblies()` — auto-discovers any class decorated with `[ControllerProperty(Route="...")]`.

## Routing: how a JS call reaches a C# method

1. Frontend: `boundControllerAsync.PostJson("/conversations/export-all", params, postData, callback)`.
2. Chromely's JS handler forwards the call to `Handlers/ConverseTekBoundObject.cs:PostJson(...)`.
3. `ConverseTekBoundObject` calls `RequestTaskRunner.RunAsync(routePath, parameters, postData)` from Chromely's `RestfulService`.
4. `RequestTaskRunner` looks up the route in the table built from `[ControllerProperty]` + `RegisterPostRequest("/path", method)` calls inside each controller's constructor.
5. The matched controller method receives a `ChromelyRequest` (parameters + JSON post data) and returns a `ChromelyResponse` whose `Data` is JSON-serialised back to the JS callback.

Only **GET** and **POST** verbs are exposed by the Chromely version in use — see [`notes.md`](./notes.md).

Avoid registering GET and POST handlers on the exact same path. This Chromely version can collide or shadow routes by path even when the verb differs, which can leave the frontend promise waiting forever. Use unique route paths for paired read/write operations, for example `GET /ai/settings/current` and `POST /ai/settings`.

## Controllers — `Controllers/`

All controllers register routes in their constructors. Three controllers exist:

### `ConversationController` (Route prefix: `conversations`)
- `GET  /conversations` → `GetConversations()` — loads all `*.bytes` (and `.cvsl.bytes` speaker lists) from the working directory and returns them as `List<ConversationAsset>`.
- `POST /conversations/put` → `UpdateConversations()` — persists a single asset as binary `.bytes`.
- `POST /conversations/export` → `ExportConversations()` — writes a single asset as `.json`.
- `POST /conversations/export-all` → `ExportAllConversations()` — re-loads all conversations from disk, writes each as `.json`. Optionally also saves a posted asset if non-empty (lines 113–122). Note: this loop runs unconditionally regardless of the posted asset.
- `POST /conversations/import` → `ImportConversation()` — reads an external JSON file and writes it as `.bytes` into the working directory.
- `POST /conversations/delete` → deletes a conversation file.

### `DefinitionController` (Route prefix: `definitions`)
- `GET /definitions` → `GetDefinitions()` — returns a `Dictionary<string, List<Definition>>` with keys `"operations"`, `"presets"`, `"tags"`.

### `FileSystemController` (Route prefix: `filesystem`)
- `GET  /filesystem` → root drive list.
- `GET  /directories` → directory listing for a given path; resolves shortcuts (Desktop, MyDocuments, Favourites).
- `GET  /quicklinks` / `POST /add-quicklink` / `POST /remove-quicklink` → CRUD on `config/quicklinks.json`.
- `GET  /colour-config` → reads `config/colours.json`.
- `POST /working-directory` → sets `FileSystemService.WorkingDirectory`, the folder used for subsequent conversation loads.
- `GET  /dependency-status` → checks for `ShadowrunDTO.dll` and `ShadowrunSerializer.dll` in `BaseDirectory`.

### `AiController` (Route prefix: `ai`)
- `GET  /ai/settings/current` -> returns AI provider and workspace settings from `config/ai.json`. This deliberately avoids sharing the same path as the save endpoint because Chromely can clash GET and POST routes on the same path.
- `POST /ai/settings` -> saves either global settings or one workspace settings block keyed by conversation folder.
- `POST /ai/models` -> polls the selected provider CLI for the current model catalogue. Codex uses `codex debug models`.
- `POST /ai/draft` -> runs the selected provider and returns an advisory structured draft plus diagnostic file paths.
- `POST /ai/draft-artifact` -> reads prompt/response diagnostics from `logs/ai-drafts` for review in the UI. It must remain restricted to that folder.
- `POST /ai/validate-conversation` -> serialises and reloads a posted conversation asset to check it can round-trip as BattleTech protobuf data before a full AI draft is accepted.

## Services — `Services/`

All use a singleton `getInstance()` pattern.

### `ConversationService`
- Reads/writes BattleTech conversation files.
- `LoadConversations()` — scans `WorkingDirectory` for `*.bytes`, deserialises each via `protobuf-net`'s `RuntimeTypeModel`, wraps in `ConversationAsset`. Files matching `.cvsl.bytes` are loaded as speaker lists instead.
- `SaveConversation(asset, FileFormat)` — writes either binary (`.bytes`) or JSON (`.json`) depending on the enum.
- `ImportConversation(path)` — parses an external JSON file into a `Conversation` object.
- `DeleteConversation(path)` — removes the file.
- `LoadSpeakersList()` / `SaveSpeakersList()` — handles `.cvsl.bytes`.
- Depends on `isogame.Conversation` (from `ShadowrunDTO.dll`) and `protobuf-net.dll`.

### `DefinitionService`
- `LoadDefinitions()` — reads every JSON file under `defs/operations/`, `defs/presets/`, `defs/tags/`. Deserialises into `OperationDefinition`, `PresetDefinition`, `TagDefinition`.
- Returns one combined dictionary, served by `DefinitionController.GetDefinitions()`.

### `FileSystemService`
- Holds the current `WorkingDirectory` (consumed by `ConversationService`).
- `GetRootDrives()`, `GetDirectories(path)` (skips system folders starting with `$`, guards against `UnauthorizedAccessException`), `GetFiles(path)` (filters to `*.json`).

### `ConfigService`
- Reads/writes user prefs: `config/quicklinks.json`, `config/colours.json`.
- Initialises the `config/` directory and placeholder JSON on first use.
- Also owns `config/ai.json`. Workspace AI settings are stored inside this file by normalised conversation-folder key; do not create per-mod settings files under `conversations/`.
- `config/ai.json` has a top-level `Enabled`/`enabled` flag. Missing values default to `true`; setting it to `false` hides AI UI entry points and blocks provider actions.
- AI model catalogues are cached per provider in `config/ai.json`. Saving other AI settings preserves that cache.

### `AiProviderService`
- Dispatches AI draft requests to the selected provider. The first provider is `codex`; other provider names are reserved for later CLI integrations.
- Polls provider model catalogues for the settings UI. Normal requests use the saved provider cache when available; explicit refresh repolls the CLI. An empty model override means "provider default/latest".
- Loads configured context files/folders as read-only prompt context, with extension and size limits.
- The Codex provider writes diagnostics under `logs/ai-drafts/<timestamp>/`: request JSON, prompt, command, stdout, stderr, and the final `draft.json`.
- Providers return suggestions only. They do not write conversation files or mutate active conversation state.

## Handlers — `Handlers/`

- `ConverseTekBoundObject` — the JS↔C# bridge. Sync and async overloads of `GetJson` / `PostJson`. Delegates routing to Chromely's `RequestTaskRunner`.
- `ConverseTekContextMenuHandler` — disables right-click in release builds.
- `ConverseTekKeyboardHandler` — DevTools toggle (Debug only).
- `CallbackResponseStruct` — wrapper for the JSON response returned to JS callbacks.

## Data types — `Data/`

DTOs and enums consumed by controllers/services:

- `ConversationAsset` — `{ FileName, FilePath, Conversation }` (Conversation comes from `isogame`).
- `SpeakerListAsset` — `{ FileName, FilePath, ConversationSpeakerList }`.
- `FileFormat` — enum `JSON | BINARY`.
- `Definition` (abstract) → `OperationDefinition`, `PresetDefinition`, `TagDefinition`.
- `OperationInput`, `OperationInputValue` — sub-types for operation argument schema.
- `FsDirectory`, `FsFile`, `FsView` — filesystem listing structs.

## JSON helpers — `Json/`

- `PresetDefinitionJsonConverter` — Newtonsoft converter that handles the case where a preset value is a scalar instead of an object.

## External assemblies — `libs/`

Referenced from `ConverseTek.csproj`:

- `ShadowrunDTO.dll` — defines `isogame.Conversation`, `isogame.ConversationSpeakerList`, and the rest of BattleTech's serialisable game types.
- `ShadowrunSerializer.dll` — protobuf-related serialisation infrastructure.
- `protobuf-net.dll` — used directly by `ConversationService` for binary read/write via `RuntimeTypeModel`.
- `Newtonsoft.Json.dll` — JSON serialisation everywhere.

The two Shadowrun DLLs are **not in the repo**; users copy them from their own BattleTech install (`BATTLETECH/BattleTech_Data/Managed/`) into `libs/` before building. The `/dependency-status` endpoint surfaces a missing-DLL warning to the UI on startup.
