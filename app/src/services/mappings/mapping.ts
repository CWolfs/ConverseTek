/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
type PropertyMapping = {
  [apiProperty: string]: string;
};

/**
    Conversation: {
        idRef: {
            id: string;
        };
        uiName: string;
        roots: [];
        nodes: [];
        default_speaker_id: string;
        default_speaker_override: string | null;
        persistent_conversation: false;
        speaker_override_id: string;
    };
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

    "int_value": 0,
    "bool_value": false,
    "float_value": 0.0,
    "string_value": "",
    "call_value": null,
    "variableref_value": null
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

function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mapArray<T>(arr: any[], mapping: PropertyMapping): any[] {
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
  const result: Partial<T> = {};
  for (const key in obj) {
    const newKey: string = mapping[key] || key;
    const value = (obj as any)[key];

    if (isObject(value)) {
      (result as any)[newKey] = mapToType(value, mapping);
    } else if (Array.isArray(value)) {
      (result as any)[newKey] = mapArray(value, mapping);
    } else {
      (result as any)[newKey] = value;
    }
  }
  return result as T;
}
