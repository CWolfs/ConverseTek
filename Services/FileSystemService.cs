namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using ConverseTek.Data;

  using Chromely.Core.Infrastructure;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  public class FileSystemService {
    private static FileSystemService instance;

    public static FileSystemService getInstance() {
      if (instance == null) instance = new FileSystemService();
      return instance;
    }

    public FileSystemService() {}

    public List<FsDirectory> GetRootDrives() {
      List<FsDirectory> rootDrives = new List<FsDirectory>();

      try {
        DriveInfo[] allDrives = DriveInfo.GetDrives();
        foreach (DriveInfo drive in allDrives) {
          if (drive.IsReady) {
            FsDirectory directory = new FsDirectory();
            directory.Name = drive.Name;
            directory.Path = drive.Name;
            directory.HasChildren = Directory.GetDirectories(drive.Name).Length > 0;
            rootDrives.Add(directory);
          }
        }
      } catch (Exception error) {
         Log.Error(error.ToString());
      }

      return rootDrives;
    }
  }
}