using System.Collections.Generic;
using System.Linq;
using ConverseTek.Data;
using isogame;

namespace ConverseTek.Conversations;
/*
  TsVariant has no type discriminator - the value lives in whichever field is set. These helpers
  work out which field an arg is using, matching the editor (def-store setLogicTypeByOperation)
  and BattleTech's own reading of the raw fields.
*/
public static class OperationArgs {
  public const string Operation = "operation";
  public const string String = "string";
  public const string Float = "float";
  public const string Int = "int";

  public static string GetString(TsVariant arg) {
    return arg?.string_value ?? "";
  }

  public static bool HasString(TsVariant arg) {
    return GetString(arg) != "";
  }

  // The type the editor assigns an arg on load: the first definition input type that applies,
  // skipping 'operation' when no call is set and another type is allowed
  public static string ResolveType(TsVariant arg, OperationInput input) {
    if (arg == null) {
      return null;
    }

    if (input?.Types == null || input.Types.Length <= 0) {
      return GetRawType(arg);
    }

    foreach (string type in input.Types) {
      if (type == Operation) {
        if (arg.call_value == null && input.Types.Length > 1) {
          continue;
        }

        return Operation;
      }
      if (type == String || type == Float || type == Int) {
        return type;
      }
    }

    return GetRawType(arg);
  }

  // How BattleTech reads the raw fields when nothing else is known
  public static string GetRawType(TsVariant arg) {
    if (arg.call_value != null) {
      return Operation;
    }

    if (HasString(arg)) {
      return String;
    }

    if (arg.float_value != 0 && arg.int_value != 0) {
      return Float;
    }

    return Int;
  }

  // Returns null when the arg holds a nested call instead of a string
  public static string GetStringValue(TsVariant arg) {
    if (arg == null || arg.call_value != null) {
      return null;
    }

    return GetString(arg);
  }

  public static bool InputAllows(OperationInput input, string type) {
    return input?.Types != null && input.Types.Contains(type);
  }

  // Text for an enum-like int, e.g. 1 -> 'Add' for Set BattleTech Tag's Action input
  public static string GetValueText(OperationInput input, int value) {
    if (input?.Values == null) {
      return null;
    }

    OperationInputValue match = input.Values.FirstOrDefault(inputValue => inputValue.Value == value.ToString());
    return match?.Text;
  }

  public static IEnumerable<TsCall> GetOps(TsBlock block) {
    if (block?.ops == null) {
      return Enumerable.Empty<TsCall>();
    }

    return block.ops;
  }
}
