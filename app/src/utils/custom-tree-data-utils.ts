import { PromptNodeType, ElementNodeType } from 'types';
import { isElementNodeType } from './node-utils';

import { nodeStore } from '../stores';
import { changeNodeAtPath, find } from './tree-data-utils';
import { getId } from './conversation-utils';

/**
 * Collapses all other branches that aren't on the same branch as the selected node
 *
 * @param treeData
 * @param node
 * @param onNode
 * @returns
 */
export function collapseOtherBranches(
  treeData: RSTNode[],
  node: PromptNodeType | ElementNodeType | null,
  onNode: (node: RSTNode) => void,
  firstLayer = true,
): RSTNode[] {
  if (node == null) return treeData;
  const nodeId = getId(node);
  let updatedTreeData = treeData;

  let promptNode: PromptNodeType | null = null;
  let rootNodes: ElementNodeType[] | null = null;

  // If response or root node, go through all of the sibling responses/root nodes, descend them and close them all
  if (isElementNodeType(node)) {
    const { type } = node;
    if (type === 'root') {
      rootNodes = nodeStore.getRoots();
    } else {
      // Get all siblings and collapse them
      const { parentId } = node;
      const parentPromptNode = nodeStore.getNode(parentId) as PromptNodeType;
      promptNode = parentPromptNode;
    }
  } else {
    if (firstLayer) {
      const { parentId } = node;
      const parentElementNode = nodeStore.getNode(parentId) as ElementNodeType;
      return collapseOtherBranches(updatedTreeData, parentElementNode, onNode, false);
    } else {
      promptNode = node;
    }
  }

  if (promptNode || rootNodes) {
    let branches = null;

    if (rootNodes) {
      branches = rootNodes;
    } else {
      if (promptNode == null) return updatedTreeData;
      ({ branches } = promptNode);
    }

    branches.forEach((elementNode: ElementNodeType) => {
      const elementId = getId(elementNode);
      if (elementId === nodeId) return;

      updatedTreeData = setExpandedInTree(updatedTreeData, elementId, onNode, false);
    });

    if (promptNode) {
      const parentNode = nodeStore.getNode(promptNode.parentId);
      if (parentNode == null) return updatedTreeData;
      return collapseOtherBranches(updatedTreeData, parentNode, onNode, false);
    }
  }

  return updatedTreeData;
}

export function collapseOrExpandBranches(
  treeData: RSTNode[],
  node: PromptNodeType | ElementNodeType | null,
  onNode: (node: RSTNode) => void,
  expand: boolean,
): RSTNode[] {
  if (node == null) return treeData;
  const nodeId = getId(node);
  let updatedTreeData = treeData;

  // If response or root node, mark as expand/collapse then go to prompt node - if one exists and isn't a link
  if (isElementNodeType(node)) {
    const { nextNodeIndex, auxiliaryLink } = node;

    updatedTreeData = setExpandedInTree(updatedTreeData, nodeId, onNode, expand);

    const childPromptNode = nodeStore.getPromptNodeByIndex(nextNodeIndex);
    if (childPromptNode != null && !auxiliaryLink) {
      updatedTreeData = collapseOrExpandBranches(updatedTreeData, childPromptNode, onNode, expand);
    }
  } else {
    // If a prompt node, go through each branch and iterate over them closing them
    const { branches } = node;
    branches.forEach((branch) => {
      updatedTreeData = collapseOrExpandBranches(updatedTreeData, branch, onNode, expand);
    });

    updatedTreeData = setExpandedInTree(updatedTreeData, nodeId, onNode, expand);
  }

  return updatedTreeData;
}

function setExpandedInTree(treeData: RSTNode[], nodeId: string, onNode: (node: RSTNode) => void, expanded: boolean): RSTNode[] {
  const { matches }: { matches: any[] } = find({
    treeData,
    searchQuery: undefined,
    searchFocusOffset: undefined,
    getNodeKey: ({ node }: { node: RSTNode }) => node.id,
    searchMethod: ({ node }: { node: RSTNode }) => node.id === nodeId,
    expandFocusMatchPaths: false,
  });

  if (matches == null || matches.length <= 0) return treeData;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const match = matches[0];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { path } = match;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const treeNode = match.node as RSTNode;
  treeNode.expanded = expanded;
  onNode(treeNode);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return changeNodeAtPath({
    treeData,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    path,
    newNode: treeNode,
    getNodeKey: ({ node }: { node: RSTNode }) => node.id,
    ignoreCollapsed: false,
  }) as RSTNode[];
}

export function expandFromCoreToNode(treeData: RSTNode[], node: PromptNodeType | ElementNodeType | null, onNode: (node: RSTNode) => void): RSTNode[] {
  if (node == null) return treeData;

  const nodeId = getId(node);
  let updatedTreeData = treeData;

  updatedTreeData = setExpandedInTree(updatedTreeData, nodeId, onNode, true);

  if (node.parentId == null) {
    updatedTreeData[0].expanded = true;
    return updatedTreeData;
  }

  const parentNode = nodeStore.getNode(node.parentId);
  return expandFromCoreToNode(updatedTreeData, parentNode, onNode);
}

export function findTreeNodeParentWithDataNodeId(element: HTMLElement): HTMLElement | null {
  if (element == null) return null;

  if (element.hasAttribute('data-node-id')) {
    return element;
  }

  if (element.parentElement == null) return null;

  return findTreeNodeParentWithDataNodeId(element.parentElement);
}
