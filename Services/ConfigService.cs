using System;
using System.IO;
using System.Windows;
using System.Collections.Generic;

using Chromely.Core.Infrastructure;

using Newtonsoft.Json;

namespace ConverseTek.Services {
  using ConverseTek.Data;

  public class ConfigService {
    private static ConfigService instance;
    private static string BASE_DIRECTORY = AppDomain.CurrentDomain.BaseDirectory;
    private static string CONFIG_PATH = $"{BASE_DIRECTORY}/config";

    private static string QUICKLINKS_PATH = $"{CONFIG_PATH}/quicklinks.json";
    private static string COLOURS_PATH = $"{CONFIG_PATH}/colours.json";
    private static string AI_PATH = $"{CONFIG_PATH}/ai.json";

    public static ConfigService getInstance() {
      if (instance == null) instance = new ConfigService();
      return instance;
    }

    private ConfigService() {
      if (!Directory.Exists(CONFIG_PATH)) {
        Directory.CreateDirectory(CONFIG_PATH);
      }

      // Create quicklinks if it doesn't exist
      if (!File.Exists(QUICKLINKS_PATH)) {
        File.WriteAllText(QUICKLINKS_PATH, JsonConvert.SerializeObject(new object { }, Formatting.Indented));
      }

      // Create quicklinks if it doesn't exist
      if (!File.Exists(COLOURS_PATH)) {
        File.WriteAllText(COLOURS_PATH, JsonConvert.SerializeObject(new object { }, Formatting.Indented));
      }

      if (!File.Exists(AI_PATH)) {
        SaveAiSettings(AiSettings.CreateDefault());
      }
    }

