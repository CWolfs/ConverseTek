namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using Chromely.Core.Infrastructure;

  using Newtonsoft.Json;

  using ConverseTek.Data;
  using ConverseTek.Json;

  public class DefinitionService {
    private static DefinitionService instance;
    private static string OPERATIONS_PATH = "/defs/operations";
    private static string PRESETS_PATH = "/defs/presets";
    private static string TAGS_PATH = "/defs/tags";

    public static DefinitionService getInstance() {
      if (instance == null) instance = new DefinitionService();
      return instance;
    }

    public DefinitionService() {}

    public Dictionary<string, List<Definition>> LoadDefinitions() {
      Dictionary<string, List<Definition>> definitions = new Dictionary<string, List<Definition>>();

      try {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

        string[] operationPaths = Directory.GetFiles(baseDirectory + OPERATIONS_PATH);
        List<Definition> operationDefs = new List<Definition>();

        foreach (string path in operationPaths) {
          Definition operationDef = JsonConvert.DeserializeObject<OperationDefinition>(File.ReadAllText(path));
          operationDef.Type = "operation";
          operationDefs.Add(operationDef);
        }

        string[] presetPaths = Directory.GetFiles(baseDirectory + PRESETS_PATH);
        List<Definition> presetDefs = new List<Definition>();

        foreach (string path in presetPaths) {
          Definition presetDef = JsonConvert.DeserializeObject<PresetDefinition>(File.ReadAllText(path), new PresetDefinitionJsonConverter());
          presetDef.Type = "preset";
          presetDefs.Add(presetDef);
        }

        string[] tagPaths = Directory.GetFiles(baseDirectory + TAGS_PATH);
        List<Definition> tagDefs = new List<Definition>();

        foreach (string path in tagPaths) {
          Definition tagDef = JsonConvert.DeserializeObject<TagDefinition>(File.ReadAllText(path));
          tagDef.Type = "tag";
          tagDefs.Add(tagDef);
        }

        definitions.Add("operations", operationDefs);
        definitions.Add("presets", presetDefs);
        definitions.Add("tags", tagDefs);
      } catch (Exception e) {
        Log.Error(e);
      }

      return definitions;
    }
  }
}