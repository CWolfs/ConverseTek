declare module 'react-sortable-tree';

type RSTNodeOnMoveContainer = {
  treeData: object[];
  node: { id: string; type: string; parentId: string };
  nextParentNode: { id: string; children: { id: number }[] };
  prevPath: number[] | string[];
  prevTreeIndex: number;
  nextPath: number[] | string[];
  nextTreeIndex: number;
};

type RSTNodeCanDropContainer = {
  node: { id: string; type: string; parentId: string };
  prevPath: number[] | string[];
  prevParent: { id: string; type: string; parentId: string };
  prevTreeIndex: number;
  nextPath: number[] | string[];
  nextParent: { id: string; type: string; parentId: string };
  nextTreeIndex: number;
};

type RSTNodeCanDragContainer = {
  node: { id: string; type: string; parentId: string };
  path: number[] | string[];
  treeIndex: number;
  lowerSiblingCounts: number[];
  isSearchMatch: bool;
  isSearchFocus: bool;
};
