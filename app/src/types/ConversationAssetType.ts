import { ElementNodeType } from './ElementNodeType';
import { PromptNodeType } from './PromptNodeType';

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
    roots: ElementNodeType[];
    /** NodeLinks are spoken by the NPCs/game description */
    nodes: PromptNodeType[];
    defaultSpeakerId: string;
    defaultSpeakerOverride: string | null;
    persistentConversation: false;
    speakerOverrideId: string;
  };
};
