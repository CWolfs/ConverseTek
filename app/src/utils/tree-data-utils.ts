export type TreeKey = string | number;
export type TreePath = TreeKey[];

type TreeNode = RSTNode;
type PseudoTreeNode = Partial<TreeNode> & {
  children?: TreeNode[] | (() => TreeNode[]) | null;
};

type GetNodeKey = (args: { node: TreeNode; treeIndex: number }) => TreeKey;

export type TreeNodeInfo = {
  node: TreeNode;
  parentNode: TreeNode | null;
  path: TreePath;
  lowerSiblingCounts: number[];
  treeIndex: number;
};

type TreeSearchMatch = {
  node: TreeNode;
  path: TreePath;
  lowerSiblingCounts?: number[];
  treeIndex: number | null;
};

type TreeSearchMethodInfo = {
  node: TreeNode;
  path: TreePath;
  treeIndex: number;
  searchQuery: unknown;
};

type WalkCallback = (nodeInfo: TreeNodeInfo) => false | void | unknown;
type MapCallback = (nodeInfo: TreeNodeInfo) => TreeNode;

type TraversalHit = {
  node: TreeNode;
  lowerSiblingCounts: number[];
  path: TreePath;
};

type TraversalResult = TraversalHit | {
  nextIndex: number;
};

function hasTraversalHit(result: TraversalResult): result is TraversalHit {
  return 'node' in result;
}

function getChildren(node: PseudoTreeNode): TreeNode[] | null {
  return Array.isArray(node.children) ? node.children : null;
}

/**
 * Walks visible descendants depth-first until it either finds the target tree
 * index or returns the next index after the scanned branch.
 */
function getNodeDataAtTreeIndexOrNextIndex({
  targetIndex,
  node,
  currentIndex,
  getNodeKey,
  path = [],
  lowerSiblingCounts = [],
  ignoreCollapsed = true,
  isPseudoRoot = false,
}: {
  targetIndex: number;
  node: PseudoTreeNode;
  currentIndex: number;
  getNodeKey: GetNodeKey;
  path?: TreePath;
  lowerSiblingCounts?: number[];
  ignoreCollapsed?: boolean;
  isPseudoRoot?: boolean;
}): TraversalResult {
  // The pseudo-root is only a traversal wrapper, so it should not appear in returned paths.
  const selfPath = !isPseudoRoot ? [...path, getNodeKey({ node: node as TreeNode, treeIndex: currentIndex })] : [];

  if (currentIndex === targetIndex) {
    return {
      node: node as TreeNode,
      lowerSiblingCounts,
      path: selfPath,
    };
  }

  const children = getChildren(node);
  if (children == null || (ignoreCollapsed && node.expanded !== true)) {
    return { nextIndex: currentIndex + 1 };
  }

  let childIndex = currentIndex + 1;
  const childCount = children.length;
  for (let i = 0; i < childCount; i += 1) {
    const result = getNodeDataAtTreeIndexOrNextIndex({
      ignoreCollapsed,
      getNodeKey,
      targetIndex,
      node: children[i],
      currentIndex: childIndex,
      lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
      path: selfPath,
    });

    if (hasTraversalHit(result)) {
      return result;
    }

    childIndex = result.nextIndex;
  }

  return { nextIndex: childIndex };
}

/**
 * Counts a node's descendants using the same visible-tree index rules as the
 * tree manipulation helpers.
 */
export function getDescendantCount({ node, ignoreCollapsed = true }: { node: TreeNode; ignoreCollapsed?: boolean }): number {
  const result = getNodeDataAtTreeIndexOrNextIndex({
    getNodeKey: ({ treeIndex }) => treeIndex,
    ignoreCollapsed,
    node,
    currentIndex: 0,
    targetIndex: -1,
  });

  return hasTraversalHit(result) ? 0 : result.nextIndex - 1;
}

/**
 * Walks descendants depth-first and lets the callback stop traversal by
 * returning false.
 */
