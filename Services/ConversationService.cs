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

    public ConversationService() {}

    public List<ConversationAsset> LoadConversations() {
      List<ConversationAsset> conversations = new List<ConversationAsset>();

      // Guard - Only load if working directory is set
      if (FileSystemService.getInstance().WorkingDirectory != null) {
        string[] conversationPaths = Directory.GetFiles(FileSystemService.getInstance().WorkingDirectory);

        foreach (string conversationPath in conversationPaths) {
          ConversationAsset conversationAsset = LoadConversation(conversationPath);
          conversations.Add(conversationAsset);
        }
      }

      return conversations;
    }

    public ConversationAsset LoadConversation(string filePath) {
      ConversationAsset conversationAsset = null;
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();

      try {
        using (FileStream fileStream = new FileStream(filePath, FileMode.Open)) {
          Conversation conversation = runtimeTypeModel.Deserialize(fileStream, null, typeof(Conversation)) as Conversation;
          conversationAsset = new ConversationAsset(filePath, conversation);
        }
      } catch (Exception error) {
          Log.Error(error.ToString());
          return null;
      }

      return conversationAsset;
    }

    public void SaveConversation(ConversationAsset conversationAsset, FileFormat fileFormat) {
      SaveConversation(conversationAsset, fileFormat, conversationAsset.FilePath);
    }

    public void SaveConversation(ConversationAsset conversationAsset, FileFormat fileFormat, string path) {
      if (fileFormat == FileFormat.JSON) {
        SaveJsonConversation(conversationAsset, path);
      } else if (fileFormat == FileFormat.BINARY) {
        SaveBinaryConversation(conversationAsset, path);
      }
    }

    private void SaveJsonConversation(ConversationAsset conversationAsset, string path) {
      File.WriteAllText(Path.ChangeExtension(path, ".json"), JsonConvert.SerializeObject(conversationAsset.Conversation, Formatting.Indented));
    }

    private void SaveBinaryConversation(ConversationAsset conversationAsset, string path) {
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();

      try {
        using (FileStream fileStream = new FileStream(Path.ChangeExtension(path, ".bytes"), FileMode.Create)) {
          runtimeTypeModel.Serialize(fileStream, conversationAsset.Conversation);
        }
      } catch (Exception error) {
          Log.Error(error.ToString());
      }
    }
  }
}