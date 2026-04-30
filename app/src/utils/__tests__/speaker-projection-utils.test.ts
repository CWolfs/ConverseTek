import { describe, expect, it } from 'vitest';

import { buildPromptSpeakerProjectionMap } from 'utils/speaker-projection-utils';
import { createConversation, createPromptNode, createResponseNode, createRootNode, getId } from 'utils/conversation-utils';

function makeRoot(nextNodeIndex: number) {
  const root = createRootNode();
  root.nextNodeIndex = nextNodeIndex;
  return root;
}

function makeBranch(nextNodeIndex: number) {
  const branch = createResponseNode();
  branch.nextNodeIndex = nextNodeIndex;
  return branch;
}

describe('speaker projection utilities', () => {
  it('formats cast identifiers as readable crew labels', async () => {
    const { formatSpeakerIdLabel } = await import('utils/speaker-projection-utils');

    expect(formatSpeakerIdLabel('FWLCountEisenhardt')).toBe('FWL Count Eisenhardt');
    expect(formatSpeakerIdLabel('castDef_AlexanderMadeiraDefault')).toBe('Alexander Madeira');
    expect(formatSpeakerIdLabel('DariusDefault')).toBe('Darius');
  });

  it('uses an explicit cast id before inherited speakers', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const darius = createPromptNode(0);
    darius.sourceInSceneRef = { id: 'DariusDefault' };

    conversationAsset.conversation.nodes = [darius];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptSpeakerProjectionMap(conversationAsset);

    expect(projections.get(getId(darius))).toMatchObject({
      label: 'Darius',
      title: 'castId DariusDefault',
      variant: 'default',
    });
  });

  it('shows known speaker ids as trimmed speaker names without changing the source id', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const darius = createPromptNode(0);
    darius.sourceInSceneRef = null;
    darius.speakerOverrideId = '598cd3f26230355c18000069';

    conversationAsset.conversation.nodes = [darius];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptSpeakerProjectionMap(conversationAsset);

    expect(projections.get(getId(darius))).toMatchObject({
      label: 'Darius',
      title: 'speakerName DariusDefault, speakerId 598cd3f26230355c18000069',
      variant: 'default',
    });
  });

  it('projects a single inherited speaker through response branches', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const yang = createPromptNode(0);
    yang.sourceInSceneRef = { id: 'YangDefault' };
    const inherited = createPromptNode(1);
    yang.branches = [makeBranch(1)];

    conversationAsset.conversation.nodes = [yang, inherited];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptSpeakerProjectionMap(conversationAsset);

    expect(projections.get(getId(inherited))).toMatchObject({
      label: 'Yang',
      title: 'Projected speaker: Yang (castId YangDefault)',
      variant: 'default',
    });
  });

  it('marks an inherited node as multiple when it can be reached with different speakers', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const yang = createPromptNode(0);
    yang.sourceInSceneRef = { id: 'YangDefault' };
    const sumire = createPromptNode(1);
    sumire.sourceInSceneRef = { id: 'SumireDefault' };
    const inherited = createPromptNode(2);
    yang.branches = [makeBranch(2)];
    sumire.branches = [makeBranch(2)];

    conversationAsset.conversation.nodes = [yang, sumire, inherited];
    conversationAsset.conversation.roots = [makeRoot(0), makeRoot(1)];

    const projections = buildPromptSpeakerProjectionMap(conversationAsset);
    const projection = projections.get(getId(inherited));

    expect(projection).toMatchObject({
      label: 'Multiple',
      variant: 'multiple',
    });
    expect(projection?.title).toContain('Yang (castId YangDefault)');
    expect(projection?.title).toContain('Sumire (castId SumireDefault)');
  });

  it('keeps inherit when no concrete upstream speaker is known', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const inherited = createPromptNode(0);

    conversationAsset.conversation.nodes = [inherited];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptSpeakerProjectionMap(conversationAsset);

    expect(projections.get(getId(inherited))).toMatchObject({
      label: 'Inherits',
      variant: 'default',
    });
  });
});