function walkDescendants({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = null,
  currentIndex,
  path = [],
  lowerSiblingCounts = [],
}: {
  callback: WalkCallback;
  getNodeKey: GetNodeKey;
  ignoreCollapsed: boolean;
  isPseudoRoot?: boolean;
  node: PseudoTreeNode;
  parentNode?: TreeNode | null;
  currentIndex: number;
  path?: TreePath;
  lowerSiblingCounts?: number[];
}): number | false {
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node: node as TreeNode, treeIndex: currentIndex })];

  if (!isPseudoRoot) {
    const callbackResult = callback({
      node: node as TreeNode,
      parentNode,
      path: selfPath,
      lowerSiblingCounts,
      treeIndex: currentIndex,
    });

    if (callbackResult === false) {
      return false;
    }
  }

  const children = getChildren(node);
  if (children == null || (node.expanded !== true && ignoreCollapsed && !isPseudoRoot)) {
    return currentIndex;
  }

  let childIndex = currentIndex;
  const childCount = children.length;
  for (let i = 0; i < childCount; i += 1) {
    const walkResult = walkDescendants({
      callback,
      getNodeKey,
      ignoreCollapsed,
      node: children[i],
      parentNode: isPseudoRoot ? null : (node as TreeNode),
      currentIndex: childIndex + 1,
      lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
      path: selfPath,
    });

    if (walkResult === false) {
      return false;
    }

    childIndex = walkResult;
  }

  return childIndex;
}

/**
 * Maps a node and all descendants depth-first while preserving tree index,
 * path, and sibling-count metadata for callers that need sortable-tree style
 * context.
 */
export function mapDescendants({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = null,
  currentIndex,
  path = [],
  lowerSiblingCounts = [],
}: {
  callback: MapCallback;
  getNodeKey: GetNodeKey;
  ignoreCollapsed: boolean;
  isPseudoRoot?: boolean;
  node: PseudoTreeNode;
  parentNode?: TreeNode | null;
  currentIndex: number;
  path?: TreePath;
  lowerSiblingCounts?: number[];
}): { node: PseudoTreeNode; treeIndex: number } {
  const nextNode: PseudoTreeNode = { ...node };
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node: nextNode as TreeNode, treeIndex: currentIndex })];
  const selfInfo: TreeNodeInfo = {
    node: nextNode as TreeNode,
    parentNode,
    path: selfPath,
    lowerSiblingCounts,
    treeIndex: currentIndex,
  };

  const children = getChildren(nextNode);
  if (children == null || (nextNode.expanded !== true && ignoreCollapsed && !isPseudoRoot)) {
    return {
      treeIndex: currentIndex,
      node: callback(selfInfo),
    };
  }

  let childIndex = currentIndex;
  const childCount = children.length;
  nextNode.children = children.map((child, i) => {
    const mapResult = mapDescendants({
      callback,
      getNodeKey,
      ignoreCollapsed,
      node: child,
      parentNode: isPseudoRoot ? null : (nextNode as TreeNode),
      currentIndex: childIndex + 1,
      lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
      path: selfPath,
    });
    childIndex = mapResult.treeIndex;

    return mapResult.node as TreeNode;
  });

  return {
    node: callback(selfInfo),
    treeIndex: childIndex,
  };
}

/**
 * Counts the currently visible nodes in a tree, where collapsed branches count
 * only as their parent node.
 */
export function getVisibleNodeCount({ treeData }: { treeData: TreeNode[] }): number {
  const traverse = (node: TreeNode): number => {
    const children = getChildren(node);
    if (children == null || node.expanded !== true) {
      return 1;
    }

    return 1 + children.reduce((total, currentNode) => total + traverse(currentNode), 0);
  };

  return treeData.reduce((total, currentNode) => total + traverse(currentNode), 0);
}

/**
 * Finds the visible node at a given tree index and returns its path metadata.
 */
