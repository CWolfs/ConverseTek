namespace ConverseTek.Handlers
{
    using Chromely.CefSharp.Winapi.Browser.Handlers;
    using System.Threading.Tasks;
    using Chromely.CefSharp.Winapi.RestfulService;
    using Chromely.Core.RestfulService;
    using global::CefSharp;

    /// <summary>
    /// The CefSharp bound object.
    /// </summary>
    public class ConverseTekBoundObject
    {
        /// <summary>
        /// The get json.
        /// </summary>
        /// <param name="routePath">
        /// The route path.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="javascriptCallback">
        /// The javascript callback.
        /// </param>
        public void GetJson(string routePath, object parameters, IJavascriptCallback javascriptCallback)
        {
            Task.Run(async () =>
            {
                using (javascriptCallback)
                {
                    ChromelyResponse chromelyResponse = await RequestTaskRunner.RunAsync(routePath, parameters, null);
                    string jsonResponse = chromelyResponse.EnsureJson();
                    var response = new CallbackResponseStruct(jsonResponse);
                    await javascriptCallback.ExecuteAsync(response);
                }
            });
        }

        /// <summary>
        /// The get json.
        /// </summary>
        /// <param name="routePath">
        /// The route path.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        public string GetJson(string routePath, object parameters)
        {
            ChromelyResponse chromelyResponse = RequestTaskRunner.Run(routePath, parameters, null);
            string jsonResponse = chromelyResponse.EnsureJson();
            return jsonResponse;
        }

        /// <summary>
        /// The post json.
        /// </summary>
        /// <param name="routePath">
        /// The route path.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="postData">
        /// The post data.
        /// </param>
        /// <param name="javascriptCallback">
        /// The javascript callback.
        /// </param>
        public void PostJson(string routePath, object parameters, object postData, IJavascriptCallback javascriptCallback)
        {
            Task.Run(async () =>
            {
                using (javascriptCallback)
                {
                    ChromelyResponse chromelyResponse = await RequestTaskRunner.RunAsync(routePath, parameters, postData);
                    string jsonResponse = chromelyResponse.EnsureJson();
                    var response = new CallbackResponseStruct(jsonResponse);
                    await javascriptCallback.ExecuteAsync(response);
                }
            });
        }

        /// <summary>
        /// The post json.
        /// </summary>
        /// <param name="routePath">
        /// The route path.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="postData">
        /// The post data.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        public string PostJson(string routePath, object parameters, object postData)
        {
            ChromelyResponse chromelyResponse = RequestTaskRunner.Run(routePath, parameters, postData);
            string jsonResponse = chromelyResponse.EnsureJson();
            return jsonResponse;
        }
    }
}