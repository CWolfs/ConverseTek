
using System.Collections.Generic;

namespace ConverseTek.Data;

public abstract class Definition {
  public string Type { get; set; }
  public List<string> View { get; set; }

  public Definition(string type) {
    Type = type;
  }

  public void AddView(string propertyName) {
    View.Add(propertyName);
  }
}
