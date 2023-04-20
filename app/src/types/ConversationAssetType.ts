import { NodeElementType } from './NodeElementType';
import { NodePromptType } from './NodePromptType';

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
    roots: NodeElementType[];
    /** NodeLinks are spoken by the NPCs/game description */
    nodes: NodePromptType[];
    defaultSpeakerId: string;
    defaultSpeakerOverride: string | null;
    persistentConversation: false;
    speakerOverrideId: string;
  };
};
