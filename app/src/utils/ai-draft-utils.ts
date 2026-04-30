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
  'castDef_DariusDefault',
  'SumireDefault',
  'castDef_SumireDefault',
  'YangDefault',
  'castDef_YangDefault',
  'FarahDefault',
  'castDef_FarahDefault',
  'KameaDefault',
  'castDef_KameaDefault',
  'MadeiraDefault',
  'castDef_MadeiraDefault',
  'KrakenIsabella',
  'BladesKai',
  'DEFAULT',
  'HOLOGRAM',
]);

const existingAliasStopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'can',
  'for',
  'from',
  'has',
  'have',
  'if',
  'in',
  'is',
  'it',
  'node',
  'of',
  'on',
  'or',
  'prompt',
  'should',
  'that',
  'the',
  'this',
  'to',
  'we',
  'what',
  'with',
  'you',
]);

type DraftBuildContext = {
  indexByKey: Map<string, number>;
  externalIndexByKey: Map<string, number>;
  externalIndexes: Set<number>;
  structuralParentByIndex: Map<number, string>;
};

type BranchExpansionBuildOptions = {
  existingNodes?: PromptNodeType[];
};

type AiDraftNodeType = AiConversationDraftType['nodes'][number];

export function parseAiDraft(draftJson: string): AiConversationDraftType {
  return JSON.parse(draftJson) as AiConversationDraftType;
}

export function validateAiDraft(
  draft: AiConversationDraftType | null,
  operations: OperationDefinitionType[],
  mode: AiDraftModeType,
  activeNode: PromptNodeType | ElementNodeType | null = null,
  existingConversationAsset: ConversationAssetType | null = null,
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

  if (mode === 'nodeSuggestion') {
    if (activeNode == null) {
      errors.push('Node suggestion drafts need a selected node.');
    }

    const suggestedTexts = getSuggestedNodeTexts(draft, activeNode);

    if (suggestedTexts[0]?.trim() !== '') {
      if (suggestedTexts.length < 3) {
        warnings.push(`Node suggestion draft returned ${suggestedTexts.length} version${suggestedTexts.length === 1 ? '' : 's'} instead of 3.`);
      }
    } else {
      errors.push('Node suggestion drafts need suggested text.');
    }

    draft.warnings?.forEach((warning) => warnings.push(`AI warning: ${warning}`));
    return { errors, warnings };
  }

  const structuralDraft = mode === 'branchExpansion' ? normaliseBranchExpansionDraft(draft) : draft;

  if (!Array.isArray(structuralDraft.nodes) || structuralDraft.nodes.length === 0) {
    errors.push('Draft has no prompt nodes.');
  }

  if (mode === 'fullConversation' && (!Array.isArray(structuralDraft.roots) || structuralDraft.roots.length === 0)) {
    errors.push('Full conversation drafts need at least one root choice.');
  }

  const nodeKeys = new Set<string>();
  structuralDraft.nodes?.forEach((node) => {
    if (node.key && node.key.trim() !== '') nodeKeys.add(node.key);
  });
  const externalTargetKeys =
    mode === 'branchExpansion' ? buildExistingTargetKeySet(existingConversationAsset?.conversation.nodes || [], structuralDraft.warnings || []) : new Set<string>();

  const seenNodeKeys = new Set<string>();
  structuralDraft.nodes?.forEach((node) => {
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
    node.choices?.forEach((choice, index) =>
      validateChoice(`node '${node.key}' choice ${index + 1}`, choice, nodeKeys, operations, errors, warnings, false, externalTargetKeys),
    );
  });

  if (mode === 'fullConversation') {
    structuralDraft.roots?.forEach((root, index) =>
      validateChoice(`root ${index + 1}`, root, nodeKeys, operations, errors, warnings, index === 0),
    );
  } else if (mode === 'branchExpansion' && activeNode?.type === 'node') {
    const promptChoice = getBranchExpansionPromptChoice(structuralDraft);
    if (promptChoice != null) {
      validateOperations('branch expansion response conditions', promptChoice.conditions, operations, errors);
      validateOperations('branch expansion response actions', promptChoice.actions, operations, errors);
    }
  }
  structuralDraft.warnings?.forEach((warning) => {
    if (mode === 'branchExpansion' && isTargetMappingWarning(warning)) return;
    warnings.push(`AI warning: ${warning}`);
  });

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
  allowBlankText = false,
  externalTargetKeys: Set<string> = new Set<string>(),
): void {
  const targetKey = choice.targetKey?.trim() || '';
  const isBlankContinueChoice = !choice.endsConversation && targetKey !== '';

  if (!allowBlankText && !isBlankContinueChoice && (!choice.text || choice.text.trim() === '')) {
    warnings.push(`${label} has blank response text.`);
  }

  if (!choice.endsConversation && (!targetKey || (!nodeKeys.has(targetKey) && !externalTargetKeys.has(targetKey)))) {
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
  selectedSuggestionIndex = 0,
  existingConversationAsset: ConversationAssetType | null = null,
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
      text: getSuggestedNodeText(draft, activeNode, selectedSuggestionIndex),
      versionIndex: selectedSuggestionIndex,
    };
  }

  if (activeNode == null) {
    throw Error('Branch expansion drafts need a selected prompt, root, or response node.');
  }

  return {
    kind: 'branchExpansion',
    patch: buildBranchExpansionPatch(draft, activeNode, { existingNodes: existingConversationAsset?.conversation.nodes || [] }),
  };
}

