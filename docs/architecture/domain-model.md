# Domain Model

The core nouns ConverseTek deals with are **conversations**, **nodes**, **operations** (actions and conditions), and **definitions** (the JSON specs that drive the dynamic editor UI).

## Conversation

A conversation is a tree of nodes plus some metadata.

**Frontend** — `app/src/types/ConversationAssetType.ts`:
```ts
type ConversationAssetType = {
  filename: string;
  filepath: string;
  conversation: {
    idRef: { id: string };
    uiName: string;                          // display name in editor
    roots: ElementNodeType[];                // initial player choices
    nodes: PromptNodeType[];                 // NPC / game-spoken nodes
    defaultSpeakerId: string;
    defaultSpeakerOverride: string | null;
    persistentConversation: boolean;
    speakerOverrideId: string;
  };
};
```

**Backend** — `Data/ConversationAsset.cs` wraps `isogame.Conversation` (from `ShadowrunDTO.dll`):
```csharp
public class ConversationAsset {
  public string FileName { get; set; }
  public string FilePath { get; set; }
  public Conversation Conversation { get; set; }   // isogame protobuf type
}
```

The `Conversation` graph itself is BattleTech's protobuf schema. ConverseTek doesn't redefine it — it consumes the game's compiled types.

## Nodes

Two kinds:

### `PromptNodeType` (NPC / game-spoken)
- `app/src/types/PromptNodeType.ts`.
- Fields: `idRef`, `index`, `parentId`, `text`, `branches[]` (player responses), `nodeType`, `truthValue`, `autoFollowBranchDelay`, `inputMaxLength`, `sourceInSceneRef`, `speakerOverrideId`, `actions`, `comment`.
- `type` is always `'node'`.
- Plays the game / NPC line, then offers `branches[]` of player responses.

### `ElementNodeType` (root or response — player-spoken)
- `app/src/types/ElementNodeType.ts`.
- Fields: `idRef`, `parentId`, `nextNodeIndex`, `responseText`, `conditions`, `actions`, `hideIfUnavailable`, `onlyOnce`, `inputBypass`, `auxiliaryLink`, `comment`.
- `type` is `'root'` (top-level player choice) or `'response'` (branch under a PromptNode).
- Points to the next PromptNode via `nextNodeIndex`. A response with `auxiliaryLink: true` is a *link* back to an existing node — used for loops.

## Operations (actions and conditions)

Both actions and conditions share one shape: a list of `OperationCallType` objects.

```ts
type OperationCallType = {
  functionName: string;          // e.g. "Set a tag"
  args: OperationArgType[];
};

type OperationArgType = {
  type?: 'int' | 'string' | 'float' | 'operation' | 'bool' | null;
  intValue: number;
  boolValue: boolean;
  floatValue: number;
  stringValue: string;
  callValue: OperationCallType | null;   // nested op (when type = 'operation')
  variableRefValue: null;
};
```

Where they attach:
- `PromptNodeType.actions` — fired when the NPC line plays.
- `ElementNodeType.actions` — fired when the player picks the response.
- `ElementNodeType.conditions` — gate the response's availability.

Edited in the UI by `EditableLogic` (`app/src/components/EditableLogic/`) and rendered read-only by `ViewableLogic`. Both read the operation's schema from `defStore` to know which inputs to render.

## Definitions (the JSON-driven UI system)

Definitions are JSON files that describe the available operations, presets (enums), and tag scopes. They live under `defs/` at the repo root and are loaded once at startup by the backend, then sent to the frontend, which caches them in `defStore`. The editor renders argument inputs for any operation by looking up its definition — adding a new action is *just* adding a JSON file, no UI code change.

### `defs/operations/`
One file per operation. Example (`set_battletech_tag.json`):
```json
{
  "key": "Set a tag",
  "label": "Set a tag",
  "view": ["inputs"],
  "scope": "action",
  "category": "primary",
  "inputs": [
    {
      "label": "Action",
      "types": ["operation", "int"],
      "values": [
        { "viewlabel": "Add a tag to",      "text": "Add",    "value": 1 },
        { "viewlabel": "Remove a tag from", "text": "Remove", "value": 0 }
      ]
    },
    {
      "label": "Tag Key",
      "types": ["string"],
      "viewlabel": "with the name '{value}'"
    }
  ]
}
```

