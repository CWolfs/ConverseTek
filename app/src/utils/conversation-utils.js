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

export default {};