export function buildConversationAssetFromDraft(draft: AiConversationDraftType, workingDirectory: string): ConversationAssetType {
  const conversationAsset = createConversation(workingDirectory);
  conversationAsset.conversation.uiName = draft.title || 'AI Draft Conversation';
  conversationAsset.filename = `${toFileStem(draft.title)}.${conversationAsset.conversation.idRef.id}.convo`;
  conversationAsset.filepath = `${workingDirectory}/${conversationAsset.filename}.bytes`;

  const context = createDraftBuildContext(draft);
  const nodes = buildPromptNodeShells(draft);
  conversationAsset.conversation.nodes = nodes;
  conversationAsset.conversation.roots = draft.roots.map((root, index) =>
    buildElementNode(root, 'root', '0', nodes, context, index === 0),
  );
  populatePromptNodeBranches(draft, nodes, context);

  return conversationAsset;
}

export function buildPreviewConversationAssetFromDraft(
  draft: AiConversationDraftType,
  mode: AiDraftModeType,
  workingDirectory: string,
  activeNode: PromptNodeType | ElementNodeType | null,
  existingConversationAsset: ConversationAssetType | null = null,
): ConversationAssetType | null {
  if (mode === 'nodeSuggestion') return null;
  if (mode === 'fullConversation') return buildConversationAssetFromDraft(draft, workingDirectory);

  const conversationAsset = createConversation(workingDirectory);
  const structuralDraft = mode === 'branchExpansion' ? normaliseBranchExpansionDraft(draft) : draft;
  conversationAsset.conversation.uiName = structuralDraft.title || 'AI Branch Draft';
  conversationAsset.filename = `${toFileStem(structuralDraft.title)}.${conversationAsset.conversation.idRef.id}.convo`;
  conversationAsset.filepath = `${workingDirectory}/${conversationAsset.filename}.bytes`;

  const existingNodes = mode === 'branchExpansion' ? existingConversationAsset?.conversation.nodes || [] : [];
  const startIndex = getNextPromptNodeIndex(existingNodes);
  const context = createDraftBuildContext(structuralDraft, existingNodes, startIndex);
  const nodes = buildPromptNodeShells(structuralDraft, startIndex);

  if (mode === 'branchExpansion' && activeNode?.type === 'node') {
    const patch = buildBranchExpansionPatch(structuralDraft, activeNode, { existingNodes });
    const previewPromptNode = clonePromptNodeForPreview(activeNode, patch.parentElementNode);
    conversationAsset.conversation.roots = [];
    conversationAsset.conversation.nodes = [previewPromptNode, ...patch.nodes];
    return conversationAsset;
  }

  const previewRoot = createRootNode();
  previewRoot.parentId = '0';
  previewRoot.responseText = getBranchPreviewRootText(activeNode);
  previewRoot.nextNodeIndex = nodes[0]?.index ?? -1;
  previewRoot.auxiliaryLink = false;

  if (nodes[0]) {
    nodes[0].parentId = getId(previewRoot);
  }

  conversationAsset.conversation.roots = [previewRoot];
  if (nodes[0]) {
    context.structuralParentByIndex.set(nodes[0].index, getId(previewRoot));
  }
  populatePromptNodeBranches(draft, nodes, context);
  conversationAsset.conversation.nodes = nodes;

  return conversationAsset;
}

