using System.Collections.Generic;

namespace ConverseTek.Data {
  public struct FsDirectory {
    public string Name;
    public string Path;
    public bool HasChildren;
    public bool IsDirectory;
  }

  public struct FsFile {
    public string Name;
    public string Path;
    public bool IsFile;
  }

  public struct FsView {
    public List<FsDirectory> directories;
    public List<FsFile> files;
  }
}