namespace ConverseTek.Data {
  using System.Collections.Generic;

  public class AiSettings {
    public bool? Enabled { get; set; }
    public string SelectedProvider { get; set; }
    public string CodexCommand { get; set; }
    public string CodexModel { get; set; }
    public string CodexReasoningEffort { get; set; }
    public string CodexProfile { get; set; }
    public int TimeoutSeconds { get; set; }
    public Dictionary<string, AiModelCatalogResult> ModelCatalogs { get; set; }
    public Dictionary<string, AiWorkspaceSettings> Workspaces { get; set; }

    public static AiSettings CreateDefault() {
      return new AiSettings {
        Enabled = true,
        SelectedProvider = "codex",
        CodexCommand = "codex",
        CodexModel = "",
        CodexReasoningEffort = "",
        CodexProfile = "",
        TimeoutSeconds = 300,
        ModelCatalogs = new Dictionary<string, AiModelCatalogResult>(),
        Workspaces = new Dictionary<string, AiWorkspaceSettings>()
      };
    }
  }

  public class AiWorkspaceSettings {
    public string WorkingDirectory { get; set; }
    public List<string> ContextPaths { get; set; }
    public string HouseStyleNotes { get; set; }
    public string DefaultCampaignBrief { get; set; }
    public Dictionary<string, List<AiBriefHistoryEntry>> BriefHistoryByScope { get; set; }
    public List<AiCastPersonality> CastPersonalities { get; set; }

    public static AiWorkspaceSettings CreateDefault(string workingDirectory) {
      return new AiWorkspaceSettings {
        WorkingDirectory = workingDirectory,
        ContextPaths = new List<string>(),
        HouseStyleNotes = "",
        DefaultCampaignBrief = "",
        BriefHistoryByScope = new Dictionary<string, List<AiBriefHistoryEntry>>(),
        CastPersonalities = null
      };
    }
  }

  public class AiBriefHistoryEntry {
    public string Brief { get; set; }
    public string Mode { get; set; }
    public string CreatedAt { get; set; }
    public string ConversationLabel { get; set; }
  }

  public class AiCastPersonality {
    public string Id { get; set; }
    public string Label { get; set; }
    public List<string> CastIds { get; set; }
    public List<string> SpeakerIds { get; set; }
    public string Rules { get; set; }
    public bool? Enabled { get; set; }
    public string DefaultKey { get; set; }
  }
}