export function buildBranchExpansionPatch(
  draft: AiConversationDraftType,
  activeNode: PromptNodeType | ElementNodeType,
  options: BranchExpansionBuildOptions = {},
): AiBranchExpansionPatchType {
  const structuralDraft = normaliseBranchExpansionDraft(draft);
  if (activeNode.type !== 'node' && activeNode.nextNodeIndex !== -1) {
    throw Error('The selected root or response already points to a prompt node. Clear it before accepting a branch expansion.');
  }

  const existingNodes = options.existingNodes || [];
  const startIndex = getNextPromptNodeIndex(existingNodes);
  const context = createDraftBuildContext(structuralDraft, existingNodes, startIndex);
  const nodes = buildPromptNodeShells(structuralDraft, startIndex);
  if (nodes.length === 0) {
    throw Error('The draft has no prompt nodes to attach.');
  }

  const parentElementNode =
    activeNode.type === 'node'
      ? buildPromptBranchResponse(structuralDraft, activeNode, nodes, context)
      : cloneElementNode(activeNode);

  if (activeNode.type !== 'node') {
    parentElementNode.nextNodeIndex = nodes[0].index;
    parentElementNode.auxiliaryLink = false;
    nodes[0].parentId = getId(parentElementNode);
    context.structuralParentByIndex.set(nodes[0].index, getId(parentElementNode));
  }

  populatePromptNodeBranches(structuralDraft, nodes, context);

  return {
    parentElementNode,
    nodes,
  };
}

export function getSuggestedNodeText(
  draft: AiConversationDraftType,
  activeNode: PromptNodeType | ElementNodeType | null,
  selectedSuggestionIndex = 0,
): string {
  return getSuggestedNodeTexts(draft, activeNode)[selectedSuggestionIndex] || '';
}

export function getSuggestedNodeTexts(draft: AiConversationDraftType, activeNode: PromptNodeType | ElementNodeType | null): string[] {
  if (activeNode?.type === 'node') {
    return (draft.nodes || []).map((node) => node.text || '').filter((text) => text.trim() !== '');
  }

  const rootTexts = (draft.roots || []).map((root) => root.text || '').filter((text) => text.trim() !== '');
  if (rootTexts.length > 0) return rootTexts;

  return (draft.nodes || [])
    .flatMap((node) => node.choices || [])
    .map((choice) => choice.text || '')
    .filter((text) => text.trim() !== '');
}

export function getOriginalNodeText(activeNode: PromptNodeType | ElementNodeType | null): string {
  if (activeNode?.type === 'node') return activeNode.text || '';
  return activeNode?.responseText || '';
}

function createDraftBuildContext(draft: AiConversationDraftType, existingNodes: PromptNodeType[] = [], startIndex = 0): DraftBuildContext {
  return {
    indexByKey: buildDraftIndexByKey(draft, startIndex),
    externalIndexByKey: buildExistingTargetIndex(existingNodes, draft.warnings || []),
    externalIndexes: new Set(existingNodes.map((node) => node.index)),
    structuralParentByIndex: new Map<number, string>(),
  };
}

function buildPromptNodeShells(draft: AiConversationDraftType, startIndex = 0): PromptNodeType[] {
  return draft.nodes.map((draftNode, index) => {
    const node = createPromptNode(startIndex + index);
    node.text = draftNode.text;
    node.comment = normaliseDraftComment(draftNode.comment);
    node.actions = buildOperationsContainer(draftNode.actions);

    if (draftNode.speaker.type === 'castId') {
      node.sourceInSceneRef = { id: draftNode.speaker.id };
      node.speakerOverrideId = '';
    } else if (draftNode.speaker.type === 'speakerId') {
      node.sourceInSceneRef = null;
      node.speakerOverrideId = draftNode.speaker.id;
    } else {
      node.sourceInSceneRef = null;
      node.speakerOverrideId = '';
    }

    return node;
  });
}

