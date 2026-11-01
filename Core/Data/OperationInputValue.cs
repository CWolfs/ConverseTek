namespace ConverseTek.Data;

public class OperationInputValue {
  public string ViewLabel { get; set; }
  public string Text { get; set; }
  public string Value { get; set; }

  public OperationInputValue(string viewLabel, string text, string value) {
    ViewLabel = viewLabel;
    Text = text;
    Value = value;
  }
}
