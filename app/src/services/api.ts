import { runInAction } from 'mobx';

import {
  AiCastPersonalityType,
  AiDraftArtifactResultType,
  AiDraftRequestType,
  AiDraftRunResultType,
  AiModelCatalogResultType,
  AiModelOptionType,
  AiSettingsType,
  AiWorkspaceSettingsType,
  ConversationAssetType,
  ConversationValidationResultType,
  DefinitionsType,
  DependencyStatusType,
  DirectoryItemType,
  FileItemSystemType,
  InputType,
  InputTypeType,
  InputValueType,
  OperationDefinitionType,
  PresetDefinitionType,
  QuickLinkType,
  TagDefinitionType,
  ColourConfigType,
} from 'types';
import { consolidateSpeaker, rebuildNodeIndexes, removeAllOldFillerNodes } from 'utils/conversation-utils';

import { get, post } from './rest';

import { dataStore, defStore, nodeStore } from '../stores';
import { fullConversationAssetMapping, mapToType, reversedFullConversationAssetMapping } from './mappings/mapping';

const AI_DEBUG_PREFIX = '[ConverseTek AI Settings]';
export const AI_SETTINGS_UPDATED_EVENT = 'conversetek-ai-settings-updated';

type DirectoryListingType = {
  directories: DirectoryItemType[];
  files: FileItemSystemType[];
};

type QuickLinksResponseType = Record<string, string>;

// Backend wire DTOs mirror Json.NET's UpperCamelCase output and are mapped at this API boundary.
type AiModelOptionResponseType = {
  Slug?: string;
  DisplayName?: string;
  Description?: string;
  DefaultReasoningLevel?: string;
  Priority?: number;
};

type AiModelCatalogResponseType = {
  Success?: boolean;
  Error?: string | null;
  Provider?: string;
  DefaultModel?: string;
  FromCache?: boolean;
  Models?: AiModelOptionResponseType[];
};

type AiWorkspaceSettingsResponseType = {
  WorkingDirectory?: string;
  ContextPaths?: string[];
  HouseStyleNotes?: string;
  DefaultCampaignBrief?: string;
  CastPersonalities?: AiCastPersonalityResponseType[];
};

type AiCastPersonalityResponseType = {
  Id?: string;
  Label?: string;
  CastIds?: string[];
  SpeakerIds?: string[];
  Rules?: string;
  Enabled?: boolean | null;
  DefaultKey?: string;
};

type AiSettingsResponseType = {
  Enabled?: boolean | null;
  SelectedProvider?: string;
  CodexCommand?: string;
  CodexModel?: string;
  CodexProfile?: string;
  TimeoutSeconds?: number;
  ModelCatalogs?: Record<string, AiModelCatalogResponseType>;
  Workspaces?: Record<string, AiWorkspaceSettingsResponseType>;
  DefaultCastPersonalities?: AiCastPersonalityResponseType[];
};

type AiDraftRunResponseType = {
  Success: boolean;
  Error: string | null;
  Provider: string;
  DiagnosticsDirectory: string;
  RequestPath: string;
  PromptPath: string;
  OutputPath: string;
  StdoutPath: string;
  StderrPath: string;
  DraftJson: string;
};

type AiDraftArtifactResponseType = {
  Success: boolean;
  Error: string | null;
  Path: string;
  Content: string;
  Truncated: boolean;
};

type ConversationValidationResponseType = {
  Success: boolean;
  Error: string | null;
};

type FsDirectoryResponseType = {
  Name: string;
  Path: string;
  HasChildren: boolean;
  IsDirectory: boolean;
};

type FsFileResponseType = {
  Name: string;
  Path: string;
  IsFile: boolean;
};

type DirectoryListingResponseType = {
  directories: FsDirectoryResponseType[];
  files: FsFileResponseType[];
};

type OperationInputValueResponseType = {
  ViewLabel?: string;
  Text?: string;
  Value?: string | number;
};

type OperationInputResponseType = {
  Label?: string;
  Types?: InputTypeType[];
  Tooltip?: string;
  ViewLabel?: string;
  Values?: OperationInputValueResponseType[];
  DefaultValue?: string | number | null;
};

type OperationDefinitionResponseType = {
  Key?: string;
  Label?: string;
  View?: OperationDefinitionType['view'];
  Scope?: OperationDefinitionType['scope'];
  Category?: OperationDefinitionType['category'];
  Tooltip?: string;
  Inputs?: OperationInputResponseType[];
};

