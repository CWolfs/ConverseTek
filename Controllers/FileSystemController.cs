namespace ConverseTek.Controllers {
  using System;
  using System.Linq;
  using System.IO;
  using System.Collections.Generic;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using ConverseTek.Data;
  using ConverseTek.Host;
  using ConverseTek.Infrastructure;
  using ConverseTek.Services;

  public class FileSystemController {
    private string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

    public void RegisterRoutes(AppRouteDispatcher dispatcher) {
      dispatcher.RegisterGet("/filesystem", this.GetRootDrives);
      dispatcher.RegisterGet("/directories", this.GetDirectories);
      dispatcher.RegisterGet("/quicklinks", this.GetQuickLinks);
      dispatcher.RegisterPost("/add-quicklink", this.AddQuickLink);
      dispatcher.RegisterPost("/remove-quicklink", this.RemoveQuickLink);
      dispatcher.RegisterGet("/colour-config", this.GetColourConfig);
      dispatcher.RegisterPost("/working-directory", this.SetWorkingDirectory);
      dispatcher.RegisterGet("/dependency-status", this.GetDependencyStatus);
    }

    private AppResponse GetRootDrives(AppRequest request) {
      FileSystemService fileSystemService = FileSystemService.getInstance();
      List<FsDirectory> rootDrives = fileSystemService.GetRootDrives();
      Log.Debug($"[FileSystemController] Returning {rootDrives.Count} root drives.");

      string rootDrivesJson = JsonConvert.SerializeObject(rootDrives);

      AppResponse response = new AppResponse();
      response.Data = rootDrivesJson;
      return response;
    }

    private AppResponse GetDirectories(AppRequest request) {
      try {
        IDictionary<string, object> requestParams = request.Parameters;
        string path = (string)requestParams["path"];
        bool includeFiles = (bool)requestParams["includeFiles"];
        List<string> fileExtensions = new List<string>();

        if (requestParams.ContainsKey("fileExtensions") && requestParams["fileExtensions"] != null) {
          JArray extensionTokens = requestParams["fileExtensions"] as JArray;
          if (extensionTokens != null) {
            foreach (JToken extensionToken in extensionTokens) {
              fileExtensions.Add(extensionToken.ToString());
            }
          }
        }

        if (path == "Desktop") {
          path = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        } else if (path == "MyDocuments") {
          path = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        } else if (path == "Favourites") {
          path = Environment.GetFolderPath(Environment.SpecialFolder.Favorites);
        }

        FileSystemService fileSystemService = FileSystemService.getInstance();
        List<FsDirectory> directories = fileSystemService.GetDirectories(path);
        List<FsFile> files = new List<FsFile>();

        if (includeFiles) {
          files = fileSystemService.GetFiles(path, fileExtensions);
        }

        FsView fsView = new FsView();
        fsView.directories = directories;
        fsView.files = files;

        string fsJson = JsonConvert.SerializeObject(fsView);

        AppResponse response = new AppResponse();
        response.Data = fsJson;
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private AppResponse GetQuickLinks(AppRequest request) {
      ConfigService configService = ConfigService.getInstance();
      Dictionary<string, string> quickLinks = configService.GetQuickLinksConfig();
      string quickLinksJson = JsonConvert.SerializeObject(quickLinks);

      AppResponse response = new AppResponse();
      response.Data = quickLinksJson;
      return response;
    }

    private AppResponse AddQuickLink(AppRequest request) {
      try {
        ConfigService configService = ConfigService.getInstance();
        IDictionary<string, object> requestParams = request.Parameters;
        string title = (string)requestParams["title"];
        string path = (string)requestParams["path"];

        Dictionary<string, string> quickLinks = configService.AddQuickLink(title, path);
        string quickLinksJson = JsonConvert.SerializeObject(quickLinks);

        AppResponse response = new AppResponse();
        response.Data = quickLinksJson;
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private AppResponse RemoveQuickLink(AppRequest request) {
      try {
        ConfigService configService = ConfigService.getInstance();
        IDictionary<string, object> requestParams = request.Parameters;
        string title = (string)requestParams["title"];
        string path = (string)requestParams["path"];

        Dictionary<string, string> quickLinks = configService.RemoveQuickLink(title, path);
        string quickLinksJson = JsonConvert.SerializeObject(quickLinks);

        AppResponse response = new AppResponse();
        response.Data = quickLinksJson;
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private AppResponse GetColourConfig(AppRequest request) {
      ConfigService configService = ConfigService.getInstance();
      Dictionary<string, Dictionary<string, string>> colourConfig = configService.GetColourConfig();
      string colourConfigJson = JsonConvert.SerializeObject(colourConfig);

      AppResponse response = new AppResponse();
      response.Data = colourConfigJson;
      Log.Info(colourConfigJson);

      return response;
    }

    private AppResponse SetWorkingDirectory(AppRequest request) {
      try {
        IDictionary<string, object> requestParams = request.Parameters;
        string path = (string)requestParams["path"];

        FileSystemService fileSystemService = FileSystemService.getInstance();
        fileSystemService.WorkingDirectory = path;

        AppResponse response = new AppResponse();
        return response;
      } catch (Exception e) {
        Log.Error(e);
        return null;
      }
    }

    private AppResponse GetDependencyStatus(AppRequest request) {
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

      AppResponse response = new AppResponse();
      response.Data = serialisedResponseData;
      return response;
    }
  }
}
