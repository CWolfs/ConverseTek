namespace ConverseTek.Handlers
{
    using Chromely.CefSharp.Winapi.Browser.Handlers;
    using Chromely.Core.Infrastructure;
    using System.Threading.Tasks;
    using Chromely.CefSharp.Winapi.RestfulService;
    using Chromely.Core.RestfulService;
    using global::CefSharp;

    public class ConverseTekBoundObject {
        public void GetJson(string routePath, object parameters, IJavascriptCallback javascriptCallback) {
            Task.Run(async () => {
                using (javascriptCallback) {
                    ChromelyResponse chromelyResponse = await RequestTaskRunner.RunAsync(routePath, parameters, null);
                    string jsonResponse = chromelyResponse.EnsureJson();
                    var response = new CallbackResponseStruct(jsonResponse);
                    await javascriptCallback.ExecuteAsync(response);
                }
            });
        }

        public string GetJson(string routePath, object parameters) {
            ChromelyResponse chromelyResponse = RequestTaskRunner.Run(routePath, parameters, null);
            string jsonResponse = chromelyResponse.EnsureJson();
            return jsonResponse;
        }

        public void PostJson(string routePath, object parameters, object postData, IJavascriptCallback javascriptCallback) {
            Task.Run(async () => {
                using (javascriptCallback) {
                    Log.Info("Handler Data is " + postData);
                    ChromelyResponse chromelyResponse = await RequestTaskRunner.RunAsync(routePath, parameters, postData);
                    string jsonResponse = chromelyResponse.EnsureJson();
                    var response = new CallbackResponseStruct(jsonResponse);
                    await javascriptCallback.ExecuteAsync(response);
                }
            });
        }

        public string PostJson(string routePath, object parameters, object postData) {
            ChromelyResponse chromelyResponse = RequestTaskRunner.Run(routePath, parameters, postData);
            string jsonResponse = chromelyResponse.EnsureJson();
            return jsonResponse;
        }
    }
}