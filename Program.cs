﻿// --------------------------------------------------------------------------------------------------------------------
// <copyright file="Program.cs" company="Chromely">
//   Copyright (c) 2017-2018 Kola Oyewumi
// </copyright>
// <license>
// MIT License
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// </license>
// <note>
// Chromely project is licensed under MIT License. CefGlue, CefSharp, Winapi may have additional licensing.
// </note>
// --------------------------------------------------------------------------------------------------------------------

namespace ChromelyReactCefSharp {
    using System;
    using System.Diagnostics.CodeAnalysis;
    using System.Reflection;
    using Chromely.CefSharp.Winapi;
    using Chromely.CefSharp.Winapi.ChromeHost;
    using Chromely.Core;
    using Chromely.Core.Helpers;
    using Chromely.Core.Infrastructure;
    using WinApi.Windows;

    /// <summary>
    /// The program.
    /// </summary>
    [SuppressMessage("StyleCop.CSharp.MaintainabilityRules", "SA1400:AccessModifierMustBeDeclared", Justification = "Reviewed. Suppression is OK here.")]
    class Program {
        /// <summary>
        /// The main.
        /// </summary>
        /// <param name="args">
        /// The args.
        /// </param>
        /// <returns>
        /// The <see cref="int"/>.
        /// </returns>
        public static int Main(string[] args) {
            try {
                HostHelpers.SetupDefaultExceptionHandlers();

                string startUrl = "local://dist/index.html";

                ChromelyConfiguration config = ChromelyConfiguration
                                              .Create()
                                              .WithAppArgs(args)
                                              .WithHostSize(1200, 900)
                                              .WithLogFile("logs\\conversetek-interface.log")
                                              .WithStartUrl(startUrl)
                                              .WithLogSeverity(LogSeverity.Info)
                                              .UseDefaultLogger("logs\\conversetek-core.log", true)
                                              .UseDefaultResourceSchemeHandler("local", string.Empty)
                                              .UseDefaultHttpSchemeHandler("http", "chromely.com")
                                              .UseDefautJsHandler("boundControllerAsync", true);

                                              // Alternate approach for multi-process, is to add a subprocess application
                                              // .WithCustomSetting(CefSettingKeys.SingleProcess, true);

                var factory = WinapiHostFactory.Init("chromely.ico");
                using (var window = factory.CreateWindow(
                    () => new CefSharpBrowserHost(config),
                    "ConverseTek",
                    constructionParams: new FrameWindowConstructionParams())
                ){
                    // Register external url schems
                    window.RegisterUrlScheme(new UrlScheme("https://github.com/mattkol/Chromely", true));

                    /*
                     * Register service assemblies
                     * Uncomment relevant part to register assemblies
                     */

                    // 1. Register current/local assembly:
                    window.RegisterServiceAssembly(Assembly.GetExecutingAssembly());

                    // 2. Register external assembly with file name:
                    // string serviceAssemblyFile = @"C:\ChromelyDlls\Chromely.Service.Demo.dll";
                    // window.RegisterServiceAssembly(serviceAssemblyFile);

                    // 3. Register external assemblies with list of filenames:
                    // string serviceAssemblyFile1 = @"C:\ChromelyDlls\Chromely.Service.Demo.dll";
                    // List<string> filenames = new List<string>();
                    // filenames.Add(serviceAssemblyFile1);
                    // window.RegisterServiceAssemblies(filenames);

                    // 4. Register external assemblies directory:
                    string serviceAssembliesFolder = @"C:\ChromelyDlls";
                    window.RegisterServiceAssemblies(serviceAssembliesFolder);

                    // Scan assemblies for Controller routes 
                    window.ScanAssemblies();

                    window.SetSize(config.HostWidth, config.HostHeight);
                    window.CenterToScreen();
                    window.Show();
                    return new HostEventLoop().Run(window);
                }
            } catch (Exception exception) {
                Log.Error(exception);
            }

            return 0;
        }
    }
}
