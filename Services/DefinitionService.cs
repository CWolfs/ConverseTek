namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using Chromely.Core.Infrastructure;

  using Newtonsoft.Json;

  using ConverseTek.Data;

  public class DefinitionService {
    private static DefinitionService instance;

    public static DefinitionService getInstance() {
      if (instance == null) instance = new DefinitionService();
      return instance;
    }

    public DefinitionService() {}

    public List<ConversationAsset> LoadDefinitions() {
      return null;
    }
  }
}