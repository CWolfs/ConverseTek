namespace ConverseTek.Controllers {
  using System;
  using System.Linq;
  using System.IO;
  using System.Collections.Generic;
  using System.Diagnostics.CodeAnalysis;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using Chromely.Core.RestfulService;
  using Chromely.Core.Infrastructure;

  using ConverseTek.Data;
  using ConverseTek.Services;

  [ControllerProperty(Name = "FileSystemController", Route = "filesystem")]
  public class FileSystemController : ChromelyController {
    private string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

    public FileSystemController() {
      this.RegisterGetRequest("/filesystem", this.GetRootDrives);
      this.RegisterGetRequest("/directories", this.GetDirectories);
      this.RegisterGetRequest("/quicklinks", this.GetQuickLinks);
      this.RegisterPostRequest("/working-directory", this.SetWorkingDirectory);
      this.RegisterGetRequest("/dependency-status", this.GetDependencyStatus);
    }

    private ChromelyResponse GetRootDrives(ChromelyRequest request) {
      FileSystemService fileSystemService = FileSystemService.getInstance();
      List<FsDirectory> rootDrives = fileSystemService.GetRootDrives();

      string rootDrivesJson = JsonConvert.SerializeObject(rootDrives);

      ChromelyResponse response = new ChromelyResponse();
      response.Data = rootDrivesJson;
      return response;
    }

    private ChromelyResponse GetDirectories(ChromelyRequest request) {
      try {
        IDictionary<string, object> requestParams = request.Parameters;
        string path = (string)requestParams["path"];
        bool includeFiles = (bool)requestParams["includeFiles"];

        FileSystemService fileSystemService = FileSystemService.getInstance();
        List<FsDirectory> directories = fileSystemService.GetDirectories(path);
        List<FsFile> files = new List<FsFile>();

        if (includeFiles) {
          files = fileSystemService.GetFiles(path);
        }

        FsView fsView = new FsView();
        fsView.directories = directories;
        fsView.files = files;

        string fsJson = JsonConvert.SerializeObject(fsView);

        ChromelyResponse response = new ChromelyResponse();
        response.Data = fsJson;
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private ChromelyResponse GetQuickLinks(ChromelyRequest request) {
      ConfigService configService = ConfigService.getInstance();
      Dictionary<string, string> quickLinks = configService.GetQuickLinksConfig();
      string quickLinksJson = JsonConvert.SerializeObject(quickLinks);

      ChromelyResponse response = new ChromelyResponse();
      response.Data = quickLinksJson;
      return response;
    }

    private ChromelyResponse SetWorkingDirectory(ChromelyRequest request) {
      try {
        IDictionary<string, object> requestParams = request.Parameters;
        string path = (string)requestParams["path"];

        FileSystemService fileSystemService = FileSystemService.getInstance();
        fileSystemService.WorkingDirectory = path;

        ChromelyResponse response = new ChromelyResponse();
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private ChromelyResponse GetDependencyStatus(ChromelyRequest request) {
      List<string> dependencyNames = new List<string> { "ShadowrunDTO.dll", "ShadowrunSerializer.dll" };
      List<string> missingDependencies = new List<string>();

      foreach (string dependencyName in dependencyNames) {
        bool dependencyExists = File.Exists($"{baseDirectory}/{dependencyName}");
        if (!dependencyExists) missingDependencies.Add(dependencyName);
      }

      Dictionary<string, object> responseData = new Dictionary<string, object>();
      responseData.Add("status", missingDependencies.Count <= 0 ? "success" : "error");
      if (missingDependencies.Count > 0) responseData.Add("missingDependencies", missingDependencies);

      string serialisedResponseData = JsonConvert.SerializeObject(responseData);

      ChromelyResponse response = new ChromelyResponse();
      response.Data = serialisedResponseData;
      return response;
    }
  }
}