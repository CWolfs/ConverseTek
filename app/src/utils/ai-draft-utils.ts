import { v4 as uuidv4 } from 'uuid';

import {
  AiAcceptedDraftType,
  AiBranchExpansionPatchType,
  AiConversationDraftType,
  AiDraftChoiceType,
  AiDraftModeType,
  AiDraftOperationIntentType,
  AiDraftValidationResultType,
  ConversationAssetType,
  ElementNodeType,
  OperationArgType,
  OperationCallType,
  OperationDefinitionType,
  PromptNodeType,
} from 'types';
import { createConversation, createPromptNode, createResponseNode, createRootNode, getId } from 'utils/conversation-utils';

const knownCastIds = new Set([
  'DariusDefault',
  'SumireDefault',
  'YangDefault',
  'FarahDefault',
  'KrakenIsabella',
  'BladesKai',
  'DEFAULT',
  'HOLOGRAM',
]);

export function parseAiDraft(draftJson: string): AiConversationDraftType {
  return JSON.parse(draftJson) as AiConversationDraftType;
}

export function validateAiDraft(
  draft: AiConversationDraftType | null,
  operations: OperationDefinitionType[],
  mode: AiDraftModeType,
): AiDraftValidationResultType {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft == null) {
    return { errors: ['No AI draft has been generated yet.'], warnings };
  }

  if (draft.mode !== mode) {
    errors.push(`Draft mode '${draft.mode}' does not match the requested mode '${mode}'.`);
  }

  if (!draft.title || draft.title.trim() === '') {
    errors.push('Draft title is blank.');
  }

  if (!Array.isArray(draft.nodes) || draft.nodes.length === 0) {
    errors.push('Draft has no prompt nodes.');
  }

  if (mode === 'fullConversation' && (!Array.isArray(draft.roots) || draft.roots.length === 0)) {
    errors.push('Full conversation drafts need at least one root choice.');
  }

  const nodeKeys = new Set<string>();
  draft.nodes?.forEach((node) => {
    if (node.key && node.key.trim() !== '') nodeKeys.add(node.key);
  });

  const seenNodeKeys = new Set<string>();
  draft.nodes?.forEach((node) => {
    if (!node.key || node.key.trim() === '') {
      errors.push('A prompt node has a blank key.');
    } else if (seenNodeKeys.has(node.key)) {
      errors.push(`Prompt node key '${node.key}' is duplicated.`);
    } else {
      seenNodeKeys.add(node.key);
    }

    if (!node.text || node.text.trim() === '') {
      warnings.push(`Prompt node '${node.key}' has blank text.`);
    }

    validateSpeaker(node.key, node.speaker, warnings);
    validateOperations(`node '${node.key}' actions`, node.actions, operations, errors);
    node.choices?.forEach((choice, index) => validateChoice(`node '${node.key}' choice ${index + 1}`, choice, nodeKeys, operations, errors, warnings));
  });

  draft.roots?.forEach((root, index) => validateChoice(`root ${index + 1}`, root, nodeKeys, operations, errors, warnings));
  draft.warnings?.forEach((warning) => warnings.push(`AI warning: ${warning}`));

  return { errors, warnings };
}

function validateSpeaker(nodeKey: string, speaker: { type: string; id: string }, warnings: string[]): void {
  if (speaker.type === 'none') return;

  if (!speaker.id || speaker.id.trim() === '') {
    warnings.push(`Prompt node '${nodeKey}' has a speaker type but no speaker id.`);
    return;
  }

  if (speaker.type === 'castId' && !knownCastIds.has(speaker.id)) {
    warnings.push(`Prompt node '${nodeKey}' uses unfamiliar cast id '${speaker.id}'.`);
  }
}

function validateChoice(
  label: string,
  choice: AiDraftChoiceType,
  nodeKeys: Set<string>,
  operations: OperationDefinitionType[],
  errors: string[],
  warnings: string[],
): void {
  if (!choice.text || choice.text.trim() === '') {
    warnings.push(`${label} has blank response text.`);
  }

  if (!choice.endsConversation && (!choice.targetKey || !nodeKeys.has(choice.targetKey))) {
    errors.push(`${label} points to missing target node '${choice.targetKey}'.`);
  }

  if (choice.endsConversation && choice.targetKey && choice.targetKey.trim() !== '') {
    warnings.push(`${label} ends the conversation and also has targetKey '${choice.targetKey}'. The ending will win.`);
  }

  validateOperations(`${label} conditions`, choice.conditions, operations, errors);
  validateOperations(`${label} actions`, choice.actions, operations, errors);
}