type PresetDefinitionResponseType = {
  Key?: string;
  Label?: string;
  Type?: PresetDefinitionType['type'];
  Values?: Record<string, string | number | boolean | null>;
};

type TagDefinitionResponseType = {
  Scope?: string | null;
  Type?: string;
  Tags?: string[];
};

type DefinitionsResponseType = {
  operations: OperationDefinitionResponseType[];
  presets: PresetDefinitionResponseType[];
  tags: TagDefinitionResponseType[];
};

/*
 * The desktop bridge exposes GET and POST routes, so PUT and DELETE style actions are sent as POSTs with method data.
 * e.g. { method: 'DELETE' }
 */

/*
======================
 || UTILITY METHODS ||
 =====================
*/
export default function noop() {
  return {};
}

/*
=====================
 || STATUS METHODS ||
 ====================
*/
export function getDependencyStatus(): Promise<DependencyStatusType> {
  return get<DependencyStatusType>('/dependency-status');
}

/*
============================
 || CONVERSATIONS METHODS ||
 ===========================
*/
export function getConversations(): Promise<ConversationAssetType[]> {
  return get<object[]>('/conversations').then((conversations): ConversationAssetType[] => {
    const typedConversations = conversations.map((conversation) => mapToType<ConversationAssetType>(conversation, fullConversationAssetMapping));
    dataStore.setConversations(typedConversations);
    return typedConversations;
  });
}

function stripTransientConversationFields(conversationAsset: ConversationAssetType): void {
  const conversation = conversationAsset.conversation as unknown as {
    roots?: Record<string, unknown>[];
    nodes?: (Record<string, unknown> & { branches?: Record<string, unknown>[] })[];
  };

  conversation.roots?.forEach((root) => {
    delete root.deleting;
  });

  conversation.nodes?.forEach((node) => {
    delete node.deleting;
    delete node.speakerType;

    node.branches?.forEach((branch) => {
      delete branch.deleting;
    });
  });
}

export function updateConversation(id: string, conversationAsset: ConversationAssetType): Promise<ConversationAssetType[]> {
  runInAction(() => {
    consolidateSpeaker(conversationAsset);
    removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
    rebuildNodeIndexes(conversationAsset);
    stripTransientConversationFields(conversationAsset);

    const nodeID = nodeStore.getActiveNodeId();
    if (nodeID) {
      setTimeout(() => nodeStore.setActiveNode(nodeID));
    }
  });

  const apiMappedConversation = mapToType<object>(conversationAsset, reversedFullConversationAssetMapping);

  return post<object[]>('/conversations/put', { id }, { method: 'PUT', conversationAsset: apiMappedConversation }).then(
    (conversations): ConversationAssetType[] => {
      const typedConversations = conversations.map((conversation) => mapToType<ConversationAssetType>(conversation, fullConversationAssetMapping));
      dataStore.setConversations(typedConversations);
      dataStore.setConversationDirty(false);
      return typedConversations;
    },
  );
}

export function exportConversation(id: string, conversationAsset: ConversationAssetType): Promise<unknown> {
  runInAction(() => {
    consolidateSpeaker(conversationAsset);
    removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
    rebuildNodeIndexes(conversationAsset);
    stripTransientConversationFields(conversationAsset);

    const nodeID = nodeStore.getActiveNodeId();
    if (nodeID) {
      setTimeout(() => nodeStore.setActiveNode(nodeID));
    }
  });

  const apiMappedConversation = mapToType<object>(conversationAsset, reversedFullConversationAssetMapping);

  return post('/conversations/export', { id }, { method: 'PUT', conversationAsset: apiMappedConversation });
}

export function exportAllConversations(id: string, conversationAsset: ConversationAssetType | null): Promise<unknown> {
  if (conversationAsset) {
    runInAction(() => {
      consolidateSpeaker(conversationAsset);
      removeAllOldFillerNodes(conversationAsset); // This only exists to fix old conversations pre-v1.4
      rebuildNodeIndexes(conversationAsset);
      stripTransientConversationFields(conversationAsset);

      const nodeID = nodeStore.getActiveNodeId();
      if (nodeID) {
        setTimeout(() => nodeStore.setActiveNode(nodeID));
      }
    });
  }

  return post('/conversations/export-all', { id }, { method: 'PUT', conversationAsset });
}

