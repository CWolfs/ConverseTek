import uuid from 'uuid/v4';
import md5 from 'md5';
import findIndex from 'lodash.findindex';

/* eslint-disable no-param-reassign, no-return-assign */
export function generateId() {
  return `9c${md5(uuid()).slice(10)}`;
}

export function regenerateNodeIds(conversationAsset) {
  conversationAsset.Conversation.roots.forEach(root => root.idRef.id = generateId());
  conversationAsset.Conversation.nodes.forEach((node) => {
    node.idRef.id = generateId();
    node.branches.forEach(branch => branch.idRef.id = generateId());
  });
}

export function regenerateConversationId(conversationAsset) {
  conversationAsset.Conversation.idRef.id = generateId();
}

/*
  Ids in the official conversation conversation files are inconsistent.
  Sometimes they are `conversationId:id` and sometimes they are just `id`
  These methods display only the latter `id` but maintain the full ids on
  those that use them
*/
export function getId(idContainer) {
  let id = null;
  ({ id } = idContainer);
  if (id === undefined) ({ id } = idContainer.idRef);
  return id.split(':')[1] || id;
}

export function createId(idRef, newId) {
  const { id } = idRef;

  // strip any colons - this is a special character for ids
  if (newId.includes(':')) newId.replace(':', '');

  if (id.includes(':')) {
    const builtId = id.split(':')[0];
    return `${builtId}:${newId}`;
  }

  return newId;
}

export function createConversation(filePath) {
  const id = generateId();
  const fileName = `${id}.convo`;
  const conversation = {
    FileName: fileName,
    FilePath: `${filePath}/${fileName}.bytes`,
    Conversation: {
      idRef: {
        id: generateId(),
      },
      ui_name: 'Unnamed-Conversation',
      nodes: [],
      roots: [],
      default_speaker_id: '',
      default_speaker_override: null,
      persistent_conversation: false,
      speaker_override_id: '',
    },
  };

  return conversation;
}

export function createRoot() {
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

export function createNode(index) {
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
    sourceWithTagInScene: '',
    override_speaker: null,
    speaker_override_id: '',
    actions: null,
    comment: '',
  };
}

export function createResponse() {
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

export function consolidateSpeaker(conversationAsset) {
  const { nodes } = conversationAsset.Conversation;
  nodes.forEach((node) => {
    const { speakerType } = node;
    if (speakerType === 'speakerId') {
      node.sourceInSceneRef = null;
    }
  });
}

export function updateRoot(conversationAsset, root) {
  const { roots } = conversationAsset.Conversation;
  const index = findIndex(roots, r => getId(r) === getId(root));

  if (index === -1) {
    roots.push(root);
  } else {
    roots[index] = root;
  }
}

export function updateNode(conversationAsset, node) {
  const { nodes } = conversationAsset.Conversation;
  const index = findIndex(nodes, n => getId(n) === getId(node));

  if (index === -1) {
    nodes.push(node);
  } else {
    nodes[index] = node;
  }
}

export function addNodes(conversationAsset, newNodes) {
  const { nodes } = conversationAsset.Conversation;
  newNodes.forEach(node => nodes.push(node));
}

export function updateResponse(conversationAsset, parentNode, response) {
  const { nodes } = conversationAsset.Conversation;

  const branchIndex = findIndex(parentNode.branches, b => getId(b) === getId(response));
  if (branchIndex === -1) {
    parentNode.branches.push(response);
  } else {
    parentNode.branches[branchIndex] = response;
  }

  const parentNodeIndex = findIndex(nodes, n => getId(n) === getId(parentNode));
  if (parentNodeIndex === -1) {
    nodes.push(parentNode);
  } else {
    nodes[parentNodeIndex] = parentNode;
  }
}

export function setRoots(conversationAsset, roots) {
  const { roots: conversationRoots } = conversationAsset.Conversation;
  conversationRoots.replace(roots);
}

export function setResponses(conversationAsset, parentNode, responses) {
  const { nodes } = conversationAsset.Conversation;
  const parentNodeIndex = findIndex(nodes, n => getId(n) === getId(parentNode));
  nodes[parentNodeIndex].branches.replace(responses);
}

export default {};