Fields:
- `key` — matches `OperationCallType.functionName`.
- `scope` — `"action"` or `"condition"` (controls where the operation appears).
- `inputs[]` — argument schema. `types` is the allowed argument types; `values` enumerates choices for fixed-value inputs; `viewlabel` is the read-only render template (with `{value}` substitution).

Backend type: `Data/OperationDefinition.cs` (`Key, Label, Tooltip, Category, Scope, List<OperationInput>`).

### `defs/presets/`
Reusable enum-like value sets. Example (`sim_game_scope.json`):
```json
{
  "key": "SimGameScope",
  "label": "Sim Game Scope",
  "type": "int",
  "values": { "0": "Company", "1": "Commander", "2": "System", "3": "Flashpoint" }
}
```
Backend type: `Data/PresetDefinition.cs`. Custom Newtonsoft converter `Json/PresetDefinitionJsonConverter.cs` handles edge cases.

### `defs/tags/`
Scope-specific tag lists. Example (`commander.json`): `{ "scope": "commander", "tags": ["commander_ancestry_davion", ...] }`. Backend type: `Data/TagDefinition.cs`.

### Loading & exposure

- `Services/DefinitionService.cs:LoadDefinitions()` reads all three subdirectories and returns one `Dictionary<string, List<Definition>>`.
- `Controllers/DefinitionController.cs` serves it on `GET /definitions`.
- `app/src/services/api.ts:getDefinitions()` calls it, runs `lowercasePropertyNames` (PascalCase → camelCase), and stores the result in `defStore` via `setDefinitions`.

## AI conversation drafts

AI drafts are an intermediate authoring format, not a BattleTech runtime format. They are shaped by `app/src/types/AiDraftType.ts` and the provider schema in `config/ai-draft-output.schema.json`.

Important fields:
- `mode` -> `fullConversation`, `nodeSuggestion`, or `branchExpansion`.
- `roots[]` -> initial player choices for full drafts. The first root of a full conversation is intentionally blank and points at the opening prompt node.
- `nodes[]` -> prompt nodes with stable draft `key` values plus readable `comment` authoring notes. For prompt-node text suggestions, `nodes[0].text` carries the replacement text.
- `choices[]` -> player responses that point to a target draft key or deliberately end the conversation. Their `comment` fields describe the branch purpose or condition context.
- For root/response text suggestions, `roots[0].text` carries the replacement text and is not treated as a graph edge.
- `actions[]` / `conditions[]` -> operation intents using existing definition `key` names and typed argument values.
- Prompt node speaker priority follows BattleTech's real fields: `sourceInSceneRef.id` is the cast id and takes priority. If `sourceInSceneRef` is set, BattleTech uses that cast definition. If the prompt should use `speakerOverrideId`, ConverseTek must clear `sourceInSceneRef`. Prompt nodes without `sourceInSceneRef` or `speakerOverrideId` inherit the current SimGame conversation speaker at runtime. ConverseTek labels these as `Inherits`; BattleTech does not provide a distinct narration speaker for SimGame conversation nodes.

Draft keys are temporary. ConverseTek generates real BattleTech ids and prompt indexes during acceptance. This keeps AI output advisory and prevents preview rendering from mutating the active observable conversation graph.

## Other notable types (frontend)

| Type | File | Purpose |
|---|---|---|
| `OperationDefinitionType` | `app/src/types/OperationDefinitionType.ts` | Frontend mirror of `OperationDefinition` |
| `PresetDefinitionType` | `app/src/types/PresetDefinitionType.ts` | Frontend mirror of `PresetDefinition` |
| `DefinitionsType` | `app/src/types/DefinitionsType.ts` | Container: `{ operations, presets, tags }` |
| `ColourConfigType` | `app/src/types/ColourConfig.ts` | UI theme: speaker → colour |
| `ClipboardType` | `app/src/types/ClipboardType.ts` | Copy/paste buffer for nodes |
| `FileSystemItemType` | `app/src/types/FileSystemItemType.ts` | Directory listing entries |

## Persistence formats

| Format | Where | Role |
|---|---|---|
| `*.bytes` | working directory | Source of truth — protobuf binary, what BattleTech ships and consumes |
| `*.cvsl.bytes` | working directory | Speaker list, also protobuf binary |
| `*.json` | working directory (export only) | Human-readable archive, used for diff / hand-edit; **not** auto-loaded on folder open |

Only `*.bytes` and `*.cvsl.bytes` are scanned on Open Folder (see `data-flow.md`).
