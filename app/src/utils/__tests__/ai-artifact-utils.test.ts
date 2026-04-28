import { describe, expect, it } from 'vitest';

import { formatAiDraftArtifactContent } from 'utils/ai-artifact-utils';

describe('AI artifact utilities', () => {
  it('formats collapsed JSON responses', () => {
    const result = formatAiDraftArtifactContent('{"title":"Routine Is A Lie","nodes":[{"key":"start","choices":[]}]}');

    expect(result.wasFormatted).toBe(true);
    expect(result.formattedContent).toContain('\n  "title": "Routine Is A Lie"');
    expect(result.formattedContent).toContain('\n  "nodes": [');
  });

  it('expands embedded JSON strings inside prompt request blocks', () => {
    const prompt = [
      '# Prompt',
      '',
      'Request JSON:',
      '```json',
      '{"Request":{"Brief":"Test","ConversationJson":"{\\"conversation\\":{\\"uiName\\":\\"Dead Claim\\"}}"}}',
      '```',
    ].join('\n');

    const result = formatAiDraftArtifactContent(prompt);

    expect(result.wasFormatted).toBe(true);
    expect(result.formattedContent).toContain('"ConversationJson": {');
    expect(result.formattedContent).toContain('"uiName": "Dead Claim"');
    expect(result.notes).toContain('Expanded embedded JSON strings inside the prompt request.');
  });

  it('keeps unparseable text unchanged', () => {
    const content = 'Plain stdout log line';
    const result = formatAiDraftArtifactContent(content);

    expect(result.wasFormatted).toBe(false);
    expect(result.formattedContent).toBe(content);
  });
});

