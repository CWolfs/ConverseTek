/* eslint-disable import/extensions */
import { v4 as uuidv4 } from 'uuid';
import md5 from 'md5';
import findIndex from 'lodash.findindex';
import sortBy from 'lodash.sortby';
import range from 'lodash.range';
import difference from 'lodash.difference';
import forEachRight from 'lodash.foreachright';

import { ElementNodeType, PromptNodeType, ConversationAssetType, IdRef } from 'types';

import { dataStore } from '../stores';

/* eslint-disable no-param-reassign, no-return-assign */
export function generateId(): string {
  return `9c${md5(uuidv4()).slice(10)}`;
}

export function regenerateNodeIds(conversationAsset: ConversationAssetType): void {
  conversationAsset.conversation.roots.forEach((root) => (root.idRef.id = generateId()));
  conversationAsset.conversation.nodes.forEach((node) => {
    node.idRef.id = generateId();
    node.branches.forEach((elementNode: ElementNodeType) => (elementNode.idRef.id = generateId()));
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

export function createRootNode(): ElementNodeType {
  return {
    type: 'root',
    parentId: '-1',
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

export function createPromptNode(index: number): PromptNodeType {
  return {
    type: 'node',
    idRef: {
      id: generateId(),
    },
    parentId: '-1',
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

export function createResponseNode(): ElementNodeType {
  return {
    type: 'response',
    parentId: '-1',
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

/**
 * Scan through all the nodes (roots, prompt nodes and their response branche nodes) and their respective indexes in the node array
 * Reassign the node index to match their order in the conversatio node array and update all nextNodeIndex in ElementNodeTypes to reflect this change
 * @param conversationAsset
 */
export function rebuildNodeIndexes(conversationAsset: ConversationAssetType) {
  const oldPromptNodeIndexToNewIndex = new Map<number, number>();
  const { nodes, roots } = conversationAsset.conversation;

  // scan through all nodes are process them
  nodes.forEach((node: PromptNodeType, nodeArrayIndex: number) => {
    if (!oldPromptNodeIndexToNewIndex.has(node.index)) {
      const { index: previousNodeIndex } = node;

      oldPromptNodeIndexToNewIndex.set(previousNodeIndex, nodeArrayIndex);
      node.index = nodeArrayIndex;
    }
  });

  // Now that all prompt nodes are rebuilt, reassign them to the branches
  nodes.forEach((node: PromptNodeType) => {
    const { branches } = node;

    branches.forEach((responseNode: ElementNodeType) => {
      const { nextNodeIndex } = responseNode;

      // No need to rebuild responses that don't connect to anywhere
      if (nextNodeIndex !== -1) {
        if (oldPromptNodeIndexToNewIndex.has(nextNodeIndex)) {
          responseNode.nextNodeIndex = oldPromptNodeIndexToNewIndex.get(nextNodeIndex) as number;
        } else {
          console.error('Response node', responseNode, ' has no mapped nextNodeIndex. This should not happen when saving.');
        }
      }
    });
  });

  // scan through all roots and process them
  roots.forEach((rootNode: ElementNodeType) => {
    const { nextNodeIndex } = rootNode;

    // No need to rebuild roots that don't connect to anywhere
    if (nextNodeIndex !== -1) {
      if (oldPromptNodeIndexToNewIndex.has(nextNodeIndex)) {
        rootNode.nextNodeIndex = oldPromptNodeIndexToNewIndex.get(nextNodeIndex) as number;
      } else {
        console.error('Root node ', rootNode, ' has no mapped nextNodeIndex. This should not happen when saving.');
      }
    }
  });
}

/**
 * This method exists to fix old conversations created with v1.3.3 or older of ConverseTek
 * It removes the old filler nodes that were an attempt to fix the old save issue
 * @param conversationAsset
 */
export function removeAllOldFillerNodes(conversationAsset: ConversationAssetType): void {
  const { nodes } = conversationAsset.conversation;
  const nodesToRemove: number[] = [];

  // Remove all padding nodes first
  nodes.forEach((node, position) => {
    const { index } = node;
    if (index === -1) nodesToRemove.push(position);
  });

  forEachRight(nodesToRemove, (position) => {
    nodes.splice(position, 1);
  });
}

export function updateRootNode(conversationAsset: ConversationAssetType, root: ElementNodeType): void {
  const { roots } = conversationAsset.conversation;
  const index = findIndex(roots, (r) => getId(r) === getId(root));

  if (index === -1) {
    roots.push(root);
  } else {
    roots[index] = root;
  }
}

export function updatePromptNode(conversationAsset: ConversationAssetType, node: PromptNodeType): void {
  const { nodes } = conversationAsset.conversation;
  const index = findIndex(nodes, (n) => getId(n) === getId(node));

  if (index === -1) {
    nodes.push(node);
  } else {
    nodes[index] = node;
  }
}

export function addNodes(conversationAsset: ConversationAssetType, newNodes: PromptNodeType[]): void {
  const { nodes } = conversationAsset.conversation;
  newNodes.forEach((node: PromptNodeType) => nodes.push(node));
}

export function updateResponseNode(conversationAsset: ConversationAssetType, parentNode: PromptNodeType, responseNode: ElementNodeType): void {
  const { nodes } = conversationAsset.conversation;

  const branchIndex = findIndex(parentNode.branches, (b) => getId(b) === getId(responseNode));
  if (branchIndex === -1) {
    parentNode.branches.push(responseNode);
  } else {
    parentNode.branches[branchIndex] = responseNode;
  }

  const parentNodeIndex = findIndex(nodes, (n) => getId(n) === getId(parentNode));
  if (parentNodeIndex === -1) {
    nodes.push(parentNode);
  } else {
    nodes[parentNodeIndex] = parentNode;
  }
}

export function setRootNodes(conversationAsset: ConversationAssetType, roots: ElementNodeType[]): void {
  // const { roots: conversationRoots } = conversationAsset.conversation;
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  // conversationRoots.replace(roots);

  // TODO: Keep an eye on this. It might break something related to mobx reactions
  const { conversation } = conversationAsset;
  conversation.roots = [...roots];
}

export function setResponseNodes(conversationAsset: ConversationAssetType, parentNode: PromptNodeType, responses: ElementNodeType[]): void {
  const { nodes } = conversationAsset.conversation;
  const parentNodeIndex = findIndex(nodes, (n) => getId(n) === getId(parentNode));

  // TODO: Keep an eye on this. It might break something related to mobx reactions
  // nodes[parentNodeIndex].branches.replace(responses);
  nodes[parentNodeIndex].branches = [...responses];
}

export function getIndexFromId(values: (IdRef | { idRef: IdRef })[], value: string) {
  return findIndex(values, (n) => getId(n) === value);
}
