# Backend Architecture

The backend is C# on **.NET Framework 4.7.2**, hosted by **Chromely (CefSharp)** as a Chromium desktop app. Its job is to read and write BattleTech's binary `.bytes` conversation files, expose the file system to the UI, and serve the JSON definition packs that drive the dynamic action/condition editor.

Repo root contains the `.csproj`, `Program.cs`, and the source folders described below.

## Entry point — `Program.cs`

- `Program.Main()` (lines ~59–136) bootstraps a Chromely CefSharp WinForms host (.NET 4.7.2, win10-x64).
- **Start URL**: `local://dist/index.html` — serves the React bundle copied to `bin/x64/Debug/net472/dist/` (or release equivalent).
- **Window**: 1480×900 default, responsive to screen size.
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
