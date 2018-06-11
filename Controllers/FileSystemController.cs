namespace ConverseTek.Controllers {
    using System;
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
        }

        private ChromelyResponse GetRootDrives(ChromelyRequest request) {
            FileSystemService fileSystemService = FileSystemService.getInstance();
            List<FsDirectory> rootDrives = fileSystemService.GetRootDrives();

            string rootDrivesJson = JsonConvert.SerializeObject(rootDrives);
            // Log.Info("[FileSystemService] Looking at drives " + rootDrivesJson);

            ChromelyResponse response = new ChromelyResponse();
            response.Data = rootDrivesJson;
            return response;
        }
    }
}