export function importConversation(path: string): Promise<unknown> {
  dataStore.clearActiveConversation();
  return post('/conversations/import', { path });
}

export function deleteConversation(path: string): Promise<unknown> {
  return post('/conversations/delete', { path });
}

function normaliseAiModelOption(model: AiModelOptionResponseType): AiModelOptionType {
  return {
    slug: model.Slug ?? '',
    displayName: model.DisplayName ?? '',
    description: model.Description ?? '',
    defaultReasoningLevel: model.DefaultReasoningLevel ?? '',
    priority: model.Priority ?? 0,
  };
}

function normaliseAiModelCatalog(source: AiModelCatalogResponseType): AiModelCatalogResultType {
  const rawModels = source.Models ?? [];

  return {
    success: source.Success ?? false,
    error: source.Error ?? '',
    provider: source.Provider ?? '',
    defaultModel: source.DefaultModel ?? '',
    fromCache: source.FromCache ?? false,
    models: rawModels.map(normaliseAiModelOption),
  };
}

function normaliseAiCastPersonality(source: AiCastPersonalityResponseType): AiCastPersonalityType {
  return {
    id: source.Id ?? '',
    label: source.Label ?? '',
    castIds: source.CastIds ?? [],
    speakerIds: source.SpeakerIds ?? [],
    rules: source.Rules ?? '',
    enabled: source.Enabled ?? true,
    defaultKey: source.DefaultKey ?? '',
  };
}

function normaliseAiWorkspaceSettings(source: AiWorkspaceSettingsResponseType): AiWorkspaceSettingsType {
  return {
    workingDirectory: source.WorkingDirectory ?? '',
    contextPaths: source.ContextPaths ?? [],
    houseStyleNotes: source.HouseStyleNotes ?? '',
    defaultCampaignBrief: source.DefaultCampaignBrief ?? '',
    castPersonalities: (source.CastPersonalities ?? []).map(normaliseAiCastPersonality),
  };
}

function normaliseAiSettings(source: AiSettingsResponseType): AiSettingsType {
  const rawModelCatalogs = source.ModelCatalogs ?? {};
  const rawWorkspaces = source.Workspaces ?? {};
  const modelCatalogs: Record<string, AiModelCatalogResultType> = {};
  const workspaces: Record<string, AiWorkspaceSettingsType> = {};

  for (const [providerName, catalog] of Object.entries(rawModelCatalogs)) {
    modelCatalogs[providerName] = normaliseAiModelCatalog(catalog);
  }

  for (const [workspaceKey, workspaceSettings] of Object.entries(rawWorkspaces)) {
    workspaces[workspaceKey] = normaliseAiWorkspaceSettings(workspaceSettings);
  }

  const settings = {
    enabled: source.Enabled ?? true,
    selectedProvider: source.SelectedProvider ?? 'codex',
    codexCommand: source.CodexCommand ?? 'codex',
    codexModel: source.CodexModel ?? '',
    codexProfile: source.CodexProfile ?? '',
    timeoutSeconds: source.TimeoutSeconds ?? 300,
    modelCatalogs,
    workspaces,
    defaultCastPersonalities: (source.DefaultCastPersonalities ?? []).map(normaliseAiCastPersonality),
  };

  console.log(`${AI_DEBUG_PREFIX} normaliseAiSettings`, {
    rawSelectedProvider: source.SelectedProvider,
    rawEnabled: source.Enabled,
    rawCodexModel: source.CodexModel,
    normalisedEnabled: settings.enabled,
    normalisedSelectedProvider: settings.selectedProvider,
    normalisedCodexModel: settings.codexModel,
    modelCatalogKeys: Object.keys(settings.modelCatalogs),
    workspaceKeys: Object.keys(settings.workspaces),
    rawKeys: Object.keys(source),
  });

  return settings;
}

function notifyAiSettingsUpdated(settings: AiSettingsType): AiSettingsType {
  window.dispatchEvent(new CustomEvent<AiSettingsType>(AI_SETTINGS_UPDATED_EVENT, { detail: settings }));
  return settings;
}

