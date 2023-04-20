import { NodeElementType } from './NodeElementType';
import { NodePromptType } from './NodePromptType';

export type ClipboardType = {
  node: NodePromptType | NodeElementType;
  originalNodeId: string;
  originalNodeIndex: number | null;
  nodes: (NodePromptType | NodeElementType)[];
  nodeIdMap: Map<number, number>;
};
