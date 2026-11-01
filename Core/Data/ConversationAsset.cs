
using System.IO;
using isogame;

namespace ConverseTek.Data;
/*
  Container for Conversation with additional meta data
*/
public class ConversationAsset {

  public string FileName { get; set; }
  public string FilePath { get; set; }
  public Conversation Conversation { get; set; }

  public ConversationAsset(string filePath, Conversation conversation) {
    FileName = Path.GetFileNameWithoutExtension(filePath);
    FilePath = filePath;
    Conversation = conversation;
  }
}
