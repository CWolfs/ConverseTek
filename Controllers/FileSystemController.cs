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
            this.RegisterPostRequest("/working-directory", this.SetWorkingDirectory);
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
    }
}