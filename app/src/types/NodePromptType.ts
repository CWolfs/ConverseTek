import { NodeElementType } from './NodeElementType';
import { OperationCallType } from './OperationCallType';

/** NodeLinks are spoken by the NPCs/game description */
export type NodePromptType = {
  type: 'node';
  idRef: {
    id: string;
  };
  index: number;
  parentId: string;
  text: string;
  branches: NodeElementType[];
  nodeType: number;
  truthValue: boolean;
  autoFollowBranchDelay: number;
  inputMaxLength: number;
  sourceTopicRef: null; // Not used in BT
  subjectTopicRefs: [] | null; // Not used in BT
  sourceInSceneRef: {
    id: string;
  } | null;
  sourceWithTagInScene: null; // Not used in BT
  speakerType: 'speakerId' | 'castId' | null;
  overrideSpeaker: null; // Not used in BT
  speakerOverrideId: string;
  actions: {
    ops: OperationCallType[] | null;
  } | null;
  comment: string | null;
  deleting?: boolean;
};