function validateOperations(
  label: string,
  intents: AiDraftOperationIntentType[] | null | undefined,
  operations: OperationDefinitionType[],
  errors: string[],
): void {
  if (!intents) return;

  intents.forEach((intent) => {
    const definition = operations.find((operation) => operation.key === intent.functionName);
    if (!definition) {
      errors.push(`${label} references unknown operation '${intent.functionName}'.`);
      return;
    }

    if (intent.args.length !== definition.inputs.length) {
      errors.push(`${label} operation '${intent.functionName}' has ${intent.args.length} args, expected ${definition.inputs.length}.`);
    }
  });
}

export function buildAcceptedDraft(
  draft: AiConversationDraftType,
  mode: AiDraftModeType,
  workingDirectory: string,
  activeNode: PromptNodeType | ElementNodeType | null,
): AiAcceptedDraftType {
  if (mode === 'fullConversation') {
    return {
      kind: 'fullConversation',
      conversationAsset: buildConversationAssetFromDraft(draft, workingDirectory),
    };
  }

  if (mode === 'nodeSuggestion') {
    return {
      kind: 'nodeText',
      text: getSuggestedNodeText(draft, activeNode),
    };
  }

  if (activeNode == null || activeNode.type === 'node') {
    throw Error('Branch expansion drafts must be accepted on a root or response node.');
  }

  return {
    kind: 'branchExpansion',
    patch: buildBranchExpansionPatch(draft, activeNode),
  };
}

export function buildConversationAssetFromDraft(draft: AiConversationDraftType, workingDirectory: string): ConversationAssetType {
  const conversationAsset = createConversation(workingDirectory);
  conversationAsset.conversation.uiName = draft.title || 'AI Draft Conversation';
  conversationAsset.filename = `${toFileStem(draft.title)}.${conversationAsset.conversation.idRef.id}.convo`;
  conversationAsset.filepath = `${workingDirectory}/${conversationAsset.filename}.bytes`;

  const nodes = buildPromptNodes(draft);
  const indexByKey = buildDraftIndexByKey(draft);
  conversationAsset.conversation.nodes = nodes;
  conversationAsset.conversation.roots = draft.roots.map((root) => buildElementNode(root, 'root', '0', nodes, indexByKey));

  return conversationAsset;
}

export function buildPreviewConversationAssetFromDraft(
  draft: AiConversationDraftType,
  mode: AiDraftModeType,
  workingDirectory: string,
  activeNode: PromptNodeType | ElementNodeType | null,
): ConversationAssetType | null {
  if (mode === 'nodeSuggestion') return null;
  if (mode === 'fullConversation') return buildConversationAssetFromDraft(draft, workingDirectory);

  const conversationAsset = createConversation(workingDirectory);
  conversationAsset.conversation.uiName = draft.title || 'AI Branch Draft';
  conversationAsset.filename = `${toFileStem(draft.title)}.${conversationAsset.conversation.idRef.id}.convo`;
  conversationAsset.filepath = `${workingDirectory}/${conversationAsset.filename}.bytes`;

  const nodes = buildPromptNodes(draft);
  const previewRoot = createRootNode();
  previewRoot.parentId = '0';
  previewRoot.responseText = getBranchPreviewRootText(activeNode);
  previewRoot.nextNodeIndex = nodes[0]?.index ?? -1;
  previewRoot.auxiliaryLink = false;

  if (nodes[0]) {
    nodes[0].parentId = getId(previewRoot);
  }

  conversationAsset.conversation.roots = [previewRoot];
  conversationAsset.conversation.nodes = nodes;

  return conversationAsset;
}

export function buildBranchExpansionPatch(draft: AiConversationDraftType, activeElementNode: ElementNodeType): AiBranchExpansionPatchType {
  if (activeElementNode.nextNodeIndex !== -1) {
    throw Error('The selected root or response already points to a prompt node. Clear it before accepting a branch expansion.');
  }

  const nodes = buildPromptNodes(draft);
  if (nodes.length === 0) {
    throw Error('The draft has no prompt nodes to attach.');
  }

  const parentElementNode = cloneElementNode(activeElementNode);
  parentElementNode.nextNodeIndex = nodes[0].index;
  parentElementNode.auxiliaryLink = false;
  nodes[0].parentId = getId(parentElementNode);

  return {
    parentElementNode,
    nodes,
  };
}

export function getSuggestedNodeText(draft: AiConversationDraftType, activeNode: PromptNodeType | ElementNodeType | null): string {
  if (activeNode?.type === 'node') {
    return draft.nodes[0]?.text || '';
  }

  return draft.roots[0]?.text || draft.nodes[0]?.choices[0]?.text || '';
}

