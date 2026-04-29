namespace ConverseTek.Host {
  using System;
  using System.Drawing;
  using System.IO;
  using System.Threading.Tasks;
  using System.Windows.Forms;

  using Microsoft.Web.WebView2.Core;
  using Microsoft.Web.WebView2.WinForms;
  using Newtonsoft.Json;
  using Newtonsoft.Json.Linq;

  using ConverseTek.Infrastructure;

  public class WebViewHostForm : Form {
    private const int GraveAccentKeyCode = 223;
    private const int OemTildeKeyCode = 192;

    private readonly WebView2 webView;
    private readonly AppRouteDispatcher dispatcher;

    public WebViewHostForm(string[] args) {
      Text = "ConverseTek";
      StartPosition = FormStartPosition.CenterScreen;
      ClientSize = GetDefaultWindowSize();
      KeyPreview = true;

      string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "conversetek.ico");
      if (File.Exists(iconPath)) {
        Icon = new Icon(iconPath);
      }

      dispatcher = AppRoutes.CreateDefaultDispatcher();
      webView = new WebView2 {
        Dock = DockStyle.Fill
      };
      webView.KeyUp += OnDevToolsShortcutKeyUp;
      Log.LineWritten += OnBackendLogLineWritten;

      Controls.Add(webView);
    }

    protected override void OnFormClosed(FormClosedEventArgs e) {
      Log.LineWritten -= OnBackendLogLineWritten;
      base.OnFormClosed(e);
    }

    protected override void OnKeyUp(KeyEventArgs e) {
      base.OnKeyUp(e);
      OnDevToolsShortcutKeyUp(this, e);
    }

#if DEBUG
    private void OnDevToolsShortcutKeyUp(object sender, KeyEventArgs e) {
      if (IsDevToolsShortcut(e) && webView.CoreWebView2 != null) {
        webView.CoreWebView2.OpenDevToolsWindow();
        e.Handled = true;
      }
    }
#else
    private void OnDevToolsShortcutKeyUp(object sender, KeyEventArgs e) { }
#endif

    protected override async void OnLoad(EventArgs e) {
      base.OnLoad(e);

      try {
        await InitialiseWebViewAsync();
      } catch (Exception error) {
        Log.Error(error);
        MessageBox.Show(error.Message, "ConverseTek failed to start", MessageBoxButtons.OK, MessageBoxIcon.Error);
        Close();
      }
    }

    private async Task InitialiseWebViewAsync() {
      await webView.EnsureCoreWebView2Async();

      webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
      webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
#if DEBUG
      await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
        window.addEventListener('keydown', function (event) {
          if (event.code === 'Backquote' || event.key === '`') {
            window.chrome.webview.postMessage({ converseTekHostCommand: 'openDevTools' });
          }
        }, true);
      ");
#endif

      string distPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist");
      string indexPath = Path.Combine(distPath, "index.html");
      string webUrl = Environment.GetEnvironmentVariable("CT_WEB_URL");

      if (!string.IsNullOrWhiteSpace(webUrl)) {
        webView.CoreWebView2.Navigate(webUrl);
        return;
      }

      if (!File.Exists(indexPath)) {
        throw new FileNotFoundException("Could not find the built ConverseTek frontend.", indexPath);
      }

      webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
        "conversetek.local",
        distPath,
        CoreWebView2HostResourceAccessKind.Allow);
      webView.CoreWebView2.Navigate("https://conversetek.local/index.html");
    }

    private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e) {
#if DEBUG
      if (TryHandleHostCommand(e.WebMessageAsJson)) return;
#endif

      AppBridgeResponse response = dispatcher.DispatchBridgeRequest(e.WebMessageAsJson);
      string responseJson = JsonConvert.SerializeObject(response);
      webView.CoreWebView2.PostWebMessageAsJson(responseJson);
    }

#if DEBUG
    private void OnBackendLogLineWritten(string line) {
      if (IsDisposed) return;

      if (InvokeRequired) {
        BeginInvoke(new Action(() => OnBackendLogLineWritten(line)));
        return;
      }

      if (webView.CoreWebView2 == null) return;

      string encodedLine = JsonConvert.SerializeObject(line);
      _ = webView.CoreWebView2.ExecuteScriptAsync($"console.debug('[ConverseTek backend]', {encodedLine});");
    }
#else
    private void OnBackendLogLineWritten(string line) { }
#endif

#if DEBUG
    private bool TryHandleHostCommand(string messageJson) {
      try {
        JObject message = JObject.Parse(messageJson);
        string command = message["converseTekHostCommand"] == null ? "" : message["converseTekHostCommand"].ToString();

        if (command == "openDevTools" && webView.CoreWebView2 != null) {
          webView.CoreWebView2.OpenDevToolsWindow();
          return true;
        }
      } catch {
        return false;
      }

      return false;
    }

    private static bool IsDevToolsShortcut(KeyEventArgs e) {
      return e.KeyCode == Keys.F12 ||
        e.KeyCode == Keys.Oemtilde ||
        e.KeyValue == GraveAccentKeyCode ||
        e.KeyValue == OemTildeKeyCode;
    }
#endif

    private static Size GetDefaultWindowSize() {
      int width = 1720;
      int height = 1000;

      Screen primaryScreen = Screen.PrimaryScreen;
      if (primaryScreen != null) {
        int availableWidth = primaryScreen.Bounds.Width - 100;
        int availableHeight = primaryScreen.Bounds.Height - 100;

        if (availableWidth < width) width = availableWidth;
        if (availableHeight < height) height = availableHeight;
      }

      return new Size(width, height);
    }
  }
}
