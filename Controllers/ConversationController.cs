namespace ChromelyReactCefSharp.Controllers {
    using System;
    using System.IO;
    using System.Collections.Generic;
    using System.Diagnostics.CodeAnalysis;

    using Newtonsoft.Json;

    using Chromely.Core.RestfulService;
    using Chromely.Core.Infrastructure;

    using isogame;
    using ProtoBuf;
    using ProtoBuf.Meta;

    [ControllerProperty(Name = "ConversationController", Route = "conversations")]
    public class ConversationController : ChromelyController {

        public ConversationController() {
            // this.RegisterGetRequest("/conversations", this.GetConversations);
            this.RegisterGetRequest("/conversations/id:", this.GetConversation);
        }

        private ChromelyResponse GetConversation(ChromelyRequest request) {
            List<MovieInfo> movieInfos = new List<MovieInfo>();
            string assemblyName = typeof(MovieInfo).Assembly.GetName().Name;

            RuntimeTypeModel runtimeTypeModel = TypeModel.Create();

            FileStream fs = null;
            try {
                fs = new FileStream("5a39e3bd6230353c12005747.convo.bytes", FileMode.Open);
            } catch (Exception error) {
                Log.Error(error.ToString());
                return null;
            }

            Conversation conversation = runtimeTypeModel.Deserialize(fs, null, typeof(Conversation)) as Conversation;
            // ShadowrunSerializer ser = new ShadowrunSerializer();
            // Conversation conversation = ser.Deserialize(fs, null, typeof(Conversation)) as Conversation;

            string conversationJson = JsonConvert.SerializeObject(conversation);
            Log.Info("JSON: " + conversationJson);
            Log.Info($"Conversation is of type {conversation.ToString()} with idRef of {conversation.idRef} with id of {conversation.idRef.id} with name of {conversation.ui_name}");

            ChromelyResponse response = new ChromelyResponse();
            response.Data = conversationJson;
            return response;
        }
    }
}