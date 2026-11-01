namespace ConverseTek.References {
  using System;
  using System.Collections.Generic;
  using System.Linq;

  using isogame;

  using ConverseTek.Conversations;
  using ConverseTek.Data;
  using ConverseTek.Definitions;
  using ConverseTek.Diagnostics;

  public static class ReferenceKind {
    public const string Tag = "tag";
    public const string Stat = "stat";
    public const string Conversation = "conversation";
  }

  public class ConversationReference {
    public string Kind { get; set; }
    public string Value { get; set; }
    public string Usage { get; set; }
    public string Operation { get; set; }
    public string ConversationName { get; set; }
    public string ConversationId { get; set; }
    public string FilePath { get; set; }
    public string Location { get; set; }
    public string Call { get; set; }

    // Conversation references only: false when the target is not in the scanned set
    public bool? Resolved { get; set; }
    public string Problem { get; set; }
  }

  /*
    Finds the tags, stats and conversation ids used across a set of conversations, driven by the
    operation definitions' input labels ('Tag Key', 'Stat Key', 'Conversation Id') so new
    operations are picked up without code changes.
  */
  public static class ConversationReferences {
    private const string SetBattleTechTagOperation = "Set BattleTech Tag";
    private const string SideloadConversationOperation = "Sideload Conversation";

    public static List<ConversationReference> Scan(IEnumerable<ConversationAsset> conversationAssets, DefinitionSet definitions) {
      List<ConversationAsset> assets = conversationAssets.ToList();
      Dictionary<string, ConversationAsset> loadedById = ConversationDiagnostics.BuildLoadedConversationsById(assets);
      List<ConversationReference> references = new List<ConversationReference>();

      foreach (ConversationAsset asset in assets) {
        Conversation conversation = asset.Conversation;

        for (int index = 0; index < conversation.roots.Count; index++) {
          ConversationLink root = conversation.roots[index];
          ScanBlock(references, asset, root.conditions, $"R{index + 1} if", definitions, loadedById);
          ScanBlock(references, asset, root.actions, $"R{index + 1} do", definitions, loadedById);
        }

        for (int position = 0; position < conversation.nodes.Count; position++) {
          ConversationNode node = conversation.nodes[position];
          ScanBlock(references, asset, node.actions, $"P{position} do", definitions, loadedById);

          for (int index = 0; index < node.branches.Count; index++) {
            ConversationLink response = node.branches[index];
            ScanBlock(references, asset, response.conditions, $"P{position}.{index + 1} if", definitions, loadedById);
            ScanBlock(references, asset, response.actions, $"P{position}.{index + 1} do", definitions, loadedById);
          }
        }
      }

      return references;
    }

    private static void ScanBlock(List<ConversationReference> references, ConversationAsset asset, TsBlock block, string location, DefinitionSet definitions, Dictionary<string, ConversationAsset> loadedById) {
      foreach (TsCall operation in OperationArgs.GetOps(block)) {
        ScanOperation(references, asset, operation, location, OperationFormatter.Format(operation, definitions), definitions, loadedById);
      }
    }

    private static void ScanOperation(List<ConversationReference> references, ConversationAsset asset, TsCall operation, string location, string call, DefinitionSet definitions, Dictionary<string, ConversationAsset> loadedById) {
      OperationDefinition definition = definitions.GetOperation(operation.functionName);

      for (int index = 0; index < operation.args.Count; index++) {
        TsVariant arg = operation.args[index];
        if (arg.call_value != null) {
          ScanOperation(references, asset, arg.call_value, location, call, definitions, loadedById);
          continue;
        }

        OperationInput input = definition?.Inputs != null && index < definition.Inputs.Count ? definition.Inputs[index] : null;
        string kind = GetReferenceKind(input);
        string value = OperationArgs.GetStringValue(arg);
        if (kind == null || string.IsNullOrEmpty(value)) continue;

        ConversationReference reference = new ConversationReference {
          Kind = kind,
          Value = value,
          Usage = GetUsage(operation, definition, kind),
          Operation = operation.functionName,
          ConversationName = asset.Conversation.ui_name,
          ConversationId = ConversationIds.GetRawId(asset.Conversation.idRef),
          FilePath = asset.FilePath,
          Location = location,
          Call = call
        };

        if (kind == ReferenceKind.Conversation) ResolveConversationReference(reference, operation, loadedById);
        references.Add(reference);
      }
    }

    private static string GetReferenceKind(OperationInput input) {
      string label = (input?.Label ?? "").ToLowerInvariant();
      if (label == "tag key") return ReferenceKind.Tag;
      if (label == "stat key") return ReferenceKind.Stat;
      if (label == "conversation id") return ReferenceKind.Conversation;
      return null;
    }

    private static string GetUsage(TsCall operation, OperationDefinition definition, string kind) {
      if (operation.functionName == SetBattleTechTagOperation) {
        TsVariant action = operation.args.ElementAtOrDefault(0);
        if (action != null && action.call_value == null) return action.int_value == 0 ? "remove" : "add";
        return "add/remove";
      }

      if (kind == ReferenceKind.Conversation) return operation.functionName == SideloadConversationOperation ? "sideload" : "start";

      string scope = definition?.Scope ?? "";
      if (scope == "condition") return "check";
      if (scope == "action") return "set";
      return "read";
    }

    private static void ResolveConversationReference(ConversationReference reference, TsCall operation, Dictionary<string, ConversationAsset> loadedById) {
      ConversationAsset target = ConversationDiagnostics.FindLoadedConversation(loadedById, reference.Value);
      if (target == null) {
        reference.Resolved = false;
        reference.Problem = "no conversation with this id in the scanned folder";
        return;
      }

      reference.Resolved = true;
      if (operation.functionName != SideloadConversationOperation) return;

      string entryNodeId = OperationArgs.GetStringValue(operation.args.ElementAtOrDefault(1));
      if (!string.IsNullOrEmpty(entryNodeId) && !ConversationDiagnostics.ConversationContainsNodeId(target, entryNodeId)) {
        reference.Resolved = false;
        reference.Problem = $"entry node '{entryNodeId}' not found in '{target.Conversation.ui_name}'";
      }
    }

    public static bool Matches(ConversationReference reference, string filter) {
      if (string.IsNullOrEmpty(filter)) return true;
      return reference.Value.IndexOf(filter, StringComparison.OrdinalIgnoreCase) >= 0;
    }
  }
}
