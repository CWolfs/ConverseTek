# Data Flow

End-to-end traces of the most common user actions. Each step lists the relevant file path so you can follow along.

## 1. Opening a Folder

1. **UI** - `containers/Header/Header.tsx`: user picks a folder via `FileSystemPicker`. The picker eventually calls `dataStore.setWorkingDirectory(path, name)`.
2. **API** - `app/src/services/api.ts:saveWorkingDirectory()` -> `POST /working-directory` with `{ path }`.
3. **Backend** - `Controllers/FileSystemController.cs:SetWorkingDirectory()` -> `FileSystemService.getInstance().WorkingDirectory = path`.
4. **Frontend** triggers a follow-up `getConversations()` -> `GET /conversations`.
5. **Backend** - `ConversationController.GetConversations()` -> `ConversationService.LoadConversations()`:
   - Scans `WorkingDirectory` for `*.bytes` files.
   - For each: `protobuf-net` `RuntimeTypeModel.Deserialize(stream, ..., typeof(Conversation))` -> wraps in `ConversationAsset { FileName, FilePath, Conversation }`.
   - Files matching `.cvsl.bytes` are routed to `LoadSpeakersList()` instead.
   - Returns `List<ConversationAsset>`.
6. **Serialise & return** - `JsonConvert.SerializeObject(conversations)` -> `AppResponse.Data`, returned through the WebView2 bridge.
7. **Frontend** - `getConversations()` maps the response with `fullConversationAssetMapping` (snake_case -> camelCase) into `ConversationAssetType[]`, then `dataStore.setConversations(typedConversations)` populates the `conversationAssets` ObservableMap.
8. **UI** - observers (`ConversationTree`, `Conversations`) re-render with the loaded list.

In parallel, definitions are fetched once via `getDefinitions()` -> `GET /definitions` -> `DefinitionService.LoadDefinitions()` -> `defStore.setDefinitions(...)`.

## 2. Editing a Dialogue Node

1. **Selection** - User clicks a node in the tree -> `nodeStore.setActiveNode(nodeId)`.
2. **Editor opens** - `ConversationEditor` reads `nodeStore.activeNode`, renders inputs.
3. **Edits** - Input handlers call `nodeStore.setNodeText(...)`, `nodeStore.setPromptNodeSpeakerId(...)`, etc., mutating the node on `dataStore.unsavedActiveConversationAsset`.
4. **Operation edits** - `EditableLogic` argument changes call `defStore.setArgValue(...)`, `defStore.setOperation(...)`, etc.
5. **Dirty tracking** - Mutations call `dataStore.setConversationDirty(true)`.
6. **Save trigger** - Either File -> Save or the Ctrl+S handler in `data-store.ts` fires `updateConversation(id, asset)` from `api.ts`.
7. **Frontend preprocessing** - Before sending: `consolidateSpeaker(asset)`, `removeAllOldFillerNodes(asset)`, `rebuildNodeIndexes(asset)`, then `mapToType(asset, reversedFullConversationAssetMapping)` for the wire format.
8. **API** - `POST /conversations/put` with `{ method: 'PUT', conversationAsset }`.
9. **Backend** - `ConversationController.UpdateConversations()` deserialises into `ConversationAsset`, calls `ConversationService.SaveConversation(asset, FileFormat.BINARY)`, which writes via `protobuf-net` to `*.bytes`.
10. **Response** - Backend reloads and returns the full conversation list. Frontend calls `dataStore.setConversations(typed)` and `setConversationDirty(false)`.

## 3. Exporting a Single Conversation as JSON

1. **UI** - File -> Export Conversation as JSON in `Header.tsx`.
2. **API** - `exportConversation(id, asset)` runs the same preprocessing as a save, maps with `reversedFullConversationAssetMapping`, then `POST /conversations/export`.
3. **Backend** - `ConversationController.ExportConversations()` -> `ConversationService.SaveConversation(asset, FileFormat.JSON)` writes `*.json` next to the `*.bytes` in the working directory.

## 4. Exporting All Conversations as JSON