function buildPromptNodes(draft: AiConversationDraftType): PromptNodeType[] {
  const indexByKey = buildDraftIndexByKey(draft);

  return draft.nodes.map((draftNode, index) => {
    const node = createPromptNode(index);
    node.text = draftNode.text;
    node.comment = draftNode.key;
    node.actions = buildOperationsContainer(draftNode.actions);

    if (draftNode.speaker.type === 'castId') {
      node.speakerType = 'castId';
      node.sourceInSceneRef = { id: draftNode.speaker.id };
      node.speakerOverrideId = '';
    } else if (draftNode.speaker.type === 'speakerId') {
      node.speakerType = 'speakerId';
      node.sourceInSceneRef = null;
      node.speakerOverrideId = draftNode.speaker.id;
    } else {
      node.speakerType = null;
      node.sourceInSceneRef = null;
      node.speakerOverrideId = '';
    }

    node.branches = draftNode.choices.map((choice) => buildElementNode(choice, 'response', getId(node), draft.nodes, indexByKey));
    return node;
  });
}

function buildDraftIndexByKey(draft: AiConversationDraftType): Map<string, number> {
  const indexByKey = new Map<string, number>();
  draft.nodes.forEach((node, index) => indexByKey.set(node.key, index));
  return indexByKey;
}

function buildElementNode(
  choice: AiDraftChoiceType,
  type: 'root' | 'response',
  parentId: string,
  nodes: PromptNodeType[] | AiConversationDraftType['nodes'],
  indexByKey?: Map<string, number>,
): ElementNodeType {
  const elementNode = type === 'root' ? createRootNode() : createResponseNode();
  const targetIndex = choice.endsConversation ? -1 : resolveTargetIndex(choice.targetKey, nodes, indexByKey);

  elementNode.type = type;
  elementNode.parentId = parentId;
  elementNode.responseText = choice.text;
  elementNode.nextNodeIndex = targetIndex;
  elementNode.auxiliaryLink = choice.auxiliaryLink;
  elementNode.conditions = buildOperationsContainer(choice.conditions);
  elementNode.actions = buildOperationsContainer(choice.actions);

  return elementNode;
}

function resolveTargetIndex(
  targetKey: string,
  nodes: PromptNodeType[] | AiConversationDraftType['nodes'],
  indexByKey?: Map<string, number>,
): number {
  if (!targetKey) return -1;
  if (indexByKey) return indexByKey.get(targetKey) ?? -1;

  const targetNode = (nodes as PromptNodeType[]).find((node) => getId(node) === targetKey || node.comment === targetKey);
  return targetNode?.index ?? -1;
}

function buildOperationsContainer(intents: AiDraftOperationIntentType[] | null | undefined): { ops: OperationCallType[] | null } | null {
  if (!intents || intents.length === 0) return null;
  return {
    ops: intents.map(buildOperationCall),
  };
}

function getBranchPreviewRootText(activeNode: PromptNodeType | ElementNodeType | null): string {
  if (activeNode != null && activeNode.type !== 'node' && activeNode.responseText.trim() !== '') {
    return activeNode.responseText;
  }

  return 'Preview attached branch';
}

function buildOperationCall(intent: AiDraftOperationIntentType): OperationCallType {
  return {
    functionName: intent.functionName,
    args: intent.args.map(buildOperationArg),
  };
}

function buildOperationArg(arg: { type: string; value: string | number | boolean | null }): OperationArgType {
  return {
    type: arg.type === 'bool' ? 'bool' : (arg.type as OperationArgType['type']),
    intValue: arg.type === 'int' ? Number(arg.value ?? 0) : 0,
    boolValue: arg.type === 'bool' ? Boolean(arg.value) : false,
    floatValue: arg.type === 'float' ? Number(arg.value ?? 0) : 0,
    stringValue: arg.type === 'string' ? String(arg.value ?? '') : '',
    callValue: null,
    variableRefValue: null,
  };
}

function cloneElementNode(node: ElementNodeType): ElementNodeType {
  return {
    ...node,
    idRef: { id: node.idRef.id },
    conditions: node.conditions == null ? null : { ops: node.conditions.ops == null ? null : node.conditions.ops.map((op) => ({ ...op })) },
    actions: node.actions == null ? null : { ops: node.actions.ops == null ? null : node.actions.ops.map((op) => ({ ...op })) },
  };
}

function toFileStem(title: string): string {
  const safeTitle = (title || 'ai-draft')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeTitle || `ai-draft-${uuidv4().slice(0, 8)}`;
}
