import { useEffect, useState } from 'react';
import type { ChangeEvent, ComponentProps } from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { message, Button, Row, Col, Form, Input, Tabs, Popconfirm } from 'antd';
import { ArrowRightOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RetweetOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons';

import { updateConversation } from 'services/api';
import { regenerateConversationId } from 'utils/conversation-utils';
import { detectType } from 'utils/node-utils';
import { useStore } from 'hooks/useStore';
import { useWindowSize } from 'hooks/useWindowSize';
import { DialogEditor } from 'components/DialogEditor';
import { DialogTextArea } from 'components/DialogTextArea';
import { ConversationDiagnosticsModal, ConversationDiagnosticsPanel } from 'components/ConversationDiagnosticsModal';
import { Split } from 'components/Split';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { SidePanelStore } from 'stores/sidePanelStore/side-panel-store';
import { positiveActionButtonProps } from 'utils/antd-button-utils';
import { ElementNodeType, ConversationAssetType } from 'types';

import { ConversationGeneral } from '../ConversationGeneral';
import { ConversationConditions } from '../ConversationConditions';
import { ConversationActions } from '../ConversationActions';

import './ConversationEditor.css';

const FormItem = Form.Item;
type TabsItems = NonNullable<ComponentProps<typeof Tabs>['items']>;

type Props = {
  conversationAsset: ConversationAssetType;
};

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 24 },
    md: { span: 4 },
    lg: { span: 3 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 24 },
    md: { span: 20 },
    lg: { span: 21 },
  },
};

const activeNodeSplitSizes = {
  minPrimarySize: '5%',
  minSecondarySize: '5%',
};

const inactiveNodeSplitSizes = {
  minPrimarySize: '100%',
  minSecondarySize: '0%',
};

const diagnosticsSidePanelId = 'conversation-diagnostics';

