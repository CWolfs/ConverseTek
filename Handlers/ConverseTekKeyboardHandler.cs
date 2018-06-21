namespace ConverseTek.Handlers
{
    using global::CefSharp;
    using Chromely.Core.Infrastructure;

    /// <summary>
    /// The CefSharp context menu handler.
    /// </summary>
    public class ConverseTekKeyboardHandler : IKeyboardHandler {

#if (!RELEASE)
        private int WINDOWS_KEY_CODE_TILDE = 223;
        private bool isDevToolOpen = false;
#endif

        bool IKeyboardHandler.OnPreKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey, ref bool isKeyboardShortcut) {
          return false;
        }

        bool IKeyboardHandler.OnKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey) {
#if (!RELEASE)
          if ((windowsKeyCode == this.WINDOWS_KEY_CODE_TILDE) && (type == KeyType.KeyUp)) {
            if (this.isDevToolOpen) {
              browser.CloseDevTools();
              this.isDevToolOpen = false;
            } else {
              this.isDevToolOpen = true;
              browser.ShowDevTools();
            }
          }
#endif
          return false;
        }
    }
}