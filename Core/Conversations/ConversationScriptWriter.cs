using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using ConverseTek.Definitions;
using isogame;

namespace ConverseTek.Conversations;
/*
  Writes a conversation as a readable script for review. It is a view only - JSON is the
  editable form. P numbers are 0-based prompt positions, the same value nextNodeIndex holds.
*/
public static class ConversationScriptWriter {
  public static string Write(Conversation conversation, DefinitionSet definitions, string filePath = null) {
    StringBuilder script = new StringBuilder();
    string name = string.IsNullOrEmpty(conversation.ui_name) ? "(unnamed)" : conversation.ui_name;

    script.AppendLine($"CONVERSATION {name}");
    script.AppendLine($"  id: {ConversationIds.GetRawId(conversation.idRef)}");
    if (filePath != null) {
      script.AppendLine($"  file: {filePath}");
    }

    List<string> settings = new List<string>();
    if (!string.IsNullOrEmpty(conversation.default_speaker_id)) {
      settings.Add($"default speaker: {conversation.default_speaker_id}");
    }

    if (!string.IsNullOrEmpty(conversation.speaker_override_id)) {
      settings.Add($"speaker override: {conversation.speaker_override_id}");
    }

    if (conversation.persistent_conversation) {
      settings.Add("persistent");
    }

    if (settings.Count > 0) {
      script.AppendLine("  " + string.Join(" | ", settings));
    }

    script.AppendLine($"  {conversation.roots.Count} root(s), {conversation.nodes.Count} prompt(s). P numbers are 0-based positions; ConverseTek shows P0 as Prompt #1.");
    script.AppendLine();

    script.AppendLine("ROOTS");
    for (int index = 0; index < conversation.roots.Count; index++) {
      ConversationLink root = conversation.roots[index];
      string text = string.IsNullOrEmpty(root.responseText) ? "" : " " + OperationFormatter.Quote(root.responseText);
      script.AppendLine($"  R{index + 1}{text} -> {Target(root.nextNodeIndex)}  [{ConversationIds.GetRawId(root.idRef)}]{Flags(root)}");
      WriteComment(script, root.comment, "     ");
      WriteOps(script, "if", root.conditions, definitions, "     ");
      WriteOps(script, "do", root.actions, definitions, "     ");
    }

    for (int position = 0; position < conversation.nodes.Count; position++) {
      ConversationNode node = conversation.nodes[position];
      script.AppendLine();

      string indexNote = node.index != position ? $"  (index field {node.index})" : "";
      script.AppendLine($"P{position}  {Speaker(node)}  [{ConversationIds.GetRawId(node.idRef)}]{indexNote}");

      List<string> nodeSettings = new List<string>();
      if ((int)node.nodeType != 0 && (int)node.nodeType != 1) {
        nodeSettings.Add("type: " + EnumName(node.nodeType.ToString(), "ConversationNodeType_"));
      }

      if ((int)node.autoFollowBranchDelay > 1) {
        nodeSettings.Add("auto-follow delay: " + EnumName(node.autoFollowBranchDelay.ToString(), "ConversationAutoFollowType_"));
      }

      if (nodeSettings.Count > 0) {
        script.AppendLine("  " + string.Join(" | ", nodeSettings));
      }

      WriteComment(script, node.comment, "  ");
      WriteText(script, node.text, "  ");
      WriteOps(script, "do", node.actions, definitions, "  ");

      for (int index = 0; index < node.branches.Count; index++) {
        ConversationLink response = node.branches[index];
        string text = string.IsNullOrEmpty(response.responseText) ? "(auto-follow)" : OperationFormatter.Quote(response.responseText);
        script.AppendLine($"  {index + 1}. {text} -> {Target(response.nextNodeIndex)}  [{ConversationIds.GetRawId(response.idRef)}]{Flags(response)}");
        WriteComment(script, response.comment, "       ");
        WriteOps(script, "if", response.conditions, definitions, "       ");
        WriteOps(script, "do", response.actions, definitions, "       ");
      }
    }

    return script.ToString();
  }

  private static string Speaker(ConversationNode node) {
    string castId = node.sourceInSceneRef?.id;
    if (!string.IsNullOrEmpty(castId)) {
      return castId;
    }

    if (!string.IsNullOrEmpty(node.speaker_override_id)) {
      return "override:" + node.speaker_override_id;
    }

    return "(inherits speaker)";
  }

  private static string Target(int nextNodeIndex) {
    return nextNodeIndex == -1 ? "END" : "P" + nextNodeIndex;
  }

  private static string Flags(ConversationLink link) {
    List<string> flags = new List<string>();
    if (link.onlyOnce) {
      flags.Add("once");
    }

    if (!link.hideIfUnavailable) {
      flags.Add("always show");
    }

    if (link.auxiliaryLink) {
      flags.Add("link");
    }

    if (link.inputBypass) {
      flags.Add("input bypass");
    }

    return flags.Count > 0 ? "  (" + string.Join(", ", flags) + ")" : "";
  }

  private static void WriteText(StringBuilder script, string text, string indent) {
    if (string.IsNullOrEmpty(text)) {
      script.AppendLine(indent + "(no text)");
      return;
    }

    string[] lines = text.Replace("\r", "").Split('\n');
    script.AppendLine(indent + "\"" + lines[0]);
    for (int index = 1; index < lines.Length; index++) {
      script.AppendLine(indent + " " + lines[index]);
    }

    script.Length -= Environment.NewLine.Length;
    script.AppendLine("\"");
  }

  private static void WriteComment(StringBuilder script, string comment, string indent) {
    if (string.IsNullOrEmpty(comment)) {
      return;
    }

    foreach (string line in comment.Replace("\r", "").Split('\n')) {
      script.AppendLine(indent + "// " + line);
    }
  }

  private static void WriteOps(StringBuilder script, string label, TsBlock block, DefinitionSet definitions, string indent) {
    foreach (TsCall operation in OperationArgs.GetOps(block)) {
      script.AppendLine($"{indent}{label}  {OperationFormatter.Format(operation, definitions)}");
    }
  }

  private static string EnumName(string value, string prefix) {
    return value.StartsWith(prefix) ? value.Substring(prefix.Length) : value;
  }
}