function populatePromptNodeBranches(draft: AiConversationDraftType, nodes: PromptNodeType[], context: DraftBuildContext): void {
  draft.nodes.forEach((draftNode, index) => {
    nodes[index].branches = draftNode.choices.map((choice) => buildElementNode(choice, 'response', getId(nodes[index]), nodes, context));
  });
}

function normaliseBranchExpansionDraft(draft: AiConversationDraftType): AiConversationDraftType {
  const redirectByKey = new Map<string, string>();
  draft.nodes.forEach((node) => {
    if (isBlankConnectorDraftNode(node)) {
      redirectByKey.set(node.key, node.choices[0].targetKey);
    }
  });

  if (redirectByKey.size === 0) return draft;

  return {
    ...draft,
    roots: draft.roots.map((root) => rewriteDraftChoiceTarget(root, redirectByKey)),
    nodes: draft.nodes
      .filter((node) => !redirectByKey.has(node.key))
      .map((node) => ({
        ...node,
        choices: node.choices.map((choice) => rewriteDraftChoiceTarget(choice, redirectByKey)),
      })),
  };
}

function isBlankConnectorDraftNode(node: AiDraftNodeType): boolean {
  if (node.text?.trim() !== '') return false;
  if ((node.actions || []).length > 0) return false;
  if ((node.choices || []).length !== 1) return false;

  const onlyChoice = node.choices[0];
  return !onlyChoice.endsConversation && (onlyChoice.conditions || []).length === 0 && (onlyChoice.actions || []).length === 0;
}

function rewriteDraftChoiceTarget(choice: AiDraftChoiceType, redirectByKey: Map<string, string>): AiDraftChoiceType {
  return {
    ...choice,
    targetKey: resolveDraftTargetAlias(choice.targetKey, redirectByKey),
  };
}

function resolveDraftTargetAlias(targetKey: string, redirectByKey: Map<string, string>): string {
  let resolvedTargetKey = targetKey;
  const visitedKeys = new Set<string>();

  while (redirectByKey.has(resolvedTargetKey) && !visitedKeys.has(resolvedTargetKey)) {
    visitedKeys.add(resolvedTargetKey);
    resolvedTargetKey = redirectByKey.get(resolvedTargetKey) || resolvedTargetKey;
  }

  return resolvedTargetKey;
}

function buildDraftIndexByKey(draft: AiConversationDraftType, startIndex = 0): Map<string, number> {
  const indexByKey = new Map<string, number>();
  draft.nodes.forEach((node, index) => indexByKey.set(node.key, startIndex + index));
  return indexByKey;
}

function buildExistingTargetIndex(existingNodes: PromptNodeType[], targetMappingWarnings: string[] = []): Map<string, number> {
  const indexByKey = new Map<string, number>();
  existingNodes.forEach((node) => {
    const nodeId = getId(node);
    addExistingTargetKey(indexByKey, nodeId, node.index);
    addExistingTargetKey(indexByKey, node.idRef?.id, node.index);
    addExistingTargetKey(indexByKey, String(node.index), node.index);
    addExistingTargetKey(indexByKey, `node_${node.index}`, node.index);
    addExistingTargetKey(indexByKey, `existing_node_${node.index}`, node.index);
    addExistingTargetKey(indexByKey, `existing_${nodeId}`, node.index);
    addExistingTargetKey(indexByKey, `existing_node_${nodeId}`, node.index);
    addExistingTargetKey(indexByKey, node.idRef?.id ? `existing_${node.idRef.id}` : null, node.index);
    addExistingTargetKey(indexByKey, node.idRef?.id ? `existing_node_${node.idRef.id}` : null, node.index);
    addExistingTargetKey(indexByKey, node.comment, node.index);
  });

  addDerivedExistingTargetAliases(indexByKey, existingNodes);
  addTargetMappingWarningAliases(indexByKey, existingNodes, targetMappingWarnings);
  return indexByKey;
}

function buildExistingTargetKeySet(existingNodes: PromptNodeType[], targetMappingWarnings: string[] = []): Set<string> {
  return new Set(buildExistingTargetIndex(existingNodes, targetMappingWarnings).keys());
}