export function getVisibleNodeInfoAtIndex({
  treeData,
  index: targetIndex,
  getNodeKey,
}: {
  treeData: TreeNode[] | null | undefined;
  index: number;
  getNodeKey: GetNodeKey;
}): TraversalHit | null {
  if (!treeData || treeData.length < 1) {
    return null;
  }

  const result = getNodeDataAtTreeIndexOrNextIndex({
    targetIndex,
    getNodeKey,
    node: {
      children: treeData,
      expanded: true,
    },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: [],
    isPseudoRoot: true,
  });

  return hasTraversalHit(result) ? result : null;
}

/**
 * Walks each visible tree node depth-first.
 */
export function walk({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[] | null | undefined;
  getNodeKey: GetNodeKey;
  callback: WalkCallback;
  ignoreCollapsed?: boolean;
}): void {
  if (!treeData || treeData.length < 1) {
    return;
  }

  walkDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: { children: treeData },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: [],
  });
}

/**
 * Applies a callback to every visible node and returns updated tree data.
 */
export function map({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[] | null | undefined;
  getNodeKey: GetNodeKey;
  callback: MapCallback;
  ignoreCollapsed?: boolean;
}): TreeNode[] {
  if (!treeData || treeData.length < 1) {
    return [];
  }

  const result = mapDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: { children: treeData },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: [],
  });

  return getChildren(result.node) || [];
}

/**
 * Expands or collapses every node in the tree.
 */
export function toggleExpandedForAll({
  treeData,
  callback = () => {},
  expanded = true,
}: {
  treeData: TreeNode[] | null | undefined;
  callback?: (node: TreeNode) => void;
  expanded?: boolean;
}): TreeNode[] {
  return map({
    treeData,
    callback: ({ node }) => {
      callback(node);
      return { ...node, expanded };
    },
    getNodeKey: ({ treeIndex }) => treeIndex,
    ignoreCollapsed: false,
  });
}

type NodeReplacement = TreeNode | null | ((args: { node: TreeNode; treeIndex: number }) => TreeNode | null);
type PathTraversalResult = TreeNode | null | typeof RESULT_MISS;
const RESULT_MISS = 'RESULT_MISS';

/**
 * Replaces or removes the node at a path. Returning null from a replacement
 * callback deletes that node from its parent's children.
 */
export function changeNodeAtPath({
  treeData,
  path,
  newNode,
  getNodeKey,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[];
  path: TreePath;
  newNode: NodeReplacement;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
}): TreeNode[] {
  const traverse = ({
    isPseudoRoot = false,
    node,
    currentTreeIndex,
    pathIndex,
  }: {
    isPseudoRoot?: boolean;
    node: PseudoTreeNode;
    currentTreeIndex: number;
    pathIndex: number;
  }): PathTraversalResult => {
    if (!isPseudoRoot && getNodeKey({ node: node as TreeNode, treeIndex: currentTreeIndex }) !== path[pathIndex]) {
      return RESULT_MISS;
    }

    if (pathIndex >= path.length - 1) {
      return typeof newNode === 'function' ? newNode({ node: node as TreeNode, treeIndex: currentTreeIndex }) : newNode;
    }

    const children = getChildren(node);
    if (children == null) {
      throw new Error('Path referenced children of node with no children.');
    }

    let nextTreeIndex = currentTreeIndex + 1;
    for (let i = 0; i < children.length; i += 1) {
      const result = traverse({
        node: children[i],
        currentTreeIndex: nextTreeIndex,
        pathIndex: pathIndex + 1,
      });

      if (result !== RESULT_MISS) {
        const nextChildren = result
          ? [...children.slice(0, i), result, ...children.slice(i + 1)]
          : [...children.slice(0, i), ...children.slice(i + 1)];

        return {
          ...node,
          children: nextChildren,
        } as TreeNode;
      }

      // Tree indices include collapsed descendants according to the caller's visibility rule.
      nextTreeIndex += 1 + getDescendantCount({ node: children[i], ignoreCollapsed });
    }

    return RESULT_MISS;
  };

  const result = traverse({
    node: { children: treeData },
    currentTreeIndex: -1,
    pathIndex: -1,
    isPseudoRoot: true,
  });

  if (result === RESULT_MISS || result == null) {
    throw new Error('No node found at the given path.');
  }

  return getChildren(result) || [];
}