function normaliseAiDraftRunResult(result: AiDraftRunResponseType): AiDraftRunResultType {
  return {
    success: result.Success,
    error: result.Error ?? '',
    provider: result.Provider,
    diagnosticsDirectory: result.DiagnosticsDirectory,
    requestPath: result.RequestPath,
    promptPath: result.PromptPath,
    outputPath: result.OutputPath,
    stdoutPath: result.StdoutPath,
    stderrPath: result.StderrPath,
    draftJson: result.DraftJson,
  };
}

function normaliseAiDraftArtifact(result: AiDraftArtifactResponseType): AiDraftArtifactResultType {
  return {
    success: result.Success,
    error: result.Error ?? '',
    path: result.Path,
    content: result.Content,
    truncated: result.Truncated,
  };
}

function normaliseConversationValidation(result: ConversationValidationResponseType): ConversationValidationResultType {
  return {
    success: result.Success,
    error: result.Error ?? '',
  };
}

function normaliseDirectory(directory: FsDirectoryResponseType): DirectoryItemType {
  return {
    name: directory.Name,
    path: directory.Path,
    isDirectory: true,
    isFile: false,
    hasChildren: directory.HasChildren,
    isQuickLink: false,
  };
}

function normaliseFile(file: FsFileResponseType): FileItemSystemType {
  return {
    name: file.Name,
    path: file.Path,
    isDirectory: false,
    isFile: true,
  };
}

function normaliseInputValue(value: OperationInputValueResponseType): InputValueType {
  return {
    viewLabel: value.ViewLabel,
    text: value.Text ?? '',
    value: value.Value ?? '',
  };
}

function normaliseOperationInput(input: OperationInputResponseType): InputType {
  return {
    label: input.Label ?? '',
    types: input.Types ?? [],
    tooltip: input.Tooltip,
    viewLabel: input.ViewLabel,
    values: input.Values?.map(normaliseInputValue),
    defaultValue: input.DefaultValue ?? null,
  };
}

function normaliseOperationDefinition(definition: OperationDefinitionResponseType): OperationDefinitionType {
  return {
    key: definition.Key ?? '',
    label: definition.Label ?? '',
    view: definition.View ?? [],
    scope: definition.Scope ?? 'action',
    category: definition.Category ?? 'primary',
    tooltip: definition.Tooltip ?? '',
    inputs: (definition.Inputs ?? []).map(normaliseOperationInput),
  };
}

function normalisePresetDefinition(definition: PresetDefinitionResponseType): PresetDefinitionType {
  const values = definition.Values ?? {};
  const normalisedValues: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    normalisedValues[key] = value == null ? '' : String(value);
  }

  return {
    key: definition.Key ?? '',
    label: definition.Label ?? '',
    type: definition.Type ?? 'int',
    values: normalisedValues,
  };
}

function normaliseTagDefinition(definition: TagDefinitionResponseType): TagDefinitionType {
  return {
    scope: definition.Scope ?? null,
    type: definition.Type,
    tags: definition.Tags ?? [],
  };
}

function normaliseDefinitions(definitions: DefinitionsResponseType): DefinitionsType {
  return {
    operations: definitions.operations.map(normaliseOperationDefinition),
    presets: definitions.presets.map(normalisePresetDefinition),
    tags: definitions.tags.map(normaliseTagDefinition),
  };
}

export function getAiSettings(): Promise<AiSettingsType> {
  return get<AiSettingsResponseType>('/ai/settings/current').then((settings) => {
    console.log(`${AI_DEBUG_PREFIX} getAiSettings raw response`, settings);
    return normaliseAiSettings(settings);
  });
}

export function saveAiSettings(settings: AiSettingsType): Promise<AiSettingsType> {
  console.log(`${AI_DEBUG_PREFIX} saveAiSettings request`, {
    selectedProvider: settings.selectedProvider,
    codexModel: settings.codexModel,
    modelCatalogKeys: Object.keys(settings.modelCatalogs || {}),
  });

  return post<AiSettingsResponseType>('/ai/settings', {}, { settings }).then((updatedSettings) => {
    console.log(`${AI_DEBUG_PREFIX} saveAiSettings raw response`, updatedSettings);
    return notifyAiSettingsUpdated(normaliseAiSettings(updatedSettings));
  });
}