function addExistingTargetKey(indexByKey: Map<string, number>, key: string | null | undefined, index: number): void {
  const normalisedKey = key?.trim();
  if (!normalisedKey) return;
  if (!indexByKey.has(normalisedKey)) indexByKey.set(normalisedKey, index);
}

function addDerivedExistingTargetAliases(indexByKey: Map<string, number>, existingNodes: PromptNodeType[]): void {
  const aliasCandidates = new Map<string, Set<number>>();

  existingNodes.forEach((node) => {
    const sourceTexts = [node.text, node.comment].filter(Boolean) as string[];
    sourceTexts.forEach((sourceText) => {
      const slug = toExistingAliasSlug(sourceText);
      addDerivedExistingAliasCandidate(aliasCandidates, slug, node.index);

      getExistingAliasTokens(sourceText).forEach((token) => {
        addDerivedExistingAliasCandidate(aliasCandidates, token, node.index);
        addDerivedExistingAliasCandidate(aliasCandidates, `${token}_followup`, node.index);
        addDerivedExistingAliasCandidate(aliasCandidates, `${token}_follow_up`, node.index);
      });
    });
  });

  aliasCandidates.forEach((indexes, alias) => {
    if (indexes.size !== 1) return;
    const [index] = Array.from(indexes);
    addExistingTargetKey(indexByKey, alias, index);
    addExistingTargetKey(indexByKey, `existing_${alias}`, index);
    addExistingTargetKey(indexByKey, `existing_node_${alias}`, index);
  });
}

function addDerivedExistingAliasCandidate(aliasCandidates: Map<string, Set<number>>, alias: string, index: number): void {
  if (!alias) return;
  if (!aliasCandidates.has(alias)) aliasCandidates.set(alias, new Set<number>());
  aliasCandidates.get(alias)?.add(index);
}

function toExistingAliasSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function getExistingAliasTokens(value: string): string[] {
  return Array.from(
    new Set(
      toExistingAliasSlug(value)
        .split('_')
        .filter((token) => token.length >= 4 && !existingAliasStopWords.has(token)),
    ),
  );
}

function getNextPromptNodeIndex(existingNodes: PromptNodeType[]): number {
  if (existingNodes.length === 0) return 0;
  return Math.max(...existingNodes.map((node) => node.index)) + 1;
}

function addTargetMappingWarningAliases(indexByKey: Map<string, number>, existingNodes: PromptNodeType[], warnings: string[]): void {
  warnings.forEach((warning) => {
    extractTargetMappingAliases(warning).forEach(({ alias, index }) => {
      if (existingNodes.some((node) => node.index === index)) {
        addExistingTargetKey(indexByKey, alias, index);
      }
    });
  });
}

function extractTargetMappingAliases(warning: string): { alias: string; index: number }[] {
  const aliases: { alias: string; index: number }[] = [];
  const aliasToIndexPattern = /(?:targetKey\s+|Target key\s+)?'?([A-Za-z][A-Za-z0-9_-]*)'?\s+(?:is intended to link to|to)\s+[^.]*?\bindex\s+(\d+)/gi;
  let match = aliasToIndexPattern.exec(warning);

  while (match != null) {
    aliases.push({ alias: match[1], index: Number(match[2]) });
    match = aliasToIndexPattern.exec(warning);
  }

  return aliases;
}

function isTargetMappingWarning(warning: string): boolean {
  if (extractTargetMappingAliases(warning).length > 0) return true;
  if (/\bexisting_[A-Za-z0-9-]{8,}\b/i.test(warning) && /\b(target|key|refer|existing prompt|existing conversation node|id)\b/i.test(warning)) return true;
  return /\bexisting_node_\d+\b/i.test(warning) && /\b(target|key|map|refer|existing conversation node|index)/i.test(warning);
}

