import { describe, expect, it, vi } from 'vitest';
import type { AiConversationDraftType, ConversationAssetType, ElementNodeType, OperationDefinitionType, PromptNodeType } from 'types';

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

  it('builds a branch expansion patch from a prompt by adding a new response choice', async () => {
    const { buildBranchExpansionPatch } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 7,
      text: 'What do we do next?',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      roots: [
        {
          text: 'Ask Darius for the risk profile.',
          comment: 'New response choice for the generated branch.',
          targetKey: 'intro',
          endsConversation: false,
          auxiliaryLink: false,
          conditions: [],
          actions: [],
        },
      ],
    });

    const patch = buildBranchExpansionPatch(draft, prompt);

    expect(prompt.branches).toEqual([]);
    expect(patch.parentElementNode.type).toBe('response');
    expect(patch.parentElementNode.parentId).toBe('prompt-id');
    expect(patch.parentElementNode.responseText).toBe('Ask Darius for the risk profile.');
    expect(patch.parentElementNode.nextNodeIndex).toBe(patch.nodes[0].index);
    expect(patch.nodes[0].parentId).toBe(patch.parentElementNode.idRef.id);
  });

  it('allows branch expansions to auxiliary-link back to existing prompt nodes', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 3,
      text: 'What are the practical limits?',
      branches: [],
    } as unknown as PromptNodeType;
    const existingTarget = {
      type: 'node',
      idRef: { id: 'existing-target-id' },
      parentId: 'response-id',
      index: 7,
      text: 'Existing Darius battle-intel thought.',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      roots: [
        {
          text: 'What are the practical limits?',
          targetKey: 'intro',
          endsConversation: false,
          auxiliaryLink: false,
          conditions: [],
          actions: [],
        },
      ],
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Apply it to intel.',
              targetKey: 'existing-target-id',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });
    const conversationAsset = {
      conversation: {
        nodes: [prompt, existingTarget],
      },
    } as unknown as ConversationAssetType;

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt, conversationAsset);
    const patch = buildBranchExpansionPatch(draft, prompt, { existingNodes: [prompt, existingTarget] });

    expect(validation.errors).toEqual([]);
    expect(patch.nodes[0].index).toBe(8);
    expect(patch.nodes[0].branches[0].nextNodeIndex).toBe(7);
    expect(patch.nodes[0].branches[0].auxiliaryLink).toBe(true);
    expect(existingTarget.parentId).toBe('response-id');
  });

  it('resolves advisory target-key aliases from AI warnings', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 3,
      text: 'What are the practical limits?',
      branches: [],
    } as unknown as PromptNodeType;
    const existingTarget = {
      type: 'node',
      idRef: { id: 'existing-target-id' },
      parentId: 'response-id',
      index: 7,
      text: 'Existing Darius battle-intel thought.',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      warnings: [
        'Target key existing_battle_intel is intended to link to the existing prompt at index 7: "Existing Darius battle-intel thought."',
      ],
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Apply it to intel.',
              targetKey: 'existing_battle_intel',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });
    const conversationAsset = {
      conversation: {
        nodes: [prompt, existingTarget],
      },
    } as unknown as ConversationAssetType;

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt, conversationAsset);
    const patch = buildBranchExpansionPatch(draft, prompt, { existingNodes: [prompt, existingTarget] });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).not.toContain(
      'AI warning: Target key existing_battle_intel is intended to link to the existing prompt at index 7: "Existing Darius battle-intel thought."',
    );
    expect(patch.nodes[0].branches[0].nextNodeIndex).toBe(7);
    expect(patch.nodes[0].branches[0].auxiliaryLink).toBe(true);
  });

  it('resolves obvious existing_node index aliases without advisory warnings', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 1,
      text: 'Push the survey array harder?',
      branches: [],
    } as unknown as PromptNodeType;
    const existingTarget = {
      type: 'node',
      idRef: { id: 'existing-target-id' },
      parentId: 'response-id',
      index: 2,
      text: 'Existing follow-up prompt.',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      warnings: ['Target keys existing_node_2 and existing_node_3 refer to existing conversation nodes with indexes 2 and 3.'],
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Return to the existing follow-up.',
              targetKey: 'existing_node_2',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });
    const conversationAsset = {
      conversation: {
        nodes: [prompt, existingTarget],
      },
    } as unknown as ConversationAssetType;

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt, conversationAsset);
    const patch = buildBranchExpansionPatch(draft, prompt, { existingNodes: [prompt, existingTarget] });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).not.toContain('AI warning: Target keys existing_node_2 and existing_node_3 refer to existing conversation nodes with indexes 2 and 3.');
    expect(patch.nodes[0].branches[0].nextNodeIndex).toBe(2);
    expect(patch.nodes[0].branches[0].auxiliaryLink).toBe(true);
  });

  it('resolves existing_node aliases that use the existing prompt id', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 1,
      text: 'Push the survey array harder?',
      branches: [],
    } as unknown as PromptNodeType;
    const existingTarget = {
      type: 'node',
      idRef: { id: '9c6bf58737d935c8cfe338f7' },
      parentId: 'response-id',
      index: 4,
      text: 'Existing follow-up prompt.',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Return to the existing follow-up.',
              targetKey: 'existing_node_9c6bf58737d935c8cfe338f7',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });
    const conversationAsset = {
      conversation: {
        nodes: [prompt, existingTarget],
      },
    } as unknown as ConversationAssetType;

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt, conversationAsset);
    const patch = buildBranchExpansionPatch(draft, prompt, { existingNodes: [prompt, existingTarget] });

    expect(validation.errors).toEqual([]);
    expect(patch.nodes[0].branches[0].nextNodeIndex).toBe(4);
    expect(patch.nodes[0].branches[0].auxiliaryLink).toBe(true);
  });

  it('resolves existing aliases that use the existing prompt id', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 1,
      text: 'Push the survey array harder?',
      branches: [],
    } as unknown as PromptNodeType;
    const existingTarget = {
      type: 'node',
      idRef: { id: '9c6bf58737d935c8cfe338f7' },
      parentId: 'response-id',
      index: 4,
      text: 'Existing follow-up prompt.',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      warnings: ['Target key existing_9c6bf58737d935c8cfe338f7 refers to the existing prompt node with id 9c6bf58737d935c8cfe338f7.'],
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: 'Return to the existing follow-up.',
              targetKey: 'existing_9c6bf58737d935c8cfe338f7',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
      ],
    });
    const conversationAsset = {
      conversation: {
        nodes: [prompt, existingTarget],
      },
    } as unknown as ConversationAssetType;

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt, conversationAsset);
    const patch = buildBranchExpansionPatch(draft, prompt, { existingNodes: [prompt, existingTarget] });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).not.toContain(
      'AI warning: Target key existing_9c6bf58737d935c8cfe338f7 refers to the existing prompt node with id 9c6bf58737d935c8cfe338f7.',
    );
    expect(patch.nodes[0].branches[0].nextNodeIndex).toBe(4);
    expect(patch.nodes[0].branches[0].auxiliaryLink).toBe(true);
  });

  it('uses the draft title as a prompt expansion response fallback when roots are empty', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 2,
      text: 'What is the expensive option?',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      title: 'Costly Survey Push',
      roots: [],
    });

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt);
    const patch = buildBranchExpansionPatch(draft, prompt);

    expect(validation.warnings).not.toContain('Prompt branch expansion drafts should include roots[0].text for the new response choice.');
    expect(patch.parentElementNode.responseText).toBe('Costly Survey Push');
  });

  it('collapses blank one-choice connector nodes in branch expansions', async () => {
    const { buildBranchExpansionPatch, validateAiDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 2,
      text: 'Push the survey array harder?',
      branches: [],
    } as unknown as PromptNodeType;
    const draft = makeDraft({
      mode: 'branchExpansion',
      nodes: [
        {
          ...makeDraft().nodes[0],
          key: 'selected_node_expansion',
          text: '',
          actions: [],
          choices: [
            {
              text: 'Push the sensors harder.',
              targetKey: 'survey_risk',
              endsConversation: false,
              auxiliaryLink: false,
              conditions: [],
              actions: [],
            },
          ],
        },
        {
          ...makeDraft().nodes[1],
          key: 'survey_risk',
          text: 'That scan will cost us time, money, and subtlety.',
        },
      ],
    });

    const validation = validateAiDraft(draft, operations, 'branchExpansion', prompt);
    const patch = buildBranchExpansionPatch(draft, prompt);

    expect(validation.warnings).not.toContain("Prompt node 'selected_node_expansion' has blank text.");
    expect(patch.nodes).toHaveLength(1);
    expect(patch.parentElementNode.nextNodeIndex).toBe(patch.nodes[0].index);
    expect(patch.nodes[0].text).toBe('That scan will cost us time, money, and subtlety.');
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

  it('uses the selected prompt as the first prompt expansion preview node', async () => {
    const { buildPreviewConversationAssetFromDraft } = await import('utils/ai-draft-utils');
    const prompt = {
      type: 'node',
      idRef: { id: 'prompt-id' },
      parentId: 'root-id',
      index: 7,
      text: 'What do we do next?',
      branches: [],
    } as unknown as PromptNodeType;

    const preview = buildPreviewConversationAssetFromDraft(
      makeDraft({
        mode: 'branchExpansion',
        roots: [
          {
            text: 'Ask Darius for the risk profile.',
            targetKey: 'intro',
            endsConversation: false,
            auxiliaryLink: false,
            conditions: [],
            actions: [],
          },
        ],
      }),
      'branchExpansion',
      'K:/Mods/DeadClaim/conversations',
      prompt,
    );

    expect(preview?.conversation.roots).toEqual([]);
    expect(preview?.conversation.nodes[0].text).toBe('What do we do next?');
    expect(preview?.conversation.nodes[0].parentId).toBe('0');
    expect(preview?.conversation.nodes[0].branches[0].responseText).toBe('Ask Darius for the risk profile.');
    expect(preview?.conversation.nodes[1].parentId).toBe(preview?.conversation.nodes[0].branches[0].idRef.id);
  });

  it('uses node text for prompt suggestions and response text for element suggestions', async () => {
    const { getSuggestedNodeText, getSuggestedNodeTexts } = await import('utils/ai-draft-utils');
    const draft = makeDraft({ mode: 'nodeSuggestion' });
    const prompt = { type: 'node' } as PromptNodeType;
    const response = { type: 'response' } as ElementNodeType;

    expect(getSuggestedNodeText(draft, prompt)).toBe(draft.nodes[0].text);
    expect(getSuggestedNodeText(draft, response)).toBe(draft.roots[0].text);
    expect(getSuggestedNodeTexts(draft, prompt)).toEqual(draft.nodes.map((node) => node.text));
  });

  it('accepts the selected node suggestion version', async () => {
    const { buildAcceptedDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      mode: 'nodeSuggestion',
      nodes: [
        { ...makeDraft().nodes[0], text: 'Version one.' },
        { ...makeDraft().nodes[0], text: 'Version two.' },
        { ...makeDraft().nodes[0], text: 'Version three.' },
      ],
      roots: [],
    });

    const acceptedDraft = buildAcceptedDraft(draft, 'nodeSuggestion', 'K:/Mods/DeadClaim/conversations', { type: 'node' } as PromptNodeType, 1);

    expect(acceptedDraft).toEqual({
      kind: 'nodeText',
      text: 'Version two.',
      versionIndex: 1,
    });
  });

  it('reports when a node suggestion returns fewer than three versions', async () => {
    const { validateAiDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({ mode: 'nodeSuggestion' });

    const result = validateAiDraft(draft, operations, 'nodeSuggestion', { type: 'node' } as PromptNodeType);

    expect(result.warnings).toContain('Node suggestion draft returned 2 versions instead of 3.');
  });

  it('allows blank continuing response choices because BattleTech displays Continue', async () => {
    const { validateAiDraft } = await import('utils/ai-draft-utils');
    const draft = makeDraft({
      nodes: [
        {
          ...makeDraft().nodes[0],
          choices: [
            {
              text: '',
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

    const result = validateAiDraft(draft, operations, 'fullConversation');

    expect(result.warnings).not.toContain("node 'intro' choice 1 has blank response text.");
  });
});
