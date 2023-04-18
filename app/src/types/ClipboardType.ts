import { NodeLinkType } from './NodeLinkType';
import { NodeType } from './NodeType';

export type ClipboardType = {
  node: NodeType | NodeLinkType;
  originalNodeId: string;
  originalNodeIndex: number | null;
  nodes: (NodeType | NodeLinkType)[];
  nodeIdMap: Map<number, number>;
};
