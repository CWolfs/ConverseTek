import nodeStore from '../stores/nodeStore';

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

export default {};
