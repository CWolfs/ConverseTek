namespace ConverseTek.Handlers
{
    using global::CefSharp;

    /// <summary>
    /// The CefSharp context menu handler.
    /// </summary>
    public class ConverseTekContextMenuHandler : IContextMenuHandler
    {
        /// <summary>
        /// The show dev tools.
        /// </summary>
        private const int ShowDevTools = 26501;

        /// <summary>
        /// The close dev tools.
        /// </summary>
        private const int CloseDevTools = 26502;

        /// <summary>
        /// The on before context menu.
        /// </summary>
        /// <param name="browserControl">
        /// The browser control.
        /// </param>
        /// <param name="browser">
        /// The browser.
        /// </param>
        /// <param name="frame">
        /// The frame.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="model">
        /// The model.
        /// </param>
        void IContextMenuHandler.OnBeforeContextMenu(IWebBrowser browserControl, IBrowser browser, IFrame frame, IContextMenuParams parameters, IMenuModel model)
        {
             // To disable the menu then call clear
             model.Clear();

            // Removing existing menu item
            // Remove "View Source" option
            model.Remove(CefMenuCommand.ViewSource);

#if (!RELEASE)
            // Add new custom menu items
            model.AddItem((CefMenuCommand)ShowDevTools, "Show DevTools");
            model.AddItem((CefMenuCommand)CloseDevTools, "Close DevTools");
#endif
        }

        /// <summary>
        /// The on context menu command.
        /// </summary>
        /// <param name="browserControl">
        /// The browser control.
        /// </param>
        /// <param name="browser">
        /// The browser.
        /// </param>
        /// <param name="frame">
        /// The frame.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="commandId">
        /// The command id.
        /// </param>
        /// <param name="eventFlags">
        /// The event flags.
        /// </param>
        /// <returns>
        /// The <see cref="bool"/>.
        /// </returns>
        bool IContextMenuHandler.OnContextMenuCommand(IWebBrowser browserControl, IBrowser browser, IFrame frame, IContextMenuParams parameters, CefMenuCommand commandId, CefEventFlags eventFlags)
        {
#if (!RELEASE)
            if ((int)commandId == ShowDevTools)
            {
                browser.ShowDevTools();
            }

            if ((int)commandId == CloseDevTools)
            {
                browser.CloseDevTools();
            }

#endif
            return false;
        }

        /// <summary>
        /// The on context menu dismissed.
        /// </summary>
        /// <param name="browserControl">
        /// The browser control.
        /// </param>
        /// <param name="browser">
        /// The browser.
        /// </param>
        /// <param name="frame">
        /// The frame.
        /// </param>
        void IContextMenuHandler.OnContextMenuDismissed(IWebBrowser browserControl, IBrowser browser, IFrame frame)
        {
        }

        /// <summary>
        /// The run context menu.
        /// </summary>
        /// <param name="browserControl">
        /// The browser control.
        /// </param>
        /// <param name="browser">
        /// The browser.
        /// </param>
        /// <param name="frame">
        /// The frame.
        /// </param>
        /// <param name="parameters">
        /// The parameters.
        /// </param>
        /// <param name="model">
        /// The model.
        /// </param>
        /// <param name="callback">
        /// The callback.
        /// </param>
        /// <returns>
        /// The <see cref="bool"/>.
        /// </returns>
        bool IContextMenuHandler.RunContextMenu(IWebBrowser browserControl, IBrowser browser, IFrame frame, IContextMenuParams parameters, IMenuModel model, IRunContextMenuCallback callback)
        {
            return false;
        }
    }
}