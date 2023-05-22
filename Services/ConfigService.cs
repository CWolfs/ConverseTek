using System;
using System.IO;
using System.Windows;
using System.Collections.Generic;

using Chromely.Core.Infrastructure;

using Newtonsoft.Json;

namespace ConverseTek.Services {
  public class ConfigService {
    private static ConfigService instance;
    private static string BASE_DIRECTORY = AppDomain.CurrentDomain.BaseDirectory;
    private static string CONFIG_PATH = $"{BASE_DIRECTORY}/config";

    private static string QUICKLINKS_PATH = $"{CONFIG_PATH}/quicklinks.json";
    private static string COLOURS_PATH = $"{CONFIG_PATH}/colours.json";

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
        Log.Debug("[ConfigService] Colours are " + json);
        Dictionary<string, Dictionary<string, string>> colourConfig = JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, string>>>(json);
        return colourConfig;
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }
  }
}