    public Dictionary<string, string> GetQuickLinksConfig() {
      try {
        if (!File.Exists(QUICKLINKS_PATH)) {
          File.WriteAllText(QUICKLINKS_PATH, JsonConvert.SerializeObject(new object { }, Formatting.Indented));
        }

        string json = File.ReadAllText(QUICKLINKS_PATH);
        Log.Debug("[ConfigService] Quick links are " + json);
        Dictionary<string, string> quickLinks = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
        return quickLinks;
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }

    public Dictionary<string, string> AddQuickLink(string title, string path) {
      Dictionary<string, string> quickLinks = GetQuickLinksConfig();
      quickLinks.Add(title, path);
      File.WriteAllText(QUICKLINKS_PATH, JsonConvert.SerializeObject(quickLinks, Formatting.Indented));
      return quickLinks;
    }

    public Dictionary<string, string> RemoveQuickLink(string title, string path) {
      Dictionary<string, string> quickLinks = GetQuickLinksConfig();
      string keyToRemove = null;

      foreach (var kvp in quickLinks) {
        if (kvp.Value == path) {
          keyToRemove = kvp.Key;
          break;
        }
      }

      if (keyToRemove != null) {
        quickLinks.Remove(keyToRemove);
      }

      File.WriteAllText(QUICKLINKS_PATH, JsonConvert.SerializeObject(quickLinks, Formatting.Indented));
      return quickLinks;
    }

    public Dictionary<string, Dictionary<string, string>> GetColourConfig() {
      try {
        if (!File.Exists(COLOURS_PATH)) {
          File.WriteAllText(COLOURS_PATH, JsonConvert.SerializeObject(new object { }, Formatting.Indented));
        }

        string json = File.ReadAllText(COLOURS_PATH);
        Dictionary<string, Dictionary<string, string>> colourConfig = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, string>>>(json);
        return colourConfig;
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }

    public AiSettings GetAiSettings() {
      try {
        if (!File.Exists(AI_PATH)) {
          SaveAiSettings(AiSettings.CreateDefault());
        }

        string json = File.ReadAllText(AI_PATH);
        AiSettings settings = JsonConvert.DeserializeObject<AiSettings>(json);
        return NormaliseAiSettings(settings);
      } catch (Exception error) {
        Log.Error(error.ToString());
        return AiSettings.CreateDefault();
      }
    }

    public AiSettings SaveAiSettings(AiSettings settings) {
      if (settings == null) settings = AiSettings.CreateDefault();

      AiSettings existingSettings = null;
      if (File.Exists(AI_PATH)) {
        existingSettings = JsonConvert.DeserializeObject<AiSettings>(File.ReadAllText(AI_PATH));
      }

      if ((settings.ModelCatalogs == null || settings.ModelCatalogs.Count == 0) &&
        existingSettings != null &&
        existingSettings.ModelCatalogs != null &&
        existingSettings.ModelCatalogs.Count > 0) {
        settings.ModelCatalogs = existingSettings.ModelCatalogs;
      }

      settings = NormaliseAiSettings(settings);
      File.WriteAllText(AI_PATH, JsonConvert.SerializeObject(settings, Formatting.Indented));
      return settings;
    }

    public AiWorkspaceSettings GetAiWorkspaceSettings(string workingDirectory) {
      AiSettings settings = GetAiSettings();
      string key = NormaliseWorkspaceKey(workingDirectory);

      if (string.IsNullOrEmpty(key)) {
        return AiWorkspaceSettings.CreateDefault("");
      }

      if (!settings.Workspaces.ContainsKey(key) || settings.Workspaces[key] == null) {
        settings.Workspaces[key] = AiWorkspaceSettings.CreateDefault(workingDirectory);
        SaveAiSettings(settings);
      }

      return NormaliseAiWorkspaceSettings(settings.Workspaces[key], workingDirectory);
    }

    public AiSettings SaveAiWorkspaceSettings(AiWorkspaceSettings workspaceSettings) {
      AiSettings settings = GetAiSettings();
      workspaceSettings = NormaliseAiWorkspaceSettings(workspaceSettings, workspaceSettings == null ? "" : workspaceSettings.WorkingDirectory);
      string key = NormaliseWorkspaceKey(workspaceSettings.WorkingDirectory);

      if (!string.IsNullOrEmpty(key)) {
        settings.Workspaces[key] = workspaceSettings;
      }

      return SaveAiSettings(settings);
    }

    private AiSettings NormaliseAiSettings(AiSettings settings) {
      if (settings == null) settings = AiSettings.CreateDefault();
      if (settings.Enabled == null) settings.Enabled = true;
      if (string.IsNullOrEmpty(settings.SelectedProvider)) settings.SelectedProvider = "codex";
      if (string.IsNullOrEmpty(settings.CodexCommand)) settings.CodexCommand = "codex";
      if (settings.CodexModel == null) settings.CodexModel = "";
      if (settings.CodexProfile == null) settings.CodexProfile = "";
      if (settings.TimeoutSeconds <= 0) settings.TimeoutSeconds = 300;
      if (settings.ModelCatalogs == null) settings.ModelCatalogs = new Dictionary<string, AiModelCatalogResult>();
      if (settings.Workspaces == null) settings.Workspaces = new Dictionary<string, AiWorkspaceSettings>();
      return settings;
    }

    private AiWorkspaceSettings NormaliseAiWorkspaceSettings(AiWorkspaceSettings workspaceSettings, string fallbackWorkingDirectory) {
      if (workspaceSettings == null) workspaceSettings = AiWorkspaceSettings.CreateDefault(fallbackWorkingDirectory);
      if (workspaceSettings.WorkingDirectory == null) workspaceSettings.WorkingDirectory = fallbackWorkingDirectory ?? "";
      if (workspaceSettings.ContextPaths == null) workspaceSettings.ContextPaths = new List<string>();
      if (workspaceSettings.HouseStyleNotes == null) workspaceSettings.HouseStyleNotes = "";
      if (workspaceSettings.DefaultCampaignBrief == null) workspaceSettings.DefaultCampaignBrief = "";
      return workspaceSettings;
    }

    private string NormaliseWorkspaceKey(string workingDirectory) {
      if (string.IsNullOrEmpty(workingDirectory)) return "";
      return workingDirectory.Trim().Replace("\\", "/").TrimEnd('/').ToLowerInvariant();
    }
  }
}
