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

      const { matches }: { matches: any[] } = find({
        treeData: updatedTreeData,
        searchQuery: undefined,
        searchFocusOffset: undefined,
        getNodeKey: ({ node }: { node: RSTNode }) => node.id,
        searchMethod: ({ node }: { node: RSTNode }) => node.id === elementId,
        expandFocusMatchPaths: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const match = matches[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { path } = match;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const elementNodeTreeItem = match.node as RSTNode;
      elementNodeTreeItem.expanded = false;
      onNode(elementNodeTreeItem);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      updatedTreeData = changeNodeAtPath({
        treeData: updatedTreeData,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        path,
        newNode: elementNodeTreeItem,
        getNodeKey: ({ node }: { node: RSTNode }) => node.id,
        ignoreCollapsed: false,
      });
    });

    if (promptNode) {
      const parentNode = nodeStore.getNode(promptNode.parentId);
      if (parentNode == null) return updatedTreeData;
      return collapseOtherBranches(updatedTreeData, parentNode, onNode, false);
    }
  }

  return updatedTreeData;
}
