namespace ConverseTek.Data {

  using System.Collections.Generic;

  public class OperationDefinition : Definition {
    public string Key { get; set; }
    public string Label { get; set; }
    public string Category { get; set; }
    public string Scope { get; set; }
    public List<OperationInput> Inputs { get; set; }

    public OperationDefinition(string type, string key, string label, string category, string scope) : base(type) {
      this.Key = key;
      this.Label = label;
      this.Category = category;
      this.Scope = scope;
    }

    public void AddInput(string label, string viewlabel, string[] types) {
      AddInput(label, viewlabel, types, null, null);
    }

    public void AddInput(string label, string viewlabel, string[] types, string scope, OperationInputValue[] values) {
      Inputs.Add(new OperationInput(label, viewlabel, types, scope, values));
    }
  }
}