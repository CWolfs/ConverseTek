namespace ConverseTek.Controllers {
    using System;
    using System.IO;
    using System.Collections.Generic;
    using System.Diagnostics.CodeAnalysis;

    using Newtonsoft.Json;

    using Chromely.Core.RestfulService;
    using Chromely.Core.Infrastructure;

    using ConverseTek.Data;
    using ConverseTek.Services;

    [ControllerProperty(Name = "ConversationController", Route = "conversations")]
    public class ConversationController : ChromelyController {

        public ConversationController() {
            this.RegisterGetRequest("/conversations", this.GetConversations);
            // this.RegisterGetRequest("/conversations/id:", this.GetConversation);
        }

        private ChromelyResponse GetConversations(ChromelyRequest request) {
            ConversationService conversationService = ConversationService.getInstance();
            List<ConversationAsset> conversations = conversationService.LoadConversations();

            string conversationsJson = JsonConvert.SerializeObject(conversations);

            ChromelyResponse response = new ChromelyResponse();
            response.Data = conversationsJson;
            return response;
        }

        //private ChromelyResponse GetConversation(ChromelyRequest request) {
            /*string conversationJson = JsonConvert.SerializeObject(conversation);
            Log.Info("JSON: " + conversationJson);
            Log.Info($"Conversation is of type {conversation.ToString()} with idRef of {conversation.idRef} with id of {conversation.idRef.id} with name of {conversation.ui_name}");

            ChromelyResponse response = new ChromelyResponse();
            response.Data = conversationJson;
            return response;
            */
        //}
    }
}