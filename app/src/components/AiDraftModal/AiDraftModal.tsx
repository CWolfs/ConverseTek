import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toJS } from 'mobx';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Alert, Button, Col, Form, Icon, Input, message, Row, Select, Spin, Tabs, Tag, Tooltip } from 'antd';
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
import {
  addNodes,
  getId,
  updatePromptNode,
  updateResponseNode,
  updateRootNode,
} from 'utils/conversation-utils';
import {
  buildAcceptedDraft,
  buildPreviewConversationAssetFromDraft,
  getSuggestedNodeText,
  parseAiDraft,
  validateAiDraft,
} from 'utils/ai-draft-utils';
import {
  AiConversationDraftType,
  AiDraftModeType,
  AiDraftRunResultType,
  AiDraftValidationResultType,
  AiModelCatalogResultType,
  AiSettingsType,
  AiWorkspaceSettingsType,
  ElementNodeType,
  PromptNodeType,
} from 'types';

import './AiDraftModal.css';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const AI_DEBUG_PREFIX = '[ConverseTek AI Modal]';

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
  codexProfile: '',
  timeoutSeconds: 300,
  modelCatalogs: {},
  workspaces: {},
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
        <Icon className="ai-draft-modal__help-icon" type="question-circle" />
      </Tooltip>
    </span>
  );
}

function normaliseWorkspaceKey(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/g, '').toLowerCase();
}

function createWorkspaceSettings(workingDirectory: string): AiWorkspaceSettingsType {
  return {
    workingDirectory,
    contextPaths: [],
    houseStyleNotes: '',
    defaultCampaignBrief: '',
  };
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

  const canGenerate = workingDirectory != null && (mode === 'fullConversation' || selectedNode != null);
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
        setWorkspaceSettings(loadedSettings.workspaces[key] || createWorkspaceSettings(workingDirectory));
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

    setValidation(validateAiDraft(draft, defStore.operations, mode));
  }, [draft, mode, defStore.operations]);

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
      ...(previousSettings || createWorkspaceSettings(workingDirectory || '')),
      ...patch,
    }));
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
    const isSettingsTab = activeTab === 'settings';

    modalStore.setShowOkButton(isSettingsTab, globalModalId);
    modalStore.setOkLabel('Save AI Settings', globalModalId);
    modalStore.setDisableOk(isSavingConfiguration, globalModalId);
    modalStore.setIsLoading(isSavingConfiguration, globalModalId);
    modalStore.setLoadingLabel('Saving', globalModalId);
    modalStore.setOnOk(() => {
      void saveConfiguration(true);
    }, globalModalId);
  }, [activeTab, settings, workspaceSettings, isSavingConfiguration]);

  const generateDraft = async () => {
    if (!canGenerate || workingDirectory == null) {
      void message.warning('Open a conversation folder and select a node when required before asking AI.');
      return;
    }

    setIsLoading(true);
    setDraft(null);
    setDiagnosticsPath('');
    setDraftRunResult(null);

    try {
      await saveConfiguration();
      const result = await createAiDraft({
        mode,
        brief,
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
      const acceptedDraft = buildAcceptedDraft(draft, mode, workingDirectory, selectedNode);

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
  const listedModelSlugs = new Set((modelCatalog?.models || []).map((model) => model.slug));
  const shouldShowCustomModel = settings.codexModel !== '' && !listedModelSlugs.has(settings.codexModel);

  console.log(`${AI_DEBUG_PREFIX} render`, {
    activeTab,
    isVisible,
    providerName,
    codexModel: settings.codexModel,
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

  return (
    <div className={classnames('ai-draft-modal', draft && 'ai-draft-modal--has-draft')}>
      <Tabs activeKey={activeTab} onChange={changeTab}>
        <TabPane tab="Draft" key="draft">
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
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBrief(event.target.value)}
                    rows={draft ? 4 : 7}
                    placeholder="Describe the scene, tone, required beats, choices, tags, and anything the AI must avoid."
                  />
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
                        icon="file-text"
                        disabled={!draftRunResult.promptPath}
                        onClick={() => {
                          void openDraftArtifact('AI Prompt Sent', draftRunResult.promptPath);
                        }}
                      >
                        Prompt
                      </Button>
                      <Button
                        size="small"
                        icon="code"
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

          <div className="ai-draft-modal__actions">
            <Button
              type="primary"
              disabled={!canGenerate || isLoading}
              loading={isLoading}
              onClick={() => {
                void generateDraft();
              }}
            >
              Generate Preview
            </Button>
            <Button
              disabled={!canAccept || isLoading}
              onClick={() => {
                void acceptDraft();
              }}
            >
              {getAcceptLabel(mode)}
            </Button>
            <Button disabled={draft == null || isLoading} onClick={() => setDraft(null)}>
              Reject
            </Button>
          </div>

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
            />
          )}
        </TabPane>

        <TabPane tab="Settings" key="settings">
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
                    <FieldLabel label={providerUi.modelLabel} help="Fetched from the provider CLI. Leave as provider default/latest to avoid pinning to a specific model." />
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
                        icon="reload"
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
                    <Alert className="ai-draft-modal__inline-alert" type="warning" message={modelCatalog.error || 'Could not load provider models.'} />
                  )}
                  {modelCatalog?.success && (
                    <div className="ai-draft-modal__field-note">
                      {modelCatalog.models.length} model{modelCatalog.models.length === 1 ? '' : 's'} loaded from {modelCatalog.provider}.
                      {modelCatalog.fromCache ? ' Using saved list.' : ''}
                    </div>
                  )}
                </Form.Item>
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
                    <Button icon="folder-open" onClick={openContextPathPicker}>
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
        </TabPane>
      </Tabs>
    </div>
  );
}

