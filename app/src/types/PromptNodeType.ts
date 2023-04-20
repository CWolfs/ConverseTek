import { ElementNodeType } from './ElementNodeType';
import { OperationCallType } from './OperationCallType';

/** NodeLinks are spoken by the NPCs/game description */
export type PromptNodeType = {
  type: 'node';
  idRef: {
    id: string;
  };
  index: number;
  parentId: string;
  text: string;
  branches: ElementNodeType[];
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
