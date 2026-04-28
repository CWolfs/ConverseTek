namespace ConverseTek.Controllers {
  using System;
  using System.IO;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using Chromely.Core.RestfulService;
  using Chromely.Core.Infrastructure;

  using ProtoBuf.Meta;
  using isogame;

  using ConverseTek.Data;
  using ConverseTek.Services;

  [ControllerProperty(Name = "AiController", Route = "ai")]
  public class AiController : ChromelyController {
    public AiController() {
      this.RegisterGetRequest("/ai/settings/current", this.GetSettings);
      this.RegisterPostRequest("/ai/settings", this.SaveSettings);
      this.RegisterPostRequest("/ai/models", this.GetModels);
      this.RegisterPostRequest("/ai/draft", this.CreateDraft);
      this.RegisterPostRequest("/ai/draft-artifact", this.GetDraftArtifact);
      this.RegisterPostRequest("/ai/validate-conversation", this.ValidateConversation);
    }

    private ChromelyResponse GetSettings(ChromelyRequest request) {
      ConfigService configService = ConfigService.getInstance();
      AiSettings settings = configService.GetAiSettings();

      ChromelyResponse response = new ChromelyResponse();
      response.Data = JsonConvert.SerializeObject(settings);
      return response;
    }

    private ChromelyResponse SaveSettings(ChromelyRequest request) {
      string postDataJson = (string)request.PostData.EnsureJson();
      JObject data = JObject.Parse(postDataJson);
      ConfigService configService = ConfigService.getInstance();

      if (data["settings"] != null) {
        AiSettings settings = JsonConvert.DeserializeObject<AiSettings>(data["settings"].ToString());
        settings = configService.SaveAiSettings(settings);
        ChromelyResponse settingsResponse = new ChromelyResponse();
        settingsResponse.Data = JsonConvert.SerializeObject(settings);
        return settingsResponse;
      }

      if (data["workspaceSettings"] != null) {
        AiWorkspaceSettings workspaceSettings = JsonConvert.DeserializeObject<AiWorkspaceSettings>(data["workspaceSettings"].ToString());
        AiSettings settings = configService.SaveAiWorkspaceSettings(workspaceSettings);
        ChromelyResponse workspaceResponse = new ChromelyResponse();
        workspaceResponse.Data = JsonConvert.SerializeObject(settings);
        return workspaceResponse;
      }

      ChromelyResponse response = new ChromelyResponse();
      response.Data = JsonConvert.SerializeObject(configService.GetAiSettings());
      return response;
    }

    private ChromelyResponse GetModels(ChromelyRequest request) {
      ChromelyResponse response = new ChromelyResponse();

      try {
        if (ConfigService.getInstance().GetAiSettings().Enabled == false) {
          response.Data = JsonConvert.SerializeObject(new AiModelCatalogResult {
            Success = false,
            Error = "AI features are disabled in config/ai.json.",
            Provider = "unknown"
          });
          return response;
        }

        string postDataJson = (string)request.PostData.EnsureJson();
        JObject data = JObject.Parse(postDataJson);
        bool forceRefresh = data["forceRefresh"] != null && data["forceRefresh"].Value<bool>();
        AiSettings settings = data["settings"] == null
          ? ConfigService.getInstance().GetAiSettings()
          : JsonConvert.DeserializeObject<AiSettings>(data["settings"].ToString());

        AiModelCatalogResult result = AiProviderService.getInstance().GetModels(settings, forceRefresh);
        response.Data = JsonConvert.SerializeObject(result);
      } catch (Exception error) {
        response.Data = JsonConvert.SerializeObject(new AiModelCatalogResult {
          Success = false,
          Error = error.Message,
          Provider = "unknown"
        });
      }

      return response;
    }

    private ChromelyResponse CreateDraft(ChromelyRequest request) {
      ChromelyResponse response = new ChromelyResponse();

      try {
        if (ConfigService.getInstance().GetAiSettings().Enabled == false) {
          response.Data = JsonConvert.SerializeObject(new AiDraftRunResult {
            Success = false,
            Error = "AI features are disabled in config/ai.json.",
            Provider = "unknown"
          });
          return response;
        }

        string postDataJson = (string)request.PostData.EnsureJson();
        JObject data = JObject.Parse(postDataJson);
        AiDraftRequest draftRequest = JsonConvert.DeserializeObject<AiDraftRequest>(data["request"].ToString());
        AiDraftRunResult result = AiProviderService.getInstance().RunDraft(draftRequest);
        response.Data = JsonConvert.SerializeObject(result);
      } catch (Exception error) {
        response.Data = JsonConvert.SerializeObject(new AiDraftRunResult {
          Success = false,
          Error = error.Message,
          Provider = "unknown"
        });
      }

      return response;
    }

    private ChromelyResponse GetDraftArtifact(ChromelyRequest request) {
      ChromelyResponse response = new ChromelyResponse();
      AiDraftArtifactResult result = new AiDraftArtifactResult {
        Success = false,
        Error = "",
        Content = "",
        Path = "",
        Truncated = false
      };

      try {
        if (ConfigService.getInstance().GetAiSettings().Enabled == false) {
          result.Error = "AI features are disabled in config/ai.json.";
          response.Data = JsonConvert.SerializeObject(result);
          return response;
        }

        string postDataJson = (string)request.PostData.EnsureJson();
        JObject data = JObject.Parse(postDataJson);
        string path = data["path"] == null ? "" : data["path"].ToString();
        result.Path = path;

        if (string.IsNullOrEmpty(path)) {
          result.Error = "No AI diagnostics artifact path was provided.";
          response.Data = JsonConvert.SerializeObject(result);
          return response;
        }

        string diagnosticsRoot = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs", "ai-drafts"));
        string fullPath = Path.GetFullPath(path);
        string diagnosticsRootWithSeparator = diagnosticsRoot.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(diagnosticsRootWithSeparator, StringComparison.OrdinalIgnoreCase)) {
          result.Error = "AI diagnostics artifact is outside the AI draft logs folder.";
          response.Data = JsonConvert.SerializeObject(result);
          return response;
        }

        if (!File.Exists(fullPath)) {
          result.Error = "AI diagnostics artifact does not exist.";
          response.Data = JsonConvert.SerializeObject(result);
          return response;
        }

        const int maxCharacters = 200000;
        string content = File.ReadAllText(fullPath);
        if (content.Length > maxCharacters) {
          content = content.Substring(0, maxCharacters);
          result.Truncated = true;
        }

        result.Content = content;
        result.Success = true;
      } catch (Exception error) {
        result.Success = false;
        result.Error = error.Message;
      }

      response.Data = JsonConvert.SerializeObject(result);
      return response;
    }

    private ChromelyResponse ValidateConversation(ChromelyRequest request) {
      ChromelyResponse response = new ChromelyResponse();
      ConversationValidationResult result = new ConversationValidationResult {
        Success = false,
        Error = ""
      };

      try {
        string postDataJson = (string)request.PostData.EnsureJson();
        JObject data = JObject.Parse(postDataJson);
        ConversationAsset conversationAsset = JsonConvert.DeserializeObject<ConversationAsset>(data["conversationAsset"].ToString());

        RuntimeTypeModel runtimeTypeModel = TypeModel.Create();
        using (MemoryStream memoryStream = new MemoryStream()) {
          runtimeTypeModel.Serialize(memoryStream, conversationAsset.Conversation);
          memoryStream.Position = 0;
          Conversation roundTrippedConversation = runtimeTypeModel.Deserialize(memoryStream, null, typeof(Conversation)) as Conversation;
          result.Success = roundTrippedConversation != null;
          result.Error = result.Success ? "" : "The generated conversation could not be read back after serialisation.";
        }
      } catch (Exception error) {
        result.Success = false;
        result.Error = error.Message;
      }

      response.Data = JsonConvert.SerializeObject(result);
      return response;
    }
  }
}
