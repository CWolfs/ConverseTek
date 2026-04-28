export type JsonValue = string | number | boolean | JsonObject | JsonArray | null;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
type MappableObject = Record<string, unknown>;

type PropertyMapping = {
  [apiProperty: string]: string;
};

type ReversedPropertyMapping = {
  [K in keyof PropertyMapping as PropertyMapping[K]]: K;
};

// CONVERSATIONS

/**
 Used for conversations
 */
export const conversationMapping: PropertyMapping = {
  FileName: 'filename',
  FilePath: 'filepath',
  Conversation: 'conversation',
  default_speaker_id: 'defaultSpeakerId',
  default_speaker_override: 'defaultSpeakerOverride',
  speaker_override_id: 'speakerOverrideId',
  persistent_conversation: 'persistentConversation',
  ui_name: 'uiName',
};

/**
    Used for actions and conditions.
*/
export const operationMapping: PropertyMapping = {
  int_value: 'intValue',
  bool_value: 'boolValue',
  float_value: 'floatValue',
  string_value: 'stringValue',
  call_value: 'callValue',
  variableref_value: 'variableRefValue',
};

export const fullConversationAssetMapping: PropertyMapping = {
  ...conversationMapping,
  ...operationMapping,
};

export const reversedFullConversationAssetMapping = reverseMapping(fullConversationAssetMapping);

// PROCESSING

function toJsonValue(value: unknown): JsonValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isObject(value)) {
    const jsonObject: JsonObject = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      jsonObject[key] = toJsonValue(nestedValue);
    }
    return jsonObject;
  }

  return null;
}

export function lowercasePropertyNames(obj: unknown, firstCharacterLower = false): JsonValue {
  if (Array.isArray(obj)) {
    return obj.map((item) => lowercasePropertyNames(item, firstCharacterLower));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: JsonObject = {};

    for (const [key, value] of Object.entries(obj)) {
      newObj[firstCharacterLower ? `${key[0].toLowerCase()}${key.substring(1)}` : key.toLowerCase()] = lowercasePropertyNames(value, firstCharacterLower);
    }

    return newObj;
  } else {
    return toJsonValue(obj);
  }
}

function isObject(value: unknown): value is MappableObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mapArray(arr: unknown[], mapping: PropertyMapping): unknown[] {
  return arr.map((item) => {
    if (isObject(item)) {
      return mapToType(item, mapping);
    } else if (Array.isArray(item)) {
      return mapArray(item, mapping);
    }
    return item;
  });
}

export function mapToType<T>(obj: object, mapping: PropertyMapping): T {
  const source = obj as MappableObject;
  const result: MappableObject = {};
  for (const key in obj) {
    const newKey: string = mapping[key] || key;
    const value = source[key];

    if (isObject(value)) {
      result[newKey] = mapToType(value, mapping);
    } else if (Array.isArray(value)) {
      result[newKey] = mapArray(value, mapping);
    } else {
      result[newKey] = value;
    }
  }
  return result as T;
}

function reverseMapping(mapping: PropertyMapping): ReversedPropertyMapping {
  const reversedMapping: Partial<ReversedPropertyMapping> = {};

  for (const key in mapping) {
    // eslint-disable-next-line no-prototype-builtins
    if (mapping.hasOwnProperty(key)) {
      const value = mapping[key];
      reversedMapping[value] = key;
    }
  }

  return reversedMapping as ReversedPropertyMapping;
}
