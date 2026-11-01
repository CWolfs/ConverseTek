
using System.Collections.Generic;

namespace ConverseTek.Data;

public class TagDefinition : Definition {
  public string Scope { get; set; }
  public List<string> Tags { get; set; }

  public TagDefinition(string type, string scope, List<string> tags) : base(type) {
    Scope = scope;
    Tags = tags;
  }
}
