import { OperationType } from './OperationType';

/** NodeLinks are either roots or branches spoken by the Player */
export type NodeLinkType = {
  type: 'root' | 'response';
  idRef: {
    id: string;
  };
  nextNodeIndex: number;
  responseText: string;
  conditions: {
    ops: OperationType[] | null;
  } | null;
  actions: {
    ops: OperationType[] | null;
  } | null;
  hideIfUnavailable: boolean;
  onlyOnce: boolean;
  inputBypass: boolean;
  auxiliaryLink: boolean;
  comment: string | null;
};
