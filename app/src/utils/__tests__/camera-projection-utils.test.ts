import { describe, expect, it } from 'vitest';

import { buildPromptCameraProjectionMap } from 'utils/camera-projection-utils';
import { createConversation, createPromptNode, createResponseNode, createRootNode, getId } from 'utils/conversation-utils';
import type { OperationCallType } from 'types';

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

function makeStringAction(functionName: string, value: string): OperationCallType {
  return {
    functionName,
    args: [
      {
        type: 'string',
        intValue: 0,
        boolValue: false,
        floatValue: 0,
        stringValue: value,
        callValue: null,
        variableRefValue: null,
      },
    ],
  };
}

describe('camera projection utilities', () => {
  it('projects a camera lock from node actions onto the same node and descendants', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const hologram = createPromptNode(0);
    hologram.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'HOLOGRAM')] };
    const inherited = createPromptNode(1);
    hologram.branches = [makeBranch(1)];

    conversationAsset.conversation.nodes = [hologram, inherited];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptCameraProjectionMap(conversationAsset);

    expect(projections.get(getId(hologram))).toMatchObject({
      label: 'Hologram',
      variant: 'default',
    });
    expect(projections.get(getId(inherited))).toMatchObject({
      label: 'Hologram',
      variant: 'default',
    });
  });

  it('applies link actions before the target prompt node is shown', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const root = makeRoot(0);
    root.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'DARIUS')] };
    const target = createPromptNode(0);

    conversationAsset.conversation.nodes = [target];
    conversationAsset.conversation.roots = [root];

    const projections = buildPromptCameraProjectionMap(conversationAsset);

    expect(projections.get(getId(target))).toMatchObject({
      label: 'Darius',
      variant: 'default',
    });
  });

  it('clears a vanilla camera lock when the target is not a BattleTech camera enum', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const hologram = createPromptNode(0);
    hologram.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'HOLOGRAM')] };
    const auto = createPromptNode(1);
    auto.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'AUTO')] };
    hologram.branches = [makeBranch(1)];

    conversationAsset.conversation.nodes = [hologram, auto];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptCameraProjectionMap(conversationAsset);

    expect(projections.get(getId(auto))).toBeUndefined();
  });

  it('marks ambiguous inherited camera state as multiple', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const darius = createPromptNode(0);
    darius.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'DARIUS')] };
    const hologram = createPromptNode(1);
    hologram.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'HOLOGRAM')] };
    const inherited = createPromptNode(2);
    darius.branches = [makeBranch(2)];
    hologram.branches = [makeBranch(2)];

    conversationAsset.conversation.nodes = [darius, hologram, inherited];
    conversationAsset.conversation.roots = [makeRoot(0), makeRoot(1)];

    const projections = buildPromptCameraProjectionMap(conversationAsset);
    const projection = projections.get(getId(inherited));

    expect(projection).toMatchObject({
      label: 'Multiple',
      variant: 'multiple',
    });
    expect(projection?.title).toContain('lock Darius');
    expect(projection?.title).toContain('lock Hologram');
  });

  it('keeps an ExtendedConversations hard-lock active when a vanilla AUTO lock clears the normal camera lock', () => {
    const conversationAsset = createConversation('K:/Mods/Test/conversations');
    const hardLock = createPromptNode(0);
    hardLock.actions = { ops: [makeStringAction('Set BattleTech Camera Hard Lock', 'HOLOGRAM')] };
    const auto = createPromptNode(1);
    auto.actions = { ops: [makeStringAction('Set BattleTech Camera Lock', 'AUTO')] };
    hardLock.branches = [makeBranch(1)];

    conversationAsset.conversation.nodes = [hardLock, auto];
    conversationAsset.conversation.roots = [makeRoot(0)];

    const projections = buildPromptCameraProjectionMap(conversationAsset);

    expect(projections.get(getId(auto))).toMatchObject({
      label: 'Hologram',
      variant: 'hardLock',
    });
  });
});
