namespace ConverseTek.Host {
  using System;
  using System.Collections.Generic;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using ConverseTek.Infrastructure;

  public class AppRequest {
    public IDictionary<string, object> Parameters { get; set; }
    public string PostData { get; set; }

    public AppRequest() {
      Parameters = new Dictionary<string, object>();
      PostData = "{}";
    }
  }

  public class AppResponse {
    public int Status { get; set; }
    public string Data { get; set; }
    public string Error { get; set; }

    public AppResponse() {
      Status = 200;
      Data = "null";
      Error = "";
    }
  }

  public class AppBridgeRequest {
    [JsonProperty("id")]
    public string Id { get; set; }
    [JsonProperty("method")]
    public string Method { get; set; }
    [JsonProperty("url")]
    public string Url { get; set; }
    [JsonProperty("parameters")]
    public JObject Parameters { get; set; }
    [JsonProperty("body")]
    public JToken Body { get; set; }
    [JsonProperty("postData")]
    public string PostData { get; set; }
  }

  public class AppBridgeResponse {
    [JsonProperty("id")]
    public string Id { get; set; }
    [JsonProperty("status")]
    public int Status { get; set; }
    [JsonProperty("data")]
    public string Data { get; set; }
    [JsonProperty("error")]
    public string Error { get; set; }
  }

  public delegate AppResponse AppRouteHandler(AppRequest request);

  public class AppRouteDispatcher {
    private readonly Dictionary<string, AppRouteHandler> routes = new Dictionary<string, AppRouteHandler>();

    public void RegisterGet(string path, AppRouteHandler handler) {
      Register("GET", path, handler);
    }

    public void RegisterPost(string path, AppRouteHandler handler) {
      Register("POST", path, handler);
    }

    public AppBridgeResponse DispatchBridgeRequest(string requestJson) {
      AppBridgeRequest bridgeRequest = null;

      try {
        bridgeRequest = JsonConvert.DeserializeObject<AppBridgeRequest>(requestJson);
        AppResponse response = Dispatch(bridgeRequest);
        return new AppBridgeResponse {
          Id = bridgeRequest == null ? "" : bridgeRequest.Id,
          Status = response.Status,
          Data = response.Data,
          Error = response.Error
        };
      } catch (Exception error) {
        Log.Error(error);
        return new AppBridgeResponse {
          Id = bridgeRequest == null ? "" : bridgeRequest.Id,
          Status = 500,
          Data = "null",
          Error = error.Message
        };
      }
    }

    private void Register(string method, string path, AppRouteHandler handler) {
      string key = GetRouteKey(method, path);
      if (routes.ContainsKey(key)) {
        throw new InvalidOperationException($"Route already registered: {method} {path}");
      }

      routes.Add(key, handler);
    }

    private AppResponse Dispatch(AppBridgeRequest bridgeRequest) {
      if (bridgeRequest == null) {
        return ErrorResponse(400, "Bridge request was empty.");
      }

      string method = string.IsNullOrEmpty(bridgeRequest.Method) ? "GET" : bridgeRequest.Method;
      string url = bridgeRequest.Url ?? "";
      string key = GetRouteKey(method, url);
      Log.Debug($"[Bridge] {method.ToUpperInvariant()} {url}");

      if (!routes.ContainsKey(key)) {
        return ErrorResponse(404, $"No route is registered for {method.ToUpperInvariant()} {url}.");
      }

      AppRequest request = new AppRequest {
        Parameters = bridgeRequest.Parameters == null
          ? new Dictionary<string, object>()
          : bridgeRequest.Parameters.ToObject<Dictionary<string, object>>(),
        PostData = !string.IsNullOrEmpty(bridgeRequest.PostData)
          ? bridgeRequest.PostData
          : bridgeRequest.Body == null ? "{}" : bridgeRequest.Body.ToString(Formatting.None)
      };

      AppResponse response = routes[key](request);
      return response ?? ErrorResponse(500, $"Route {method.ToUpperInvariant()} {url} returned no response.");
    }

    private static AppResponse ErrorResponse(int status, string error) {
      return new AppResponse {
        Status = status,
        Data = "null",
        Error = error
      };
    }

    private static string GetRouteKey(string method, string path) {
      return $"{(method ?? "").Trim().ToUpperInvariant()} {(path ?? "").Trim()}";
    }
  }
}
