namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using Chromely.Core.Infrastructure;

  using isogame;
  using ProtoBuf;
  using ProtoBuf.Meta;

  public class ConversationService {
    private static ConversationService instance;

    public static ConversationService getInstance() {
      if (instance == null) instance = new ConversationService();
      return instance;
    }

    public ConversationService() {

    }

    public List<Conversation> LoadConversations() {
      List<Conversation> conversations = new List<Conversation>();
      string[] conversationPaths = Directory.GetFiles("D:/Program Files (x86)/Steam/steamapps/common/BATTLETECH/BattleTech_Data/StreamingAssets/data/simGameConversations");
      
      foreach (string conversationPath in conversationPaths) {
        Conversation conversation = LoadConversation(conversationPath);
        conversations.Add(conversation);
      }

      return conversations;
    }

    public Conversation LoadConversation(string filePath) {
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();
      FileStream fs = null;
      try {
          fs = new FileStream(filePath, FileMode.Open);
      } catch (Exception error) {
          Log.Error(error.ToString());
          return null;
      }

      Conversation conversation = runtimeTypeModel.Deserialize(fs, null, typeof(Conversation)) as Conversation;
      return conversation;
    }
  }
}