/**
 * Removes the node at the supplied path.
 */
export function removeNodeAtPath({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[];
  path: TreePath;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
}): TreeNode[] {
  return changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: null,
  });
}

/**
 * Removes the node at the supplied path and also returns the removed node and
 * its previous tree index.
 */
export function removeNode({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[];
  path: TreePath;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
}): { treeData: TreeNode[]; node: TreeNode | null; treeIndex: number | null } {
  let removedNode: TreeNode | null = null;
  let removedTreeIndex: number | null = null;
  const nextTreeData = changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: ({ node, treeIndex }) => {
      removedNode = node;
      removedTreeIndex = treeIndex;

      return null;
    },
  });

  return {
    treeData: nextTreeData,
    node: removedNode,
    treeIndex: removedTreeIndex,
  };
}

/**
 * Reads the node at a path without modifying the returned tree.
 */
export function getNodeAtPath({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[];
  path: TreePath;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
}): { node: TreeNode; treeIndex: number } | null {
  let foundNodeInfo: { node: TreeNode; treeIndex: number } | null = null;

  try {
    changeNodeAtPath({
      treeData,
      path,
      getNodeKey,
      ignoreCollapsed,
      newNode: ({ node, treeIndex }) => {
        foundNodeInfo = { node, treeIndex };
        return node;
      },
    });
  } catch {
    // The null return is enough for callers that probe optional paths.
  }

  return foundNodeInfo;
}

/**
 * Adds a node under the parent identified by parentKey. A null parent appends
 * the node at the root level.
 */
export function addNodeUnderParent({
  treeData,
  newNode,
  parentKey = null,
  getNodeKey,
  ignoreCollapsed = true,
  expandParent = false,
}: {
  treeData: TreeNode[] | null | undefined;
  newNode: TreeNode;
  parentKey?: TreeKey | null;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
  expandParent?: boolean;
}): { treeData: TreeNode[]; treeIndex: number | null } {
  if (parentKey === null) {
    const existingTreeData = treeData || [];
    return {
      treeData: [...existingTreeData, newNode],
      treeIndex: existingTreeData.length,
    };
  }

  let insertedTreeIndex: number | null = null;
  let hasBeenAdded = false;
  const changedTreeData = map({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: ({ node, treeIndex, path }) => {
      const key = path.length > 0 ? path[path.length - 1] : null;
      if (hasBeenAdded || key !== parentKey) {
        return node;
      }
      hasBeenAdded = true;

      const parentNode: TreeNode = {
        ...node,
        ...(expandParent ? { expanded: true } : {}),
      };
      const parentChildren = getChildren(parentNode);

      if (parentChildren == null) {
        insertedTreeIndex = treeIndex + 1;
        return {
          ...parentNode,
          children: [newNode],
        };
      }

      let nextTreeIndex = treeIndex + 1;
      for (let i = 0; i < parentChildren.length; i += 1) {
        nextTreeIndex += 1 + getDescendantCount({ node: parentChildren[i], ignoreCollapsed });
      }

      insertedTreeIndex = nextTreeIndex;

      return {
        ...parentNode,
        children: [...parentChildren, newNode],
      };
    },
  });

  if (!hasBeenAdded) {
    throw new Error('No node found with the given key.');
  }

  return {
    treeData: changedTreeData,
    treeIndex: insertedTreeIndex,
  };
}

type AddNodeResult = {
  node: PseudoTreeNode;
  nextIndex: number;
  insertedTreeIndex?: number;
  parentPath?: TreePath;
  parentNode?: TreeNode | null;
};

/**
 * Finds an insertion point at the requested depth and minimum tree index,
 * returning enough metadata for callers to focus the inserted node.
 */
