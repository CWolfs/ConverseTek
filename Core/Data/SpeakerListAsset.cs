namespace ConverseTek.Data {

  using System.IO;
  using isogame;

  /*
    Container for ConversationSpeakerList with additional meta data
  */
  public class SpeakerListAsset {

    public string FileName { get; set; }
    public string FilePath { get; set; }
    public ConversationSpeakerList SpeakerList { get; set; }

    public SpeakerListAsset(string filePath, ConversationSpeakerList speakerList) {
      FileName = Path.GetFileNameWithoutExtension(filePath);
      FilePath = filePath;
      SpeakerList = speakerList;
    }
  }
}