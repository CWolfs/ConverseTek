namespace ConverseTek.Diagnostics {
  public static class DiagnosticSeverity {
    public const string Error = "error";
    public const string Warning = "warning";
    public const string Info = "info";
  }

  public static class DiagnosticCategory {
    public const string Content = "content";
    public const string Graph = "graph";
    public const string Operation = "operation";
    public const string Reference = "reference";
  }

  public class ConversationDiagnostic {
    public string Severity { get; set; }
    public string Category { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string NodeId { get; set; }
    public string NodeLabel { get; set; }
  }
}
