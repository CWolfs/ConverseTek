namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using ConverseTek.Data;
  using ConverseTek.Definitions;
  using ConverseTek.Infrastructure;

  public class DefinitionService {
    private static DefinitionService instance;

    public static DefinitionService getInstance() {
      if (instance == null) instance = new DefinitionService();
      return instance;
    }

    public DefinitionService() {}

    public Dictionary<string, List<Definition>> LoadDefinitions() {
      try {
        string defsDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "defs");
        return DefinitionSet.Load(defsDirectory).ToDictionary();
      } catch (Exception e) {
        Log.Error(e);
      }

      return new Dictionary<string, List<Definition>>();
    }
  }
}
