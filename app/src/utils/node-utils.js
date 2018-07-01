import nodeStore from '../stores/nodeStore';

export function detectType(type) {
  return {
    isRoot: (type === 'root'),
    isNode: (type === 'node'),
    isResponse: (type === 'response'),
    isLink: (type === 'link'),
  };
}

export function isAllowedToCreateNode(nodeId) {
  if (nodeId === '0') return true; // for the 'Root'

  const node = nodeStore.getNode(nodeId);

  // GUARD
  if (!node) return false;

  const { type, nextNodeIndex } = node;
  if (type === 'node') return true;
  if (type === 'root' || type === 'response') {
    if (nextNodeIndex === -1) return true;
    return false;
  }

  return false;
}

export function isAllowedToPasteLink(nodeId, clipboardNode) {
  // GUARD - Don't allow pasting link into a root
  if (nodeId === '0') return false;

  const node = nodeStore.getNode(nodeId);

  // GUARD
  if (!node || !clipboardNode) return false;

  const { type, auxiliaryLink } = node;
  const { type: clipboardType } = clipboardNode;

  const { isResponse } = detectType(type);
  const { isRoot: clipboardIsRoot, isNode: clipboardIsNode } = detectType(clipboardType);

  // GUARD - Only allow pasting links into responses
  if (!isResponse) return false;

  // GUARD - Only allow pasting of roots or nodes
  if (!clipboardIsNode && !clipboardIsRoot) return false;

  if (!auxiliaryLink) return true;

  return false;
}

export default {};
