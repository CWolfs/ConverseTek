namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using ConverseTek.Data;

  using ConverseTek.Infrastructure;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  public class FileSystemService {
    private static FileSystemService instance;

    public static FileSystemService getInstance() {
      if (instance == null) instance = new FileSystemService();
      return instance;
    }

    public string WorkingDirectory { get; set; }

    public FileSystemService() {}

    public List<FsDirectory> GetRootDrives() {
      List<FsDirectory> rootDrives = new List<FsDirectory>();

      DriveInfo[] allDrives = DriveInfo.GetDrives();
      foreach (DriveInfo drive in allDrives) {
        try {
          if (drive.IsReady) {
            FsDirectory directory = new FsDirectory();
            directory.Name = drive.Name;
            directory.Path = drive.Name;
            directory.IsDirectory = true;
            directory.HasChildren = HasVisibleDirectories(drive.Name);
            rootDrives.Add(directory);
          }
        } catch (Exception error) {
          Log.Error($"[FileSystemService] Could not inspect drive {drive.Name}: {error}");
        }
      }

      Log.Debug($"[FileSystemService] Root drive count: {rootDrives.Count}");
      return rootDrives;
    }

    private bool HasVisibleDirectories(string path) {
      try {
        using (IEnumerator<string> directoryEnumerator = Directory.EnumerateDirectories(path).GetEnumerator()) {
          return directoryEnumerator.MoveNext();
        }
      } catch (Exception error) {
        Log.Error($"[FileSystemService] Could not inspect child directories for {path}: {error.Message}");
        return false;
      }
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
      backLink.IsDirectory = true;
      directories.Add(backLink);

      try {
        string[] directoryPaths = Directory.GetDirectories(path);
        foreach (string directoryPath in directoryPaths) {
          DirectoryInfo directoryInfo = new DirectoryInfo(directoryPath);
          FsDirectory directory = new FsDirectory();
          directory.Name = directoryInfo.Name;
          directory.Path = directoryPath;
          directory.IsDirectory = true;
          
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

    public List<FsFile> GetFiles(string path, List<string> fileExtensions = null) {
      List<FsFile> files = new List<FsFile>();

      // Guard: No files at root
      if (path == "{drives}") return files;

      try {
        List<string> searchExtensions = fileExtensions == null || fileExtensions.Count == 0 ? new List<string> { ".json" } : fileExtensions;
        List<string> filePaths = new List<string>();

        foreach (string extension in searchExtensions) {
          string normalisedExtension = extension.StartsWith(".") ? extension : "." + extension;
          filePaths.AddRange(Directory.GetFiles(path, "*" + normalisedExtension));
        }

        filePaths.Sort(StringComparer.OrdinalIgnoreCase);
        foreach (string filePath in filePaths) {
          FileInfo fileInfo = new FileInfo(filePath);
          FsFile file = new FsFile();
          file.Name = fileInfo.Name;
          file.Path = filePath;
          file.IsFile = true;

          files.Add(file);
        }
      } catch (Exception error) {
         Log.Error(error.ToString());
      }

      return files;
    }
  }
}
