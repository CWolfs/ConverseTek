declare module 'react-sortable-tree';

type RSTNodeOnMoveContainer = {
  treeData: object[];
  node: RSTNode;
  nextParentNode: { id: string; children: { id: string }[] };
  prevPath: number[] | string[];
  prevTreeIndex: number;
  nextPath: number[] | string[];
  nextTreeIndex: number;
};

type RSTNodeCanDropContainer = {
  node: RSTNode;
  prevPath: number[] | string[];
  prevParent: RSTNode;
  prevTreeIndex: number;
  nextPath: number[] | string[];
  nextParent: RSTNode;
  nextTreeIndex: number;
};

type RSTNodeCanDragContainer = {
  node: RSTNode;
  path: number[] | string[];
  treeIndex: number;
  lowerSiblingCounts: number[];
  isSearchMatch: bool;
  isSearchFocus: bool;
};

type RSTNode = {
  id: string;
  type: string;
  parentId: string;
};
