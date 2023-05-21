import { PromptNodeType, ElementNodeType } from 'types';
import { isElementNodeType } from './node-utils';

import { nodeStore } from '../stores';
import { changeNodeAtPath, find, mapDescendants } from './tree-data-utils';
import { getId } from './conversation-utils';

export function collapseOtherBranches(
  treeData: RSTNode[],
  node: PromptNodeType | ElementNodeType | null,
  onNode: (node: RSTNode) => void,
): RSTNode[] {
  if (node == null) return treeData;
  console.log('treeData', treeData);
  console.log('node', node);
  const nodeId = getId(node);
  let updatedTreeData = treeData;

  // If response or root node, go through all of the sibling responses/root nodes, descend them and close them all
  if (isElementNodeType(node)) {
    // Get all siblings and collapse them
    const { parentId } = node;
    const parentPromptNode = nodeStore.getNode(parentId) as PromptNodeType;

    if (parentPromptNode) {
      const { branches } = parentPromptNode;

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
        const { path, treeIndex } = match;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const elementNodeTreeItem = match.node as RSTNode;
        elementNodeTreeItem.expanded = false;
        nodeStore.setNodeExpansion(elementId, false);

        updatedTreeData = changeNodeAtPath({
          treeData,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          path,
          newNode: elementNodeTreeItem,
          getNodeKey: ({ node }: { node: RSTNode }) => node.id,
          ignoreCollapsed: false,
        });

        // const updatedTreeBranch = mapDescendants({
        //   node: updatedTreeData,
        //   getNodeKey: (node: RSTNode) => node.id,
        //   callback: onNode,
        //   ignoreCollapsed: false,
        // });
      });
    }
  }

  console.log('updatedTreeData end', updatedTreeData);

  // When finished, or a prompt node, go recurse into parent
  return updatedTreeData;
}
