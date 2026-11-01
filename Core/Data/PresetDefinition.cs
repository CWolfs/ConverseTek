namespace ConverseTek.Data {
  
  using System.Collections.Generic;

  public class PresetDefinition : Definition {
    public string Key { get; set; }
    public string Label { get; set; }
    public Dictionary<string, object> Values { get; set; }

    public PresetDefinition(string type) : base(type) { }

    public PresetDefinition(string key, string label, string type, Dictionary<string, object> values) : base(type) {
      this.Key = key;
      this.Label = label;
      this.Values = Values;
    }
  }
}