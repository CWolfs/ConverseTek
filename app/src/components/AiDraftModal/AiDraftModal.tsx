import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toJS } from 'mobx';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Alert, Button, Checkbox, Col, Form, Input, message, Radio, Row, Select, Spin, Tabs, Tag, Tooltip } from 'antd';
import {
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import classnames from 'classnames';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { DefStore } from 'stores/defStore/def-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { NodeStore } from 'stores/nodeStore/node-store';
import { AiContextPathPicker } from 'components/AiContextPathPicker';
import { AiDraftConversationTreePreview } from './AiDraftConversationTreePreview';
import { AiDraftArtifactViewer } from './AiDraftArtifactViewer';
import {
  createAiDraft,
  getAiDraftArtifact,
  getAiModels,
  getAiSettings,
  saveAiSettings,
  saveAiWorkspaceSettings,
  validateConversationRoundTrip,
} from 'services/api';
import { addNodes, getId, updatePromptNode, updateResponseNode, updateRootNode } from 'utils/conversation-utils';
import {
  buildAcceptedDraft,
  buildPreviewConversationAssetFromDraft,
  getOriginalNodeText,
  getSuggestedNodeTexts,
  parseAiDraft,
  validateAiDraft,
} from 'utils/ai-draft-utils';
import {
  AiCastPersonalityType,
  AiConversationDraftType,
  AiDraftModeType,
  AiDraftRunResultType,
  AiDraftValidationResultType,
  AiModelCatalogResultType,
  AiModelOptionType,
  AiSettingsType,
  AiWorkspaceSettingsType,
  ConversationAssetType,
  ElementNodeType,
  PromptNodeType,
} from 'types';

import './AiDraftModal.css';

const { TextArea } = Input;
const { Option } = Select;
type TabsItems = NonNullable<React.ComponentProps<typeof Tabs>['items']>;
const AI_DEBUG_PREFIX = '[ConverseTek AI Modal]';

const fallbackReasoningEfforts = [
  { effort: 'low', label: 'Low', description: 'Fast responses with lighter reasoning.' },
  { effort: 'medium', label: 'Medium', description: 'Balanced speed and reasoning depth.' },
  { effort: 'high', label: 'High', description: 'Better for branch planning and tangled context.' },
  { effort: 'xhigh', label: 'Extra high', description: 'Slowest, deepest pass for difficult drafts.' },
];

type QuickShotPrompt = {
  label: string;
  prompt: string;
};

const rewriteQuickShotPrompts: QuickShotPrompt[] = [
  {
    label: 'Give me alternate versions',
    prompt: 'Give me alternate versions with clearly different flavours, not minor wording tweaks.',
  },
  {
    label: 'Make it tighter',
    prompt: 'Make the result shorter, punchier, and suitable for quick BattleTech dialogue bubbles.',
  },
  {
    label: 'Push character voice',
    prompt: "Lean harder into the selected speaker's voice while keeping the line natural and in British English.",
  },
];

const promptBranchQuickShotPrompts: QuickShotPrompt[] = [
  {
    label: 'Add practical response',
    prompt:
      'Add a new response choice from this prompt, then expand it into a sensible short branch. Make the first response a natural Commander line with intent or concern, not a terse command or abstract menu label. Most later choices should also be spoken Commander lines of roughly 5-14 words; only use very short labels for clear mechanical actions. Good style: "Can we push those sensors harder without cooking the ship?" Bad style: "Authorise deep sweep." Add action or condition intents when the branch clearly changes money, time, tags, contracts, or other game state.',
  },
  {
    label: 'Add risky branch',
    prompt:
      'Add a new conversational Commander response that explores a more dangerous or costly option, then branch into grounded consequences and a clear next decision. Make the first response curious, sceptical, or decisive in-world rather than a terse command. Keep most follow-up choices as compact spoken lines, not button labels; vary length naturally and let only one or two choices be very short if the beat earns it. Avoid labels like Pick Risky Option or Authorise Scan unless the choice is intentionally mechanical. If the branch has a cost, delay, tag, or other game-state consequence, add suitable action or condition intents with advisory placeholder values.',
  },
  {
    label: 'Add character-led branch',
    prompt:
      'Add a new conversational Commander response that invites the most relevant character to weigh in, then continue with their voice, priorities, and a useful follow-up choice. Make the first response sound like a player asking for judgement or a second opinion, not a menu label. Keep most follow-up choices as compact spoken lines rather than labels like Proceed, Do it, or Stand down. Add action or condition intents when the branch clearly changes money, time, tags, contracts, or other game state.',
  },
];

const elementBranchQuickShotPrompts: QuickShotPrompt[] = [
  {
    label: 'Continue this branch',
    prompt:
      'Continue from the selected response with a sensible short follow-up branch that fits the current conversation context. Keep most new choices conversational, roughly 5-14 words, unless a bracketed mechanical action is genuinely appropriate. Add action or condition intents when the continuation clearly changes money, time, tags, contracts, or other game state.',
  },
  {
    label: 'Escalate consequences',
    prompt:
      'Continue from the selected response by escalating the practical stakes, risks, or cost, then give the player clear conversational choices. Avoid making every choice a terse command; mix short punchy options with fuller spoken lines. If the branch has a cost, delay, tag, or other game-state consequence, add suitable action or condition intents with advisory placeholder values.',
  },
  {
    label: 'Add character reaction',
    prompt:
      'Continue from the selected response with a focused reaction from the most relevant character, preserving their voice and moving the scene forward with natural response choices. Keep most choices as things the Commander could say, not admin labels. Add action or condition intents when the reaction clearly changes money, time, tags, contracts, or other game state.',
  },
];

function getQuickShotPrompts(mode: AiDraftModeType, selectedNode: PromptNodeType | ElementNodeType | null): QuickShotPrompt[] {
  if (mode === 'nodeSuggestion') return rewriteQuickShotPrompts;
  if (mode === 'branchExpansion' && selectedNode?.type === 'node') return promptBranchQuickShotPrompts;
  if (mode === 'branchExpansion') return elementBranchQuickShotPrompts;
  return [];
}

type Props = {
  globalModalId: string;
  mode: AiDraftModeType;
  selectedNodeId?: string;
};

const emptySettings: AiSettingsType = {
  enabled: true,
  selectedProvider: 'codex',
  codexCommand: 'codex',
  codexModel: '',
  codexReasoningEffort: '',
  codexProfile: '',
  timeoutSeconds: 300,
  modelCatalogs: {},
  workspaces: {},
  defaultCastPersonalities: [],
};

type ProviderUi = {
  displayName: string;
  commandLabel: string;
  commandPlaceholder: string;
  modelLabel: string;
  profileLabel: string;
  profilePlaceholder: string;
};

function getModeTitle(mode: AiDraftModeType): string {
  if (mode === 'fullConversation') return 'AI Draft Conversation';
  if (mode === 'branchExpansion') return 'AI Expand Branch';
  return 'AI Suggest Node Text';
}

function getAcceptLabel(mode: AiDraftModeType): string {
  if (mode === 'fullConversation') return 'Open In Main Editor';
  return 'Accept';
}

function getRewriteContextLabel(selectedNode: PromptNodeType | ElementNodeType | null): string {
  if (selectedNode?.type === 'node') return 'Current prompt';
  if (selectedNode?.type === 'root') return 'Current root response';
  return 'Current response';
}

function splitDraftWarnings(warnings: string[]): { structuralWarnings: string[]; advisoryNotes: string[] } {
  return warnings.reduce(
    (result, warning) => {
      if (warning.startsWith('AI warning:')) {
        result.advisoryNotes.push(warning.replace(/^AI warning:\s*/, ''));
      } else {
        result.structuralWarnings.push(warning);
      }

      return result;
    },
    { structuralWarnings: [] as string[], advisoryNotes: [] as string[] },
  );
}

function shouldShowSelectedNodeContext(mode: AiDraftModeType, selectedNode: PromptNodeType | ElementNodeType | null, draft: AiConversationDraftType | null): boolean {
  if (selectedNode == null || draft != null) return false;
  return mode === 'nodeSuggestion' || (mode === 'branchExpansion' && selectedNode.type === 'node');
}

function getDefaultCommandForProvider(providerName: string): string {
  return providerName === 'claudecode' ? 'claude' : 'codex';
}

function getProviderUi(providerName: string): ProviderUi {
  if (providerName === 'claudecode') {
    return {
      displayName: 'Claude Code CLI',
      commandLabel: 'Claude Code command',
      commandPlaceholder: 'claude',
      modelLabel: 'Claude model',
      profileLabel: 'Claude profile',
      profilePlaceholder: 'Default Claude Code profile',
    };
  }

  return {
    displayName: 'Codex CLI',
    commandLabel: 'Codex command',
    commandPlaceholder: 'codex',
    modelLabel: 'Codex model',
    profileLabel: 'Codex profile',
    profilePlaceholder: 'Default Codex profile',
  };
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <span className="ai-draft-modal__field-label">
      <span>{label}</span>
      <Tooltip title={help}>
        <QuestionCircleOutlined className="ai-draft-modal__help-icon" />
      </Tooltip>
    </span>
  );
}

