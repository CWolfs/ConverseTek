import { OperationCallType } from './OperationCallType';

/** NodeLinks are either roots or branches spoken by the Player */
export type NodeLinkType = {
  type: 'root' | 'response';
  idRef: {
    id: string;
  };
  parentId: string;
  nextNodeIndex: number;
  responseText: string;
  conditions: {
    ops: OperationCallType[] | null;
  } | null;
  actions: {
    ops: OperationCallType[] | null;
  } | null;
  hideIfUnavailable: boolean;
  onlyOnce: boolean;
  inputBypass: boolean;
  auxiliaryLink: boolean;
  comment: string | null;
  deleting?: boolean;
};
