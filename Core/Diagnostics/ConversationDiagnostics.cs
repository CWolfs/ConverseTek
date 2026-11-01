using System.Collections.Generic;
using System.Linq;
using ConverseTek.Conversations;
using ConverseTek.Data;
using ConverseTek.Definitions;
using isogame;

namespace ConverseTek.Diagnostics;
/*
  C# port of app/src/utils/conversation-diagnostics-utils.ts so conversations can be checked
  without the editor. Keep the two in step - when a check changes in one, change it in the other.

  Differences from the editor version, both because the CLI reads files exactly as stored:
    - The editor fills an operation-only input that has no call with a default 'Get Preset Value (int)'
      when it loads, so it never reports that input as empty. Here it is reported.
    - The editor types every arg from its definition on load, so its 'input type looks wrong' check
      rarely fires. Here the stored fields are checked against the definition instead.
*/
public static class ConversationDiagnostics {
  private const string SideloadConversationOperation = "Sideload Conversation";
  private const string StartConversationCustomOperation = "Start Conversation Custom";
  private const string SetBattleTechViewscreenImageOperation = "Set BattleTech Viewscreen Image";

  private class NodeContext {
    public string NodeId;
    public string NodeLabel;
  }

  private class OperationContext : NodeContext {
    public string LogicKind;
    public string Path;

    public OperationContext With(string path) {
      return new OperationContext { NodeId = NodeId, NodeLabel = NodeLabel, LogicKind = LogicKind, Path = path };
    }
  }

  private class Scan {
    public ConversationAsset Asset;
    public DefinitionSet Definitions;
    public Dictionary<string, ConversationAsset> LoadedById;
    public Dictionary<int, ConversationNode> PromptsByRuntimeIndex;
    public List<ConversationDiagnostic> Diagnostics = new List<ConversationDiagnostic>();
  }

  public static List<ConversationDiagnostic> Build(ConversationAsset conversationAsset, DefinitionSet definitions, IEnumerable<ConversationAsset> loadedConversationAssets = null) {
    List<ConversationAsset> loaded = loadedConversationAssets?.ToList() ?? new List<ConversationAsset>();
    Scan scan = new Scan {
      Asset = conversationAsset,
      Definitions = definitions ?? new DefinitionSet(),
      LoadedById = BuildLoadedConversationsById(new[] { conversationAsset }.Concat(loaded))
    };

    scan.PromptsByRuntimeIndex = BuildPromptNodeRuntimeIndexMap(scan);
    ScanActiveConversationIdDuplicates(scan, loaded);
    ScanConversationShape(scan);
    ScanReachability(scan);
    ScanOperations(scan);

    return scan.Diagnostics;
  }

  public static bool HasErrors(IEnumerable<ConversationDiagnostic> diagnostics) {
    return diagnostics.Any(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error);
  }

  private static Dictionary<int, ConversationNode> BuildPromptNodeRuntimeIndexMap(Scan scan) {
    Dictionary<int, ConversationNode> promptsByRuntimeIndex = new Dictionary<int, ConversationNode>();
    Dictionary<int, ConversationNode> promptIndexes = new Dictionary<int, ConversationNode>();
    List<ConversationNode> nodes = scan.Asset.Conversation.nodes;

    for (int runtimeIndex = 0; runtimeIndex < nodes.Count; runtimeIndex++) {
      ConversationNode node = nodes[runtimeIndex];
      promptsByRuntimeIndex[runtimeIndex] = node;

      if (node.index != runtimeIndex) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Graph, "Prompt node index differs from its runtime position",
          $"BattleTech resolves links by position in the prompt node list. This prompt is stored at position {runtimeIndex}, but its own index field is {node.index}. Saving in ConverseTek should rebuild this, but it is worth checking before testing in game.",
          GetPromptNodeContext(node));
      }

