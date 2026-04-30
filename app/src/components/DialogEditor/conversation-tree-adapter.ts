import type { NodeApi } from 'react-arborist';

export type ConversationTreeScaffoldLine = {
  key: string;
  left: number;
  kind: 'full' | 'branch' | 'terminal';
};

export type ConversationTreeMoveResult = {
  treeData: RSTNode[];
  movedNode: RSTNode;
  previousParentId: string | null;
  nextParentNode: RSTNode;
};

export function getConversationTreeNodeId(node: RSTNode): string {
  if (node.id) return node.id;

  const linkIndex = node.linkIndex == null ? 'unknown' : node.linkIndex;
  return `${node.type}-${node.parentId || 'root'}-${linkIndex}`;
}

export function buildInitialOpenState<T extends RSTNode>(
  treeData: T[],
  getNodeId: (node: T) => string = getConversationTreeNodeId as (node: T) => string,
): Record<string, boolean> {
  const openState: Record<string, boolean> = {};

  const visit = (nodes: readonly RSTNode[] | null | undefined) => {
    if (nodes == null) return;

    nodes.forEach((node) => {
      const children = node.children;
      if (children != null && children.length > 0) {
        openState[getNodeId(node as T)] = node.expanded !== false;
        visit(children);
      }
    });
  };

  visit(treeData);
  return openState;
}

export function getConversationTreePath<T extends RSTNode>(node: NodeApi<T>): RSTPath {
  const path: string[] = [];
  let current: NodeApi<T> | null = node;

  while (current != null && !current.isRoot) {
    path.unshift(getConversationTreeNodeId(current.data));
    current = current.parent;
  }

  return path;
}

export function getConversationTreeScaffoldLines<T extends RSTNode>(
  node: NodeApi<T>,
  scaffoldBlockPxWidth = 44,
): ConversationTreeScaffoldLine[] {
  if (node.level <= 0) return [];

  const halfScaffoldBlockPxWidth = scaffoldBlockPxWidth / 2;
  const lines: ConversationTreeScaffoldLine[] = [
    {
      key: `${node.id}-self`,
      left: -halfScaffoldBlockPxWidth,
      kind: node.nextSibling == null ? 'terminal' : 'branch',
    },
  ];

  let ancestor = node.parent;
  let ancestorDistance = 1;

  while (ancestor != null && !ancestor.isRoot) {
    if (ancestor.nextSibling != null) {
      lines.push({
        key: `${node.id}-${ancestor.id}`,
        left: -(ancestorDistance * scaffoldBlockPxWidth + halfScaffoldBlockPxWidth),
        kind: 'full',
      });
    }

    ancestor = ancestor.parent;
    ancestorDistance += 1;
  }

  return lines;
}

export function findConversationTreeMaxRightEdge(node: HTMLElement | null): number {
  let maxRight = 0;
  if (node == null) return maxRight;

  const nodeRect = node.getBoundingClientRect();
  const scrollContainer = node.matches('.conversation-tree__list') ? node : node.querySelector<HTMLElement>('.conversation-tree__list');
  const scrollLeft = scrollContainer?.scrollLeft || node.scrollLeft;

  node.querySelectorAll<HTMLElement>('.conversation-node-renderer__row-wrapper').forEach((rowWrapper) => {
    const rect = rowWrapper.getBoundingClientRect();
    maxRight = Math.max(maxRight, rect.right - nodeRect.left + scrollLeft);
  });

  return maxRight;
}

export function moveConversationTreeNode(treeData: RSTNode[], nodeId: string, nextParentId: string | null, nextIndex: number): ConversationTreeMoveResult | null {
  const removed = removeNode(treeData, nodeId);
  if (removed == null) return null;

  const insertion = insertNode(removed.treeData, { ...removed.node, parentId: nextParentId }, nextParentId, nextIndex);
  if (insertion == null) return null;

  return {
    treeData: insertion.treeData,
    movedNode: { ...removed.node, parentId: nextParentId },
    previousParentId: removed.previousParentId,
    nextParentNode: insertion.parentNode,
  };
}

function removeNode(treeData: RSTNode[], nodeId: string): { treeData: RSTNode[]; node: RSTNode; previousParentId: string | null } | null {
  for (let index = 0; index < treeData.length; index += 1) {
    const node = treeData[index];
    if (getConversationTreeNodeId(node) === nodeId) {
      return {
        treeData: [...treeData.slice(0, index), ...treeData.slice(index + 1)],
        node,
        previousParentId: node.parentId,
      };
    }

    if (node.children == null) continue;

    const childResult = removeNode(node.children, nodeId);
    if (childResult != null) {
      const nextNode = { ...node, children: childResult.treeData };
      return {
        treeData: [...treeData.slice(0, index), nextNode, ...treeData.slice(index + 1)],
        node: childResult.node,
        previousParentId: childResult.previousParentId,
      };
    }
  }

  return null;
}

function insertNode(treeData: RSTNode[], nodeToInsert: RSTNode, nextParentId: string | null, nextIndex: number): { treeData: RSTNode[]; parentNode: RSTNode } | null {
  if (nextParentId == null) return null;

  for (let index = 0; index < treeData.length; index += 1) {
    const node = treeData[index];
    if (getConversationTreeNodeId(node) === nextParentId) {
      const currentChildren = node.children || [];
      const nextChildren = [...currentChildren.slice(0, nextIndex), nodeToInsert, ...currentChildren.slice(nextIndex)];
      const nextParentNode = { ...node, children: nextChildren };

      return {
        treeData: [...treeData.slice(0, index), nextParentNode, ...treeData.slice(index + 1)],
        parentNode: nextParentNode,
      };
    }

    if (node.children == null) continue;

    const childResult = insertNode(node.children, nodeToInsert, nextParentId, nextIndex);
    if (childResult != null) {
      const nextNode = { ...node, children: childResult.treeData };
      return {
        treeData: [...treeData.slice(0, index), nextNode, ...treeData.slice(index + 1)],
        parentNode: childResult.parentNode,
      };
    }
  }

  return null;
}
