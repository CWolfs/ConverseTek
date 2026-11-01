namespace ConverseTek.Conversations {
  using System.Collections.Generic;
  using System.Globalization;
  using System.Linq;

  using isogame;

  using ConverseTek.Data;
  using ConverseTek.Definitions;

  /*
    Renders an operation call as one readable line, e.g.
      Evaluate Tag for Company(Get Preset Value (int)("HasOrHasNot", 1 = has), "dc_story_a1_complete")
      Set BattleTech Tag(1 = Add, 1 = Company, "dc_choice_a1_killed_dave_locke")
  */
  public static class OperationFormatter {
    private const string GetPresetValueOperation = "Get Preset Value (int)";

    public static string Format(TsCall operation, DefinitionSet definitions) {
      if (operation == null) return "(none)";

      OperationDefinition definition = definitions?.GetOperation(operation.functionName);
      List<string> args = new List<string>();

      for (int index = 0; index < operation.args.Count; index++) {
        OperationInput input = definition?.Inputs != null && index < definition.Inputs.Count ? definition.Inputs[index] : null;
        args.Add(FormatArg(operation, operation.args[index], input, index, definitions));
      }

      return $"{operation.functionName}({string.Join(", ", args)})";
    }

    private static string FormatArg(TsCall operation, TsVariant arg, OperationInput input, int index, DefinitionSet definitions) {
      if (arg == null) return "null";

      string type = input != null ? OperationArgs.ResolveType(arg, input) : OperationArgs.GetRawType(arg);

      if (type == OperationArgs.Operation) return Format(arg.call_value, definitions);
      if (type == OperationArgs.String) return Quote(OperationArgs.GetString(arg));
      if (type == OperationArgs.Float) return arg.float_value.ToString(CultureInfo.InvariantCulture);

      string valueText = OperationArgs.GetValueText(input, arg.int_value);
      if (valueText == null && operation.functionName == GetPresetValueOperation && index == 1) {
        valueText = GetPresetText(definitions, OperationArgs.GetString(operation.args.ElementAtOrDefault(0)), arg.int_value);
      }

      string intText = arg.int_value.ToString(CultureInfo.InvariantCulture);
      return valueText != null ? $"{intText} = {valueText}" : intText;
    }

    private static string GetPresetText(DefinitionSet definitions, string presetKey, int value) {
      PresetDefinition preset = definitions?.GetPreset(presetKey);
      if (preset?.Values == null) return null;
      return preset.Values.TryGetValue(value.ToString(), out object text) ? text?.ToString() : null;
    }

    public static string Quote(string text) {
      return "\"" + (text ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n") + "\"";
    }
  }
}
