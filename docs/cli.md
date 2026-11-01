# Command Line Tool (`ctek`)

`ctek` works with BattleTech conversation files without opening the editor. It is aimed at scripted workflows and AI agents that need to read, check and write conversations safely, and it uses the same shared code as the desktop app (`Core/`).

## Build

```bash
dotnet build Cli/ConverseTek.Cli.csproj
# Output: Cli/bin/Debug/net472/ctek.exe
```

The game DLLs must be in `libs/` (see [development.md](development.md)).

## Commands

### `export`

```bash
ctek export <file|folder> [--out <dir>] [--format script|json|both]
```

- A single file with no `--out` prints to the console - a readable script by default, or JSON with `--format json`.
- A folder (or any export with `--out`) writes `<name>.script.txt` and/or `<name>.json` per conversation.
- The JSON is the same Newtonsoft serialisation of `isogame.Conversation` that the editor's Export Conversation produces, so it can be edited and imported back.

The script is a review view, not an editable format. Prompts are labelled `P0`, `P1`... by list position, which is the value `nextNodeIndex` holds (the editor shows `P0` as Prompt #1). Each line carries the node id in brackets, response flags in parentheses (`once`, `always show`, `link`, `input bypass`), and conditions and actions as `if` / `do` lines:

```text
P3  SumireDefault  [9c63fc03f0a671118e7be9d2]
  "[INTERCOM] Commander, Darius. We're receiving an urgent communication..."
  do  Set BattleTech Camera Hard Lock("DARIUS")
  1. "We're on our way, Sumire." -> END  [9c8117194f7943f83a7dad5b]
       do  Start Conversation Custom("9cc71978b9c677fd26a37d5e", "Dead Claim", "Hunt that prospect", 0 = False, 1000 = DC Survey Center)
```

### `import`

```bash
ctek import <file.json> [--out <file.bytes>] [--force]
```

Converts ConverseTek JSON to `.bytes`. The default output path swaps the extension (`x.convo.json` -> `x.convo.bytes`). Before writing it serialises and reads the conversation back, then runs diagnostics against the other conversations in the output folder. It refuses to write when there are errors unless `--force` is passed.

`import` writes exactly what the JSON says. It does not rebuild node indexes or regenerate ids, so the JSON must already have unique `9c...` ids and `index` values that match each prompt's position.

### `check`

```bash
ctek check <file|folder>... [--json]
```

Runs the editor's diagnostics (`Core/Diagnostics/ConversationDiagnostics.cs`, a port of `app/src/utils/conversation-diagnostics-utils.ts`). For a single file, the other conversations in its folder are loaded so sideload targets and duplicate ids resolve. Accepts `.bytes` and `.json`.

The CLI reads files exactly as stored, so it differs from the editor in two places:

- An operation-only input with no call is reported as empty. The editor silently fills it with a default `Get Preset Value (int)` on load.
- Stored values are checked against the definition's allowed types (for example a string in an int-only input). The editor types every arg from its definition on load, so it rarely sees this.

### `refs`

```bash
ctek refs <folder> [--kind tag|stat|conversation] [--filter <text>] [--unresolved] [--json]
```

Lists every tag, stat and conversation id used across a folder, with how each is used (`add`, `remove`, `check`, `set`, `start`, `sideload`) and where (`R1 if`, `P4 do`, `P9.2 if` = prompt 9, response 2). It is driven by operation input labels (`Tag Key`, `Stat Key`, `Conversation Id`), so new operations are picked up from their definitions.

- Conversation ids that are not in the folder, or sideload entry nodes that do not exist, are marked `!!` and make the command exit with 1.
- Tags that are only ever checked are marked "checked but never set in these conversations". That is often fine - contracts and events set tags too - but it is a quick way to spot a misspelt or renamed tag.

## Definitions

Every command loads operation definitions to name inputs, render enum values and run checks. `--defs <dir>` points at a defs folder; otherwise `ctek` uses the nearest `defs/` folder above `ctek.exe`, then above the current directory. Without definitions every operation reports as missing.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Problems found: diagnostic errors (`check`, `import`) or unresolved references (`refs`) |
| 2 | Bad usage or a file that could not be read |

## Typical Agent Workflow

1. `ctek export <file>` to read a conversation as a script.
2. `ctek export <file> --format json` to get the editable JSON.
3. Edit the JSON (keeping ids unique and indexes in step).
4. `ctek check <edited.json>` until it is clean.
5. `ctek import <edited.json> --out <conversations>/<name>.convo.bytes`.
6. Open it in ConverseTek for a final review.
