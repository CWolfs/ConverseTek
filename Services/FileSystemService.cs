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

    public List<FsDirectory> GetDirectories(string path) {
      List<FsDirectory> directories = new List<FsDirectory>();

      // GUARD - If at the top of the drive, return drives instead
      if (path == "{drives}") return GetRootDrives();

      // Add a back link so the user can navigate back up the file structure
      DirectoryInfo currentDirectoryInfo = new DirectoryInfo(path);
      DirectoryInfo parentDirectoryInfo = currentDirectoryInfo.Parent;
      FsDirectory backLink = new FsDirectory();
      backLink.Name = "..";
      backLink.Path = (parentDirectoryInfo == null) ? "{drives}" : parentDirectoryInfo.FullName;
      backLink.HasChildren = true;
      directories.Add(backLink);

      try {
        string[] directoryPaths = Directory.GetDirectories(path);
        foreach (string directoryPath in directoryPaths) {
          DirectoryInfo directoryInfo = new DirectoryInfo(directoryPath);
          FsDirectory directory = new FsDirectory();
          directory.Name = directoryInfo.Name;
          directory.Path = directoryPath;
          
          try {
            directory.HasChildren = Directory.GetDirectories(directoryPath).Length > 0;
          } catch (System.UnauthorizedAccessException) {
            directory.HasChildren = false;
            continue; // Don't add directories that you don't have permissions to
          }

          // Add directories as long as they aren't special
          if (!directory.Name.StartsWith("$")) directories.Add(directory);   
        }
      } catch (Exception error) {
         Log.Error(error.ToString());
      }

      return directories;
    }
  }
}