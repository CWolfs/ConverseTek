namespace ConverseTek.Services {
  using System;
  using System.IO;
  using System.Collections.Generic;

  using Chromely.Core.Infrastructure;

  using Newtonsoft.Json;

  public class FileSystemService {
    private static FileSystemService instance;

    public static FileSystemService getInstance() {
      if (instance == null) instance = new FileSystemService();
      return instance;
    }

    public FileSystemService() {}
  }
}