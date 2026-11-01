using System;
using System.Collections.Generic;

namespace ConverseTek.Cli;
/*
  Minimal argument parser: positionals plus --name value options and --flag switches
*/
public class CliArgs {
  private static readonly HashSet<string> SWITCHES = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
    "json", "force", "unresolved", "help"
  };

  public string Command { get; private set; }
  public List<string> Positionals { get; } = new List<string>();
  private readonly Dictionary<string, string> options = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
  private readonly HashSet<string> switches = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

  public static CliArgs Parse(string[] args) {
    CliArgs parsed = new CliArgs();

    for (int index = 0; index < args.Length; index++) {
      string arg = args[index];

      if (arg.StartsWith("--")) {
        string name = arg.Substring(2);
        if (SWITCHES.Contains(name)) {
          parsed.switches.Add(name);
        } else if (index + 1 < args.Length) {
          parsed.options[name] = args[++index];
        } else {
          throw new CliException($"Option '--{name}' needs a value");
        }
        continue;
      }

      if (arg == "-h") {
        parsed.switches.Add("help");
        continue;
      }

      if (parsed.Command == null) {
        parsed.Command = arg.ToLowerInvariant();
      } else {
        parsed.Positionals.Add(arg);
      }
    }

    return parsed;
  }

  public string Option(string name, string fallback = null) {
    return options.TryGetValue(name, out string value) ? value : fallback;
  }

  public bool Switch(string name) {
    return switches.Contains(name);
  }

  public string RequirePositional(int index, string description) {
    if (index >= Positionals.Count) {
      throw new CliException($"Missing {description}");
    }

    return Positionals[index];
  }
}

public class CliException : Exception {
  public CliException(string message) : base(message) { }
}
