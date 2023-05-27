namespace ConverseTek.Data {

  using System.Collections.Generic;

  public class OperationDefinition : Definition {
    public string Key { get; set; }
    public string Label { get; set; }
    public string Tooltip { get; set; }
    public string Category { get; set; }
    public string Scope { get; set; }
    public List<OperationInput> Inputs { get; set; }

    public OperationDefinition(string type, string key, string tooltip, string label, string category, string scope) : base(type) {
      this.Key = key;
      this.Label = label;
      this.Tooltip = tooltip;
      this.Category = category;
      this.Scope = scope;
    }

    public void AddInput(string label, string viewLabel, string tooltip, string[] types) {
      AddInput(label, viewLabel, tooltip, types, null, null, null);
    }

    public void AddInput(string label, string viewLabel, string tooltip, string[] types, string scope, OperationInputValue[] values, object defaultValue) {
      Inputs.Add(new OperationInput(label, viewLabel, tooltip, types, scope, values, defaultValue));
    }
  }
}