namespace ConverseTek.Data {
  
  using System.Collections.Generic;

  public class TagDefinition : Definition {
    public string Scope { get; set; }
    public List<string> Tags { get; set; }

    public TagDefinition(string type, string scope, List<string> tags) : base(type) {
      this.Scope = scope;
      this.Tags = tags;
    }
  }
}