function ConversationEditor({ conversationAsset }: Props) {
  const nodeStore = useStore<NodeStore>('node');
  const dataStore = useStore<DataStore>('data');
  const modalStore = useStore<ModalStore>('modal');
  const sidePanelStore = useStore<SidePanelStore>('sidePanel');
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(true);
  const windowSize = useWindowSize();

  const { unsavedActiveConversationAsset } = dataStore;
  const { activeNode, rebuild } = nodeStore;
  const activeConversationId = conversationAsset.conversation.idRef.id;

  const createNewUnsavedConversation = () => {
    const unsavedConversationAsset = { ...toJS(conversationAsset) };
    dataStore.setUnsavedActiveConversation(unsavedConversationAsset);
  };

  const onSaveButtonClicked = () => {
    if (unsavedActiveConversationAsset == null) {
      void message.error('Save failed');
      return;
    }

    void updateConversation(unsavedActiveConversationAsset.conversation.idRef.id, unsavedActiveConversationAsset).then(() => {
      void message.success('Save successful');
    });
    dataStore.updateActiveConversation(unsavedActiveConversationAsset); // local update for speed
    createNewUnsavedConversation();
  };

  const onRegenerateNodeIdsButtonClicked = () => {
    if (unsavedActiveConversationAsset == null) throw Error('unsavedActiveConversationAsset is null or undefined.');

    nodeStore.regenerateNodeIds(unsavedActiveConversationAsset);
    nodeStore.setRebuild(true);
  };

  const onRegenerateConversationIdButtonClicked = () => {
    if (unsavedActiveConversationAsset == null) throw Error('unsavedActiveConversationAsset is null or undefined.');

    regenerateConversationId(unsavedActiveConversationAsset);
  };

  const handleIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    dataStore.setUnsavedConversationId(event.target.value.trim());
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target;
    dataStore.setUnsavedConversationUIName(event.target.value.trim());
  };

  const onDiagnosticsButtonClicked = () => {
    if ((windowSize.width ?? 0) >= 1280) {
      if (sidePanelStore.isPanelVisible(diagnosticsSidePanelId)) {
        sidePanelStore.closePanel();
        return;
      }

      sidePanelStore.setPanelContent(ConversationDiagnosticsPanel, {}, 'Conversation Diagnostics', true, diagnosticsSidePanelId);
      return;
    }

    sidePanelStore.closePanel();
    modalStore.setModelContent(ConversationDiagnosticsModal, {}, 'global1');
  };

  // onMount
  useEffect(() => {
    const unsavedConversationAsset = { ...toJS(conversationAsset) };
    dataStore.setUnsavedActiveConversation(unsavedConversationAsset);
  }, []);

  // onConversationChanged
  useEffect(() => {
    createNewUnsavedConversation();
  }, [conversationAsset]);

  useEffect(() => {
    if (!sidePanelStore.isPanelVisible(diagnosticsSidePanelId)) return;
    if ((windowSize.width ?? 0) < 1280) return;

    sidePanelStore.setPanelContent(ConversationDiagnosticsPanel, {}, 'Conversation Diagnostics', true, diagnosticsSidePanelId);
  }, [activeConversationId, sidePanelStore, windowSize.width]);

  useEffect(() => {
    if (windowSize.width != null && windowSize.width < 1280) sidePanelStore.closePanel();
  }, [sidePanelStore, windowSize.width]);

  if (unsavedActiveConversationAsset == null) return null;

  const { conversation } = unsavedActiveConversationAsset;
  const conversationId = conversation.idRef.id;
  const { type } = activeNode || { type: null };
  const { isRoot, isResponse } = detectType(type);
  const detailTabs = activeNode
    ? ([
        {
          children: <ConversationGeneral node={activeNode} />,
          key: '1',
          label: 'General',
        },
        (isRoot || isResponse) && {
          children: <ConversationConditions node={activeNode as ElementNodeType} />,
          key: '2',
          label: 'Conditions',
        },
        {
          children: <ConversationActions node={activeNode} />,
          key: '3',
          label: 'Actions',
        },
      ].filter(Boolean) as TabsItems)
    : [];

  return (
    <div className="conversation-editor">
      <Form>
        <Row gutter={16}>
          <Col span={11}>
            <FormItem {...formItemLayout} label="Id">
              <div className="conversation-editor__id-control">
                <Input className="conversation-editor__id-input" value={conversationId} onChange={handleIdChange} />
                <Popconfirm
                  title="Are you sure you want to regenerate the conversation id?"
                  placement="bottomRight"
                  onConfirm={onRegenerateConversationIdButtonClicked}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    className="conversation-editor__regenerate-conversation-id-button button-secondary"
                    type="primary"
                    size="small"
                    icon={<RetweetOutlined />}
                  />
                </Popconfirm>
              </div>
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem {...formItemLayout} label="Name">
              <Input value={conversation.uiName} onChange={handleNameChange} />
            </FormItem>
          </Col>
        </Row>
      </Form>

      <div className="conversation-editor__toolbar">
        <div className="conversation-editor__tool-buttons">
          <Button
            className="conversation-editor__expand-nodes button-secondary"
            type="primary"
            size="small"
            icon={isAllExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={() => setIsAllExpanded(!isAllExpanded)}
          />
          <Button
            className="conversation-editor__go-to-node-button button-secondary"
            type="primary"
            size="small"
            disabled={!nodeStore.getActiveNodeId() && !nodeStore.getPreviousActiveNodeId()}
            onClick={() => {
              nodeStore.scrollToActiveNode(true);
            }}
            icon={<ArrowRightOutlined />}
          />
          <Button
            className="conversation-editor__diagnostics-button button-secondary"
            type="primary"
            size="small"
            icon={<WarningOutlined />}
            onClick={onDiagnosticsButtonClicked}
          />
        </div>

        <div className="conversation-editor__buttons">
          <Popconfirm
            title="Are you sure you want to regenerate all dialog node ids?"
            placement="bottomRight"
            onConfirm={onRegenerateNodeIdsButtonClicked}
            okText="Yes"
            cancelText="No"
          >
            <Button className="conversation-editor__regenerate-ids-button button-secondary" type="primary" size="small" icon={<RetweetOutlined />} />
          </Popconfirm>
          <Button className="conversation-editor__save-button" {...positiveActionButtonProps} size="small" icon={<SaveOutlined />} onClick={onSaveButtonClicked} />
        </div>
      </div>

      <Split initialPrimarySize="68%" {...(activeNode ? activeNodeSplitSizes : inactiveNodeSplitSizes)} orientation="horizontal">
        <DialogEditor conversationAsset={unsavedActiveConversationAsset} rebuild={rebuild} expandAll={isAllExpanded} />

        {activeNode && (
          <div className="conversation-editor__details">
            <Row gutter={16}>
              <Col md={12} className="conversation-editor__details-left">
                <div className="conversation-editor__details-left-buttons">
                  <Button
                    className="conversation-editor__go-to-node-button button-secondary"
                    type="primary"
                    size="small"
                    onClick={() => nodeStore.scrollToActiveNode()}
                    icon={<ArrowRightOutlined />}
                  />
                </div>
                <DialogTextArea node={activeNode} />
              </Col>
              <Col md={12} className="conversation-editor__details-right">
                <Tabs defaultActiveKey="1" items={detailTabs} />
              </Col>
            </Row>
          </div>
        )}
      </Split>
    </div>
  );
}

export const ObservingConversationEditor = observer(ConversationEditor);