function addNodeAtDepthAndIndex({
  targetDepth,
  minimumTreeIndex,
  newNode,
  ignoreCollapsed,
  expandParent,
  isPseudoRoot = false,
  isLastChild,
  node,
  currentIndex,
  currentDepth,
  getNodeKey,
  path = [],
}: {
  targetDepth: number;
  minimumTreeIndex: number;
  newNode: TreeNode;
  ignoreCollapsed: boolean;
  expandParent: boolean;
  isPseudoRoot?: boolean;
  isLastChild: boolean;
  node: PseudoTreeNode;
  currentIndex: number;
  currentDepth: number;
  getNodeKey: GetNodeKey;
  path?: TreePath;
}): AddNodeResult {
  const selfPath = (currentNode: PseudoTreeNode): TreePath =>
    isPseudoRoot ? [] : [...path, getNodeKey({ node: currentNode as TreeNode, treeIndex: currentIndex })];
  const children = getChildren(node);

  if (currentIndex >= minimumTreeIndex - 1 || (isLastChild && (children == null || children.length === 0))) {
    const nextNode = {
      ...node,
      ...(expandParent ? { expanded: true } : {}),
      children: children ? [newNode, ...children] : [newNode],
    };

    return {
      node: nextNode,
      nextIndex: currentIndex + 2,
      insertedTreeIndex: currentIndex + 1,
      parentPath: selfPath(nextNode),
      parentNode: isPseudoRoot ? null : (nextNode as TreeNode),
    };
  }

  if (currentDepth >= targetDepth - 1) {
    if (children == null || (node.expanded !== true && ignoreCollapsed && !isPseudoRoot)) {
      return { node, nextIndex: currentIndex + 1 };
    }

    let childIndex = currentIndex + 1;
    let insertedTreeIndex: number | null = null;
    let insertIndex: number | null = null;
    for (let i = 0; i < children.length; i += 1) {
      if (childIndex >= minimumTreeIndex) {
        insertedTreeIndex = childIndex;
        insertIndex = i;
        break;
      }

      childIndex += 1 + getDescendantCount({ node: children[i], ignoreCollapsed });
    }

    if (insertIndex === null) {
      if (childIndex < minimumTreeIndex && !isLastChild) {
        return { node, nextIndex: childIndex };
      }

      insertedTreeIndex = childIndex;
      insertIndex = children.length;
    }

    const nextNode = {
      ...node,
      children: [...children.slice(0, insertIndex), newNode, ...children.slice(insertIndex)],
    };

    return {
      node: nextNode,
      nextIndex: childIndex,
      insertedTreeIndex: insertedTreeIndex ?? childIndex,
      parentPath: selfPath(nextNode),
      parentNode: isPseudoRoot ? null : (nextNode as TreeNode),
    };
  }

  if (children == null || (node.expanded !== true && ignoreCollapsed && !isPseudoRoot)) {
    return { node, nextIndex: currentIndex + 1 };
  }

  let insertedTreeIndex: number | null = null;
  let pathFragment: TreePath | null = null;
  let parentNode: TreeNode | null | undefined = null;
  let childIndex = currentIndex + 1;
  const newChildren = children.map((child, i) => {
    if (insertedTreeIndex !== null) {
      return child;
    }

    const mapResult = addNodeAtDepthAndIndex({
      targetDepth,
      minimumTreeIndex,
      newNode,
      ignoreCollapsed,
      expandParent,
      isLastChild: isLastChild && i === children.length - 1,
      node: child,
      currentIndex: childIndex,
      currentDepth: currentDepth + 1,
      getNodeKey,
      path: [],
    });

    if (mapResult.insertedTreeIndex != null) {
      insertedTreeIndex = mapResult.insertedTreeIndex;
      parentNode = mapResult.parentNode;
      pathFragment = mapResult.parentPath || [];
    }

    childIndex = mapResult.nextIndex;

    return mapResult.node as TreeNode;
  });

  const nextNode = { ...node, children: newChildren };
  const result: AddNodeResult = {
    node: nextNode,
    nextIndex: childIndex,
  };

  if (insertedTreeIndex !== null) {
    result.insertedTreeIndex = insertedTreeIndex;
    result.parentPath = [...selfPath(nextNode), ...(pathFragment || [])];
    result.parentNode = parentNode;
  }

  return result;
}

