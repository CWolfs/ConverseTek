namespace ConverseTek.Controllers {
  using System;
  using System.Collections.Generic;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using ConverseTek.Data;
  using ConverseTek.Host;
  using ConverseTek.Infrastructure;
  using ConverseTek.Services;

  public class ConversationController {

    public void RegisterRoutes(AppRouteDispatcher dispatcher) {
      dispatcher.RegisterGet("/conversations", this.GetConversations);
      dispatcher.RegisterPost("/conversations/put", this.UpdateConversations);
      dispatcher.RegisterPost("/conversations/export", this.ExportConversations);
      dispatcher.RegisterPost("/conversations/export-all", this.ExportAllConversations);
      dispatcher.RegisterPost("/conversations/import", this.ImportConversation);
      dispatcher.RegisterPost("/conversations/delete", this.DeleteConversation);
    }

    private AppResponse GetConversations(AppRequest request) {
      ConversationService conversationService = ConversationService.getInstance();
      List<ConversationAsset> conversations = conversationService.LoadConversations();

      string conversationsJson = JsonConvert.SerializeObject(conversations);

      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }

    private AppResponse UpdateConversations(AppRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = request.PostData;
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
      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }

    private AppResponse ExportConversations(AppRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = request.PostData;
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
      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }

    private AppResponse ImportConversation(AppRequest request) {
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
      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }

    private AppResponse ExportAllConversations(AppRequest request) {
      IDictionary<string, object> parameters = request.Parameters;
      string postDataJson = request.PostData;
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
      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }


    private AppResponse DeleteConversation(AppRequest request) {
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
      AppResponse response = new AppResponse();
      response.Data = conversationsJson;
      return response;
    }
  }
}
