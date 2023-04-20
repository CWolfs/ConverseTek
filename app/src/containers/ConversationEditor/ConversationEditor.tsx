import React, { ChangeEvent, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { message, Button, Row, Col, Form, Input, Icon, Tabs, Popconfirm } from 'antd';

import { updateConversation } from 'services/api';
import { regenerateNodeIds, regenerateConversationId } from 'utils/conversation-utils';
import { detectType } from 'utils/node-utils';
import { useStore } from 'hooks/useStore';
import { DialogEditor } from 'components/DialogEditor';
import { DialogTextArea } from 'components/DialogTextArea';
import { NodeStore } from 'stores/nodeStore/node-store';
import { DataStore } from 'stores/dataStore/data-store';
import { ElementNodeType } from 'types/ElementNodeType';

import { ConversationAssetType } from 'types/ConversationAssetType';
import { ConversationGeneral } from '../ConversationGeneral';
import { ConversationConditions } from '../ConversationConditions';
import { ConversationActions } from '../ConversationActions';

import './ConversationEditor.css';

const FormItem = Form.Item;
const { TabPane } = Tabs;

type Props = {
  conversationAsset: ConversationAssetType;
};

function ConversationEditor({ conversationAsset }: Props) {
  const nodeStore = useStore<NodeStore>('node');
  const dataStore = useStore<DataStore>('data');

  const { unsavedActiveConversationAsset } = dataStore;
  const { activeNode, rebuild } = nodeStore;

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

    regenerateNodeIds(unsavedActiveConversationAsset);
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

  // onMount
  useEffect(() => {
    const unsavedConversationAsset = { ...toJS(conversationAsset) };
    dataStore.setUnsavedActiveConversation(unsavedConversationAsset);
  }, []);

  // onConversationChanged
  useEffect(() => {
    createNewUnsavedConversation();
  }, [conversationAsset]);

  if (unsavedActiveConversationAsset == null) return null;

  const { conversation } = unsavedActiveConversationAsset;
  const conversationId = conversation.idRef.id;
  const { type } = activeNode || { type: null };
  const { isRoot, isResponse } = detectType(type);

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

  return (
    <div className="conversation-editor">
      <div>
        <div className="conversation-editor__buttons">
          <Popconfirm
            title="Are you sure you want to regenerate all dialog node ids?"
            placement="bottomRight"
            onConfirm={onRegenerateNodeIdsButtonClicked}
            okText="Yes"
            cancelText="No"
          >
            <Button className="conversation-editor__regenerate-ids-button" type="secondary" size="small">
              <Icon type="retweet" />
            </Button>
          </Popconfirm>
          <Button className="conversation-editor__save-button" type="primary" size="small" onClick={onSaveButtonClicked}>
            <Icon type="save" />
          </Button>
        </div>
      </div>

      <Form>
        <Row gutter={16}>
          <Col span={11}>
            <FormItem {...formItemLayout} label="Id">
              <Input className="conversation-editor__id-input" value={conversationId} onChange={handleIdChange} />
              <Popconfirm
                title="Are you sure you want to regenerate the conversation id?"
                placement="bottomRight"
                onConfirm={onRegenerateConversationIdButtonClicked}
                okText="Yes"
                cancelText="No"
              >
                <Button className="conversation-editor__regenerate-ids-button" type="secondary" size="small">
                  <Icon type="retweet" />
                </Button>
              </Popconfirm>
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem {...formItemLayout} label="Name">
              <Input value={conversation.uiName} onChange={handleNameChange} />
            </FormItem>
          </Col>
        </Row>
      </Form>

      <DialogEditor conversationAsset={unsavedActiveConversationAsset} rebuild={rebuild} />

      {activeNode && (
        <div className="conversation-editor__details">
          <Row gutter={16}>
            <Col md={12} className="conversation-editor__details-left">
              <DialogTextArea node={activeNode} />
            </Col>
            <Col md={12} className="conversation-editor__details-right">
              <Tabs defaultActiveKey="1">
                <TabPane tab="General" key="1">
                  <ConversationGeneral node={activeNode} />
                </TabPane>
                {(isRoot || isResponse) && (
                  <TabPane tab="Conditions" key="2">
                    <ConversationConditions node={activeNode as ElementNodeType} />
                  </TabPane>
                )}
                <TabPane tab="Actions" key="3">
                  <ConversationActions node={activeNode} />
                </TabPane>
              </Tabs>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

ConversationEditor.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
};

export const ObservingConversationEditor = observer(ConversationEditor);
