import { describe, expect, it } from 'vitest';

import { buildConversationDiagnostics } from 'utils/conversation-diagnostics-utils';
import { createConversation, createPromptNode, createResponseNode, createRootNode, getId } from 'utils/conversation-utils';
import type { ConversationAssetType, OperationArgType, OperationCallType, OperationDefinitionType } from 'types';

function makeStringArg(value: string): OperationArgType {
  return {
    type: 'string',
    intValue: 0,
    boolValue: false,
    floatValue: 0,
    stringValue: value,
    callValue: null,
    variableRefValue: null,
  };
}

function makeIntArg(value: number): OperationArgType {
  return {
    type: 'int',
    intValue: value,
    boolValue: false,
    floatValue: 0,
    stringValue: '',
    callValue: null,
    variableRefValue: null,
  };
}

function makeAction(functionName: string, args: OperationArgType[] = []): OperationCallType {
  return { functionName, args };
}

function makeDefinition(key: string, inputs: OperationDefinitionType['inputs'] = []): OperationDefinitionType {
  return {
    key,
    label: key,
    view: ['label', 'inputs'],
    scope: 'action',
    category: 'primary',
    tooltip: '',
    inputs,
  };
}

function makeBasicConversation(): ConversationAssetType {
  const conversationAsset = createConversation('K:/Mods/Test/conversations');
  const root = createRootNode();
  const prompt = createPromptNode(0);
  root.nextNodeIndex = 0;
  root.responseText = 'Start';
  prompt.text = 'Hello.';

  conversationAsset.conversation.roots = [root];
  conversationAsset.conversation.nodes = [prompt];

  return conversationAsset;
}

