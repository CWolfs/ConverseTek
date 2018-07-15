namespace ConverseTek.Data {
  public class OperationInput {
    public string Label { get; set; }
    public string[] Types { get; set; }
    public string Scope { get; set; }
    public OperationInputValue[] Values { get; set; }

    public OperationInput(string label, string[] types, string scope, OperationInputValue[] values) {
      this.Label = label;
      this.Types = types;
      this.Scope = scope;
      this.Values = values;
    }
  }
}