function buildElementNode(
  choice: AiDraftChoiceType,
  type: 'root' | 'response',
  parentId: string,
  nodes: PromptNodeType[],
  context: DraftBuildContext,
  forceBlankText = false,
): ElementNodeType {
  const elementNode = type === 'root' ? createRootNode() : createResponseNode();
  const targetIndex = choice.endsConversation ? -1 : resolveTargetIndex(choice.targetKey, nodes, context);
  const isExternalTarget = targetIndex !== -1 && context.externalIndexes.has(targetIndex);
  const hasStructuralParent = targetIndex !== -1 && context.structuralParentByIndex.has(targetIndex);
  const useAuxiliaryLink = targetIndex !== -1 && (choice.auxiliaryLink || hasStructuralParent || isExternalTarget);

  elementNode.type = type;
  elementNode.parentId = parentId;
  elementNode.responseText = forceBlankText ? '' : choice.text;
  elementNode.comment = normaliseDraftComment(choice.comment);
  elementNode.nextNodeIndex = targetIndex;
  elementNode.auxiliaryLink = useAuxiliaryLink;
  elementNode.conditions = buildOperationsContainer(choice.conditions);
  elementNode.actions = buildOperationsContainer(choice.actions);

  if (targetIndex !== -1 && !useAuxiliaryLink) {
    context.structuralParentByIndex.set(targetIndex, getId(elementNode));
    const targetNode = nodes.find((node) => node.index === targetIndex);
    if (targetNode) targetNode.parentId = getId(elementNode);
  }

  return elementNode;
}

function resolveTargetIndex(
  targetKey: string,
  nodes: PromptNodeType[],
  context: DraftBuildContext,
): number {
  if (!targetKey) return -1;
  const normalisedTargetKey = targetKey.trim();
  const indexByDraftKey = context.indexByKey.get(normalisedTargetKey);
  if (indexByDraftKey !== undefined) return indexByDraftKey;

  const indexByExistingKey = context.externalIndexByKey.get(normalisedTargetKey);
  if (indexByExistingKey !== undefined) return indexByExistingKey;

  const targetNode = nodes.find((node) => getId(node) === normalisedTargetKey || node.comment === normalisedTargetKey);
  return targetNode?.index ?? -1;
}

function normaliseDraftComment(comment: string | null | undefined): string {
  if (!comment) return '';
  return comment.trim();
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

function buildPromptBranchResponse(
  draft: AiConversationDraftType,
  activePromptNode: PromptNodeType,
  nodes: PromptNodeType[],
  context: DraftBuildContext,
): ElementNodeType {
  const firstDraftNodeKey = draft.nodes[0]?.key || '';
  const promptChoice = getBranchExpansionPromptChoice(draft);
  const attachChoice: AiDraftChoiceType = {
    text: getBranchExpansionResponseText(draft),
    comment: promptChoice?.comment || getBranchExpansionResponseComment(draft),
    targetKey: firstDraftNodeKey,
    endsConversation: false,
    auxiliaryLink: false,
    conditions: promptChoice?.conditions || [],
    actions: promptChoice?.actions || [],
  };

  return buildElementNode(attachChoice, 'response', getId(activePromptNode), nodes, context);
}

function getBranchExpansionPromptChoice(draft: AiConversationDraftType): AiDraftChoiceType | null {
  return (draft.roots || []).find((root) => root?.text?.trim() !== '') || null;
}

function getBranchExpansionResponseText(draft: AiConversationDraftType): string {
  const rootText = getBranchExpansionPromptChoice(draft)?.text?.trim();
  if (rootText) return rootText;

  const titleText = normaliseResponseFallback(draft.title);
  if (titleText) return titleText;

  const summaryText = normaliseResponseFallback(draft.summary);
  if (summaryText) return summaryText;

  return 'Open new branch';
}

function getBranchExpansionResponseComment(draft: AiConversationDraftType): string {
  return normaliseDraftComment(draft.summary) || 'AI-generated response choice for the expanded branch.';
}

function normaliseResponseFallback(value: string | null | undefined): string {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return '';

  const firstSentence = trimmedValue.split(/[.!?]/)[0]?.trim() || trimmedValue;
  return firstSentence.length > 48 ? `${firstSentence.slice(0, 45).trim()}...` : firstSentence;
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

function clonePromptNodeForPreview(node: PromptNodeType, generatedResponse: ElementNodeType): PromptNodeType {
  return {
    ...node,
    type: 'node',
    idRef: { id: node.idRef.id },
    parentId: '0',
    branches: [generatedResponse],
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
