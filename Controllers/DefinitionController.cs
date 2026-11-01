using System;
using System.Collections.Generic;
using ConverseTek.Data;
using ConverseTek.Host;
using ConverseTek.Infrastructure;
using ConverseTek.Services;
using Newtonsoft.Json;

namespace ConverseTek.Controllers;

public class DefinitionController {

  public void RegisterRoutes(AppRouteDispatcher dispatcher) {
    dispatcher.RegisterGet("/definitions", GetDefinitions);
  }

  private AppResponse GetDefinitions(AppRequest request) {
    DefinitionService definitionService = DefinitionService.getInstance();
    Dictionary<string, List<Definition>> definitions = definitionService.LoadDefinitions();

    string definitionsJson = JsonConvert.SerializeObject(definitions);

    AppResponse response = new AppResponse();
    response.Data = definitionsJson;
    return response;
  }

  private AppResponse GetDirectories(AppRequest request) {
    try {
      IDictionary<string, object> requestParams = request.Parameters;
      string path = (string)requestParams["path"];

      FileSystemService fileSystemService = FileSystemService.getInstance();
      List<FsDirectory> directories = fileSystemService.GetDirectories(path);
      string directoryJson = JsonConvert.SerializeObject(directories);

      AppResponse response = new AppResponse();
      response.Data = directoryJson;
      return response;
    } catch (Exception e) {
      Log.Error(e);
      return null;
    }
  }
}