/**
 * Inserts a node at the requested depth after the minimum tree index.
 */
export function insertNode({
  treeData,
  depth: targetDepth,
  minimumTreeIndex,
  newNode,
  getNodeKey = ({ treeIndex }) => treeIndex,
  ignoreCollapsed = true,
  expandParent = false,
}: {
  treeData: TreeNode[] | null | undefined;
  depth: number;
  minimumTreeIndex: number;
  newNode: TreeNode;
  getNodeKey?: GetNodeKey;
  ignoreCollapsed?: boolean;
  expandParent?: boolean;
}): { treeData: TreeNode[]; treeIndex: number; path: TreePath; parentNode: TreeNode | null | undefined } {
  if (!treeData && targetDepth === 0) {
    return {
      treeData: [newNode],
      treeIndex: 0,
      path: [getNodeKey({ node: newNode, treeIndex: 0 })],
      parentNode: null,
    };
  }

  const insertResult = addNodeAtDepthAndIndex({
    targetDepth,
    minimumTreeIndex,
    newNode,
    ignoreCollapsed,
    expandParent,
    getNodeKey,
    isPseudoRoot: true,
    isLastChild: true,
    node: { children: treeData || [] },
    currentIndex: -1,
    currentDepth: -1,
  });

  if (insertResult.insertedTreeIndex == null) {
    throw new Error('No suitable position found to insert.');
  }

  const treeIndex = insertResult.insertedTreeIndex;
  return {
    treeData: getChildren(insertResult.node) || [],
    treeIndex,
    path: [...(insertResult.parentPath || []), getNodeKey({ node: newNode, treeIndex })],
    parentNode: insertResult.parentNode,
  };
}

/**
 * Flattens tree data into visible node metadata.
 */
export function getFlatDataFromTree({
  treeData,
  getNodeKey,
  ignoreCollapsed = true,
}: {
  treeData: TreeNode[] | null | undefined;
  getNodeKey: GetNodeKey;
  ignoreCollapsed?: boolean;
}): TreeNodeInfo[] {
  if (!treeData || treeData.length < 1) {
    return [];
  }

  const flattened: TreeNodeInfo[] = [];
  walk({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: (nodeInfo) => {
      flattened.push(nodeInfo);
    },
  });

  return flattened;
}

/**
 * Rebuilds nested tree data from flat nodes keyed by id and parentId.
 */
export function getTreeFromFlatData({
  flatData,
  getKey = (node: TreeNode) => node.id,
  getParentKey = (node: TreeNode) => node.parentId,
  rootKey = '0',
}: {
  flatData: TreeNode[] | null | undefined;
  getKey?: (node: TreeNode) => TreeKey | null | undefined;
  getParentKey?: (node: TreeNode) => TreeKey | null | undefined;
  rootKey?: TreeKey;
}): TreeNode[] {
  if (!flatData) {
    return [];
  }

  const childrenToParents = new Map<TreeKey | null | undefined, TreeNode[]>();
  flatData.forEach((child) => {
    const parentKey = getParentKey(child);
    childrenToParents.set(parentKey, [...(childrenToParents.get(parentKey) || []), child]);
  });

  if (!childrenToParents.has(rootKey)) {
    return [];
  }

  const traverse = (parent: TreeNode): TreeNode => {
    const parentKey = getKey(parent);
    const children = childrenToParents.get(parentKey);
    if (children) {
      return {
        ...parent,
        children: children.map((child) => traverse(child)),
      };
    }

    return { ...parent };
  };

  return (childrenToParents.get(rootKey) || []).map((child) => traverse(child));
}

