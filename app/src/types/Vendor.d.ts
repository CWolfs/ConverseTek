declare module 'react-sortable-tree';

type RSTNodeOnMoveContainer = {
  treeData: object[];
  node: RSTNode;
  nextParentNode: { id: string; children: { id: string }[] };
  prevPath: RSTPath;
  prevTreeIndex: number;
  nextPath: RSTPath;
  nextTreeIndex: number;
};

type RSTNodeCanDropContainer = {
  node: RSTNode;
  prevPath: RSTPath;
  prevParent: RSTNode;
  prevTreeIndex: number;
  nextPath: RSTPath;
  nextParent: RSTNode;
  nextTreeIndex: number;
};

type RSTNodeCanDragContainer = {
  node: RSTNode;
  path: RSTPath;
  treeIndex: number;
  lowerSiblingCounts: number[];
  isSearchMatch: bool;
  isSearchFocus: bool;
};

type RSTNode = {
  id?: string;
  type: 'root' | 'node' | 'response' | 'link';
  parentId: string | null;
  expanded?: boolean;
  children?: RSTNode[] | null;
  title: string;
  subtitle?: string;
  canDrag?: boolean;
  linkId?: string | null;
  linkIndex?: number;
  treeIndex?: number;
};

type RSTPath = number[] | string[];
