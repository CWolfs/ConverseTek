import { nodeStore } from '../stores/nodeStore';

export function detectType(type) {
  return {
    isRoot: type === 'root',
    isNode: type === 'node',
    isResponse: type === 'response',
    isLink: type === 'link',
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

export function isAllowedToPasteCopy(nodeId, clipboard) {
  const node = nodeStore.getNode(nodeId);
  const { node: clipboardNode } = clipboard;

  // GUARD
  if (!node || !clipboardNode) return false;

  const { isRoot, isNode, isResponse } = detectType(node.type);
  const { isNode: clipboardIsNode, isResponse: clipboardIsResponse } = detectType(clipboardNode.type);

  if (isRoot || isResponse) {
    // Only allow nodes to be copied in if target is a root or response
    if (!clipboardIsNode) return false;
  } else if (isNode) {
    // Only allow response to be copied in
    if (!clipboardIsResponse) return false;
  }

  return true;
}

export function isAllowedToPasteLink(nodeId, clipboard) {
  // GUARD - Don't allow pasting link into a root
  if (nodeId === '0') return false;

  const node = nodeStore.getNode(nodeId);
  const { node: clipboardNode } = clipboard;

  // GUARD
  if (!node || !clipboardNode) return false;

  const { type, auxiliaryLink } = node;
  const { type: clipboardType } = clipboardNode;

  const { isResponse } = detectType(type);
  const { isNode: clipboardIsNode } = detectType(clipboardType);

  // GUARD - Only allow pasting links into responses
  if (!isResponse) return false;

  // GUARD - Only allow pasting of nodes
  if (!clipboardIsNode) return false;

  if (!auxiliaryLink) return true;

  return false;
}

export default {};