describe('conversation diagnostics', () => {
  it('reports broken links and unreachable prompt nodes', () => {
    const conversationAsset = makeBasicConversation();
    const root = conversationAsset.conversation.roots[0];
    const orphan = createPromptNode(4);
    orphan.text = 'No route here.';
    root.nextNodeIndex = 99;
    conversationAsset.conversation.nodes.push(orphan);

    const diagnostics = buildConversationDiagnostics({ conversationAsset, operationDefinitions: [] });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', title: 'Link target is missing', nodeId: getId(root) }),
        expect.objectContaining({ severity: 'warning', title: 'Prompt node is not reachable from a root', nodeId: getId(orphan) }),
      ]),
    );
  });

  it('reports missing operation definitions and missing required inputs', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    prompt.actions = {
      ops: [makeAction('Unknown Action'), makeAction('Trigger Event', [makeStringArg('')])],
    };

    const diagnostics = buildConversationDiagnostics({
      conversationAsset,
      operationDefinitions: [makeDefinition('Trigger Event', [{ label: 'Event Def Id', types: ['string'] }])],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', title: 'Missing operation definition', nodeId: getId(prompt) }),
        expect.objectContaining({ severity: 'warning', title: 'Operation input is empty', nodeId: getId(prompt) }),
      ]),
    );
  });

  it('allows empty prompt nodes that continue into response choices', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    const commanderResponse = createResponseNode();
    commanderResponse.responseText = 'Keep going.';
    commanderResponse.nextNodeIndex = -1;
    prompt.text = '';
    prompt.branches = [commanderResponse];

    const diagnostics = buildConversationDiagnostics({ conversationAsset, operationDefinitions: [] });
    const promptDiagnostics = diagnostics.filter((diagnostic) => diagnostic.nodeId === getId(prompt));

    expect(promptDiagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'info', title: 'Prompt node has no text' })]),
    );
    expect(promptDiagnostics.some((diagnostic) => diagnostic.severity === 'warning' && diagnostic.title.startsWith('Prompt node'))).toBe(false);
  });

  it('reports empty prompt nodes that have no responses or actions', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    prompt.text = '';
    prompt.branches = [];
    prompt.actions = null;

    const diagnostics = buildConversationDiagnostics({ conversationAsset, operationDefinitions: [] });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', title: 'Prompt node has no content or responses', nodeId: getId(prompt) }),
      ]),
    );
  });

  it('does not treat operation definition values as strict validation rules', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    prompt.actions = {
      ops: [
        makeAction('Start Conversation Custom', [
          makeStringArg('9cc71978b9c677fd26a37d5e'),
          makeStringArg('Dead Claim'),
          makeStringArg('Hunt that prospect'),
          makeIntArg(0),
          makeIntArg(1000),
        ]),
      ],
    };

    const diagnostics = buildConversationDiagnostics({
      conversationAsset,
      operationDefinitions: [
        makeDefinition('Start Conversation Custom', [
          { label: 'Conversation Id', types: ['string'] },
          { label: 'Conversation Header', types: ['string'] },
          { label: 'Conversation Sub Header', types: ['string'] },
          {
            label: 'Force Non-FP Conference Room',
            types: ['int'],
            values: [
              { text: 'False', value: 0 },
              { text: 'True', value: 1 },
            ],
          },
          {
            label: 'Dropship Exit Room',
            types: ['int'],
            values: [
              { text: 'DC Leopard Corridor', value: 110 },
              { text: 'DC Mech Bay', value: 200 },
            ],
          },
        ]),
      ],
    });

    expect(diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'warning', title: 'Operation input is outside the expected values', nodeId: getId(prompt) })]),
    );
  });

  it('reports an empty conversation sub header as info instead of a warning', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    const response = createResponseNode();
    response.responseText = 'Open the custom conversation.';
    response.actions = {
      ops: [makeAction('Start Conversation Custom', [makeStringArg('conversation_target'), makeStringArg('Dead Claim'), makeStringArg('')])],
    };
    prompt.branches = [response];

    const diagnostics = buildConversationDiagnostics({
      conversationAsset,
      operationDefinitions: [
        makeDefinition('Start Conversation Custom', [
          { label: 'Conversation Id', types: ['string'] },
          { label: 'Conversation Header', types: ['string'] },
          { label: 'Conversation Sub Header', types: ['string'] },
        ]),
      ],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'info', title: 'Operation input is empty', nodeId: getId(response) })]),
    );
    expect(diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'warning', title: 'Operation input is empty', nodeId: getId(response) })]),
    );
  });

  it('uses the runtime prompt node position for link target checks', () => {
    const conversationAsset = makeBasicConversation();
    const root = conversationAsset.conversation.roots[0];
    const target = createPromptNode(9);
    target.text = 'Runtime position one.';
    root.nextNodeIndex = 1;
    conversationAsset.conversation.nodes.push(target);

    const diagnostics = buildConversationDiagnostics({ conversationAsset, operationDefinitions: [] });

    expect(diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', title: 'Link target is missing', nodeId: getId(root) }),
      ]),
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', title: 'Prompt node index differs from its runtime position', nodeId: getId(target) }),
      ]),
    );
  });

  it('validates sideload conversation and entry node references against loaded conversations', () => {
    const conversationAsset = makeBasicConversation();
    const prompt = conversationAsset.conversation.nodes[0];
    prompt.actions = {
      ops: [makeAction('Sideload Conversation', [makeStringArg('conversation_missing'), makeStringArg('entry_missing'), makeIntArg(1)])],
    };

    const diagnostics = buildConversationDiagnostics({
      conversationAsset,
      operationDefinitions: [
        makeDefinition('Sideload Conversation', [
          { label: 'Conversation Id', types: ['string'] },
          { label: 'Entry Node Id', types: ['string'] },
          { label: 'Resume host after sideload finished', types: ['int'] },
        ]),
      ],
      loadedConversationAssets: [],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', title: 'Sideload conversation target is not loaded', nodeId: getId(prompt) }),
      ]),
    );
  });

  it('reports a missing sideload entry node when the conversation exists', () => {
    const conversationAsset = makeBasicConversation();
    const sideloadedConversation = createConversation('K:/Mods/Test/conversations');
    sideloadedConversation.conversation.idRef.id = 'conversation_target';
    const targetPrompt = createPromptNode(0);
    targetPrompt.text = 'Loaded.';
    sideloadedConversation.conversation.nodes = [targetPrompt];

    const prompt = conversationAsset.conversation.nodes[0];
    prompt.actions = {
      ops: [makeAction('Sideload Conversation', [makeStringArg('conversation_target'), makeStringArg('entry_missing'), makeIntArg(1)])],
    };

    const diagnostics = buildConversationDiagnostics({
      conversationAsset,
      operationDefinitions: [
        makeDefinition('Sideload Conversation', [
          { label: 'Conversation Id', types: ['string'] },
          { label: 'Entry Node Id', types: ['string'] },
          { label: 'Resume host after sideload finished', types: ['int'] },
        ]),
      ],
      loadedConversationAssets: [sideloadedConversation],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', title: 'Sideload entry node is missing', nodeId: getId(prompt) }),
      ]),
    );
  });
});
