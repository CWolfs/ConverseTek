namespace ConverseTek {
    using System;
    using System.Diagnostics.CodeAnalysis;
    using System.Windows.Forms;

    using ConverseTek.Host;
    using ConverseTek.Infrastructure;

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
        [STAThread]
        public static int Main(string[] args) {
            try {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new WebViewHostForm(args));
                return 0;
            } catch (Exception exception) {
                Log.Error(exception);
            }

            return 0;
        }
    }
}
