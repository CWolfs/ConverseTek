using System.Collections.Generic;

namespace ConverseTek.Data {
  public struct FsDirectory {
    public string Name;
    public string Path;
    public bool HasChildren;
  }

  public class FsDirectoryView {

    public string DesktopPath = "";
    public string MyComputerPath = "";
    public List<FsDirectory> DirectoryList = new List<FsDirectory>();

    public FsDirectoryView() {
      
    }
  }
}