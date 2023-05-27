namespace ConverseTek.Data {
  public class OperationInput {
    public string Label { get; set; }
    public string ViewLabel { get; set; }
    public string Tooltip { get; set; }
    public string[] Types { get; set; }
    public string Scope { get; set; }
    public OperationInputValue[] Values { get; set; }
    public object DefaultValue { get; set; }

    public OperationInput(string label, string viewLabel, string tooltip, string[] types, string scope, OperationInputValue[] values, object defaultValue) {
      this.Label = label;
      this.ViewLabel = viewLabel;
      this.Tooltip = tooltip;
      this.Types = types;
      this.Scope = scope;
      this.Values = values;
      this.DefaultValue = defaultValue;
    }
  }
}