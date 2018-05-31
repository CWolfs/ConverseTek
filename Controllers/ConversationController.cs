namespace ConverseTek.Controllers {
    using System;
    using System.IO;
    using System.Collections.Generic;
    using System.Diagnostics.CodeAnalysis;

    using Newtonsoft.Json;

    using Chromely.Core.RestfulService;
    using Chromely.Core.Infrastructure;

    using ConverseTek.Services;

    using isogame;
    using ProtoBuf;
    using ProtoBuf.Meta;

    [ControllerProperty(Name = "ConversationController", Route = "conversations")]
    public class ConversationController : ChromelyController {

        public ConversationController() {
            this.RegisterGetRequest("/conversations", this.GetConversations);
            // this.RegisterGetRequest("/conversations/id:", this.GetConversation);
        }

        private ChromelyResponse GetConversations(ChromelyRequest request) {
            ConversationService conversationService = ConversationService.getInstance();
            List<Conversation> conversations = conversationService.LoadConversations();
            return null;
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