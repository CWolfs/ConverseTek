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

            try {
                ConversationAsset conversationAsset = JsonConvert.DeserializeObject<ConversationAsset>(data["conversationAsset"].ToString());
                ConversationService conversationService = ConversationService.getInstance();
                conversationService.SaveConversation(conversationAsset, FileFormat.BINARY);
            } catch (Exception e) {
                Log.Error(e);
            }

            return null;
        }
    }
}