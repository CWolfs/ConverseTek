namespace ConverseTek.Data {
  using System.Collections.Generic;

  public class AiDraftRequest {
    public string Mode { get; set; }
    public string Brief { get; set; }
    public string WorkingDirectory { get; set; }
    public string ConversationJson { get; set; }
    public string SelectedNodeJson { get; set; }
    public string DefinitionsJson { get; set; }
  }

  public class AiDraftProviderRequest {
    public AiDraftRequest Request { get; set; }
    public AiSettings Settings { get; set; }
    public AiWorkspaceSettings WorkspaceSettings { get; set; }
    public List<AiContextFile> ContextFiles { get; set; }
  }

  public class AiContextFile {
    public string Path { get; set; }
    public string Content { get; set; }
    public bool Truncated { get; set; }
  }

  public class AiDraftRunResult {
    public bool Success { get; set; }
    public string Error { get; set; }
    public string Provider { get; set; }
    public string DiagnosticsDirectory { get; set; }
    public string RequestPath { get; set; }
    public string PromptPath { get; set; }
    public string OutputPath { get; set; }
    public string StdoutPath { get; set; }
    public string StderrPath { get; set; }
    public string DraftJson { get; set; }
  }

  public class AiDraftArtifactResult {
    public bool Success { get; set; }
    public string Error { get; set; }
    public string Path { get; set; }
    public string Content { get; set; }
    public bool Truncated { get; set; }
  }

  public class ConversationValidationResult {
    public bool Success { get; set; }
    public string Error { get; set; }
  }

  public class AiModelOption {
    public string Slug { get; set; }
    public string DisplayName { get; set; }
    public string Description { get; set; }
    public string DefaultReasoningLevel { get; set; }
    public List<AiReasoningLevel> SupportedReasoningLevels { get; set; }
    public int Priority { get; set; }
  }

  public class AiReasoningLevel {
    public string Effort { get; set; }
    public string Description { get; set; }
  }

  public class AiModelCatalogResult {
    public bool Success { get; set; }
    public string Error { get; set; }
    public string Provider { get; set; }
    public string DefaultModel { get; set; }
    public bool FromCache { get; set; }
    public List<AiModelOption> Models { get; set; }
  }
}
