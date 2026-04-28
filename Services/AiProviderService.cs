namespace ConverseTek.Services {
  using System;
  using System.Collections.Generic;
  using System.Diagnostics;
  using System.IO;
  using System.Text;

  using Chromely.Core.Infrastructure;
  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using ConverseTek.Data;

  public interface IAiProvider {
    AiDraftRunResult RunDraft(AiDraftProviderRequest request);
  }

  public class AiProviderService {
    private static AiProviderService instance;

    public static AiProviderService getInstance() {
      if (instance == null) instance = new AiProviderService();
      return instance;
    }

    public AiDraftRunResult RunDraft(AiDraftRequest request) {
      ConfigService configService = ConfigService.getInstance();
      AiSettings settings = configService.GetAiSettings();
      if (settings.Enabled == false) {
        return new AiDraftRunResult {
          Success = false,
          Provider = settings.SelectedProvider ?? "unknown",
          Error = "AI features are disabled in config/ai.json."
        };
      }

      AiWorkspaceSettings workspaceSettings = configService.GetAiWorkspaceSettings(request.WorkingDirectory);

      AiDraftProviderRequest providerRequest = new AiDraftProviderRequest {
        Request = request,
        Settings = settings,
        WorkspaceSettings = workspaceSettings,
        ContextFiles = LoadContextFiles(workspaceSettings)
      };

      IAiProvider provider = CreateProvider(settings.SelectedProvider);
      return provider.RunDraft(providerRequest);
    }

    public AiModelCatalogResult GetModels(AiSettings settings, bool forceRefresh) {
      settings = settings ?? ConfigService.getInstance().GetAiSettings();
      if (settings.Enabled == false) {
        return new AiModelCatalogResult {
          Success = false,
          Error = "AI features are disabled in config/ai.json.",
          Provider = settings.SelectedProvider ?? "unknown",
          DefaultModel = "",
          FromCache = false,
          Models = new List<AiModelOption>()
        };
      }

      string normalisedProviderName = (settings.SelectedProvider ?? "").Trim().ToLowerInvariant();
      if (normalisedProviderName == "") normalisedProviderName = "codex";

      ConfigService configService = ConfigService.getInstance();
      AiSettings savedSettings = configService.GetAiSettings();
      AiModelCatalogResult cachedResult = GetCachedModelCatalog(savedSettings, normalisedProviderName);

      if (!forceRefresh && cachedResult != null) {
        cachedResult.FromCache = true;
        return cachedResult;
      }

      if (normalisedProviderName == "" || normalisedProviderName == "codex") {
        AiModelCatalogResult result = new CodexCliAiProvider().GetModels(settings);

        if (result.Success && result.Models != null && result.Models.Count > 0) {
          result.FromCache = false;
          savedSettings.ModelCatalogs[normalisedProviderName] = result;
          configService.SaveAiSettings(savedSettings);
          return result;
        }

        if (cachedResult != null) {
          cachedResult.FromCache = true;
          cachedResult.Error = "Could not refresh provider models. Showing the last saved model list. " + result.Error;
          return cachedResult;
        }

        return result;
      }

      return new AiModelCatalogResult {
        Success = false,
        Error = "AI provider '" + settings.SelectedProvider + "' does not expose model polling yet.",
        Provider = normalisedProviderName,
        DefaultModel = "",
        FromCache = false,
        Models = new List<AiModelOption>()
      };
    }

    private AiModelCatalogResult GetCachedModelCatalog(AiSettings settings, string providerName) {
      if (settings == null || settings.ModelCatalogs == null) return null;
      if (!settings.ModelCatalogs.ContainsKey(providerName)) return null;

      AiModelCatalogResult cachedResult = settings.ModelCatalogs[providerName];
      if (cachedResult == null || cachedResult.Models == null || cachedResult.Models.Count == 0) return null;
      return cachedResult;
    }

    private IAiProvider CreateProvider(string providerName) {
      string normalisedProviderName = (providerName ?? "").Trim().ToLowerInvariant();
      if (normalisedProviderName == "" || normalisedProviderName == "codex") {
        return new CodexCliAiProvider();
      }

      throw new NotSupportedException("AI provider '" + providerName + "' is not supported yet.");
    }

    private List<AiContextFile> LoadContextFiles(AiWorkspaceSettings workspaceSettings) {
      List<AiContextFile> files = new List<AiContextFile>();
      if (workspaceSettings == null || workspaceSettings.ContextPaths == null) return files;

      foreach (string path in workspaceSettings.ContextPaths) {
        if (files.Count >= 16) break;
        AddContextPath(files, path);
      }

      return files;
    }

    private void AddContextPath(List<AiContextFile> files, string path) {
      if (string.IsNullOrEmpty(path)) return;

      try {
        if (File.Exists(path)) {
          AddContextFile(files, path);
          return;
        }

        if (!Directory.Exists(path)) return;

        string[] candidateFiles = Directory.GetFiles(path, "*.*", SearchOption.AllDirectories);
        Array.Sort(candidateFiles, StringComparer.OrdinalIgnoreCase);
        foreach (string candidateFile in candidateFiles) {
          if (files.Count >= 16) break;
          if (IsSupportedContextFile(candidateFile)) {
            AddContextFile(files, candidateFile);
          }
        }
      } catch (Exception error) {
        Log.Error("[AiProviderService] Could not load AI context path " + path + ": " + error.Message);
      }
    }

    private void AddContextFile(List<AiContextFile> files, string path) {
      if (!IsSupportedContextFile(path)) return;

      string source = File.ReadAllText(path, Encoding.UTF8);
      bool truncated = false;
      if (source.Length > 40000) {
        source = source.Substring(0, 40000);
        truncated = true;
      }

      files.Add(new AiContextFile {
        Path = path,
        Content = source,
        Truncated = truncated
      });
    }

    private bool IsSupportedContextFile(string path) {
      string extension = Path.GetExtension(path).ToLowerInvariant();
      return extension == ".md" ||
        extension == ".txt" ||
        extension == ".json" ||
        extension == ".jsonc" ||
        extension == ".html" ||
        extension == ".cs";
    }
  }

  public class CodexCliAiProvider : IAiProvider {
    private static string BASE_DIRECTORY = AppDomain.CurrentDomain.BaseDirectory;

    public AiModelCatalogResult GetModels(AiSettings settings) {
      AiModelCatalogResult result = new AiModelCatalogResult {
        Success = false,
        Provider = "codex",
        DefaultModel = "",
        FromCache = false,
        Models = new List<AiModelOption>()
      };

      try {
        Process process = CreateCodexModelsProcess(settings);
        string stdout = "";
        string stderr = "";

        process.Start();
        stdout = process.StandardOutput.ReadToEnd();
        stderr = process.StandardError.ReadToEnd();
        bool exited = process.WaitForExit(30000);

        if (!exited) {
          try {
            process.Kill();
          } catch {
          }

          result.Error = "Codex model polling timed out after 30 seconds.";
          return result;
        }

        if (process.ExitCode != 0) {
          result.Error = "Codex model polling exited with code " + process.ExitCode + ". " + FormatProcessOutputForDisplay(stderr == "" ? stdout : stderr);
          return result;
        }

        JObject catalog = JObject.Parse(ExtractJsonObject(stdout));
        JArray models = catalog["models"] as JArray;
        if (models == null) {
          result.Error = "Codex model polling returned no models array.";
          return result;
        }

        foreach (JToken model in models) {
          string visibility = model.Value<string>("visibility") ?? "";
          if (visibility != "" && visibility != "list") continue;

          result.Models.Add(new AiModelOption {
            Slug = model.Value<string>("slug") ?? "",
            DisplayName = model.Value<string>("display_name") ?? model.Value<string>("slug") ?? "",
            Description = model.Value<string>("description") ?? "",
            DefaultReasoningLevel = model.Value<string>("default_reasoning_level") ?? "",
            Priority = model.Value<int?>("priority") ?? 0
          });
        }

        result.Models.Sort((left, right) => left.Priority.CompareTo(right.Priority));
        result.Success = true;
        return result;
      } catch (Exception error) {
        result.Error = error.Message;
        return result;
      }
    }

    public AiDraftRunResult RunDraft(AiDraftProviderRequest providerRequest) {
      AiDraftRunResult result = new AiDraftRunResult {
        Success = false,
        Provider = "codex"
      };

      string runDirectory = CreateRunDirectory();
      result.DiagnosticsDirectory = runDirectory;
      result.RequestPath = Path.Combine(runDirectory, "request.json");
      result.PromptPath = Path.Combine(runDirectory, "prompt.md");
      result.OutputPath = Path.Combine(runDirectory, "draft.json");
      result.StdoutPath = Path.Combine(runDirectory, "stdout.log");
      result.StderrPath = Path.Combine(runDirectory, "stderr.log");
      string commandPath = Path.Combine(runDirectory, "command.txt");

      string requestJson = JsonConvert.SerializeObject(providerRequest, Formatting.Indented);
      string prompt = BuildPrompt(providerRequest, requestJson);
      File.WriteAllText(result.RequestPath, requestJson, Encoding.UTF8);
      File.WriteAllText(result.PromptPath, prompt, Encoding.UTF8);
      File.WriteAllText(result.StdoutPath, "", Encoding.UTF8);
      File.WriteAllText(result.StderrPath, "", Encoding.UTF8);

      try {
        Process process = CreateCodexProcess(providerRequest.Settings, result.OutputPath, commandPath);
        StringBuilder stdoutBuilder = new StringBuilder();
        StringBuilder stderrBuilder = new StringBuilder();
        process.OutputDataReceived += (sender, args) => {
          if (args.Data != null) stdoutBuilder.AppendLine(args.Data);
        };
        process.ErrorDataReceived += (sender, args) => {
          if (args.Data != null) stderrBuilder.AppendLine(args.Data);
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        process.StandardInput.Write(prompt);
        process.StandardInput.Close();

        bool exited = process.WaitForExit(providerRequest.Settings.TimeoutSeconds * 1000);

        if (!exited) {
          try {
            process.Kill();
          } catch {
          }

          result.Error = "Codex timed out after " + providerRequest.Settings.TimeoutSeconds + " seconds.";
          return result;
        }

        process.WaitForExit();
        string stdout = stdoutBuilder.ToString();
        string stderr = stderrBuilder.ToString();
        File.WriteAllText(result.StdoutPath, stdout, Encoding.UTF8);
        File.WriteAllText(result.StderrPath, stderr, Encoding.UTF8);

        if (process.ExitCode != 0) {
          result.Error = "Codex exited with code " + process.ExitCode + ". " + FormatProcessOutputForDisplay(stderr == "" ? stdout : stderr);
          return result;
        }

        if (!File.Exists(result.OutputPath)) {
          result.Error = "Codex completed but did not write a draft output file.";
          return result;
        }

        result.DraftJson = ExtractJsonObject(File.ReadAllText(result.OutputPath, Encoding.UTF8));
        result.Success = true;
        return result;
      } catch (Exception error) {
        result.Error = error.Message;
        return result;
      }
    }

    private Process CreateCodexProcess(AiSettings settings, string outputPath, string commandPath) {
      string codexCommand = FindCodexCommand(settings);
      string schemaPath = Path.Combine(BASE_DIRECTORY, "config", "ai-draft-output.schema.json");
      if (!File.Exists(schemaPath)) {
        schemaPath = Path.GetFullPath(Path.Combine(BASE_DIRECTORY, "..", "..", "..", "..", "config", "ai-draft-output.schema.json"));
      }

      StringBuilder command = new StringBuilder();
      command.Append(QuoteForCmd(codexCommand));
      command.Append(" --ask-for-approval never exec");
      command.Append(" --sandbox read-only");
      command.Append(" --ephemeral");
      if (!string.IsNullOrEmpty(settings.CodexModel)) {
        command.Append(" --model ").Append(QuoteForCmd(settings.CodexModel));
      }
      if (!string.IsNullOrEmpty(settings.CodexProfile)) {
        command.Append(" --profile ").Append(QuoteForCmd(settings.CodexProfile));
      }
      command.Append(" --output-schema ").Append(QuoteForCmd(schemaPath));
      command.Append(" --output-last-message ").Append(QuoteForCmd(outputPath));
      command.Append(" -");

      File.WriteAllText(commandPath, command.ToString(), Encoding.UTF8);

      ProcessStartInfo startInfo = new ProcessStartInfo();
      startInfo.FileName = "cmd.exe";
      startInfo.Arguments = "/d /s /c \"" + command + "\"";
      startInfo.WorkingDirectory = BASE_DIRECTORY;
      startInfo.UseShellExecute = false;
      startInfo.RedirectStandardInput = true;
      startInfo.RedirectStandardOutput = true;
      startInfo.RedirectStandardError = true;
      startInfo.CreateNoWindow = true;

      Process process = new Process();
      process.StartInfo = startInfo;
      return process;
    }

    private Process CreateCodexModelsProcess(AiSettings settings) {
      string codexCommand = FindCodexCommand(settings);
      StringBuilder command = new StringBuilder();
      command.Append(QuoteForCmd(codexCommand));
      if (!string.IsNullOrEmpty(settings.CodexProfile)) {
        command.Append(" --profile ").Append(QuoteForCmd(settings.CodexProfile));
      }
      command.Append(" debug models");

      ProcessStartInfo startInfo = new ProcessStartInfo();
      startInfo.FileName = "cmd.exe";
      startInfo.Arguments = "/d /s /c \"" + command + "\"";
      startInfo.WorkingDirectory = BASE_DIRECTORY;
      startInfo.UseShellExecute = false;
      startInfo.RedirectStandardOutput = true;
      startInfo.RedirectStandardError = true;
      startInfo.CreateNoWindow = true;

      Process process = new Process();
      process.StartInfo = startInfo;
      return process;
    }

    private string BuildPrompt(AiDraftProviderRequest providerRequest, string requestJson) {
      StringBuilder sb = new StringBuilder();
      sb.AppendLine("# ConverseTek AI Conversation Draft");
      sb.AppendLine();
      sb.AppendLine("You are drafting BattleTech dropship/SimGame conversations for ConverseTek.");
      sb.AppendLine("Return only JSON matching the supplied schema.");
      sb.AppendLine();
      sb.AppendLine("Rules:");
      sb.AppendLine("- Use British English.");
      sb.AppendLine("- Do not edit files.");
      sb.AppendLine("- Produce an advisory draft only; ConverseTek will create real ids, indexes, and files after the user accepts.");
      sb.AppendLine("- Keep dialogue in BattleTech dropship conversation style: concise, voiced by the shown speaker, and readable in short UI bubbles.");
      sb.AppendLine("- Use speaker.type castId for known cast ids. Known cast ids include: " + FormatKnownCastIds(providerRequest.WorkspaceSettings) + ".");
      sb.AppendLine("- Use speaker.type none only when the line should inherit the current BattleTech conversation speaker. BattleTech does not have a separate narration speaker for SimGame conversation nodes.");
      sb.AppendLine("- Every root or choice must either set targetKey to an existing node key or set endsConversation to true.");
      sb.AppendLine("- For fullConversation, make the first root text an empty string and point it at the opening prompt node. Do not use Continue for that first root.");
      sb.AppendLine("- For every other root or choice, use explicit short choices such as Understood, Ask Yang, or End conversation.");
      sb.AppendLine("- For nodeSuggestion, return a text rewrite only. If the selected node is a prompt node, put the rewrite in nodes[0].text. If the selected node is a root or response, put the rewrite in roots[0].text. Leave the unused array empty.");
      sb.AppendLine("- Write comment fields as short authoring notes that explain the beat, branch purpose, or condition context. Do not use draft keys such as darius_check as comments.");
      sb.AppendLine("- For operation intents, only use operation names present in the supplied definitions JSON. If unsure, leave operations empty and describe the concern in warnings.");
      sb.AppendLine("- Use mode from the request exactly.");
      sb.AppendLine();
      AiWorkspaceSettings workspaceSettings = providerRequest.WorkspaceSettings;
      if (workspaceSettings != null) {
        sb.AppendLine("Workspace house style notes:");
        sb.AppendLine(string.IsNullOrEmpty(workspaceSettings.HouseStyleNotes) ? "(none)" : workspaceSettings.HouseStyleNotes);
        sb.AppendLine();
        sb.AppendLine("Default campaign brief:");
        sb.AppendLine(string.IsNullOrEmpty(workspaceSettings.DefaultCampaignBrief) ? "(none)" : workspaceSettings.DefaultCampaignBrief);
        sb.AppendLine();
      }

      sb.AppendLine("Cast personality rules:");
      List<AiCastPersonality> relevantPersonalities = SelectRelevantCastPersonalities(providerRequest);
      if (relevantPersonalities.Count == 0) {
        sb.AppendLine("(none)");
      } else {
        sb.AppendLine("Apply these rules whenever a draft line uses a matching cast id or speaker id. Do not mention these rules in the draft output.");
        foreach (AiCastPersonality personality in relevantPersonalities) {
          sb.AppendLine("## " + (string.IsNullOrEmpty(personality.Label) ? personality.Id : personality.Label));
          sb.AppendLine("Cast ids: " + FormatIdList(personality.CastIds));
          sb.AppendLine("Speaker ids: " + FormatIdList(personality.SpeakerIds));
          sb.AppendLine(personality.Rules);
        }
      }
      sb.AppendLine();

      sb.AppendLine("Context files:");
      if (providerRequest.ContextFiles == null || providerRequest.ContextFiles.Count == 0) {
        sb.AppendLine("(none)");
      } else {
        foreach (AiContextFile contextFile in providerRequest.ContextFiles) {
          sb.AppendLine("## " + contextFile.Path + (contextFile.Truncated ? " (truncated)" : ""));
          sb.AppendLine("```");
          sb.AppendLine(contextFile.Content);
          sb.AppendLine("```");
        }
      }

      sb.AppendLine();
      sb.AppendLine("Request JSON:");
      sb.AppendLine("```json");
      sb.AppendLine(requestJson);
      sb.AppendLine("```");
      return sb.ToString();
    }

    private string FormatKnownCastIds(AiWorkspaceSettings workspaceSettings) {
      List<string> castIds = new List<string> {
        "DariusDefault",
        "SumireDefault",
        "YangDefault",
        "FarahDefault",
        "KrakenIsabella",
        "BladesKai",
        "DEFAULT",
        "HOLOGRAM"
      };

      if (workspaceSettings != null && workspaceSettings.CastPersonalities != null) {
        foreach (AiCastPersonality personality in workspaceSettings.CastPersonalities) {
          if (personality == null || personality.Enabled == false || personality.CastIds == null) continue;
          foreach (string castId in personality.CastIds) {
            AddUnique(castIds, castId);
          }
        }
      }

      return string.Join(", ", castIds.ToArray());
    }

    private List<AiCastPersonality> SelectRelevantCastPersonalities(AiDraftProviderRequest providerRequest) {
      List<AiCastPersonality> relevantPersonalities = new List<AiCastPersonality>();
      if (providerRequest == null || providerRequest.WorkspaceSettings == null || providerRequest.WorkspaceSettings.CastPersonalities == null) {
        return relevantPersonalities;
      }

      string searchText = BuildCastPersonalitySearchText(providerRequest);
      foreach (AiCastPersonality personality in providerRequest.WorkspaceSettings.CastPersonalities) {
        if (!IsUsablePersonality(personality)) continue;
        if (PersonalityMatchesText(personality, searchText)) {
          relevantPersonalities.Add(personality);
        }
      }

      if (relevantPersonalities.Count > 0) return relevantPersonalities;

      foreach (AiCastPersonality personality in providerRequest.WorkspaceSettings.CastPersonalities) {
        if (!IsUsablePersonality(personality)) continue;
        if (!string.IsNullOrEmpty(personality.DefaultKey)) {
          relevantPersonalities.Add(personality);
        }
      }

      return relevantPersonalities;
    }

    private string BuildCastPersonalitySearchText(AiDraftProviderRequest providerRequest) {
      if (providerRequest == null || providerRequest.Request == null) return "";

      StringBuilder sb = new StringBuilder();
      sb.AppendLine(providerRequest.Request.Brief ?? "");
      sb.AppendLine(providerRequest.Request.ConversationJson ?? "");
      sb.AppendLine(providerRequest.Request.SelectedNodeJson ?? "");
      return sb.ToString();
    }

    private bool IsUsablePersonality(AiCastPersonality personality) {
      return personality != null && personality.Enabled != false && !string.IsNullOrWhiteSpace(personality.Rules);
    }

    private bool PersonalityMatchesText(AiCastPersonality personality, string searchText) {
      if (string.IsNullOrEmpty(searchText)) return false;

      if (ContainsToken(searchText, personality.Label)) return true;
      if (ContainsToken(searchText, personality.DefaultKey)) return true;

      if (personality.CastIds != null) {
        foreach (string castId in personality.CastIds) {
          if (ContainsToken(searchText, castId)) return true;
          if (!string.IsNullOrEmpty(castId) && castId.StartsWith("castDef_", StringComparison.OrdinalIgnoreCase)) {
            if (ContainsToken(searchText, castId.Substring("castDef_".Length))) return true;
          }
        }
      }

      if (personality.SpeakerIds != null) {
        foreach (string speakerId in personality.SpeakerIds) {
          if (ContainsToken(searchText, speakerId)) return true;
        }
      }

      return false;
    }

    private bool ContainsToken(string searchText, string token) {
      if (string.IsNullOrWhiteSpace(token)) return false;
      return searchText.IndexOf(token.Trim(), StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private string FormatIdList(List<string> ids) {
      if (ids == null || ids.Count == 0) return "(none)";

      List<string> normalisedIds = new List<string>();
      foreach (string id in ids) {
        AddUnique(normalisedIds, id);
      }

      return normalisedIds.Count == 0 ? "(none)" : string.Join(", ", normalisedIds.ToArray());
    }

    private void AddUnique(List<string> values, string value) {
      if (string.IsNullOrWhiteSpace(value)) return;

      string trimmedValue = value.Trim();
      foreach (string existingValue in values) {
        if (string.Equals(existingValue, trimmedValue, StringComparison.OrdinalIgnoreCase)) return;
      }

      values.Add(trimmedValue);
    }

    private string CreateRunDirectory() {
      string directory = Path.Combine(BASE_DIRECTORY, "logs", "ai-drafts", DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff"));
      Directory.CreateDirectory(directory);
      return directory;
    }

    private string FindCodexCommand(AiSettings settings) {
      if (!string.IsNullOrEmpty(settings.CodexCommand) && settings.CodexCommand.Trim().ToLowerInvariant() != "codex") {
        return settings.CodexCommand;
      }

      string path = Environment.GetEnvironmentVariable("PATH") ?? "";
      string[] directories = path.Split(Path.PathSeparator);
      string[] candidates = new string[] { "codex.cmd", "codex.exe", "codex" };

      for (int i = 0; i < directories.Length; i++) {
        for (int j = 0; j < candidates.Length; j++) {
          string candidate = Path.Combine(directories[i], candidates[j]);
          if (File.Exists(candidate)) {
            return candidate;
          }
        }
      }

      string[] knownWindowsPaths = new string[] {
        @"d:\Program Files\nodejs\codex.cmd",
        @"C:\Program Files\nodejs\codex.cmd",
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "npm", "codex.cmd")
      };

      for (int i = 0; i < knownWindowsPaths.Length; i++) {
        if (File.Exists(knownWindowsPaths[i])) {
          return knownWindowsPaths[i];
        }
      }

      return "codex";
    }

    private string ExtractJsonObject(string value) {
      if (string.IsNullOrEmpty(value)) return "{}";
      int start = value.IndexOf('{');
      int end = value.LastIndexOf('}');
      if (start >= 0 && end >= start) {
        return value.Substring(start, end - start + 1);
      }
      return value;
    }

    private string TrimForDisplay(string value) {
      if (string.IsNullOrEmpty(value)) return "";
      value = value.Trim();
      return value.Length > 1600 ? value.Substring(0, 1600) + "..." : value;
    }

    private string FormatProcessOutputForDisplay(string value) {
      string providerError = ExtractProviderErrorMessage(value);
      if (!string.IsNullOrEmpty(providerError)) return providerError;
      return TrimForDisplay(value);
    }

    private string ExtractProviderErrorMessage(string value) {
      if (string.IsNullOrEmpty(value)) return "";

      int markerIndex = value.LastIndexOf("ERROR:", StringComparison.OrdinalIgnoreCase);
      if (markerIndex < 0) return "";

      string candidate = value.Substring(markerIndex + "ERROR:".Length).Trim();
      string json = ExtractJsonObject(candidate);
      if (string.IsNullOrEmpty(json) || json == "{}") return "";

      try {
        JObject errorEnvelope = JObject.Parse(json);
        JToken errorToken = errorEnvelope["error"];
        if (errorToken == null) return "";

        string code = errorToken.Value<string>("code") ?? "";
        string message = errorToken.Value<string>("message") ?? "";
        string status = errorEnvelope["status"] == null ? "" : errorEnvelope["status"].ToString();
        if (string.IsNullOrEmpty(message)) return "";

        string prefix = string.IsNullOrEmpty(code) ? "" : code + ": ";
        string suffix = string.IsNullOrEmpty(status) ? "" : " (status " + status + ")";
        return prefix + message + suffix;
      } catch {
        return "";
      }
    }

    private string QuoteForCmd(string value) {
      return "\"" + value.Replace("\"", "\\\"") + "\"";
    }
  }
}
