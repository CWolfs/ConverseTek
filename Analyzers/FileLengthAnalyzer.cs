using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Text;

namespace ConverseTek.Analyzers;

/// <summary>
/// Keeps source files small enough to read: CTK0001 warns above 700 lines, CTK0002 fails above 800.
/// Generated files are ignored. Existing long files are grandfathered per file in .editorconfig.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class FileLengthAnalyzer : DiagnosticAnalyzer {
  public const int WarningLines = 700;
  public const int ErrorLines = 800;

  private static readonly DiagnosticDescriptor TooLongWarning = new(
    "CTK0001",
    "Source file is getting long",
    "File has {0} lines (soft limit {1}); consider splitting it",
    "Maintainability",
    DiagnosticSeverity.Warning,
    isEnabledByDefault: true);

  private static readonly DiagnosticDescriptor TooLongError = new(
    "CTK0002",
    "Source file is too long",
    "File has {0} lines (limit {1}); split it into smaller files",
    "Maintainability",
    DiagnosticSeverity.Error,
    isEnabledByDefault: true);

  public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
    ImmutableArray.Create(TooLongWarning, TooLongError);

  public override void Initialize(AnalysisContext context) {
    context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
    context.EnableConcurrentExecution();
    context.RegisterSyntaxTreeAction(AnalyzeTree);
  }

  private static void AnalyzeTree(SyntaxTreeAnalysisContext context) {
    int lines = context.Tree.GetText(context.CancellationToken).Lines.Count;
    if (lines <= WarningLines) {
      return;
    }

    bool isError = lines > ErrorLines;
    Location location = Location.Create(context.Tree, new TextSpan(0, 0));
    context.ReportDiagnostic(Diagnostic.Create(
      isError ? TooLongError : TooLongWarning, location, lines, isError ? ErrorLines : WarningLines));
  }
}
