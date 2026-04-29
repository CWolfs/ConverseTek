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
        comment: 'Gate into the opening briefing.',
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
        comment: 'Opening contract hook.',
        speaker: { type: 'castId', id: 'DariusDefault' },
        text: 'Commander, this contract has been dead for years, but someone just paid to exhume it.',
        actions: [{ functionName: 'SetFlag', args: [{ type: 'string', value: 'dead_claim_intro' }], note: '' }],
        choices: [
          {
            text: 'Keep talking.',
            comment: 'Continue to the practical follow-up.',
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
        comment: 'Darius gives the risk and reward.',
        speaker: { type: 'castId', id: 'DariusDefault' },
        text: 'I do not like the smell of it, but the money is real.',
        actions: [],
        choices: [
          {
            text: 'End briefing.',
            comment: 'Close the draft conversation.',
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

  it('accepts a response rewrite draft without prompt nodes', async () => {
    const { validateAiDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      mode: 'nodeSuggestion',
      nodes: [],
      roots: [
        {
          text: 'Put them through. Darius, keep the Survey Centre hot; I want every scrap of intel before we jump.',
          comment: 'Sharper closing response for the selected branch.',
          targetKey: '',
          endsConversation: true,
          auxiliaryLink: false,
          conditions: [],
          actions: [],
        },
      ],
    });

    const result = validateAiDraft(draft, operations, 'nodeSuggestion', { type: 'response' } as ElementNodeType);

    expect(result.errors).toEqual([]);
  });

  it('turns a full draft into a fresh conversation asset with resolved graph targets', async () => {
    const { buildConversationAssetFromDraft } = await import('utils/ai-draft-utils');

    const conversationAsset = buildConversationAssetFromDraft(makeDraft(), 'K:/Mods/DeadClaim/conversations');

    expect(conversationAsset.conversation.uiName).toBe('Dead Claim Briefing');
    expect(conversationAsset.conversation.roots[0].responseText).toBe('');
    expect(conversationAsset.conversation.roots[0].comment).toBe('Gate into the opening briefing.');
    expect(conversationAsset.conversation.roots[0].nextNodeIndex).toBe(0);
    expect(conversationAsset.conversation.nodes[0].comment).toBe('Opening contract hook.');
    expect(conversationAsset.conversation.nodes[0].branches[0].nextNodeIndex).toBe(1);
    expect(conversationAsset.conversation.nodes[0].branches[0].comment).toBe('Continue to the practical follow-up.');
    expect(conversationAsset.conversation.nodes[1].branches[0].nextNodeIndex).toBe(-1);
    expect(conversationAsset.conversation.nodes[0].actions?.ops?.[0].functionName).toBe('SetFlag');
  });

  it('converts repeated full-draft targets into auxiliary links after the first structural parent', async () => {
    const { buildConversationAssetFromDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Ask for the practical version.',
              targetKey: 'followup',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
            {
              text: 'Ask for the cautious version.',
              targetKey: 'followup',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
        makeDraft().nodes[1],
      ],
    });

    const conversationAsset = buildConversationAssetFromDraft(draft, 'K:/Mods/DeadClaim/conversations');
    const [firstBranch, secondBranch] = conversationAsset.conversation.nodes[0].branches;

    expect(firstBranch.nextNodeIndex).toBe(1);
    expect(firstBranch.auxiliaryLink).toBe(false);
    expect(secondBranch.nextNodeIndex).toBe(1);
    expect(secondBranch.auxiliaryLink).toBe(true);
  });

  it('converts backwards full-draft targets into auxiliary links to avoid rendering duplicate branches', async () => {
    const { buildConversationAssetFromDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      nodes: [
        makeDraft().nodes[0],
        {
          ...makeDraft().nodes[1],
          choices: [
            {
              text: 'Loop back to the opening concern.',
              targetKey: 'intro',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });

    const conversationAsset = buildConversationAssetFromDraft(draft, 'K:/Mods/DeadClaim/conversations');
    const loopBranch = conversationAsset.conversation.nodes[1].branches[0];

    expect(loopBranch.nextNodeIndex).toBe(0);
    expect(loopBranch.auxiliaryLink).toBe(true);
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