function normaliseWorkspaceKey(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/g, '').toLowerCase();
}

function createWorkspaceSettings(workingDirectory: string, defaultPersonalities: AiCastPersonalityType[] = []): AiWorkspaceSettingsType {
  return {
    workingDirectory,
    contextPaths: [],
    houseStyleNotes: '',
    defaultCampaignBrief: '',
    castPersonalities: cloneDefaultCastPersonalities(defaultPersonalities),
  };
}

function cloneDefaultCastPersonalities(defaultPersonalities: AiCastPersonalityType[]): AiCastPersonalityType[] {
  return defaultPersonalities.map((personality) => ({
    ...personality,
    castIds: [...personality.castIds],
    speakerIds: [...personality.speakerIds],
  }));
}

function makePersonalityId(prefix = 'custom'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCustomCastPersonality(): AiCastPersonalityType {
  return {
    id: makePersonalityId(),
    label: 'New personality',
    castIds: [],
    speakerIds: [],
    rules: '',
    enabled: true,
    defaultKey: '',
  };
}

function cloneCastPersonality(personality: AiCastPersonalityType): AiCastPersonalityType {
  return {
    ...personality,
    id: makePersonalityId('copy'),
    label: `${personality.label || 'Personality'} Copy`,
    castIds: [...personality.castIds],
    speakerIds: [...personality.speakerIds],
    defaultKey: '',
  };
}

function normaliseIdTags(values: string[]): string[] {
  const seenValues = new Set<string>();
  const normalisedValues: string[] = [];

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const key = value.toLowerCase();
      if (seenValues.has(key)) return;
      seenValues.add(key);
      normalisedValues.push(value);
    });

  return normalisedValues;
}

function matchesPersonalitySearch(personality: AiCastPersonalityType, searchTerm: string): boolean {
  const trimmedSearchTerm = searchTerm.trim().toLowerCase();
  if (trimmedSearchTerm === '') return true;

  return [personality.label, personality.defaultKey, ...personality.castIds, ...personality.speakerIds]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(trimmedSearchTerm));
}

