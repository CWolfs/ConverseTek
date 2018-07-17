namespace ConverseTek.Data {
  public class OperationInputValue {
    public string Viewlabel { get; set; }
    public string Text { get; set; }
    public string Value { get; set; }

    public OperationInputValue(string viewlabel, string text, string value) {
      this.Viewlabel = viewlabel;
      this.Text = text;
      this.Value = value;
    }
  }
}