export function saveAiWorkspaceSettings(workspaceSettings: AiWorkspaceSettingsType): Promise<AiSettingsType> {
  console.log(`${AI_DEBUG_PREFIX} saveAiWorkspaceSettings request`, {
    workingDirectory: workspaceSettings.workingDirectory,
    contextPathCount: workspaceSettings.contextPaths.length,
  });

  return post<AiSettingsResponseType>('/ai/settings', {}, { workspaceSettings }).then((updatedSettings) => {
    console.log(`${AI_DEBUG_PREFIX} saveAiWorkspaceSettings raw response`, updatedSettings);
    return notifyAiSettingsUpdated(normaliseAiSettings(updatedSettings));
  });
}

export function createAiDraft(request: AiDraftRequestType): Promise<AiDraftRunResultType> {
  return post<AiDraftRunResponseType>('/ai/draft', {}, { request }).then(normaliseAiDraftRunResult);
}

export function getAiDraftArtifact(path: string): Promise<AiDraftArtifactResultType> {
  return post<AiDraftArtifactResponseType>('/ai/draft-artifact', {}, { path }).then(normaliseAiDraftArtifact);
}

export function getAiModels(settings: AiSettingsType, forceRefresh = false): Promise<AiModelCatalogResultType> {
  console.log(`${AI_DEBUG_PREFIX} getAiModels request`, {
    selectedProvider: settings.selectedProvider,
    codexModel: settings.codexModel,
    forceRefresh,
  });

  return post<AiModelCatalogResponseType>('/ai/models', {}, { settings, forceRefresh }).then((result) => {
    const catalog = normaliseAiModelCatalog(result);
    console.log(`${AI_DEBUG_PREFIX} getAiModels response`, {
      provider: catalog.provider,
      success: catalog.success,
      fromCache: catalog.fromCache,
      modelCount: catalog.models.length,
      modelSlugs: catalog.models.map((model) => model.slug),
    });
    return catalog;
  });
}

export function validateConversationRoundTrip(conversationAsset: ConversationAssetType): Promise<ConversationValidationResultType> {
  stripTransientConversationFields(conversationAsset);
  const apiMappedConversation = mapToType<object>(conversationAsset, reversedFullConversationAssetMapping);
  return post<ConversationValidationResponseType>('/ai/validate-conversation', {}, { conversationAsset: apiMappedConversation }).then(
    normaliseConversationValidation,
  );
}

/*
==========================
 || FILE SYSTEM METHODS ||
 =========================
*/
export function getRootDrives(): Promise<DirectoryItemType[]> {
  return get<FsDirectoryResponseType[]>('/filesystem').then((directories): DirectoryItemType[] => directories.map(normaliseDirectory));
}

export function getDirectories(path: string, includeFiles = false, fileExtensions: string[] = []): Promise<DirectoryListingType> {
  return get<DirectoryListingResponseType>('/directories', { path, includeFiles, fileExtensions }).then((result): DirectoryListingType => ({
    directories: result.directories.map(normaliseDirectory),
    files: result.files.map(normaliseFile),
  }));
}

export function getQuickLinks(): Promise<QuickLinkType[]> {
  return get<QuickLinksResponseType>('/quicklinks').then((quickLinks) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function addQuickLink(title: string, path: string): Promise<QuickLinkType[]> {
  const modifiedPath = path.replaceAll('\\', '/');

  return post<QuickLinksResponseType>('/add-quicklink', { title, path: modifiedPath }).then((quickLinks) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function removeQuickLink(title: string, path: string): Promise<QuickLinkType[]> {
  const modifiedPath = path.replaceAll('\\', '/');
  return post<QuickLinksResponseType>('/remove-quicklink', { title, path: modifiedPath }).then((quickLinks) => {
    const entries: QuickLinkType[] = [];
    for (const [key, value] of Object.entries(quickLinks)) {
      entries.push({ title: key, path: value } as QuickLinkType);
    }
    return entries;
  });
}

export function getColourConfig(): Promise<void> {
  return get<ColourConfigType>('/colour-config').then((colourConfig) => {
    dataStore.setColourConfig(colourConfig);
  });
}

export function saveWorkingDirectory(path: string, name: string): Promise<unknown> {
  dataStore.setWorkingDirectory(path, name);
  return post('/working-directory', { path });
}

/*
==========================
 || DEFINITIONS METHODS ||
 =========================
*/
export function getDefinitions(): Promise<DefinitionsType> {
  return get<DefinitionsResponseType>('/definitions').then((definitions): DefinitionsType => {
    const typedDefinitions = normaliseDefinitions(definitions);
    defStore.setDefinitions(typedDefinitions);
    return typedDefinitions;
  });
}
