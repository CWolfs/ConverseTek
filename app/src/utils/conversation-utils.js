import uuid from 'uuid/v4';
import md5 from 'md5';

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

export function consolidateSpeaker(conversationAsset) {
  const { nodes } = conversationAsset.Conversation;
  nodes.forEach((node) => {
    const { speakerType } = node;
    if (speakerType === 'speakerId') {
      node.sourceInSceneRef = null;
    }
  });
}

export default {};
