import { OperationType } from './OperationType';

/** NodeLinks are either roots or branches spoken by the Player */
export type NodeLinkType = {
  type: 'root' | 'branch';
  idRef: {
    id: string;
  };
  nextNodeIndex: number;
  responseText: string;
  conditions: OperationType[];
  actions: OperationType[];
  hideIfUnavailable: boolean;
  onlyOnce: boolean;
  inputBypass: boolean;
  auxiliaryLink: boolean;
  comment: string;
};
