namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using ConverseTek.Conversations;
  using ConverseTek.Data;
  using ConverseTek.Infrastructure;

  public class ConversationService {
    private static ConversationService instance;

    public static ConversationService getInstance() {
      if (instance == null) instance = new ConversationService();
      return instance;
    }

    public ConversationService() { }

    public List<ConversationAsset> LoadConversations() {
      List<ConversationAsset> conversations = new List<ConversationAsset>();

      // Guard - Only load if working directory is set
      if (FileSystemService.getInstance().WorkingDirectory != null) {
        string[] conversationPaths = Directory.GetFiles(FileSystemService.getInstance().WorkingDirectory);

        foreach (string conversationPath in conversationPaths) {
          // GUARD - Only process .bytes files
          if (!conversationPath.EndsWith(".bytes")) continue;

          // This is a ConversationSpeakerList instead of a Conversation
          if (conversationPath.Contains(".cvsl.bytes")) {
            SpeakerListAsset speakerListAsset = LoadSpeakersList(conversationPath);
            SaveJsonSpeakerList(speakerListAsset, speakerListAsset.FilePath);
          } else {
            ConversationAsset conversationAsset = LoadConversation(conversationPath);
            conversations.Add(conversationAsset);
          }
        }
      }

      return conversations;
    }

    public ConversationAsset LoadConversation(string filePath) {
      try {
        return new ConversationAsset(filePath, ConversationFiles.LoadBinary(filePath));
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }

    public ConversationAsset ImportConversation(string filePath) {
      try {
        return new ConversationAsset(filePath, ConversationFiles.LoadJson(filePath));
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }

    public bool DeleteConversation(string filePath) {
      try {
        bool fileExists = File.Exists(filePath);
        if (fileExists) {
          File.Delete(filePath);
          return !File.Exists(filePath);
        }
      } catch (Exception error) {
        Log.Error(error.ToString());
      }
      return false;
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
      ConversationFiles.SaveJson(conversationAsset.Conversation, Path.ChangeExtension(path, ".json"));
    }

    private void SaveBinaryConversation(ConversationAsset conversationAsset, string path) {
      try {
        ConversationFiles.SaveBinary(conversationAsset.Conversation, Path.ChangeExtension(path, ".bytes"));
      } catch (Exception error) {
        Log.Error(error.ToString());
      }
    }

    public SpeakerListAsset LoadSpeakersList(string filePath) {
      try {
        return new SpeakerListAsset(filePath, ConversationFiles.LoadSpeakerList(filePath));
      } catch (Exception error) {
        Log.Error(error.ToString());
        return null;
      }
    }

    public void SaveSpeakersList(SpeakerListAsset speakerList, FileFormat fileFormat, string path) {
      if (fileFormat == FileFormat.JSON) {
        SaveJsonSpeakerList(speakerList, path);
      } else if (fileFormat == FileFormat.BINARY) {
        SaveBinarySpeakerList(speakerList, path);
      }
    }

    private void SaveJsonSpeakerList(SpeakerListAsset speakerList, string path) {
      ConversationFiles.SaveSpeakerListJson(speakerList.SpeakerList, Path.ChangeExtension(path, ".json"));
    }

    private void SaveBinarySpeakerList(SpeakerListAsset speakerList, string path) {
      try {
        ConversationFiles.SaveSpeakerListBinary(speakerList.SpeakerList, Path.ChangeExtension(path, ".bytes"));
      } catch (Exception error) {
        Log.Error(error.ToString());
      }
    }
  }
}
