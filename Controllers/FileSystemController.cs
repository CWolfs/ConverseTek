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

        public FileSystemController() {
            this.RegisterGetRequest("/filesystem", this.GetRootDrives);
            this.RegisterGetRequest("/directories", this.GetDirectories);
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