function AiDraftModal({ globalModalId, mode, selectedNodeId }: Props) {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');
  const modalStore = useStore<ModalStore>('modal');
  const nodeStore = useStore<NodeStore>('node');

  const [settings, setSettings] = useState<AiSettingsType>(emptySettings);
  const [workspaceSettings, setWorkspaceSettings] = useState<AiWorkspaceSettingsType | null>(null);
  const [brief, setBrief] = useState('');
  const [draft, setDraft] = useState<AiConversationDraftType | null>(null);
  const [validation, setValidation] = useState<AiDraftValidationResultType>({ errors: [], warnings: [] });
  const [modelCatalog, setModelCatalog] = useState<AiModelCatalogResultType | null>(null);
  const [diagnosticsPath, setDiagnosticsPath] = useState('');
  const [draftRunResult, setDraftRunResult] = useState<AiDraftRunResultType | null>(null);
  const [activeTab, setActiveTab] = useState('draft');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [personalitySearch, setPersonalitySearch] = useState('');
  const [selectedPersonalityId, setSelectedPersonalityId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);

  const { workingDirectory, unsavedActiveConversationAsset } = dataStore;
  const isVisible = modalStore.options.get(globalModalId)?.isVisible === true;
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return nodeStore.activeNode;
    return nodeStore.getNode(selectedNodeId);
  }, [selectedNodeId, nodeStore.activeNode]);
  const providerName = settings.selectedProvider || 'codex';
  const providerUi = getProviderUi(providerName);
  const castPersonalities = workspaceSettings?.castPersonalities || [];
  const filteredCastPersonalities = useMemo(
    () => castPersonalities.filter((personality) => matchesPersonalitySearch(personality, personalitySearch)),
    [castPersonalities, personalitySearch],
  );
  const selectedPersonality = useMemo(
    () => castPersonalities.find((personality) => personality.id === selectedPersonalityId) || castPersonalities[0] || null,
    [castPersonalities, selectedPersonalityId],
  );
  const selectedDefaultPersonality = selectedPersonality?.defaultKey
    ? settings.defaultCastPersonalities.find((personality) => personality.defaultKey === selectedPersonality.defaultKey)
    : null;

  const canGenerate = workingDirectory != null && (mode === 'fullConversation' || selectedNode != null);
  const canGenerateFromBrief = canGenerate && brief.trim() !== '';
  const canAccept = draft != null && validation.errors.length === 0;

  const getCachedModelCatalog = (targetSettings: AiSettingsType, targetProviderName: string) => {
    const catalog = targetSettings.modelCatalogs ? targetSettings.modelCatalogs[targetProviderName] : null;
    if (catalog == null || !catalog.models || catalog.models.length === 0) return null;
    return {
      ...catalog,
      fromCache: true,
    };
  };

  const loadModelCatalog = async (targetSettings: AiSettingsType, forceRefresh = false) => {
    console.log(`${AI_DEBUG_PREFIX} loadModelCatalog start`, {
      targetProvider: targetSettings.selectedProvider,
      targetCodexModel: targetSettings.codexModel,
      forceRefresh,
    });

    setIsLoadingModels(true);
    try {
      const result = await getAiModels(targetSettings, forceRefresh);
      setModelCatalog(result);
      console.log(`${AI_DEBUG_PREFIX} loadModelCatalog success`, {
        provider: result.provider,
        modelCount: result.models.length,
        fromCache: result.fromCache,
        currentStateCodexModel: settings.codexModel,
        returnedModelSlugs: result.models.map((model) => model.slug),
      });
    } catch (error) {
      console.log(`${AI_DEBUG_PREFIX} loadModelCatalog error`, error);
      setModelCatalog({
        success: false,
        error: error instanceof Error ? error.message : 'Could not load provider models.',
        provider: targetSettings.selectedProvider || 'unknown',
        defaultModel: '',
        fromCache: false,
        models: [],
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    modalStore.setTitle(getModeTitle(mode), globalModalId);
    modalStore.setWidth(mode === 'fullConversation' ? '74vw' : '86vw', globalModalId);
    modalStore.setShowOkButton(false, globalModalId);
    modalStore.setShowCancelButton(true, globalModalId);
    modalStore.setCancelLabel('Close', globalModalId);
    modalStore.setMaskClosable(false, globalModalId);
  }, []);

  const loadConfiguration = async (refreshModelsForSettingsTab = false) => {
    console.log(`${AI_DEBUG_PREFIX} loadConfiguration start`, {
      refreshModelsForSettingsTab,
      activeTab,
      workingDirectory,
      previousCodexModel: settings.codexModel,
    });

    try {
      const loadedSettings = await getAiSettings();
      console.log(`${AI_DEBUG_PREFIX} loadConfiguration loaded`, {
        loadedSelectedProvider: loadedSettings.selectedProvider,
        loadedCodexModel: loadedSettings.codexModel,
        loadedModelCatalogKeys: Object.keys(loadedSettings.modelCatalogs || {}),
      });

      setSettings(loadedSettings);

      const loadedProviderName = loadedSettings.selectedProvider || 'codex';
      setModelCatalog(getCachedModelCatalog(loadedSettings, loadedProviderName));

      if (workingDirectory) {
        const key = normaliseWorkspaceKey(workingDirectory);
        setWorkspaceSettings(loadedSettings.workspaces[key] || createWorkspaceSettings(workingDirectory, loadedSettings.defaultCastPersonalities));
      }

      if (refreshModelsForSettingsTab && activeTab === 'settings') {
        void loadModelCatalog(loadedSettings, true);
      }
    } catch (error) {
      console.log(`${AI_DEBUG_PREFIX} loadConfiguration error`, error);
      void message.error(error instanceof Error ? error.message : 'Could not load AI settings.');
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    void loadConfiguration(true);
  }, [isVisible, workingDirectory]);

  useEffect(() => {
    if (draft == null) {
      setValidation({ errors: [], warnings: [] });
      return;
    }

    setValidation(validateAiDraft(draft, defStore.operations, mode, selectedNode, unsavedActiveConversationAsset));
  }, [draft, mode, selectedNode, defStore.operations, unsavedActiveConversationAsset]);

  useEffect(() => {
    if (workspaceSettings == null) return;
    if (workspaceSettings.castPersonalities.some((personality) => personality.id === selectedPersonalityId)) return;
    setSelectedPersonalityId(workspaceSettings.castPersonalities[0]?.id || '');
  }, [workspaceSettings, selectedPersonalityId]);

  const updateSettings = (patch: Partial<AiSettingsType>) => {
    console.log(`${AI_DEBUG_PREFIX} updateSettings`, {
      patch,
      previousCodexModel: settings.codexModel,
      nextCodexModel: patch.codexModel ?? settings.codexModel,
    });

    setSettings((previousSettings) => ({
      ...previousSettings,
      ...patch,
    }));
  };

  const updateWorkspaceSettings = (patch: Partial<AiWorkspaceSettingsType>) => {
    setWorkspaceSettings((previousSettings) => ({
      ...(previousSettings || createWorkspaceSettings(workingDirectory || '', settings.defaultCastPersonalities)),
      ...patch,
    }));
  };

  const updateCastPersonalities = (nextPersonalities: AiCastPersonalityType[]) => {
    updateWorkspaceSettings({ castPersonalities: nextPersonalities });
  };

  const updateSelectedPersonality = (patch: Partial<AiCastPersonalityType>) => {
    if (selectedPersonality == null) return;

    updateCastPersonalities(
      castPersonalities.map((personality) =>
        personality.id === selectedPersonality.id
          ? {
              ...personality,
              ...patch,
            }
          : personality,
      ),
    );
  };

  const addCastPersonality = () => {
    const personality = createCustomCastPersonality();
    updateCastPersonalities([...castPersonalities, personality]);
    setSelectedPersonalityId(personality.id);
  };

  const duplicateSelectedPersonality = () => {
    if (selectedPersonality == null) return;

    const personality = cloneCastPersonality(selectedPersonality);
    updateCastPersonalities([...castPersonalities, personality]);
    setSelectedPersonalityId(personality.id);
  };

  const deleteSelectedPersonality = () => {
    if (selectedPersonality == null) return;

    const nextPersonalities = castPersonalities.filter((personality) => personality.id !== selectedPersonality.id);
    updateCastPersonalities(nextPersonalities);
    setSelectedPersonalityId(nextPersonalities[0]?.id || '');
  };

  const restoreSelectedDefaultPersonality = () => {
    if (selectedPersonality == null || selectedDefaultPersonality == null) return;

    updateSelectedPersonality({
      label: selectedDefaultPersonality.label,
      castIds: [...selectedDefaultPersonality.castIds],
      speakerIds: [...selectedDefaultPersonality.speakerIds],
      rules: selectedDefaultPersonality.rules,
      enabled: selectedDefaultPersonality.enabled,
      defaultKey: selectedDefaultPersonality.defaultKey,
    });
  };

  const restoreMissingDefaultPersonalities = () => {
    const existingDefaultKeys = new Set(castPersonalities.map((personality) => personality.defaultKey).filter(Boolean));
    const missingDefaults = cloneDefaultCastPersonalities(settings.defaultCastPersonalities).filter(
      (personality) => !existingDefaultKeys.has(personality.defaultKey),
    );

    if (missingDefaults.length === 0) {
      void message.info('All default cast personalities are already present.');
      return;
    }

    updateCastPersonalities([...castPersonalities, ...missingDefaults]);
    setSelectedPersonalityId(missingDefaults[0].id);
  };

  const addContextPath = (path: string) => {
    const existingPaths = workspaceSettings?.contextPaths || [];
    if (existingPaths.includes(path)) return;
    updateWorkspaceSettings({ contextPaths: [...existingPaths, path] });
  };

  const openContextPathPicker = () => {
    modalStore.setModelContent(
      AiContextPathPicker,
      {
        initialPath: workingDirectory || undefined,
        onSelectPath: addContextPath,
      },
      'global2',
    );
  };

  const openDraftArtifact = async (title: string, path: string) => {
    if (!path) {
      void message.warning('No AI diagnostics file is available yet.');
      return;
    }

    try {
      const artifact = await getAiDraftArtifact(path);
      if (!artifact.success) {
        void message.error(artifact.error || 'Could not read AI diagnostics file.');
        return;
      }

      modalStore.setModelContent(
        AiDraftArtifactViewer,
        {
          title,
          path: artifact.path,
          content: artifact.content,
          truncated: artifact.truncated,
        },
        'global2',
      );
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Could not read AI diagnostics file.');
    }
  };

  const saveConfiguration = async (showSuccessMessage = false) => {
    console.log(`${AI_DEBUG_PREFIX} saveConfiguration start`, {
      showSuccessMessage,
      selectedProvider: settings.selectedProvider,
      codexModel: settings.codexModel,
      hasWorkspaceSettings: workspaceSettings != null,
    });

    setIsSavingConfiguration(true);

    try {
      const updatedSettings = await saveAiSettings(settings);
      let savedSettings = updatedSettings;
      console.log(`${AI_DEBUG_PREFIX} saveConfiguration after saveAiSettings`, {
        savedSelectedProvider: savedSettings.selectedProvider,
        savedCodexModel: savedSettings.codexModel,
      });

      if (workspaceSettings != null) {
        savedSettings = await saveAiWorkspaceSettings(workspaceSettings);
        console.log(`${AI_DEBUG_PREFIX} saveConfiguration after saveAiWorkspaceSettings`, {
          savedSelectedProvider: savedSettings.selectedProvider,
          savedCodexModel: savedSettings.codexModel,
        });
      }

      setSettings(savedSettings);
      const savedProviderName = savedSettings.selectedProvider || 'codex';
      setModelCatalog(getCachedModelCatalog(savedSettings, savedProviderName));

      if (showSuccessMessage) {
        void message.success('AI settings saved');
      }
    } catch (error) {
      console.log(`${AI_DEBUG_PREFIX} saveConfiguration error`, error);
      void message.error(error instanceof Error ? error.message : 'Could not save AI settings.');
      throw error;
    } finally {
      console.log(`${AI_DEBUG_PREFIX} saveConfiguration finally`, {
        codexModelAtFinally: settings.codexModel,
      });
      setIsSavingConfiguration(false);
      modalStore.setIsLoading(false, globalModalId);
      modalStore.setDisableOk(false, globalModalId);
    }
  };

  useEffect(() => {
    const isConfigurationTab = activeTab === 'settings' || activeTab === 'cast-personalities';

    modalStore.setShowOkButton(isConfigurationTab, globalModalId);
    modalStore.setOkLabel('Save AI Settings', globalModalId);
    modalStore.setDisableOk(isSavingConfiguration, globalModalId);
    modalStore.setIsLoading(isSavingConfiguration, globalModalId);
    modalStore.setLoadingLabel('Saving', globalModalId);
    modalStore.setOnOk(() => {
      void saveConfiguration(true);
    }, globalModalId);
  }, [activeTab, settings, workspaceSettings, isSavingConfiguration]);

  const generateDraft = async (briefOverride?: string) => {
    const draftBrief = briefOverride ?? brief;

    if (!canGenerate || workingDirectory == null) {
      void message.warning('Open a conversation folder and select a node when required before asking AI.');
      return;
    }

    if (draftBrief.trim() === '') {
      void message.warning('Write a brief before asking AI.');
      return;
    }

    setIsLoading(true);
    setDraft(null);
    setSelectedSuggestionIndex(0);
    setDiagnosticsPath('');
    setDraftRunResult(null);

    try {
      await saveConfiguration();
      const result = await createAiDraft({
        mode,
        brief: draftBrief,
        workingDirectory,
        conversationJson: JSON.stringify(toJS(unsavedActiveConversationAsset), null, 2),
        selectedNodeJson: JSON.stringify(toJS(selectedNode), null, 2),
        definitionsJson: JSON.stringify(toJS({ operations: defStore.operations, presets: defStore.presets, tags: defStore.tags }), null, 2),
      });

      setDiagnosticsPath(result.diagnosticsDirectory);
      setDraftRunResult(result);

      if (!result.success) {
        void message.error(result.error || 'AI draft generation failed.');
        return;
      }

      setDraft(parseAiDraft(result.draftJson));
      void message.success('AI draft generated');
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'AI draft generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptDraft = async () => {
    if (draft == null || workingDirectory == null) return;

    try {
      const acceptedDraft = buildAcceptedDraft(draft, mode, workingDirectory, selectedNode, selectedSuggestionIndex, dataStore.unsavedActiveConversationAsset);

      if (acceptedDraft.kind === 'fullConversation') {
        const roundTripResult = await validateConversationRoundTrip(acceptedDraft.conversationAsset);
        if (!roundTripResult.success) {
          void message.error(`Generated conversation failed serialisation validation: ${roundTripResult.error}`);
          return;
        }

        runInAction(() => {
          dataStore.updateActiveConversation(acceptedDraft.conversationAsset);
          dataStore.setConversationDirty(true);
          nodeStore.setRebuild(true);
        });
      } else if (acceptedDraft.kind === 'nodeText') {
        if (selectedNode == null) return;

        runInAction(() => {
          nodeStore.setNodeText(selectedNode, acceptedDraft.text);
          nodeStore.setRebuild(true);
        });
      } else {
        const activeConversation = dataStore.unsavedActiveConversationAsset;
        if (activeConversation == null) return;

        runInAction(() => {
          const { parentElementNode, nodes } = acceptedDraft.patch;
          addNodes(activeConversation, nodes);

          if (parentElementNode.type === 'root') {
            updateRootNode(activeConversation, parentElementNode);
          } else {
            const parentPromptNode = nodeStore.getNode(parentElementNode.parentId) as PromptNodeType;
            updateResponseNode(activeConversation, parentPromptNode, parentElementNode);
          }

          nodes.forEach((node) => updatePromptNode(activeConversation, node));
          dataStore.setConversationDirty(true);
          nodeStore.setRebuild(true);
        });
      }

      void message.success(mode === 'fullConversation' ? 'AI conversation draft is ready to save' : 'AI suggestion accepted');
      modalStore.closeModal(globalModalId);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'Could not accept AI draft.');
    }
  };

  const contextPathsText = (workspaceSettings?.contextPaths || []).join('\n');
  const selectedNodeLabel = selectedNode ? `${selectedNode.type} ${getId(selectedNode)}` : 'None';
  const showSelectedNodeContext = shouldShowSelectedNodeContext(mode, selectedNode, draft);
  const selectedNodeOriginalText = showSelectedNodeContext ? getOriginalNodeText(selectedNode) : '';
  const selectedNodeContextLabel = getRewriteContextLabel(selectedNode);
  const quickShotPrompts = useMemo(() => getQuickShotPrompts(mode, selectedNode), [mode, selectedNode]);
  const listedModelSlugs = new Set((modelCatalog?.models || []).map((model) => model.slug));
  const shouldShowCustomModel = settings.codexModel !== '' && !listedModelSlugs.has(settings.codexModel);
  const selectedModelOption = getSelectedModelOption(modelCatalog, settings.codexModel);
  const reasoningEffortOptions = getReasoningEffortOptions(selectedModelOption, settings.codexReasoningEffort);
  const selectedModelDefaultReasoningEffort = selectedModelOption?.defaultReasoningLevel || '';

  console.log(`${AI_DEBUG_PREFIX} render`, {
    activeTab,
    isVisible,
    providerName,
    codexModel: settings.codexModel,
    codexReasoningEffort: settings.codexReasoningEffort,
    modelCatalogProvider: modelCatalog?.provider,
    modelCatalogFromCache: modelCatalog?.fromCache,
    listedModelSlugs: Array.from(listedModelSlugs),
    shouldShowCustomModel,
  });

  const updateProvider = (nextProviderName: string) => {
    const previousDefaultCommand = getDefaultCommandForProvider(providerName);
    const nextDefaultCommand = getDefaultCommandForProvider(nextProviderName);
    const currentCommand = settings.codexCommand || '';
    const shouldUseNextDefault = currentCommand.trim() === '' || currentCommand === previousDefaultCommand;

    const nextSettings = {
      ...settings,
      selectedProvider: nextProviderName,
      codexCommand: shouldUseNextDefault ? nextDefaultCommand : currentCommand,
      codexModel: '',
    };

    setSettings(nextSettings);
    setModelCatalog(getCachedModelCatalog(nextSettings, nextProviderName));
  };

  const changeTab = (key: string) => {
    console.log(`${AI_DEBUG_PREFIX} changeTab`, {
      key,
      codexModelBeforeTabChange: settings.codexModel,
    });

    setActiveTab(key);

    if (key === 'settings') {
      void loadModelCatalog(settings, true);
    }
  };

  const draftActions = (
    <div className="ai-draft-modal__actions">
      <Button
        className="ai-draft-modal__action-button ai-draft-modal__action-button--generate"
        disabled={!canGenerateFromBrief || isLoading}
        loading={isLoading}
        onClick={() => {
          void generateDraft();
        }}
      >
        Generate Preview
      </Button>
      <Button
        type={draft != null ? 'primary' : 'default'}
        className="ai-draft-modal__action-button"
        disabled={!canAccept || isLoading}
        onClick={() => {
          void acceptDraft();
        }}
      >
        {getAcceptLabel(mode)}
      </Button>
      <Button
        type="default"
        danger={draft != null}
        className="ai-draft-modal__action-button"
        disabled={draft == null || isLoading}
        onClick={() => setDraft(null)}
      >
        Reject
      </Button>
    </div>
  );

  const tabsItems: TabsItems = [
    {
      children: (
        <>
          {!canGenerate && (
            <Alert
              className="ai-draft-modal__alert"
              type="warning"
              message="This AI flow needs an open conversation folder and, for node or branch suggestions, a selected node."
            />
          )}

          <Row gutter={16}>
            <Col md={14}>
              <Form layout="vertical">
                <Form.Item
                  label={
                    <FieldLabel
                      label="Brief"
                      help="Describe what the AI should draft: story beats, tone, speakers, choices, required operations, and anything to avoid."
                    />
                  }
                >
                  <TextArea
                    value={brief}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                      if (isLoading) return;
                      setBrief(event.target.value);
                    }}
                    disabled={isLoading}
                    readOnly={isLoading}
                    rows={draft ? 4 : 7}
                    placeholder="Describe the scene, tone, required beats, choices, tags, and anything the AI must avoid."
                  />
                  {showSelectedNodeContext && (
                    <div className="ai-draft-modal__rewrite-context">
                      <span>{selectedNodeContextLabel}</span>
                      <p>{selectedNodeOriginalText || 'Selected text is blank.'}</p>
                    </div>
                  )}
                  {quickShotPrompts.length > 0 && (
                    <div className="ai-draft-modal__quick-shots">
                      {quickShotPrompts.map((quickShotPrompt) => (
                        <Button
                          key={quickShotPrompt.label}
                          size="small"
                          disabled={!canGenerate || isLoading}
                          onClick={() => {
                            void generateDraft(quickShotPrompt.prompt);
                          }}
                        >
                          {quickShotPrompt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </Form.Item>
              </Form>
            </Col>
            <Col md={10}>
              <div className="ai-draft-modal__meta">
                <div>
                  <span>Mode</span>
                  <Tag>{mode}</Tag>
                </div>
                <div>
                  <span>Selected</span>
                  <Tag>{selectedNodeLabel}</Tag>
                </div>
                <div>
                  <span>Provider</span>
                  <Tag>{settings.selectedProvider || 'codex'}</Tag>
                </div>
                {diagnosticsPath && (
                  <div>
                    <span>Diagnostics</span>
                    <code>{diagnosticsPath}</code>
                  </div>
                )}
                {draftRunResult && (
                  <div className="ai-draft-modal__artifact-actions">
                    <span>Review</span>
                    <div>
                      <Button
                        size="small"
                        icon={<FileTextOutlined />}
                        disabled={!draftRunResult.promptPath}
                        onClick={() => {
                          void openDraftArtifact('AI Prompt Sent', draftRunResult.promptPath);
                        }}
                      >
                        Prompt
                      </Button>
                      <Button
                        size="small"
                        icon={<CodeOutlined />}
                        disabled={!draftRunResult.outputPath}
                        onClick={() => {
                          void openDraftArtifact('AI Response Received', draftRunResult.outputPath);
                        }}
                      >
                        Response
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {draft == null && draftActions}

          {isLoading && (
            <div className="ai-draft-modal__loading">
              <Spin />
              <span>Waiting for AI draft...</span>
            </div>
          )}

          {draft && (
            <DraftPreview
              draft={draft}
              validation={validation}
              mode={mode}
              workingDirectory={workingDirectory || ''}
              selectedNode={selectedNode}
              existingConversationAsset={unsavedActiveConversationAsset}
              selectedSuggestionIndex={selectedSuggestionIndex}
              onSelectedSuggestionIndexChange={setSelectedSuggestionIndex}
            />
          )}

          {draft != null && draftActions}
        </>
      ),
      key: 'draft',
      label: 'Draft',
    },
    {
      children: (
        <>
          <Row gutter={16}>
            <Col md={10}>
              <Form layout="vertical">
                <Form.Item
                  label={
                    <FieldLabel
                      label="Provider"
                      help="Select the CLI provider ConverseTek will call. Codex is implemented now; Claude Code is reserved for the next provider."
                    />
                  }
                >
                  <Select value={providerName} onChange={updateProvider}>
                    <Option value="codex">Codex CLI</Option>
                    <Option value="claudecode">Claude Code CLI (planned)</Option>
                  </Select>
                </Form.Item>
                {providerName !== 'codex' && (
                  <Alert
                    className="ai-draft-modal__alert"
                    type="info"
                    message={`${providerUi.displayName} settings can be prepared here, but only Codex runs drafts in this version.`}
                  />
                )}
                <Form.Item
                  label={
                    <FieldLabel
                      label={providerUi.commandLabel}
                      help={`Executable or full path for ${providerUi.displayName}. Use the default when the command is already on PATH.`}
                    />
                  }
                >
                  <Input
                    value={settings.codexCommand}
                    placeholder={providerUi.commandPlaceholder}
                    onChange={(event) => updateSettings({ codexCommand: event.target.value })}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <FieldLabel
                      label={providerUi.modelLabel}
                      help="Fetched from the provider CLI. Leave as provider default/latest to avoid pinning to a specific model."
                    />
                  }
                >
                  <div className="ai-draft-modal__model-row">
                    <Select
                      value={settings.codexModel || ''}
                      loading={isLoadingModels}
                      onChange={(value: string) => {
                        console.log(`${AI_DEBUG_PREFIX} model Select onChange`, {
                          value,
                          previousCodexModel: settings.codexModel,
                        });
                        updateSettings({ codexModel: value });
                      }}
                    >
                      <Option value="">Provider default/latest</Option>
                      {shouldShowCustomModel && <Option value={settings.codexModel}>{settings.codexModel} (custom)</Option>}
                      {(modelCatalog?.models || []).map((model) => (
                        <Option key={model.slug} value={model.slug}>
                          {model.displayName || model.slug}
                        </Option>
                      ))}
                    </Select>
                    <Tooltip title="Poll the provider CLI again for the latest model catalogue.">
                      <Button
                        icon={<ReloadOutlined />}
                        loading={isLoadingModels}
                        onClick={() => {
                          void loadModelCatalog(settings, true);
                        }}
                      >
                        Refresh
                      </Button>
                    </Tooltip>
                  </div>
                  {modelCatalog && modelCatalog.error && (
                    <Alert
                      className="ai-draft-modal__inline-alert"
                      type="warning"
                      message={modelCatalog.error || 'Could not load provider models.'}
                    />
                  )}
                  {modelCatalog?.success && (
                    <div className="ai-draft-modal__field-note">
                      {modelCatalog.models.length} model{modelCatalog.models.length === 1 ? '' : 's'} loaded from {modelCatalog.provider}.
                      {modelCatalog.fromCache ? ' Using saved list.' : ''}
                    </div>
                  )}
                </Form.Item>
                {providerName === 'codex' && (
                  <Form.Item
                    label={
                      <FieldLabel
                        label="Reasoning effort"
                        help="Overrides Codex's model/profile reasoning effort for ConverseTek draft runs only. Auto leaves the Codex CLI defaults alone."
                      />
                    }
                  >
                    <Select
                      value={settings.codexReasoningEffort || ''}
                      popupClassName="ai-draft-modal__reasoning-dropdown"
                      optionLabelProp="label"
                      onChange={(value: string) => updateSettings({ codexReasoningEffort: value })}
                    >
                      <Option value="" label="Auto">
                        <div className="ai-draft-modal__select-option">
                          <span>Auto</span>
                          <small>
                            Use the Codex profile/model default
                            {selectedModelDefaultReasoningEffort ? ` (${titleCaseReasoningEffort(selectedModelDefaultReasoningEffort)})` : ''}.
                          </small>
                        </div>
                      </Option>
                      {reasoningEffortOptions.map((option) => (
                        <Option key={option.effort} value={option.effort} label={option.label}>
                          <div className="ai-draft-modal__select-option">
                            <span>{option.label}</span>
                            {option.description && <small>{option.description}</small>}
                          </div>
                        </Option>
                      ))}
                    </Select>
                    <div className="ai-draft-modal__field-note">
                      High or extra high is useful for branch expansion; medium is usually enough for simple rewrites.
                    </div>
                  </Form.Item>
                )}
                <Form.Item
                  label={
                    <FieldLabel
                      label={providerUi.profileLabel}
                      help="Optional CLI profile/config name. Leave blank to use your normal provider profile."
                    />
                  }
                >
                  <Input
                    value={settings.codexProfile}
                    placeholder={providerUi.profilePlaceholder}
                    onChange={(event) => updateSettings({ codexProfile: event.target.value })}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <FieldLabel
                      label="Timeout seconds"
                      help="Maximum time ConverseTek waits for the provider before treating the draft run as failed."
                    />
                  }
                >
                  <Input
                    value={settings.timeoutSeconds.toString()}
                    placeholder="300"
                    onChange={(event) => updateSettings({ timeoutSeconds: Number(event.target.value) || 300 })}
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col md={14}>
              <Form layout="vertical">
                <Form.Item
                  label={
                    <FieldLabel
                      label="Context files and folders"
                      help="One file or folder path per line. ConverseTek includes supported text files as read-only context. Examples: a DeadClaim outline markdown file; a folder containing existing conversation exports."
                    />
                  }
                >
                  <TextArea
                    value={contextPathsText}
                    rows={7}
                    placeholder="One path per line"
                    onChange={(event) =>
                      updateWorkspaceSettings({
                        contextPaths: event.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <div className="ai-draft-modal__field-actions">
                    <Button icon={<FolderOpenOutlined />} onClick={openContextPathPicker}>
                      Browse...
                    </Button>
                  </div>
                </Form.Item>
                <Form.Item
                  label={
                    <FieldLabel
                      label="House style notes"
                      help="Reusable tone and formatting guidance for this conversation folder. Examples: keep dropship lines short and practical; Darius should sound wary but professional."
                    />
                  }
                >
                  <TextArea
                    value={workspaceSettings?.houseStyleNotes || ''}
                    rows={4}
                    placeholder="Optional style guidance"
                    onChange={(event) => updateWorkspaceSettings({ houseStyleNotes: event.target.value })}
                  />
                </Form.Item>
                <Form.Item
                  label={
                    <FieldLabel
                      label="Default campaign brief"
                      help="Standing campaign context that should be available to every draft in this workspace. Examples: part 1/part 2 structure; recurring cast, current campaign state, and plot constraints."
                    />
                  }
                >
                  <TextArea
                    value={workspaceSettings?.defaultCampaignBrief || ''}
                    rows={4}
                    placeholder="Optional campaign context"
                    onChange={(event) => updateWorkspaceSettings({ defaultCampaignBrief: event.target.value })}
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </>
      ),
      key: 'settings',
      label: 'Settings',
    },
    {
      children: (
        <>
          <Row gutter={24} className="ai-draft-personalities">
            <Col md={9}>
              <div className="ai-draft-personalities__toolbar">
                <Input
                  value={personalitySearch}
                  prefix={<SearchOutlined />}
                  placeholder="Search personalities"
                  onChange={(event) => setPersonalitySearch(event.target.value)}
                />
                <Button icon={<PlusOutlined />} onClick={addCastPersonality}>
                  Add
                </Button>
              </div>

              <div className="ai-draft-personalities__list">
                {filteredCastPersonalities.length === 0 ? (
                  <div className="ai-draft-personalities__empty">No matching personalities.</div>
                ) : (
                  filteredCastPersonalities.map((personality) => (
                    <button
                      key={personality.id}
                      type="button"
                      className={classnames('ai-draft-personalities__item', {
                        'ai-draft-personalities__item--active': selectedPersonality?.id === personality.id,
                        'ai-draft-personalities__item--disabled': !personality.enabled,
                      })}
                      onClick={() => setSelectedPersonalityId(personality.id)}
                    >
                      <span className="ai-draft-personalities__item-header">
                        <span>{personality.label || 'Untitled personality'}</span>
                        {personality.defaultKey && <Tag>Default</Tag>}
                      </span>
                      <span className="ai-draft-personalities__item-ids">
                        {[...personality.castIds, ...personality.speakerIds].slice(0, 4).map((id) => (
                          <Tag key={id}>{id}</Tag>
                        ))}
                        {personality.castIds.length + personality.speakerIds.length > 4 && (
                          <Tag>+{personality.castIds.length + personality.speakerIds.length - 4}</Tag>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="ai-draft-personalities__list-actions">
                <Button icon={<CopyOutlined />} disabled={selectedPersonality == null} onClick={duplicateSelectedPersonality}>
                  Duplicate
                </Button>
                <Button icon={<DeleteOutlined />} disabled={selectedPersonality == null} onClick={deleteSelectedPersonality}>
                  Delete
                </Button>
                <Button icon={<ReloadOutlined />} onClick={restoreMissingDefaultPersonalities}>
                  Restore Missing Defaults
                </Button>
              </div>
            </Col>

            <Col md={15}>
              {selectedPersonality == null ? (
                <div className="ai-draft-personalities__editor-empty">Add a personality or restore the defaults to start.</div>
              ) : (
                <Form layout="vertical" className="ai-draft-personalities__editor">
                  <div className="ai-draft-personalities__editor-heading">
                    <Checkbox
                      checked={selectedPersonality.enabled}
                      onChange={(event) => updateSelectedPersonality({ enabled: event.target.checked })}
                    >
                      Enabled
                    </Checkbox>
                    <Button icon={<ReloadOutlined />} disabled={selectedDefaultPersonality == null} onClick={restoreSelectedDefaultPersonality}>
                      Restore Selected Default
                    </Button>
                  </div>

                  <Form.Item
                    label={
                      <FieldLabel
                        label="Label"
                        help="Human-readable name for this voice profile. Labels are also used as a hint when matching personalities to a draft request."
                      />
                    }
                  >
                    <Input value={selectedPersonality.label} onChange={(event) => updateSelectedPersonality({ label: event.target.value })} />
                  </Form.Item>

                  <Form.Item
                    label={
                      <FieldLabel
                        label="Cast ids"
                        help="BattleTech cast ids that should use these rules. Include both short ids such as DariusDefault and cast definition ids such as castDef_DariusDefault when useful."
                      />
                    }
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',', '\n']}
                      value={selectedPersonality.castIds}
                      placeholder="Add cast ids"
                      onChange={(values: string[]) => updateSelectedPersonality({ castIds: normaliseIdTags(values) })}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<FieldLabel label="Speaker ids" help="Conversation speaker ids from .cvsl speaker lists that should use these rules." />}
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',', '\n']}
                      value={selectedPersonality.speakerIds}
                      placeholder="Add speaker ids"
                      onChange={(values: string[]) => updateSelectedPersonality({ speakerIds: normaliseIdTags(values) })}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <FieldLabel
                        label="AI agent rules"
                        help="Voice and behaviour rules the provider must follow whenever generated dialogue uses a matching cast id or speaker id."
                      />
                    }
                  >
                    <TextArea
                      value={selectedPersonality.rules}
                      rows={9}
                      placeholder="Describe how this character speaks, what they notice, what they avoid, and how they should react under pressure."
                      onChange={(event) => updateSelectedPersonality({ rules: event.target.value })}
                    />
                  </Form.Item>
                </Form>
              )}
            </Col>
          </Row>
        </>
      ),
      key: 'cast-personalities',
      label: 'Cast Personalities',
    },
  ];

  return (
    <div className={classnames('ai-draft-modal', draft && 'ai-draft-modal--has-draft')}>
      <Tabs activeKey={activeTab} onChange={changeTab} items={tabsItems} />
    </div>
  );
}

function DraftPreview({
  draft,
  validation,
  mode,
  workingDirectory,
  selectedNode,
  existingConversationAsset,
  selectedSuggestionIndex,
  onSelectedSuggestionIndexChange,
}: {
  draft: AiConversationDraftType;
  validation: AiDraftValidationResultType;
  mode: AiDraftModeType;
  workingDirectory: string;
  selectedNode: PromptNodeType | ElementNodeType | null;
  existingConversationAsset: ConversationAssetType | null;
  selectedSuggestionIndex: number;
  onSelectedSuggestionIndexChange: (index: number) => void;
}) {
  const previewConversationAsset = useMemo(
    () => (mode === 'fullConversation' ? null : buildPreviewConversationAssetFromDraft(draft, mode, workingDirectory, selectedNode, existingConversationAsset)),
    [draft, mode, workingDirectory, selectedNode, existingConversationAsset],
  );
  const originalText = useMemo(() => (mode === 'nodeSuggestion' ? getOriginalNodeText(selectedNode) : ''), [mode, selectedNode]);
  const suggestedTexts = useMemo(
    () => (mode === 'nodeSuggestion' ? getSuggestedNodeTexts(draft, selectedNode).slice(0, 3) : []),
    [draft, mode, selectedNode],
  );
  const { structuralWarnings, advisoryNotes } = useMemo(() => splitDraftWarnings(validation.warnings), [validation.warnings]);

  return (
    <div className="ai-draft-preview">
      <div className="ai-draft-preview__summary">
        <h3>{draft.title}</h3>
        <p>{draft.summary}</p>
      </div>

      {validation.errors.length > 0 && (
        <Alert className="ai-draft-modal__alert" type="error" message="Draft errors" description={validation.errors.join('\n')} />
      )}
      {structuralWarnings.length > 0 && (
        <Alert className="ai-draft-modal__alert" type="warning" message="Draft warnings" description={structuralWarnings.join('\n')} />
      )}
      {advisoryNotes.length > 0 && (
        <div className="ai-draft-preview__notes" aria-label="Draft notes">
          <span>Draft notes</span>
          {advisoryNotes.map((note, index) => (
            <p key={`${index}-${note}`}>{note}</p>
          ))}
        </div>
      )}

      {(draft.cast || []).length > 0 && (
        <div className="ai-draft-preview__cast">
          {(draft.cast || []).map((castMember) => (
            <Tag key={castMember.id}>{castMember.label || castMember.id}</Tag>
          ))}
        </div>
      )}

      {mode === 'nodeSuggestion' ? (
        <div className="ai-draft-preview__suggestion">
          <h4>Node text comparison</h4>
          <div className="ai-draft-preview__text-card ai-draft-preview__text-card--original">
            <span className="ai-draft-preview__text-label">Original</span>
            <p>{originalText}</p>
          </div>
          {suggestedTexts.length > 0 ? (
            <Radio.Group
              className="ai-draft-preview__versions"
              value={selectedSuggestionIndex}
              onChange={(event) => onSelectedSuggestionIndexChange(Number(event.target.value))}
            >
              {suggestedTexts.map((suggestedText, index) => (
                <label
                  key={`${index}-${suggestedText}`}
                  className={classnames('ai-draft-preview__text-card', 'ai-draft-preview__text-card--version', {
                    'ai-draft-preview__text-card--selected': selectedSuggestionIndex === index,
                  })}
                >
                  <Radio value={index}>Version {index + 1}</Radio>
                  <p>{suggestedText}</p>
                </label>
              ))}
            </Radio.Group>
          ) : (
            <div className="ai-draft-preview__text-card ai-draft-preview__text-card--empty">
              <span className="ai-draft-preview__text-label">Versions</span>
              <p>No suggested text returned.</p>
            </div>
          )}
        </div>
      ) : previewConversationAsset != null ? (
        <AiDraftConversationTreePreview conversationAsset={previewConversationAsset} />
      ) : null}
    </div>
  );
}

function titleCaseReasoningEffort(effort: string): string {
  if (effort === 'xhigh') return 'Extra high';
  if (effort === '') return 'Auto';
  return effort.charAt(0).toUpperCase() + effort.slice(1);
}

function getSelectedModelOption(modelCatalog: AiModelCatalogResultType | null, codexModel: string): AiModelOptionType | null {
  if (!modelCatalog) return null;
  if (!codexModel) return null;
  return modelCatalog.models.find((model) => model.slug === codexModel) || null;
}

function getReasoningEffortOptions(selectedModel: AiModelOptionType | null, selectedEffort: string) {
  const knownOptions = new Map(
    fallbackReasoningEfforts.map((option) => [
      option.effort,
      {
        ...option,
        supported: true,
      },
    ]),
  );

  if (selectedModel?.supportedReasoningLevels.length) {
    knownOptions.clear();
    selectedModel.supportedReasoningLevels.forEach((level) => {
      if (!level.effort) return;
      knownOptions.set(level.effort, {
        effort: level.effort,
        label: titleCaseReasoningEffort(level.effort),
        description: level.description,
        supported: true,
      });
    });
  }

  if (selectedEffort && !knownOptions.has(selectedEffort)) {
    knownOptions.set(selectedEffort, {
      effort: selectedEffort,
      label: `${titleCaseReasoningEffort(selectedEffort)} (custom)`,
      description: 'Saved custom effort value.',
      supported: true,
    });
  }

  return Array.from(knownOptions.values());
}

export const ObservingAiDraftModal = observer(AiDraftModal);
