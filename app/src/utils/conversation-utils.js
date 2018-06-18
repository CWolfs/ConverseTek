import uuid from 'uuid/v4';
import md5 from 'md5';

/* eslint-disable no-param-reassign, no-return-assign */
export function generateId() {
  return `9c${md5(uuid()).slice(10)}`;
}

export function regenerateIds(conversationAsset) {
  conversationAsset.Conversation.idRef.id = generateId();

  conversationAsset.Conversation.roots.forEach(root => root.idRef.id = generateId());
  conversationAsset.Conversation.nodes.forEach((node) => {
    node.idRef.id = generateId();
    node.branches.forEach(branch => branch.idRef.id = generateId());
  });
}

/*
  Ids in the official conversation conversation files are inconsistent.
  Sometimes they are `conversationId:id` and sometimes they are just `id`
  These methods display only the latter `id` but maintain the full ids on
  those that use them
*/
export function getId(idRef) {
  const { id } = idRef;
  return id.split(':')[1] || id;
}

export function createId(idRef, newId) {
  const { id } = idRef;

  if (id.includes(':')) {
    const builtId = id.split(':')[0];
    return `${builtId}:${newId}`;
  }

  return newId;
}

export default {};