1. **UI** - File -> Export All Conversations as JSON. Visible whenever `workingDirectory` is set; it does not require an open conversation.
2. **API** - `exportAllConversations(id, asset | null)` -> `POST /conversations/export-all`. The asset, if provided, is sent as a courtesy save; if `null`, the backend treats it as "no extra asset".
3. **Backend** - `ConversationController.ExportAllConversations()`:
   - Loads all conversations from disk via `ConversationService.LoadConversations()`.
   - Loops them, calling `SaveConversation(c, FileFormat.JSON)` on each.
   - Optionally also saves the posted asset if it is non-empty.
   - Returns the updated conversation list.

## 5. Importing a JSON Conversation

1. **UI** - File -> Import Conversation from JSON. `FileSystemPicker` opens in file mode.
2. **API** - `importConversation(path)` calls `dataStore.clearActiveConversation()` then `POST /conversations/import` with `{ path }`.
3. **Backend** - `ConversationController.ImportConversation()` reads the JSON file, deserialises to `Conversation`, then writes it back as `*.bytes` into the working directory via `ConversationService.SaveConversation(..., FileFormat.BINARY)`.
4. **Effect** - The new `*.bytes` shows up on the next reload.

## 6. Deleting a Conversation

1. **UI** - Tree context menu in `ConversationTree`.
2. **API** - `deleteConversation(path)` -> `POST /conversations/delete`.
3. **Backend** - `ConversationService.DeleteConversation(path)` removes the file. Backend returns the updated list.

## 7. Loading Definitions

1. **At startup** - `Conversations` container calls `getDefinitions()` via `api.ts` once.
2. **API** - `GET /definitions`.
3. **Backend** - `DefinitionController.GetDefinitions()` -> `DefinitionService.LoadDefinitions()` reads every JSON file under `defs/operations/`, `defs/presets/`, and `defs/tags/`.
4. **Frontend** - `lowercasePropertyNames(response, true)` (PascalCase -> camelCase) -> `defStore.setDefinitions(typed)`.
5. **Consumption** - `EditableLogic` and `ViewableLogic` look up an operation by `functionName` via `defStore.getDefinition(...)` and render inputs from its `inputs[]` schema.

## 8. Drafting with AI

1. **UI** - Header AI menu opens a full-conversation draft, or the dialogue tree context menu opens a node rewrite / branch expansion.
2. **Settings** - `AiDraftModal` loads `getAiSettings()` and edits global provider options plus workspace context paths, house style notes, campaign brief, and cast personalities. Built-in personality restore defaults come from `config/ai-personalities.json`.
3. **Model polling** - `getAiModels()` posts current provider settings to `POST /ai/models`. Backend returns the saved provider catalogue when present; otherwise Codex runs `codex debug models`. Refresh forces a new poll. A blank model selection means provider default/latest.
4. **Request** - `createAiDraft()` posts the brief, active conversation JSON, selected node JSON, definitions JSON, and working directory to `POST /ai/draft`.
5. **Backend** - `AiController` calls `AiProviderService`, which loads configured context files, selects relevant cast-personality rules, builds a provider prompt, and runs the selected CLI provider.
6. **Diagnostics** - The provider writes prompt/request/stdout/stderr/command/output files under `logs/ai-drafts/<timestamp>/` and returns the structured draft JSON.
7. **Preview** - The frontend parses and validates the draft as `AiConversationDraftType`; warnings and errors are shown before acceptance.
8. **Accept** - Full drafts are round-trip validated through `POST /ai/validate-conversation`, then turned into a fresh active conversation. Node rewrites replace selected text. Branch expansions apply a patch under the selected root/response.
9. **Dirty state** - Acceptance marks the conversation dirty and triggers a tree rebuild. Rejection discards the draft without touching `unsavedActiveConversationAsset`.

## Summary Diagram

```text
Open Folder      | UI -> POST /working-directory -> FileSystemService
                 |    -> GET  /conversations     -> ConversationService.Load -> dataStore
Edit & Save      | UI -> nodeStore/dataStore mutations
                 |    -> POST /conversations/put -> ConversationService.Save (BINARY)
Export single    | UI -> POST /conversations/export       -> Save (JSON)
Export all       | UI -> POST /conversations/export-all   -> Loop Save (JSON)
Import           | UI -> POST /conversations/import       -> Read JSON, Save (BINARY)
Definitions      | once -> GET /definitions -> DefinitionService.Load -> defStore
Draft            | UI -> POST /ai/draft -> AiProviderService -> preview -> explicit accept
```
