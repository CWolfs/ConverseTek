namespace ConverseTek.Data {

  using System.Collections.Generic;

  public abstract class Definition {
    public string Type { get; set; }
    public List<string> View { get; set; }

    public Definition(string type) {
      this.Type = type;
    }

    public void AddView(string propertyName) {
      this.View.Add(propertyName);
    }
  }
}