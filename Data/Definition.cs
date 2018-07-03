namespace ConverseTek.Data {
  public abstract class Definition {
    public string Type { get; set; }

    public Definition(string type) {
      this.Type = type;
    }
  }
}