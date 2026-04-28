type JsonPrimitive = string | number | boolean | null;
type JsonObjectValue = { [key: string]: JsonDisplayValue };
type JsonDisplayValue = JsonPrimitive | JsonDisplayValue[] | JsonObjectValue;

export type AiArtifactDisplayContent = {
  formattedContent: string;
  wasFormatted: boolean;
  notes: string[];
};

export function formatAiDraftArtifactContent(content: string): AiArtifactDisplayContent {
  const source = content || '';
  const parsedWholeContent = parseJson(source);

  if (parsedWholeContent != null) {
    return {
      formattedContent: stringifyJson(expandEmbeddedJson(parsedWholeContent)),
      wasFormatted: true,
      notes: ['Formatted JSON response.'],
    };
  }

  const markdownResult = formatMarkdownJsonBlocks(source);
  if (markdownResult.wasFormatted) {
    return markdownResult;
  }

  return {
    formattedContent: source,
    wasFormatted: false,
    notes: [],
  };
}

function formatMarkdownJsonBlocks(content: string): AiArtifactDisplayContent {
  const notes = new Set<string>();
  const formattedContent = content.replace(/```json\s*\r?\n([\s\S]*?)```/gi, (match, jsonBlock: string) => {
    const parsedBlock = parseJson(jsonBlock);
    if (parsedBlock == null) return match;

    const expandedBlock = expandEmbeddedJson(parsedBlock);
    notes.add('Formatted prompt JSON block.');

    if (containsExpandedJsonString(parsedBlock, expandedBlock)) {
      notes.add('Expanded embedded JSON strings inside the prompt request.');
    }

    return `\`\`\`json\n${stringifyJson(expandedBlock)}\n\`\`\``;
  });

  return {
    formattedContent,
    wasFormatted: notes.size > 0,
    notes: Array.from(notes),
  };
}

function expandEmbeddedJson(value: JsonDisplayValue): JsonDisplayValue {
  if (typeof value === 'string') {
    const embeddedJson = parseEmbeddedJsonString(value);
    return embeddedJson == null ? value : expandEmbeddedJson(embeddedJson);
  }

  if (Array.isArray(value)) {
    return value.map((item) => expandEmbeddedJson(item));
  }

  if (value != null && typeof value === 'object') {
    const expandedObject: JsonObjectValue = {};
    for (const [key, childValue] of Object.entries(value)) {
      expandedObject[key] = expandEmbeddedJson(childValue);
    }

    return expandedObject;
  }

  return value;
}

function containsExpandedJsonString(originalValue: JsonDisplayValue, expandedValue: JsonDisplayValue): boolean {
  if (typeof originalValue === 'string') {
    return originalValue !== expandedValue && parseEmbeddedJsonString(originalValue) != null;
  }

  if (Array.isArray(originalValue) && Array.isArray(expandedValue)) {
    return originalValue.some((item, index) => containsExpandedJsonString(item, expandedValue[index]));
  }

  if (isJsonObject(originalValue) && isJsonObject(expandedValue)) {
    return Object.keys(originalValue).some((key) => containsExpandedJsonString(originalValue[key], expandedValue[key]));
  }

  return false;
}

function parseEmbeddedJsonString(value: string): JsonDisplayValue | null {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) return null;

  const parsedValue = parseJson(trimmedValue);
  if (parsedValue == null || typeof parsedValue !== 'object') return null;

  return parsedValue;
}

function parseJson(value: string): JsonDisplayValue | null {
  try {
    return JSON.parse(value) as JsonDisplayValue;
  } catch {
    return null;
  }
}

function stringifyJson(value: JsonDisplayValue): string {
  return JSON.stringify(value, null, 2);
}

function isJsonObject(value: JsonDisplayValue | undefined): value is JsonObjectValue {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

