import { ConversationAssetType } from './ConversationAssetType';
import { ElementNodeType } from './ElementNodeType';
import { PromptNodeType } from './PromptNodeType';

export type AiProviderName = 'codex' | 'claudecode' | string;

export type AiWorkspaceSettingsType = {
  workingDirectory: string;
  contextPaths: string[];
  houseStyleNotes: string;
  defaultCampaignBrief: string;
};

export type AiSettingsType = {
  enabled: boolean;
  selectedProvider: AiProviderName;
  codexCommand: string;
  codexModel: string;
  codexProfile: string;
  timeoutSeconds: number;
  modelCatalogs: Record<string, AiModelCatalogResultType>;
  workspaces: Record<string, AiWorkspaceSettingsType>;
};

export type AiDraftModeType = 'fullConversation' | 'nodeSuggestion' | 'branchExpansion';

export type AiDraftArgType = {
  type: 'string' | 'int' | 'float' | 'bool';
  value: string | number | boolean | null;
};

export type AiDraftOperationIntentType = {
  functionName: string;
  args: AiDraftArgType[];
  note: string;
};

export type AiDraftSpeakerType = {
  type: 'castId' | 'speakerId' | 'none';
  id: string;
};

export type AiDraftChoiceType = {
  text: string;
  targetKey: string;
  endsConversation: boolean;
  auxiliaryLink: boolean;
  conditions: AiDraftOperationIntentType[];
  actions: AiDraftOperationIntentType[];
};

export type AiDraftNodeType = {
  key: string;
  speaker: AiDraftSpeakerType;
  text: string;
  choices: AiDraftChoiceType[];
  actions: AiDraftOperationIntentType[];
};

export type AiConversationDraftType = {
  version: number;
  mode: AiDraftModeType;
  title: string;
  summary: string;
  cast: {
    id: string;
    label: string;
    role: string;
  }[];
  roots: AiDraftChoiceType[];
  nodes: AiDraftNodeType[];
  warnings: string[];
};

export type AiDraftRequestType = {
  mode: AiDraftModeType;
  brief: string;
  workingDirectory: string;
  conversationJson: string;
  selectedNodeJson: string;
  definitionsJson: string;
};

export type AiDraftRunResultType = {
  success: boolean;
  error: string;
  provider: string;
  diagnosticsDirectory: string;
  requestPath: string;
  promptPath: string;
  outputPath: string;
  stdoutPath: string;
  stderrPath: string;
  draftJson: string;
};

export type AiDraftArtifactResultType = {
  success: boolean;
  error: string;
  path: string;
  content: string;
  truncated: boolean;
};

export type AiModelOptionType = {
  slug: string;
  displayName: string;
  description: string;
  defaultReasoningLevel: string;
  priority: number;
};

export type AiModelCatalogResultType = {
  success: boolean;
  error: string;
  provider: string;
  defaultModel: string;
  fromCache: boolean;
  models: AiModelOptionType[];
};

export type ConversationValidationResultType = {
  success: boolean;
  error: string;
};

export type AiDraftValidationResultType = {
  errors: string[];
  warnings: string[];
};

export type AiBranchExpansionPatchType = {
  parentElementNode: ElementNodeType;
  nodes: PromptNodeType[];
};

export type AiAcceptedDraftType =
  | {
      kind: 'fullConversation';
      conversationAsset: ConversationAssetType;
    }
  | {
      kind: 'nodeText';
      text: string;
    }
  | {
      kind: 'branchExpansion';
      patch: AiBranchExpansionPatchType;
    };
