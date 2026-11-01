namespace ConverseTek.Json {

  using System;
  using System.Collections.Generic;

  using Newtonsoft.Json;
  using Newtonsoft.Json.Converters;

  using ConverseTek.Data;

  class PresetDefinitionJsonConverter : CustomCreationConverter<Definition> {
      public override Definition Create(Type objectType) {
          return new PresetDefinition(null);
      }

      public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer) {
          if (reader.TokenType == JsonToken.StartObject || reader.TokenType == JsonToken.Null) {
              return base.ReadJson(reader, objectType, existingValue, serializer);
          }

          // if the next token is not an object
          // then fall back on standard deserializer (strings, numbers etc.)
          return serializer.Deserialize(reader);
      }
  }
}