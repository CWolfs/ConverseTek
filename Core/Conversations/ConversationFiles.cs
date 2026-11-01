namespace ConverseTek.Conversations {
  using System;
  using System.Collections.Generic;
  using System.IO;

  using Newtonsoft.Json;

  using isogame;
  using ProtoBuf.Meta;

  using ConverseTek.Data;

  /*
    Reads and writes BattleTech conversation files. The binary .bytes format is the protobuf
    serialisation of the game's own isogame types, so only fields on those types round-trip.
    Methods throw on failure - callers decide whether to log, report or swallow.
  */
  public static class ConversationFiles {
    public static bool IsSpeakerListPath(string path) {
      return path.EndsWith(".cvsl.bytes", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsJsonPath(string path) {
      return path.EndsWith(".json", StringComparison.OrdinalIgnoreCase);
    }

    // Loads a conversation from either a binary .bytes file or a JSON export, picked by extension
    public static Conversation Load(string path) {
      return IsJsonPath(path) ? LoadJson(path) : LoadBinary(path);
    }

    public static Conversation LoadBinary(string path) {
      using (FileStream fileStream = new FileStream(path, FileMode.Open, FileAccess.Read)) {
        Conversation conversation = TypeModel.Create().Deserialize(fileStream, null, typeof(Conversation)) as Conversation;
        if (conversation == null) throw new InvalidDataException($"'{path}' did not contain a conversation");
        return conversation;
      }
    }

    public static Conversation LoadJson(string path) {
      Conversation conversation = JsonConvert.DeserializeObject<Conversation>(File.ReadAllText(path));
      if (conversation == null) throw new InvalidDataException($"'{path}' did not contain a conversation");
      return conversation;
    }

    public static void SaveBinary(Conversation conversation, string path) {
      using (FileStream fileStream = new FileStream(path, FileMode.Create)) {
        TypeModel.Create().Serialize(fileStream, conversation);
      }
    }

    public static void SaveJson(Conversation conversation, string path) {
      File.WriteAllText(path, ToJson(conversation));
    }

    public static string ToJson(Conversation conversation) {
      return JsonConvert.SerializeObject(conversation, Formatting.Indented);
    }

    // Serialises to protobuf and back. Anything that does not survive this will not survive a save.
    public static Conversation RoundTrip(Conversation conversation) {
      RuntimeTypeModel runtimeTypeModel = TypeModel.Create();
      using (MemoryStream stream = new MemoryStream()) {
        runtimeTypeModel.Serialize(stream, conversation);
        stream.Position = 0;
        return runtimeTypeModel.Deserialize(stream, null, typeof(Conversation)) as Conversation;
      }
    }

    // Every conversation .bytes file in a folder (speaker lists skipped). Files that fail to load are
    // reported through failures rather than stopping the whole folder.
    public static List<ConversationAsset> LoadFolder(string directory, List<KeyValuePair<string, Exception>> failures = null) {
      List<ConversationAsset> assets = new List<ConversationAsset>();
      string[] paths = Directory.GetFiles(directory, "*.bytes");
      Array.Sort(paths, StringComparer.OrdinalIgnoreCase);

      foreach (string path in paths) {
        if (IsSpeakerListPath(path)) continue;

        try {
          assets.Add(new ConversationAsset(path, LoadBinary(path)));
        } catch (Exception error) {
          failures?.Add(new KeyValuePair<string, Exception>(path, error));
        }
      }

      return assets;
    }

    public static ConversationSpeakerList LoadSpeakerList(string path) {
      using (FileStream fileStream = new FileStream(path, FileMode.Open, FileAccess.Read)) {
        ConversationSpeakerList speakerList = TypeModel.Create().Deserialize(fileStream, null, typeof(ConversationSpeakerList)) as ConversationSpeakerList;
        if (speakerList == null) throw new InvalidDataException($"'{path}' did not contain a speaker list");
        return speakerList;
      }
    }

    public static void SaveSpeakerListBinary(ConversationSpeakerList speakerList, string path) {
      using (FileStream fileStream = new FileStream(path, FileMode.Create)) {
        TypeModel.Create().Serialize(fileStream, speakerList);
      }
    }

    public static void SaveSpeakerListJson(ConversationSpeakerList speakerList, string path) {
      File.WriteAllText(path, JsonConvert.SerializeObject(speakerList, Formatting.Indented));
    }
  }
}
