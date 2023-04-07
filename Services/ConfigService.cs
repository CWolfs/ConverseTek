using System;
using System.IO;
using System.Windows;
using System.Collections.Generic;

using Chromely.Core.Infrastructure;

using Newtonsoft.Json;

namespace ConverseTek.Services {
  public class ConfigService {
    private static ConfigService instance;
    private static string CONFIG_PATH = "/config";

    public static ConfigService getInstance() {
      if (instance == null) instance = new ConfigService();
      return instance;
    }

    public Dictionary<string, string> GetQuickLinksConfig() {
      try {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string json = File.ReadAllText($"{baseDirectory}{CONFIG_PATH}/quicklinks.json");
        Log.Debug("[ConfigService] Quick links are " + json);
        Dictionary<string, string> quickLinks = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
        return quickLinks;
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }
  }
}