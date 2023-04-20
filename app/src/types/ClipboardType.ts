import { ElementNodeType } from './ElementNodeType';
import { PromptNodeType } from './PromptNodeType';

export type ClipboardType = {
  node: PromptNodeType | ElementNodeType;
  originalNodeId: string;
  originalNodeIndex: number | null;
  nodes: (PromptNodeType | ElementNodeType)[];
  nodeIdMap: Map<number, number>;
};
