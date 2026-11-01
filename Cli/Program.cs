namespace ConverseTek.Cli {
  using System;
  using System.Collections.Generic;
  using System.IO;
  using System.Linq;
  using System.Text;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Serialization;

  using isogame;

  using ConverseTek.Conversations;
  using ConverseTek.Data;
  using ConverseTek.Definitions;
  using ConverseTek.Diagnostics;
  using ConverseTek.References;

  /*
    Exit codes: 0 success, 1 problems found (diagnostic errors or unresolved references), 2 bad usage or I/O failure
  */
  public static class Program {
    private const int EXIT_OK = 0;
    private const int EXIT_PROBLEMS = 1;
    private const int EXIT_FAILURE = 2;

    private const string USAGE = @"ctek - ConverseTek command line tools for BattleTech conversation files

Usage:
  ctek export <file|folder> [--out <dir>] [--format script|json|both]
      Writes a readable script and/or JSON. A single file with no --out prints to the console.
  ctek import <file.json> [--out <file.bytes>] [--force]
      Converts ConverseTek JSON to .bytes after a round-trip and diagnostics check.
      Refuses to write when there are errors unless --force is given.
  ctek check <file|folder>... [--json]
      Runs the editor's diagnostics. Other conversations in the same folder are used to resolve
      sideload targets. Accepts .bytes and .json files.
  ctek refs <folder> [--kind tag|stat|conversation] [--filter <text>] [--unresolved] [--json]
      Lists every tag, stat and conversation id used across a folder and where.

Options for every command:
  --defs <dir>   Definition folder (defs/operations etc). Defaults to the nearest defs folder
                 above ctek.exe, then above the current directory.

Exit codes: 0 ok, 1 problems found, 2 usage or file error.";

    public static int Main(string[] args) {
      Console.OutputEncoding = new UTF8Encoding(false);

      try {
        CliArgs cliArgs = CliArgs.Parse(args);
        if (cliArgs.Command == null || cliArgs.Command == "help" || cliArgs.Switch("help")) {
          Console.WriteLine(USAGE);
          return cliArgs.Command == null && args.Length > 0 ? EXIT_FAILURE : EXIT_OK;
        }

        switch (cliArgs.Command) {
          case "export": return Export(cliArgs);
          case "import": return Import(cliArgs);
          case "check": return Check(cliArgs);
          case "refs": return Refs(cliArgs);
          default: throw new CliException($"Unknown command '{cliArgs.Command}'. Run 'ctek help'.");
        }
      } catch (CliException error) {
        Console.Error.WriteLine("ctek: " + error.Message);
        return EXIT_FAILURE;
      } catch (Exception error) {
        Console.Error.WriteLine("ctek: " + error);
        return EXIT_FAILURE;
      }
    }

    /* ------------------------------------------------------------------ export */

    private static int Export(CliArgs args) {
      string path = Path.GetFullPath(args.RequirePositional(0, "file or folder to export"));
      string format = (args.Option("format", "script")).ToLowerInvariant();
      string outDirectory = args.Option("out");
      if (format != "script" && format != "json" && format != "both") throw new CliException("--format must be script, json or both");

      DefinitionSet definitions = LoadDefinitions(args);
      bool isFolder = Directory.Exists(path);

      if (!isFolder && outDirectory == null) {
        Conversation conversation = LoadConversationFile(path);
        if (format == "json") Console.WriteLine(ConversationFiles.ToJson(conversation));
        else Console.Write(ConversationScriptWriter.Write(conversation, definitions, path));
        if (format == "both") Console.Error.WriteLine("ctek: --format both needs --out; printed the script only");
        return EXIT_OK;
      }

      if (outDirectory == null) throw new CliException("Exporting a folder needs --out <dir>");
      outDirectory = Path.GetFullPath(outDirectory);
      Directory.CreateDirectory(outDirectory);

      List<ConversationAsset> assets = isFolder ? LoadFolder(path) : new List<ConversationAsset> { new ConversationAsset(path, LoadConversationFile(path)) };
      foreach (ConversationAsset asset in assets) {
        string baseName = GetBaseName(asset.FilePath);
        if (format != "json") {
          File.WriteAllText(Path.Combine(outDirectory, baseName + ".script.txt"), ConversationScriptWriter.Write(asset.Conversation, definitions, asset.FilePath), new UTF8Encoding(false));
        }
        if (format != "script") {
          ConversationFiles.SaveJson(asset.Conversation, Path.Combine(outDirectory, baseName + ".json"));
        }
      }

      Console.WriteLine($"Exported {assets.Count} conversation(s) to {outDirectory}");
      return EXIT_OK;
    }

    /* ------------------------------------------------------------------ import */

    private static int Import(CliArgs args) {
      string path = Path.GetFullPath(args.RequirePositional(0, "JSON file to import"));
      string outPath = Path.GetFullPath(args.Option("out") ?? Path.ChangeExtension(path, ".bytes"));
      if (!File.Exists(path)) throw new CliException($"'{path}' does not exist");

      Conversation conversation = ConversationFiles.LoadJson(path);
      Conversation roundTripped = ConversationFiles.RoundTrip(conversation);
      if (roundTripped == null) throw new CliException("The conversation could not be read back after serialisation");

      // Check the round-tripped copy - that is what will be on disk - against the target folder
      ConversationAsset asset = new ConversationAsset(outPath, roundTripped);
      DefinitionSet definitions = LoadDefinitions(args);
      List<ConversationAsset> neighbours = LoadNeighbours(outPath);
      List<ConversationDiagnostic> diagnostics = ConversationDiagnostics.Build(asset, definitions, neighbours);

      PrintDiagnostics(asset, diagnostics);
      if (ConversationDiagnostics.HasErrors(diagnostics) && !args.Switch("force")) {
        Console.Error.WriteLine("ctek: not written because of errors. Fix them or pass --force.");
        return EXIT_PROBLEMS;
      }

      Directory.CreateDirectory(Path.GetDirectoryName(outPath));
      ConversationFiles.SaveBinary(roundTripped, outPath);
      Console.WriteLine($"Wrote {outPath}");
      return EXIT_OK;
    }

    /* ------------------------------------------------------------------ check */

    private class CheckResult {
      public string File { get; set; }
      public string Name { get; set; }
      public string Id { get; set; }
      public List<ConversationDiagnostic> Diagnostics { get; set; }
    }

    private static int Check(CliArgs args) {
      if (args.Positionals.Count <= 0) throw new CliException("Missing file or folder to check");
      DefinitionSet definitions = LoadDefinitions(args);
      List<CheckResult> results = new List<CheckResult>();

      foreach (string rawPath in args.Positionals) {
        string path = Path.GetFullPath(rawPath);

        if (Directory.Exists(path)) {
          List<ConversationAsset> assets = LoadFolder(path);
          foreach (ConversationAsset asset in assets) {
            results.Add(ToCheckResult(asset, ConversationDiagnostics.Build(asset, definitions, assets)));
          }
        } else {
          ConversationAsset asset = new ConversationAsset(path, LoadConversationFile(path));
          results.Add(ToCheckResult(asset, ConversationDiagnostics.Build(asset, definitions, LoadNeighbours(path))));
        }
      }

      if (args.Switch("json")) {
        Console.WriteLine(ToJson(results));
      } else {
        foreach (CheckResult result in results) {
          PrintDiagnostics(result.Name, result.File, result.Diagnostics);
        }

        int errors = results.Sum(result => result.Diagnostics.Count(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error));
        int warnings = results.Sum(result => result.Diagnostics.Count(diagnostic => diagnostic.Severity == DiagnosticSeverity.Warning));
        Console.WriteLine($"Checked {results.Count} conversation(s): {errors} error(s), {warnings} warning(s)");
      }

      return results.Any(result => ConversationDiagnostics.HasErrors(result.Diagnostics)) ? EXIT_PROBLEMS : EXIT_OK;
    }

    private static CheckResult ToCheckResult(ConversationAsset asset, List<ConversationDiagnostic> diagnostics) {
      return new CheckResult {
        File = asset.FilePath,
        Name = asset.Conversation.ui_name,
        Id = ConversationIds.GetRawId(asset.Conversation.idRef),
        Diagnostics = diagnostics
      };
    }

    /* ------------------------------------------------------------------ refs */

    private static int Refs(CliArgs args) {
      string path = Path.GetFullPath(args.RequirePositional(0, "folder to scan"));
      if (!Directory.Exists(path)) throw new CliException($"'{path}' is not a folder");

      string kind = args.Option("kind");
      string filter = args.Option("filter");
      bool unresolvedOnly = args.Switch("unresolved");

      List<ConversationReference> references = ConversationReferences.Scan(LoadFolder(path), LoadDefinitions(args))
        .Where(reference => kind == null || string.Equals(reference.Kind, kind, StringComparison.OrdinalIgnoreCase))
        .Where(reference => ConversationReferences.Matches(reference, filter))
        .Where(reference => !unresolvedOnly || reference.Resolved == false)
        .ToList();

      if (args.Switch("json")) {
        Console.WriteLine(ToJson(references));
      } else {
        foreach (IGrouping<string, ConversationReference> kindGroup in references.GroupBy(reference => reference.Kind).OrderBy(group => group.Key)) {
          Console.WriteLine(kindGroup.Key.ToUpperInvariant() + "S");
          foreach (IGrouping<string, ConversationReference> valueGroup in kindGroup.GroupBy(reference => reference.Value).OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)) {
            // Tags are often set by contracts or events instead, so this is a prompt to check, not an error
            bool neverSet = kindGroup.Key == ReferenceKind.Tag && valueGroup.All(reference => reference.Usage == "check" || reference.Usage == "read");
            Console.WriteLine("  " + valueGroup.Key + (neverSet ? "   (checked but never set in these conversations)" : ""));
            foreach (ConversationReference reference in valueGroup) {
              string name = string.IsNullOrEmpty(reference.ConversationName) ? Path.GetFileName(reference.FilePath) : reference.ConversationName;
              string problem = reference.Problem != null ? $"  !! {reference.Problem}" : "";
              Console.WriteLine($"    {reference.Usage,-10} {name} {reference.Location}{problem}");
            }
          }
          Console.WriteLine();
        }
        Console.WriteLine($"{references.Count} reference(s)");
      }

      return references.Any(reference => reference.Resolved == false) ? EXIT_PROBLEMS : EXIT_OK;
    }

    /* ------------------------------------------------------------------ helpers */

    private static DefinitionSet LoadDefinitions(CliArgs args) {
      string defsDirectory = args.Option("defs");

      if (defsDirectory == null) {
        defsDirectory = DefinitionSet.FindDefsDirectory(AppDomain.CurrentDomain.BaseDirectory)
          ?? DefinitionSet.FindDefsDirectory(Directory.GetCurrentDirectory());
      }

      if (defsDirectory == null || !Directory.Exists(defsDirectory)) {
        Console.Error.WriteLine("ctek: no defs folder found - operations will show as missing definitions. Use --defs <dir>.");
        return new DefinitionSet();
      }

      return DefinitionSet.Load(defsDirectory);
    }

    private static Conversation LoadConversationFile(string path) {
      if (!File.Exists(path)) throw new CliException($"'{path}' does not exist");
      if (ConversationFiles.IsSpeakerListPath(path)) throw new CliException($"'{path}' is a speaker list, not a conversation");
      return ConversationFiles.Load(path);
    }

    private static List<ConversationAsset> LoadFolder(string directory) {
      List<KeyValuePair<string, Exception>> failures = new List<KeyValuePair<string, Exception>>();
      List<ConversationAsset> assets = ConversationFiles.LoadFolder(directory, failures);
      foreach (KeyValuePair<string, Exception> failure in failures) {
        Console.Error.WriteLine($"ctek: could not load '{failure.Key}': {failure.Value.Message}");
      }
      return assets;
    }

    // The other conversations in a file's folder, used to resolve sideload targets and duplicate ids
    private static List<ConversationAsset> LoadNeighbours(string filePath) {
      string directory = Path.GetDirectoryName(filePath);
      if (directory == null || !Directory.Exists(directory)) return new List<ConversationAsset>();
      return ConversationFiles.LoadFolder(directory)
        .Where(asset => !string.Equals(asset.FilePath, filePath, StringComparison.OrdinalIgnoreCase))
        .ToList();
    }

    // 'deadclaim-1-introduction.9cc7...convo.bytes' -> 'deadclaim-1-introduction.9cc7...convo'
    private static string GetBaseName(string path) {
      string name = Path.GetFileName(path);
      if (name.EndsWith(".bytes", StringComparison.OrdinalIgnoreCase)) return name.Substring(0, name.Length - ".bytes".Length);
      if (name.EndsWith(".json", StringComparison.OrdinalIgnoreCase)) return name.Substring(0, name.Length - ".json".Length);
      return name;
    }

    private static void PrintDiagnostics(ConversationAsset asset, List<ConversationDiagnostic> diagnostics) {
      PrintDiagnostics(asset.Conversation.ui_name, asset.FilePath, diagnostics);
    }

    private static void PrintDiagnostics(string name, string file, List<ConversationDiagnostic> diagnostics) {
      if (diagnostics.Count <= 0) return;

      Console.WriteLine($"{(string.IsNullOrEmpty(name) ? "(unnamed)" : name)}  ({Path.GetFileName(file)})");
      foreach (ConversationDiagnostic diagnostic in diagnostics.OrderBy(diagnostic => SeverityOrder(diagnostic.Severity))) {
        string node = diagnostic.NodeId != null ? $" [{diagnostic.NodeId}]" : "";
        Console.WriteLine($"  {diagnostic.Severity.ToUpperInvariant(),-7} {diagnostic.NodeLabel}{node}: {diagnostic.Title}");
        Console.WriteLine($"          {diagnostic.Description}");
      }
      Console.WriteLine();
    }

    private static int SeverityOrder(string severity) {
      if (severity == DiagnosticSeverity.Error) return 0;
      if (severity == DiagnosticSeverity.Warning) return 1;
      return 2;
    }

    private static string ToJson(object value) {
      return JsonConvert.SerializeObject(value, Formatting.Indented, new JsonSerializerSettings {
        ContractResolver = new CamelCasePropertyNamesContractResolver(),
        NullValueHandling = NullValueHandling.Ignore
      });
    }
  }
}
