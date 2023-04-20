import { ElementNodeType } from './ElementNodeType';
import { PromptNodeType } from './PromptNodeType';

export type ClipboardType = {
  copiedNode: PromptNodeType | ElementNodeType;
  originalNodeId: string;
  originalNodeIndex: number | null;
  nodes: (PromptNodeType | ElementNodeType)[];
  nodeIdMap: Map<number, number>; // <original node index, new node index>
};
