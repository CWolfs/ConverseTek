namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using Chromely.Core.Infrastructure;

  using Newtonsoft.Json;

  using isogame;
  using ProtoBuf;
  using ProtoBuf.Meta;

  using ConverseTek.Data;

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
      // string[] conversationPaths = Directory.GetFiles("D:/Program Files (x86)/Steam/steamapps/common/BATTLETECH/BattleTech_Data/StreamingAssets/data/simGameConversations");
      string[] conversationPaths = Directory.GetFiles("C:/Data");

      foreach (string conversationPath in conversationPaths) {
        Conversation conversation = LoadConversation(conversationPath);
        ExportConversation(conversation, FileFormat.BINARY, conversationPath);
        conversations.Add(conversation);
      }

      return conversations;
    }

    public Conversation LoadConversation(string filePath) {
      Conversation conversation = null;
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();

      try {
        using (FileStream fileStream = new FileStream(filePath, FileMode.Open)) {
          conversation = runtimeTypeModel.Deserialize(fileStream, null, typeof(Conversation)) as Conversation;
        }
      } catch (Exception error) {
          Log.Error(error.ToString());
          return null;
      }

      return conversation;
    }

    public void ExportConversation(Conversation conversation, FileFormat fileFormat, string path) {
      if (fileFormat == FileFormat.JSON) {
        ExportJsonConversation(conversation, path);
      } else if (fileFormat == FileFormat.BINARY) {
        ExportBinaryConversation(conversation, path);
      }
    }

    private void ExportJsonConversation(Conversation conversation, string path) {
      File.WriteAllText(Path.ChangeExtension(path, ".json"), JsonConvert.SerializeObject(conversation, Formatting.Indented));
    }

    private void ExportBinaryConversation(Conversation conversation, string path) {
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();

      try {
        using (FileStream fileStream = new FileStream(Path.ChangeExtension(path, ".byte1"), FileMode.Create)) {
          runtimeTypeModel.Serialize(fileStream, conversation);
        }
      } catch (Exception error) {
          Log.Error(error.ToString());
      }
    }
  }
}