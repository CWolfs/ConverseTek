import { NodeLinkType } from './NodeLinkType';
import { NodeType } from './NodeType';

export type IdRef = {
  id: string;
};

export type ConversationAssetType = {
  filename: string;
  filepath: string;
  conversation: {
    idRef: IdRef;
    uiName: string;
    /** NodeLinks are either roots or branches spoken by the Player */
    roots: NodeLinkType[];
    /** NodeLinks are spoken by the NPCs/game description */
    nodes: NodeType[];
    defaultSpeakerId: string;
    defaultSpeakerOverride: string | null;
    persistentConversation: false;
    speakerOverrideId: string;
  };
};
