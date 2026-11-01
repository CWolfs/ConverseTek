namespace ConverseTek.Data;

public class OperationInput {
  public string Label { get; set; }
  public string ViewLabel { get; set; }
  public string Tooltip { get; set; }
  public string[] Types { get; set; }
  public string Scope { get; set; }
  public OperationInputValue[] Values { get; set; }
  public object DefaultValue { get; set; }
  public string PreferredType { get; set; }
  public string AiHint { get; set; }
  public object[] AiExamples { get; set; }

  public OperationInput(string label, string viewLabel, string tooltip, string[] types, string scope, OperationInputValue[] values, object defaultValue) {
    Label = label;
    ViewLabel = viewLabel;
    Tooltip = tooltip;
    Types = types;
    Scope = scope;
    Values = values;
    DefaultValue = defaultValue;
  }
}
