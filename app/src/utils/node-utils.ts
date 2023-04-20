import { NodePromptType } from 'types/NodePromptType';
import { nodeStore } from '../stores';
import { NodeElementType } from 'types/NodeElementType';
import { ClipboardType } from 'types/ClipboardType';

export type NodeTypeDetectionResult = {
  isRoot: boolean;
  isNode: boolean;
  isResponse: boolean;
  isLink: boolean;
};

export function isNodeType(node: NodePromptType | NodeElementType): node is NodePromptType {
  return node.type === 'node';
}

export function isNodeLinkType(node: NodePromptType | NodeElementType): node is NodeElementType {
  return node.type !== 'node';
}

export function detectType(type: string | null): NodeTypeDetectionResult {
  if (type == null) return { isRoot: false, isNode: false, isResponse: false, isLink: false };

  return {
    isRoot: type === 'root',
    isNode: type === 'node',
    isResponse: type === 'response',
    isLink: type === 'link',
  };
}

export function isAllowedToCreateNode(nodeId: string | undefined) {
  if (!nodeId) return false;
  if (nodeId === '0') return true; // for the 'Root'

  const node = nodeStore.getNode(nodeId);

  // GUARD
  if (!node) return false;

  const { type } = node;
  if (type === 'node') return true;

  const { nextNodeIndex } = node;
  if (type === 'root' || type === 'response') {
    if (nextNodeIndex === -1) return true;
    return false;
  }

  return false;
}

export function isAllowedToPasteCopy(nodeId: string | undefined, clipboard: ClipboardType | null) {
  if (!nodeId) return false;
  const node = nodeStore.getNode(nodeId);

  // GUARD
  if (node == null || clipboard == null) return false;

  const { node: clipboardNode } = clipboard;

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

export function isAllowedToPasteLink(nodeId: string | undefined, clipboard: ClipboardType | null) {
  if (!nodeId) return false;
  // GUARD - Don't allow pasting link into a root
  if (nodeId === '0') return false;

  const node = nodeStore.getNode(nodeId);

  // GUARD
  if (node == null || clipboard == null) return false;

  const { node: clipboardNode } = clipboard;

  const { type } = node;
  const { type: clipboardType } = clipboardNode;

  const { isResponse } = detectType(type);
  const { isNode: clipboardIsNode } = detectType(clipboardType);

  // GUARD - Only allow pasting links into responses
  if (!isResponse) return false;

  // GUARD - Only allow pasting of nodes
  if (!clipboardIsNode) return false;

  let auxiliaryLink;
  if ('auxiliaryLink' in node) ({ auxiliaryLink } = node);

  if (!auxiliaryLink) return true;

  return false;
}

export default {};
