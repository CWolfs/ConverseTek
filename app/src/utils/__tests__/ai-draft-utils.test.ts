import { describe, expect, it, vi } from 'vitest';
import type { AiConversationDraftType, ElementNodeType, OperationDefinitionType, PromptNodeType } from 'types';

vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.stubGlobal('document', {
  addEventListener: vi.fn(),
  getElementsByTagName: vi.fn(() => []),
});

const operations: OperationDefinitionType[] = [
  {
    key: 'SetFlag',
    label: 'Set Flag',
    view: ['label'],
    scope: 'action',
    category: 'primary',
    tooltip: '',
    inputs: [{ label: 'Flag', types: ['string'] }],
  },
];

function makeDraft(overrides: Partial<AiConversationDraftType> = {}): AiConversationDraftType {
  return {
    version: 1,
    mode: 'fullConversation',
    title: 'Dead Claim Briefing',
    summary: 'Darius introduces the problem and gives the commander a choice.',
    cast: [{ id: 'DariusDefault', label: 'Darius', role: 'XO' }],
    roots: [
      {
        text: 'Open the briefing.',
        targetKey: 'intro',
        endsConversation: false,
        auxiliaryLink: false,
        conditions: [],
        actions: [],
      },
    ],
    nodes: [
      {
        key: 'intro',
        speaker: { type: 'castId', id: 'DariusDefault' },
        text: 'Commander, this contract has been dead for years, but someone just paid to exhume it.',
        actions: [{ functionName: 'SetFlag', args: [{ type: 'string', value: 'dead_claim_intro' }], note: '' }],
        choices: [
          {
            text: 'Keep talking.',
            targetKey: 'followup',
            endsConversation: false,
            auxiliaryLink: false,
            conditions: [],
            actions: [],
          },
        ],
      },
      {
        key: 'followup',
        speaker: { type: 'castId', id: 'DariusDefault' },
        text: 'I do not like the smell of it, but the money is real.',
        actions: [],
        choices: [
          {
            text: 'End briefing.',
            targetKey: '',
            endsConversation: true,
            auxiliaryLink: false,
            conditions: [],
            actions: [],
          },
        ],
      },
    ],
    warnings: [],
    ...overrides,
  };
}

describe('AI draft utilities', () => {
  it('validates a branching draft with forward target references', async () => {
    const { validateAiDraft } = await import('utils/ai-draft-utils');

    const result = validateAiDraft(makeDraft(), operations, 'fullConversation');

    expect(result.errors).toEqual([]);
  });

  it('flags duplicate draft keys before accepting', async () => {
    const { validateAiDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      nodes: [makeDraft().nodes[0], { ...makeDraft().nodes[1], key: 'intro' }],
    });

    const result = validateAiDraft(draft, operations, 'fullConversation');

    expect(result.errors).toContain("Prompt node key 'intro' is duplicated.");
  });

  it('turns a full draft into a fresh conversation asset with resolved graph targets', async () => {
    const { buildConversationAssetFromDraft } = await import('utils/ai-draft-utils');

    const conversationAsset = buildConversationAssetFromDraft(makeDraft(), 'K:/Mods/DeadClaim/conversations');

    expect(conversationAsset.conversation.uiName).toBe('Dead Claim Briefing');
    expect(conversationAsset.conversation.roots[0].nextNodeIndex).toBe(0);
    expect(conversationAsset.conversation.nodes[0].branches[0].nextNodeIndex).toBe(1);
    expect(conversationAsset.conversation.nodes[1].branches[0].nextNodeIndex).toBe(-1);
    expect(conversationAsset.conversation.nodes[0].actions?.ops?.[0].functionName).toBe('SetFlag');
  });

  it('builds a branch expansion patch without mutating the selected element node', async () => {
    const { buildBranchExpansionPatch } = await import('utils/ai-draft-utils');
    const root = {
      type: 'root',
      parentId: '0',
      nextNodeIndex: -1,
      responseText: 'Ask Darius.',
      auxiliaryLink: false,
      idRef: { id: 'root-id' },
      conditions: null,
      actions: null,
      hideIfUnavailable: true,
      onlyOnce: false,
      inputBypass: false,
      comment: '',
    } as ElementNodeType;

    const patch = buildBranchExpansionPatch(makeDraft({ mode: 'branchExpansion', roots: [] }), root);

    expect(root.nextNodeIndex).toBe(-1);
    expect(patch.parentElementNode.nextNodeIndex).toBe(patch.nodes[0].index);
    expect(patch.nodes[0].parentId).toBe('root-id');
  });

  it('builds a branch expansion preview as a temporary conversation tree', async () => {
    const { buildPreviewConversationAssetFromDraft } = await import('utils/ai-draft-utils');
    const response = {
      type: 'response',
      parentId: 'parent-node',
      nextNodeIndex: -1,
      responseText: 'Ask Sumire for a signal check.',
      auxiliaryLink: false,
      idRef: { id: 'response-id' },
      conditions: null,
      actions: null,
      hideIfUnavailable: true,
      onlyOnce: false,
      inputBypass: false,
      comment: '',
    } as ElementNodeType;

    const preview = buildPreviewConversationAssetFromDraft(
      makeDraft({ mode: 'branchExpansion', roots: [] }),
      'branchExpansion',
      'K:/Mods/DeadClaim/conversations',
      response,
    );

    expect(preview?.conversation.roots[0].responseText).toBe('Ask Sumire for a signal check.');
    expect(preview?.conversation.roots[0].nextNodeIndex).toBe(0);
    expect(preview?.conversation.nodes[0].parentId).toBe(preview?.conversation.roots[0].idRef.id);
  });

  it('uses node text for prompt suggestions and response text for element suggestions', async () => {
    const { getSuggestedNodeText } = await import('utils/ai-draft-utils');
    const draft = makeDraft({ mode: 'nodeSuggestion' });
    const prompt = { type: 'node' } as PromptNodeType;
    const response = { type: 'response' } as ElementNodeType;

    expect(getSuggestedNodeText(draft, prompt)).toBe(draft.nodes[0].text);
    expect(getSuggestedNodeText(draft, response)).toBe(draft.roots[0].text);
  });
});