/**
 * Returns true when younger is contained anywhere under older.
 */
export function isDescendant(older: TreeNode, younger: TreeNode): boolean {
  const children = getChildren(older);
  return children != null && children.some((child) => child === younger || isDescendant(child, younger));
}

/**
 * Gets the maximum descendant depth for a node.
 */
export function getDepth(node: TreeNode, depth = 0): number {
  const children = getChildren(node);
  if (children == null) {
    return depth;
  }

  return children.reduce((deepest, child) => Math.max(deepest, getDepth(child, depth + 1)), depth);
}

/**
 * Searches tree data and optionally expands matching paths so callers can focus
 * the active match in the visible tree.
 */
export function find({
  getNodeKey,
  treeData,
  searchQuery,
  searchMethod,
  searchFocusOffset,
  expandAllMatchPaths = false,
  expandFocusMatchPaths = true,
}: {
  getNodeKey: GetNodeKey;
  treeData: TreeNode[] | null | undefined;
  searchQuery: unknown;
  searchMethod: (nodeInfo: TreeSearchMethodInfo) => boolean;
  searchFocusOffset?: number;
  expandAllMatchPaths?: boolean;
  expandFocusMatchPaths?: boolean;
}): { matches: TreeSearchMatch[]; treeData: TreeNode[] } {
  let matchCount = 0;
  const traverse = ({
    isPseudoRoot = false,
    node,
    currentIndex,
    path = [],
  }: {
    isPseudoRoot?: boolean;
    node: PseudoTreeNode;
    currentIndex: number;
    path?: TreePath;
  }): { node: PseudoTreeNode; matches: TreeSearchMatch[]; hasFocusMatch: boolean; treeIndex: number } => {
    let matches: TreeSearchMatch[] = [];
    let isSelfMatch = false;
    let hasFocusMatch = false;
    const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node: node as TreeNode, treeIndex: currentIndex })];
    const extraInfo = {
      path: selfPath,
      treeIndex: currentIndex,
    };
    const children = getChildren(node);
    const hasChildren = children != null && children.length > 0;

    if (!isPseudoRoot && searchMethod({ ...extraInfo, node: node as TreeNode, searchQuery })) {
      if (matchCount === searchFocusOffset) {
        hasFocusMatch = true;
      }

      matchCount += 1;
      isSelfMatch = true;
    }

    let childIndex = currentIndex;
    const newNode: PseudoTreeNode = { ...node };
    if (hasChildren && children != null) {
      newNode.children = children.map((child) => {
        const mapResult = traverse({
          node: child,
          currentIndex: childIndex + 1,
          path: selfPath,
        });

        if (mapResult.node.expanded) {
          childIndex = mapResult.treeIndex;
        } else {
          childIndex += 1;
        }

        if (mapResult.matches.length > 0 || mapResult.hasFocusMatch) {
          matches = [...matches, ...mapResult.matches];
          if (mapResult.hasFocusMatch) {
            hasFocusMatch = true;
          }

          if ((expandAllMatchPaths && mapResult.matches.length > 0) || ((expandAllMatchPaths || expandFocusMatchPaths) && mapResult.hasFocusMatch)) {
            newNode.expanded = true;
          }
        }

        return mapResult.node as TreeNode;
      });
    }

    if (!isPseudoRoot && !newNode.expanded) {
      matches = matches.map((match) => ({
        ...match,
        treeIndex: null,
      }));
    }

    if (isSelfMatch) {
      matches = [{ ...extraInfo, node: newNode as TreeNode }, ...matches];
    }

    return {
      node: matches.length > 0 ? newNode : node,
      matches,
      hasFocusMatch,
      treeIndex: childIndex,
    };
  };

  const result = traverse({
    node: { children: treeData || [] },
    isPseudoRoot: true,
    currentIndex: -1,
  });

  return {
    matches: result.matches,
    treeData: getChildren(result.node) || [],
  };
}
