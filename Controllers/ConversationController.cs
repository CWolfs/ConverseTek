namespace ConverseTek.Controllers {
  using System;
  using System.IO;
  using System.Collections.Generic;
  using System.Diagnostics.CodeAnalysis;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using Chromely.Core.RestfulService;
  using Chromely.Core.Infrastructure;

  using ConverseTek.Data;
  using ConverseTek.Services;

  [ControllerProperty(Name = "ConversationController", Route = "conversations")]
  public class ConversationController : ChromelyController {

    public ConversationController() {
      this.RegisterGetRequest("/conversations", this.GetConversations);
      this.RegisterPostRequest("/conversations/put", this.UpdateConversations);
      this.RegisterPostRequest("/conversations/export", this.ExportConversations);
      this.RegisterPostRequest("/conversations/export-all", this.ExportAllConversations);
      this.RegisterPostRequest("/conversations/import", this.ImportConversation);
      this.RegisterPostRequest("/conversations/delete", this.DeleteConversation);
    }

    private ChromelyResponse GetConversations(ChromelyRequest request) {
      ConversationService conversationService = ConversationService.getInstance();
      List<ConversationAsset> conversations = conversationService.LoadConversations();

      string conversationsJson = JsonConvert.SerializeObject(conversations);

      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }

    private ChromelyResponse UpdateConversations(ChromelyRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = (string)request.PostData.EnsureJson();
      JObject data = JObject.Parse(postDataJson);

      ConversationService conversationService = ConversationService.getInstance();

      try {
        ConversationAsset conversationAsset = JsonConvert.DeserializeObject<ConversationAsset>(data["conversationAsset"].ToString());
        conversationService.SaveConversation(conversationAsset, FileFormat.BINARY);
      } catch (Exception e) {
        Log.Error(e);
      }

      List<ConversationAsset> conversations = conversationService.LoadConversations();
      string conversationsJson = JsonConvert.SerializeObject(conversations);
      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }

    private ChromelyResponse ExportConversations(ChromelyRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = (string)request.PostData.EnsureJson();
      JObject data = JObject.Parse(postDataJson);

      ConversationService conversationService = ConversationService.getInstance();

      try {
        ConversationAsset conversationAsset = JsonConvert.DeserializeObject<ConversationAsset>(data["conversationAsset"].ToString());
        conversationService.SaveConversation(conversationAsset, FileFormat.JSON);
      } catch (Exception e) {
        Log.Error(e);
      }

      List<ConversationAsset> conversations = conversationService.LoadConversations();
      string conversationsJson = JsonConvert.SerializeObject(conversations);
      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }

    private ChromelyResponse ImportConversation(ChromelyRequest request) {
      IDictionary<string, object> requestParams = request.Parameters;
      string path = (string)requestParams["path"];

      ConversationService conversationService = ConversationService.getInstance();

      try {
        ConversationAsset conversationAsset = conversationService.ImportConversation(path);
        conversationService.SaveConversation(conversationAsset, FileFormat.BINARY);
      } catch (Exception e) {
        Log.Error(e);
      }

      List<ConversationAsset> conversations = conversationService.LoadConversations();
      string conversationsJson = JsonConvert.SerializeObject(conversations);
      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }

    private ChromelyResponse ExportAllConversations(ChromelyRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = (string)request.PostData.EnsureJson();
      JObject data = JObject.Parse(postDataJson);

      ConversationService conversationService = ConversationService.getInstance();

      List<ConversationAsset> conversations = conversationService.LoadConversations();
      foreach (ConversationAsset conversationAsset in conversations) {
        conversationService.SaveConversation(conversationAsset, FileFormat.JSON);
      }

      try {
        string conversationAssetString = data["conversationAsset"].ToString();

        if (conversationAssetString != "") {
          ConversationAsset conversationAsset = JsonConvert.DeserializeObject<ConversationAsset>(conversationAssetString);
          conversationService.SaveConversation(conversationAsset, FileFormat.JSON);
        }
      } catch (Exception e) {
        Log.Error(e);
      }

      List<ConversationAsset> updatedConversations = conversationService.LoadConversations();
      string conversationsJson = JsonConvert.SerializeObject(updatedConversations);
      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }


    private ChromelyResponse DeleteConversation(ChromelyRequest request) {
      IDictionary<string, object> requestParams = request.Parameters;
      string path = (string)requestParams["path"];

      ConversationService conversationService = ConversationService.getInstance();

      try {
        bool success = conversationService.DeleteConversation(path);
        if (!success) {
          Log.Error("Delete failed");
        }
      } catch (Exception e) {
        Log.Error(e);
      }

      List<ConversationAsset> conversations = conversationService.LoadConversations();
      string conversationsJson = JsonConvert.SerializeObject(conversations);
      ChromelyResponse response = new ChromelyResponse();
      response.Data = conversationsJson;
      return response;
    }
  }
}