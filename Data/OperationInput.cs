namespace ConverseTek.Data {
  public class OperationInput {
    public string Label { get; set; }
    public string Viewlabel { get; set; }
    public string Tooltip { get; set; }
    public string[] Types { get; set; }
    public string Scope { get; set; }
    public OperationInputValue[] Values { get; set; }

    public OperationInput(string label, string viewlabel, string tooltip, string[] types, string scope, OperationInputValue[] values) {
      this.Label = label;
      this.Viewlabel = viewlabel;
      this.Tooltip = tooltip;
      this.Types = types;
      this.Scope = scope;
      this.Values = values;
    }
  }
}