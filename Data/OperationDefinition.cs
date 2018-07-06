namespace ConverseTek.Data {

  using System.Collections.Generic;

  public class OperationDefinition : Definition {
    public string Key { get; set; }
    public string Label { get; set; }
    public string Category { get; set; }
    public List<OperationInput> Inputs { get; set; }

    public OperationDefinition(string type, string key, string label, string category) : base(type) {
      this.Key = key;
      this.Label = label;
      this.Category = category;
    }

    public void AddInput(string label, string[] types) {
      AddInput(label, types, null);
    }

    public void AddInput(string label, string[] types, string scope) {
      Inputs.Add(new OperationInput(label, types, scope));
    }
  }
}