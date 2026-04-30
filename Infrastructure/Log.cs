namespace ConverseTek.Infrastructure {
  using System;
  using System.Diagnostics;
  using System.IO;

  public static class Log {
    private static readonly object WriteLock = new object();
    private static readonly string LogDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
    private static readonly string LogPath = Path.Combine(LogDirectory, "conversetek-core.log");

    public static event Action<string> LineWritten;

    public static void Debug(object message) {
      Write("DEBUG", message);
    }

    public static void Info(object message) {
      Write("INFO", message);
    }

    public static void Error(object message) {
      Write("ERROR", message);
    }

    private static void Write(string level, object message) {
      string line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [{level}] {message}";
      Trace.WriteLine(line);

      try {
        lock (WriteLock) {
          if (!Directory.Exists(LogDirectory)) {
            Directory.CreateDirectory(LogDirectory);
          }

          File.AppendAllText(LogPath, line + Environment.NewLine);
        }
      } catch {
        // Logging must never prevent the editor from running.
      }

      try {
        LineWritten?.Invoke(line);
      } catch {
        // Log subscribers must never prevent the editor from running.
      }
    }
  }
}
