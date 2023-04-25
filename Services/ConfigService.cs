using System;
using System.IO;
using System.Windows;
using System.Collections.Generic;

using Chromely.Core.Infrastructure;

using Newtonsoft.Json;

namespace ConverseTek.Services {
  public class ConfigService {
    private static ConfigService instance;
    string BASE_DIRECTORY = AppDomain.CurrentDomain.BaseDirectory;
    private static string CONFIG_PATH = "/config";

    public static ConfigService getInstance() {
      if (instance == null) instance = new ConfigService();
      return instance;
    }

    public Dictionary<string, string> GetQuickLinksConfig() {
      try {
        string json = File.ReadAllText($"{BASE_DIRECTORY}{CONFIG_PATH}/quicklinks.json");
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
      File.WriteAllText($"{BASE_DIRECTORY}{CONFIG_PATH}/quicklinks.json", JsonConvert.SerializeObject(quickLinks, Formatting.Indented));
      return quickLinks;
    }

    public Dictionary<string, string> RemoveQuickLink(string title, string path) {
      Dictionary<string, string> quickLinks = GetQuickLinksConfig();
      quickLinks.Remove(title);
      File.WriteAllText($"{BASE_DIRECTORY}{CONFIG_PATH}/quicklinks.json", JsonConvert.SerializeObject(quickLinks, Formatting.Indented));
      return quickLinks;
    }
  }
}