      if (promptIndexes.ContainsKey(node.index)) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Graph, "Duplicate prompt node index",
          $"Prompt node index {node.index} is used more than once. BattleTech uses this field for conversation history and loop handling, so duplicates can make backtracking behaviour unreliable.",
          GetPromptNodeContext(node));
        continue;
      }

      promptIndexes[node.index] = node;
    }

    return promptsByRuntimeIndex;
  }

  private static void ScanConversationShape(Scan scan) {
    Conversation conversation = scan.Asset.Conversation;

    ScanDuplicateNodeIds(scan);

    if (conversation.roots.Count <= 0) {
      Add(scan, DiagnosticSeverity.Error, DiagnosticCategory.Graph, "Conversation has no roots",
        "The conversation has no root response nodes, so BattleTech has no entry point into the dialogue.",
        GetConversationContext(scan.Asset));
    }

    for (int index = 0; index < conversation.roots.Count; index++) {
      ConversationLink root = conversation.roots[index];
      ScanElementNodeTarget(scan, root, GetElementNodeContext(root, $"Root {index + 1}"), true);
    }

    foreach (ConversationNode node in conversation.nodes) {
      NodeContext context = GetPromptNodeContext(node);

      if ((node.text ?? "").Trim() == "" && IsEmptyPromptLikelyInert(node)) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Content, "Prompt node has no content or responses",
          "This prompt has no speaker text, no response options, and no actions. Check that the player will not be left on stale or missing dialogue text.",
          context);
      }

      for (int index = 0; index < node.branches.Count; index++) {
        ConversationLink response = node.branches[index];
        ScanElementNodeTarget(scan, response, GetElementNodeContext(response, $"Response {index + 1} from {context.NodeLabel}"), false);
      }
    }
  }

  private static void ScanDuplicateNodeIds(Scan scan) {
    Dictionary<string, NodeContext> contextsById = new Dictionary<string, NodeContext>();
    Conversation conversation = scan.Asset.Conversation;

    void ScanNodeId(IDRef idRef, NodeContext context) {
      string nodeId = ConversationIds.GetId(idRef);
      if (nodeId == "" || nodeId == "-1") {
        return;
      }

      if (contextsById.TryGetValue(nodeId, out NodeContext existing)) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Reference, "Duplicate node id",
          $"{context.NodeLabel} shares node id '{nodeId}' with {existing.NodeLabel}. Node-id based references, including sideload entry points, may resolve unpredictably.",
          context);
        return;
      }

      contextsById[nodeId] = context;
    }

    for (int index = 0; index < conversation.roots.Count; index++) {
      ConversationLink root = conversation.roots[index];
      ScanNodeId(root.idRef, GetElementNodeContext(root, $"Root {index + 1}"));
    }

    foreach (ConversationNode node in conversation.nodes) {
      NodeContext promptContext = GetPromptNodeContext(node);
      ScanNodeId(node.idRef, promptContext);

      for (int index = 0; index < node.branches.Count; index++) {
        ConversationLink response = node.branches[index];
        ScanNodeId(response.idRef, GetElementNodeContext(response, $"Response {index + 1} from {promptContext.NodeLabel}"));
      }
    }
  }

  private static bool IsEmptyPromptLikelyInert(ConversationNode node) {
    return node.branches.Count <= 0 && OperationArgs.GetOps(node.actions).Count() <= 0;
  }

  private static void ScanElementNodeTarget(Scan scan, ConversationLink elementNode, NodeContext context, bool isRoot) {
    if (elementNode.nextNodeIndex == -1) {
      if (isRoot) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Graph, "Root has no target prompt node",
          "This root points to End of Dialogue. If this is not intentional, connect it to a prompt node.",
          context);
      }
      return;
    }

    if (!scan.PromptsByRuntimeIndex.ContainsKey(elementNode.nextNodeIndex)) {
      Add(scan, DiagnosticSeverity.Error, DiagnosticCategory.Graph, "Link target is missing",
        $"{context.NodeLabel} points to prompt node position {elementNode.nextNodeIndex}, but the prompt node list does not have that position. BattleTech will treat this as End Conversation.",
        context);
    }
  }

  private static void ScanReachability(Scan scan) {
    HashSet<int> reachable = new HashSet<int>();
    Stack<int> pending = new Stack<int>();
    Conversation conversation = scan.Asset.Conversation;

    foreach (ConversationLink root in conversation.roots) {
      pending.Push(root.nextNodeIndex);
    }

    while (pending.Count > 0) {
      int index = pending.Pop();
      if (index == -1 || reachable.Contains(index)) {
        continue;
      }

      if (!scan.PromptsByRuntimeIndex.TryGetValue(index, out ConversationNode node)) {
        continue;
      }

      reachable.Add(index);
      foreach (ConversationLink branch in node.branches) {
        pending.Push(branch.nextNodeIndex);
      }
    }

    for (int runtimeIndex = 0; runtimeIndex < conversation.nodes.Count; runtimeIndex++) {
      if (reachable.Contains(runtimeIndex)) {
        continue;
      }

      Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Graph, "Prompt node is not reachable from a root",
        "This prompt node cannot be reached by following roots and responses in this conversation. If it is only used as an explicit sideload entry, this can be intentional.",
        GetPromptNodeContext(conversation.nodes[runtimeIndex]));
    }
  }

  private static void ScanOperations(Scan scan) {
    Conversation conversation = scan.Asset.Conversation;

    for (int index = 0; index < conversation.roots.Count; index++) {
      ConversationLink root = conversation.roots[index];
      NodeContext context = GetElementNodeContext(root, $"Root {index + 1}");
      ScanOperationList(scan, root.conditions, ToOperationContext(context, "condition", "root conditions"));
      ScanOperationList(scan, root.actions, ToOperationContext(context, "action", "root actions"));
    }

    foreach (ConversationNode node in conversation.nodes) {
      NodeContext context = GetPromptNodeContext(node);
      ScanOperationList(scan, node.actions, ToOperationContext(context, "action", "prompt actions"));

      for (int index = 0; index < node.branches.Count; index++) {
        ConversationLink response = node.branches[index];
        NodeContext responseContext = GetElementNodeContext(response, $"Response {index + 1} from {context.NodeLabel}");
        ScanOperationList(scan, response.conditions, ToOperationContext(responseContext, "condition", "response conditions"));
        ScanOperationList(scan, response.actions, ToOperationContext(responseContext, "action", "response actions"));
      }
    }
  }

  private static void ScanOperationList(Scan scan, TsBlock block, OperationContext context) {
    int index = 0;
    foreach (TsCall operation in OperationArgs.GetOps(block)) {
      index++;
      ScanOperation(scan, operation, context.With($"{context.Path} > {context.LogicKind} {index}"));
    }
  }

  private static void ScanOperation(Scan scan, TsCall operation, OperationContext context) {
    OperationDefinition definition = scan.Definitions.GetOperation(operation.functionName);

    if (definition == null) {
      Add(scan, DiagnosticSeverity.Error, DiagnosticCategory.Operation, "Missing operation definition",
        $"{context.Path} uses '{operation.functionName}', but no matching operation definition is installed.",
        context);
      return;
    }

    List<OperationInput> inputs = definition.Inputs ?? new List<OperationInput>();
    List<TsVariant> args = operation.args;

    if (args.Count < inputs.Count) {
      Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Operation, "Operation has missing inputs",
        $"{operation.functionName} expects {inputs.Count} input(s), but this call only has {args.Count}.",
        context);
    }

    for (int index = 0; index < args.Count; index++) {
      if (index >= inputs.Count) {
        Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Operation, "Operation has extra input data",
          $"{operation.functionName} has an extra input at position {index + 1}. It may have been created with an older or mismatched definition.",
          context);
        continue;
      }

      ScanOperationArg(scan, operation, args[index], inputs[index], index, context);
    }

    if (operation.functionName == SideloadConversationOperation) {
      ScanSideloadConversationOperation(scan, operation, context);
    }
  }

  private static void ScanOperationArg(Scan scan, TsCall operation, TsVariant arg, OperationInput input, int inputIndex, OperationContext context) {
    string inputName = string.IsNullOrEmpty(input.Label) ? (inputIndex + 1).ToString() : input.Label;
    string inputPath = $"{operation.functionName} input '{inputName}'";

    string storedType = GetStoredFieldType(arg);
    if (storedType != null && !OperationArgs.InputAllows(input, storedType)) {
      Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Operation, "Operation input type looks wrong",
        $"{inputPath} is stored as {storedType}, but the definition allows {string.Join(", ", input.Types ?? new string[0])}.",
        context);
    }

    if (!IsInputOptional(operation.functionName, input) && IsEmptyRequiredArg(arg, input)) {
      string severity = IsInformationalEmptyArg(operation.functionName, input) ? DiagnosticSeverity.Info : DiagnosticSeverity.Warning;
      Add(scan, severity, DiagnosticCategory.Operation, "Operation input is empty",
        GetEmptyRequiredArgDescription(operation.functionName, inputPath, severity),
        context);
    }

    if (arg.call_value != null) {
      ScanOperation(scan, arg.call_value, context.With($"{context.Path} > {operation.functionName}.{inputName}"));
    }
  }

  // Only the unambiguous fields count - an empty string with zero numbers could be any type
  private static string GetStoredFieldType(TsVariant arg) {
    if (arg.call_value != null) {
      return OperationArgs.Operation;
    }

    if (OperationArgs.HasString(arg)) {
      return OperationArgs.String;
    }

    return null;
  }

  private static void ScanSideloadConversationOperation(Scan scan, TsCall operation, OperationContext context) {
    string conversationId = OperationArgs.GetStringValue(operation.args.ElementAtOrDefault(0));
    string entryNodeId = OperationArgs.GetStringValue(operation.args.ElementAtOrDefault(1));

    if (conversationId == null || conversationId.Trim() == "") {
      return;
    }

    ConversationAsset sideloaded = FindLoadedConversation(scan.LoadedById, conversationId);
    if (sideloaded == null) {
      Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Reference, "Sideload conversation target is not loaded",
        $"Sideload Conversation references '{conversationId}', but no loaded conversation with that id was found in the current folder.",
        context);
      return;
    }

    if (entryNodeId == null || entryNodeId.Trim() == "") {
      return;
    }

    if (!ConversationContainsNodeId(sideloaded, entryNodeId)) {
      string sideloadedName = string.IsNullOrEmpty(sideloaded.Conversation.ui_name) ? conversationId : sideloaded.Conversation.ui_name;
      Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Reference, "Sideload entry node is missing",
        $"Sideload Conversation enters '{entryNodeId}', but that node id was not found in '{sideloadedName}'.",
        context);
    }
  }

  private static bool IsEmptyRequiredArg(TsVariant arg, OperationInput input) {
    string[] types = input.Types ?? new string[0];
    bool allowsOperation = types.Contains(OperationArgs.Operation);
    bool allowsString = types.Contains(OperationArgs.String);
    string text = OperationArgs.GetString(arg).Trim();

    if (allowsOperation && types.Length == 1) {
      return arg.call_value == null;
    }

    if (allowsString && !allowsOperation) {
      return text == "";
    }

    if (allowsString && allowsOperation) {
      return arg.call_value == null && text == "";
    }

    return false;
  }

  private static bool IsInputOptional(string functionName, OperationInput input) {
    string inputText = $"{input.Label ?? ""} {input.Tooltip ?? ""}".ToLowerInvariant();
    if (inputText.Contains("optional")) {
      return true;
    }

    if (functionName == SideloadConversationOperation && (input.Label ?? "").ToLowerInvariant() == "entry node id") {
      return true;
    }

    return false;
  }

  private static bool IsInformationalEmptyArg(string functionName, OperationInput input) {
    string label = (input.Label ?? "").ToLowerInvariant();
    if (functionName == StartConversationCustomOperation && label == "conversation sub header") {
      return true;
    }

    if (functionName == SetBattleTechViewscreenImageOperation && label == "key") {
      return true;
    }

    return false;
  }

  private static string GetEmptyRequiredArgDescription(string functionName, string inputPath, string severity) {
    if (functionName == SetBattleTechViewscreenImageOperation) {
      return $"{inputPath} is empty. BattleTech treats this as clearing the conversation viewscreen, so check that the reset is intentional.";
    }

    if (severity == DiagnosticSeverity.Info) {
      return $"{inputPath} is empty. This is valid, but check that the missing value is intentional.";
    }

    return $"{inputPath} is empty. This may fail or do nothing at runtime.";
  }

  public static Dictionary<string, ConversationAsset> BuildLoadedConversationsById(IEnumerable<ConversationAsset> conversationAssets) {
    Dictionary<string, ConversationAsset> conversationsById = new Dictionary<string, ConversationAsset>();

    foreach (ConversationAsset conversationAsset in conversationAssets) {
      string rawId = ConversationIds.GetRawId(conversationAsset.Conversation.idRef);
      conversationsById[rawId] = conversationAsset;
      conversationsById[ConversationIds.GetComparableId(rawId)] = conversationAsset;
    }

    return conversationsById;
  }

  public static ConversationAsset FindLoadedConversation(Dictionary<string, ConversationAsset> loadedById, string conversationId) {
    if (loadedById.TryGetValue(conversationId, out ConversationAsset match)) {
      return match;
    }

    loadedById.TryGetValue(ConversationIds.GetComparableId(conversationId), out match);
    return match;
  }

  private static void ScanActiveConversationIdDuplicates(Scan scan, List<ConversationAsset> loaded) {
    string rawId = ConversationIds.GetRawId(scan.Asset.Conversation.idRef);
    string comparableId = ConversationIds.GetComparableId(rawId);

    ConversationAsset duplicate = loaded.FirstOrDefault(loadedAsset => {
      if (loadedAsset == scan.Asset) {
        return false;
      }

      if (loadedAsset.FilePath == scan.Asset.FilePath) {
        return false;
      }

      string loadedRawId = ConversationIds.GetRawId(loadedAsset.Conversation.idRef);
      return loadedRawId == rawId || ConversationIds.GetComparableId(loadedRawId) == comparableId;
    });

    if (duplicate == null) {
      return;
    }

    string duplicateRawId = ConversationIds.GetRawId(duplicate.Conversation.idRef);
    string duplicateName = string.IsNullOrEmpty(duplicate.Conversation.ui_name) ? duplicateRawId : duplicate.Conversation.ui_name;
    Add(scan, DiagnosticSeverity.Warning, DiagnosticCategory.Reference, "Duplicate conversation id",
      $"Another loaded conversation, '{duplicateName}', uses matching id '{duplicateRawId}'. The active conversation id is '{rawId}', so conversation-id based references may resolve to the wrong conversation until the duplicate id is fixed.",
      GetConversationContext(scan.Asset));
  }

  public static bool ConversationContainsNodeId(ConversationAsset conversationAsset, string nodeId) {
    string comparableNodeId = ConversationIds.GetComparableId(nodeId);
    bool Matches(IDRef idRef) => ConversationIds.GetRawId(idRef) == nodeId || ConversationIds.GetId(idRef) == comparableNodeId;

    Conversation conversation = conversationAsset.Conversation;
    return conversation.roots.Any(root => Matches(root.idRef)) ||
      conversation.nodes.Any(node => Matches(node.idRef) || node.branches.Any(branch => Matches(branch.idRef)));
  }

  private static void Add(Scan scan, string severity, string category, string title, string description, NodeContext context) {
    scan.Diagnostics.Add(new ConversationDiagnostic {
      Severity = severity,
      Category = category,
      Title = title,
      Description = description,
      NodeId = context.NodeId,
      NodeLabel = context.NodeLabel
    });
  }

  private static NodeContext GetPromptNodeContext(ConversationNode node) {
    return new NodeContext { NodeId = ConversationIds.GetId(node.idRef), NodeLabel = $"Prompt #{node.index + 1}" };
  }

  private static NodeContext GetElementNodeContext(ConversationLink node, string fallbackLabel) {
    return new NodeContext { NodeId = ConversationIds.GetId(node.idRef), NodeLabel = fallbackLabel };
  }

  private static NodeContext GetConversationContext(ConversationAsset conversationAsset) {
    Conversation conversation = conversationAsset.Conversation;
    string label = string.IsNullOrEmpty(conversation.ui_name) ? ConversationIds.GetId(conversation.idRef) : conversation.ui_name;
    return new NodeContext { NodeId = null, NodeLabel = label };
  }

  private static OperationContext ToOperationContext(NodeContext context, string logicKind, string path) {
    return new OperationContext { NodeId = context.NodeId, NodeLabel = context.NodeLabel, LogicKind = logicKind, Path = path };
  }
}
