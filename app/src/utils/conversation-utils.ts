/* eslint-disable import/extensions */
import { v4 as uuidv4 } from 'uuid';
import md5 from 'md5';
import findIndex from 'lodash.findindex';
import sortBy from 'lodash.sortby';
import range from 'lodash.range';
import difference from 'lodash.difference';
import forEachRight from 'lodash.foreachright';

import { ConversationAssetType, IdRef } from 'types/ConversationAssetType';
import { NodeType } from 'types/NodeType';
import { NodeLinkType } from 'types/NodeLinkType';

import { dataStore } from '../stores';

/* eslint-disable no-param-reassign, no-return-assign */
export function generateId(): string {
  return `9c${md5(uuidv4()).slice(10)}`;
}

export function regenerateNodeIds(conversationAsset: ConversationAssetType): void {
  conversationAsset.conversation.roots.forEach((root) => (root.idRef.id = generateId()));
  conversationAsset.conversation.nodes.forEach((node) => {
    node.idRef.id = generateId();
    node.branches.forEach((branch) => (branch.idRef.id = generateId()));
  });
}

export function regenerateConversationId(conversationAsset: ConversationAssetType): void {
  dataStore.setConversationId(conversationAsset, generateId());
}

/*
  Ids in the official conversation conversation files are inconsistent.
  Sometimes they are `conversationId:id` and sometimes they are just `id`
  These methods display only the latter `id` but maintain the full ids on
  those that use them
*/
export function getId(idContainer: IdRef | { idRef: IdRef }): string {
  let id: string | null = null;
  if (idContainer == null) return '-1';

  if (typeof idContainer === 'object' && 'id' in idContainer) {
    id = idContainer.id;
  } else {
    id = idContainer.idRef.id;
  }

  return id.split(':')[1] || id;
}

export function createId(idRef: IdRef, newId: string): string {
  const { id } = idRef;

  // strip any colons - this is a special character for ids
  if (newId.includes(':')) newId.replace(':', '');

  if (id.includes(':')) {
    const builtId = id.split(':')[0];
    return `${builtId}:${newId}`;
  }

  return newId;
}

export function createConversation(filePath: string): ConversationAssetType {
  const id = generateId();
  const fileName = `${id}.convo`;
  const conversation: ConversationAssetType = {
    filename: fileName,
    filepath: `${filePath}/${fileName}.bytes`,
    conversation: {
      idRef: {
        id,
      },
      uiName: 'Unnamed-Conversation',
      nodes: [],
      roots: [],
      defaultSpeakerId: '',
      defaultSpeakerOverride: null,
      persistentConversation: false,
      speakerOverrideId: '',
    },
  };

  return conversation;
}

export function createRoot(): NodeLinkType {
  return {
    type: 'root',
    responseText: '',
    conditions: null,
    actions: null,
    nextNodeIndex: -1,
    hideIfUnavailable: true,
    onlyOnce: false,
    idRef: {
      id: generateId(),
    },
    inputBypass: false,
    auxiliaryLink: false,
    comment: '',
  };
}

export function createNode(index: number): NodeType {
  return {
    type: 'node',
    idRef: {
      id: generateId(),
    },
    index,
    text: '',
    branches: [],
    nodeType: 1,
    truthValue: false,
    autoFollowBranchDelay: 1,
    inputMaxLength: 0,
    sourceTopicRef: null,
    subjectTopicRefs: [],
    sourceInSceneRef: null,
    sourceWithTagInScene: null,
    overrideSpeaker: null,
    speakerOverrideId: '',
    actions: null,
    comment: '',
    speakerType: null,
  };
}

export function createResponse(): NodeLinkType {
  return {
    type: 'response',
    responseText: '',
    conditions: null,
    actions: null,
    nextNodeIndex: -1,
    hideIfUnavailable: true,
    onlyOnce: false,
    idRef: {
      id: generateId(),
    },
    inputBypass: false,
    auxiliaryLink: false,
    comment: '',
  };
}

export function consolidateSpeaker(conversationAsset: ConversationAssetType): void {
  const { nodes } = conversationAsset.conversation;
  nodes.forEach((node) => {
    const { speakerType } = node;
    if (speakerType === 'speakerId') {
      node.sourceInSceneRef = null;
    }
  });
}

export function fillIndexGaps(conversationAsset: ConversationAssetType): void {
  const { nodes } = conversationAsset.conversation;
  const usedIndexes: number[] = [];
  const nodesToRemove: number[] = [];

  // Remove all padding nodes first
  nodes.forEach((node, position) => {
    const { index } = node;
    if (index === -1) nodesToRemove.push(position);
  });

  forEachRight(nodesToRemove, (position) => {
    nodes.splice(position, 1);
  });

  // Fill gaps as reqiured with new padding
  nodes.forEach((node) => {
    const { index } = node;
    usedIndexes.push(index);
  });

  const sortedIndexes = sortBy(usedIndexes);
  const rangeIndexes = range(sortedIndexes[sortedIndexes.length - 1]);
  const indexGaps = difference(rangeIndexes, sortedIndexes);

  indexGaps.forEach((index) => {
    nodes.splice(index, 0, createNode(-1));
  });
}

export function updateRoot(conversationAsset: ConversationAssetType, root: NodeLinkType): void {
  const { roots } = conversationAsset.conversation;
  const index = findIndex(roots, (r) => getId(r) === getId(root));

  if (index === -1) {
    roots.push(root);
  } else {
    roots[index] = root;
  }
}

export function updateNode(conversationAsset: ConversationAssetType, node: NodeType): void {
  const { nodes } = conversationAsset.conversation;
  const index = findIndex(nodes, (n) => getId(n) === getId(node));

  if (index === -1) {
    nodes.push(node);
  } else {
    nodes[index] = node;
  }
}

export function addNodes(conversationAsset: ConversationAssetType, newNodes: NodeType[]): void {
  const { nodes } = conversationAsset.conversation;
  newNodes.forEach((node) => nodes.push(node));
}

export function updateResponse(conversationAsset: ConversationAssetType, parentNode: NodeType, response: NodeLinkType): void {
  const { nodes } = conversationAsset.conversation;

  const branchIndex = findIndex(parentNode.branches, (b) => getId(b) === getId(response));
  if (branchIndex === -1) {
    parentNode.branches.push(response);
  } else {
    parentNode.branches[branchIndex] = response;
  }

  const parentNodeIndex = findIndex(nodes, (n) => getId(n) === getId(parentNode));
  if (parentNodeIndex === -1) {
    nodes.push(parentNode);
  } else {
    nodes[parentNodeIndex] = parentNode;
  }
}

export function setRoots(conversationAsset: ConversationAssetType, roots: NodeLinkType[]): void {
  // const { roots: conversationRoots } = conversationAsset.conversation;
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  // conversationRoots.replace(roots);

  // TODO: Keep an eye on this. It might break something related to mobx reactions
  const { conversation } = conversationAsset;
  conversation.roots = [...roots];
}

export function setResponses(conversationAsset: ConversationAssetType, parentNode: NodeType, responses: NodeLinkType[]): void {
  const { nodes } = conversationAsset.conversation;
  const parentNodeIndex = findIndex(nodes, (n) => getId(n) === getId(parentNode));

  // TODO: Keep an eye on this. It might break something related to mobx reactions
  // nodes[parentNodeIndex].branches.replace(responses);
  nodes[parentNodeIndex].branches = [...responses];
}

export function getIndexFromId(values: (IdRef | { idRef: IdRef })[], value: string) {
  return findIndex(values, (n) => getId(n) === value);
}
