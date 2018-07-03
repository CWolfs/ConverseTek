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

    [ControllerProperty(Name = "DefinitionController", Route = "definitions")]
    public class DefinitionController : ChromelyController {

        public DefinitionController() {
            this.RegisterGetRequest("/definitions", this.GetDefinitions);
        }

        private ChromelyResponse GetDefinitions(ChromelyRequest request) {
            DefinitionService definitionService = DefinitionService.getInstance();
            Dictionary<string, List<Definition>> definitions = definitionService.LoadDefinitions();

            string definitionsJson = JsonConvert.SerializeObject(definitions);

            ChromelyResponse response = new ChromelyResponse();
            response.Data = definitionsJson;
            return response;
        }

        private ChromelyResponse GetDirectories(ChromelyRequest request) {
            try {
                IDictionary<string, object> requestParams = request.Parameters;
                string path = (string)requestParams["path"];

                FileSystemService fileSystemService = FileSystemService.getInstance();
                List<FsDirectory> directories = fileSystemService.GetDirectories(path);
                string directoryJson = JsonConvert.SerializeObject(directories);

                ChromelyResponse response = new ChromelyResponse();
                response.Data = directoryJson;
                return response;
            } catch (Exception e) {
                Log.Error(e);
                return null;
            }
        }
    }
}