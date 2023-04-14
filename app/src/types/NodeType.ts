import { NodeLinkType } from './NodeLinkType';
import { OperationType } from './OperationType';

/** NodeLinks are spoken by the NPCs/game description */
export type NodeType = {
  type: 'node';
  idRef: {
    id: string;
  };
  index: number;
  text: string;
  branches: NodeLinkType[];
  nodeType: number;
  truthValue: boolean;
  autoFollowBranchDelay: number;
  inputMaxLength: number;
  sourceTopicRef: null; // Not used in BT
  subjectTopicRefs: [] | null; // Not used in BT
  sourceInSceneRef: null;
  sourceWithTagInScene: null; // Not used in BT
  speakerType: 'speakerId' | null;
  overrideSpeaker: null; // Not used in BT
  speakerOverrideId: string;
  actions: OperationType[] | null;
  comment: string | null;
};
