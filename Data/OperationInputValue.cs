namespace ConverseTek.Data {
  public class OperationInputValue {
    public string Text { get; set; }
    public string Value { get; set; }

    public OperationInputValue(string text, string value) {
      this.Text = text;
      this.Value = value;
    }
  }
}