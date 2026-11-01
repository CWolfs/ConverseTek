namespace ConverseTek.Definitions {
  using System;
  using System.Collections.Generic;
  using System.IO;
  using System.Linq;

  using Newtonsoft.Json;

  using ConverseTek.Data;
  using ConverseTek.Json;

  /*
    The operation, preset and tag definition packs from a defs folder (defs/operations, defs/presets, defs/tags)
  */
  public class DefinitionSet {
    public List<OperationDefinition> Operations { get; } = new List<OperationDefinition>();
    public List<PresetDefinition> Presets { get; } = new List<PresetDefinition>();
    public List<TagDefinition> Tags { get; } = new List<TagDefinition>();

    private Dictionary<string, OperationDefinition> operationsByKey;

    public static DefinitionSet Load(string defsDirectory) {
      DefinitionSet definitions = new DefinitionSet();

      foreach (string path in GetJsonFiles(defsDirectory, "operations")) {
        OperationDefinition operation = JsonConvert.DeserializeObject<OperationDefinition>(File.ReadAllText(path));
        operation.Type = "operation";
        definitions.Operations.Add(operation);
      }

      foreach (string path in GetJsonFiles(defsDirectory, "presets")) {
        PresetDefinition preset = JsonConvert.DeserializeObject<PresetDefinition>(File.ReadAllText(path), new PresetDefinitionJsonConverter());
        preset.Type = "preset";
        definitions.Presets.Add(preset);
      }

      foreach (string path in GetJsonFiles(defsDirectory, "tags")) {
        TagDefinition tag = JsonConvert.DeserializeObject<TagDefinition>(File.ReadAllText(path));
        tag.Type = "tag";
        definitions.Tags.Add(tag);
      }

      return definitions;
    }

    // Walks up from a starting directory looking for a defs folder with operation definitions in it
    public static string FindDefsDirectory(string startDirectory) {
      DirectoryInfo directory = new DirectoryInfo(startDirectory);
      while (directory != null) {
        string candidate = Path.Combine(directory.FullName, "defs");
        if (Directory.Exists(Path.Combine(candidate, "operations"))) return candidate;
        directory = directory.Parent;
      }
      return null;
    }

    public OperationDefinition GetOperation(string key) {
      if (key == null) return null;
      if (operationsByKey == null) {
        operationsByKey = new Dictionary<string, OperationDefinition>();
        foreach (OperationDefinition operation in Operations) {
          if (operation.Key != null && !operationsByKey.ContainsKey(operation.Key)) operationsByKey.Add(operation.Key, operation);
        }
      }

      operationsByKey.TryGetValue(key, out OperationDefinition definition);
      return definition;
    }

    public PresetDefinition GetPreset(string key) {
      return Presets.FirstOrDefault(preset => preset.Key == key);
    }

    // The shape the desktop app's /definitions route has always returned
    public Dictionary<string, List<Definition>> ToDictionary() {
      return new Dictionary<string, List<Definition>>() {
        { "operations", Operations.Cast<Definition>().ToList() },
        { "presets", Presets.Cast<Definition>().ToList() },
        { "tags", Tags.Cast<Definition>().ToList() }
      };
    }

    private static string[] GetJsonFiles(string defsDirectory, string folder) {
      string path = Path.Combine(defsDirectory, folder);
      if (!Directory.Exists(path)) return new string[0];
      string[] files = Directory.GetFiles(path, "*.json");
      Array.Sort(files, StringComparer.OrdinalIgnoreCase);
      return files;
    }
  }
}