function DraftPreview({
  draft,
  validation,
  mode,
  workingDirectory,
  selectedNode,
}: {
  draft: AiConversationDraftType;
  validation: AiDraftValidationResultType;
  mode: AiDraftModeType;
  workingDirectory: string;
  selectedNode: PromptNodeType | ElementNodeType | null;
}) {
  const previewConversationAsset = useMemo(
    () => (mode === 'fullConversation' ? null : buildPreviewConversationAssetFromDraft(draft, mode, workingDirectory, selectedNode)),
    [draft, mode, workingDirectory, selectedNode],
  );
  const suggestedText = useMemo(
    () => (mode === 'fullConversation' ? '' : getSuggestedNodeText(draft, selectedNode)),
    [draft, mode, selectedNode],
  );

  return (
    <div className="ai-draft-preview">
      <div className="ai-draft-preview__summary">
        <h3>{draft.title}</h3>
        <p>{draft.summary}</p>
      </div>

      {validation.errors.length > 0 && (
        <Alert className="ai-draft-modal__alert" type="error" message="Draft errors" description={validation.errors.join('\n')} />
      )}
      {validation.warnings.length > 0 && (
        <Alert className="ai-draft-modal__alert" type="warning" message="Draft warnings" description={validation.warnings.join('\n')} />
      )}

      {(draft.cast || []).length > 0 && (
        <div className="ai-draft-preview__cast">
          {(draft.cast || []).map((castMember) => (
            <Tag key={castMember.id}>{castMember.label || castMember.id}</Tag>
          ))}
        </div>
      )}

      {previewConversationAsset != null ? (
        <AiDraftConversationTreePreview conversationAsset={previewConversationAsset} />
      ) : mode !== 'fullConversation' ? (
        <div className="ai-draft-preview__suggestion">
          <h4>Suggested text</h4>
          <p>{suggestedText}</p>
        </div>
      ) : null}
    </div>
  );
}

export const ObservingAiDraftModal = observer(AiDraftModal);
