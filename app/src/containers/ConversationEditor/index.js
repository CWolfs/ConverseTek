import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { toJS } from 'mobx';
import { observer, inject } from 'mobx-react';
import { message, Button, Row, Col, Form, Input, Icon, Tabs, Popconfirm } from 'antd';

import { DialogEditor } from '../../components/DialogEditor';
import { DialogTextArea } from '../../components/DialogTextArea';
import ConversationGeneral from '../ConversationGeneral';
import { ConversationConditions } from '../ConversationConditions';
import { ConversationActions } from '../ConversationActions';

import { updateConversation } from '../../services/api';
import { regenerateNodeIds, regenerateConversationId } from '../../utils/conversation-utils';
import { detectType } from '../../utils/node-utils';

import './ConversationEditor.css';

const FormItem = Form.Item;
const { TabPane } = Tabs;

class ConversationEditor extends Component {
  constructor(props) {
    super(props);

    const { dataStore, conversationAsset } = this.props;
    const unsavedConversationAsset = { ...toJS(conversationAsset) };
    dataStore.setUnsavedActiveConversation(unsavedConversationAsset);

    this.handleIdChange = this.handleIdChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.onSaveButtonClicked = this.onSaveButtonClicked.bind(this);
    this.onRegenerateNodeIdsButtonClicked = this.onRegenerateNodeIdsButtonClicked.bind(this);
    this.onRegenerateConversationIdButtonClicked = this.onRegenerateConversationIdButtonClicked.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset } = dataStore;
    const { conversationAsset: propConversationAsset } = nextProps;

    if (propConversationAsset !== unsavedActiveConversationAsset) {
      this.createNewUnsavedConversation(propConversationAsset);
    }
  }

  onSaveButtonClicked() {
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    this.createNewUnsavedConversation(conversationAsset);

    updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset).then(() => {
      message.success('Save successful');
    });
    dataStore.updateActiveConversation(conversationAsset); // local update for speed
  }

  onRegenerateNodeIdsButtonClicked() {
    const { dataStore, nodeStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    regenerateNodeIds(conversationAsset);
    nodeStore.setRebuild(true);
  }

  onRegenerateConversationIdButtonClicked() {
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    regenerateConversationId(conversationAsset);
  }

  createNewUnsavedConversation(conversationAsset) {
    const { dataStore } = this.props;
    const unsavedConversationAsset = { ...toJS(conversationAsset) };
    dataStore.setUnsavedActiveConversation(unsavedConversationAsset);
  }

  handleIdChange(event) {
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    conversationAsset.Conversation.idRef.id = event.target.value.trim();
  }

  handleNameChange(event) {
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    conversationAsset.Conversation.ui_name = event.target.value.trim();
  }

  render() {
    const { dataStore, nodeStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { Conversation } = conversationAsset;
    const conversationId = Conversation.idRef.id;
    const { activeNode, rebuild } = nodeStore;
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
              onConfirm={this.onRegenerateNodeIdsButtonClicked}
              okText="Yes"
              cancelText="No"
            >
              <Button className="conversation-editor__regenerate-ids-button" type="secondary" size="small">
                <Icon type="retweet" />
              </Button>
            </Popconfirm>
            <Button className="conversation-editor__save-button" type="primary" size="small" onClick={this.onSaveButtonClicked}>
              <Icon type="save" />
            </Button>
          </div>
        </div>

        <Form>
          <Row gutter={16}>
            <Col span={11}>
              <FormItem {...formItemLayout} label="Id">
                <Input className="conversation-editor__id-input" value={conversationId} onChange={this.handleIdChange} />
                <Popconfirm
                  title="Are you sure you want to regenerate the conversation id?"
                  placement="bottomRight"
                  onConfirm={this.onRegenerateConversationIdButtonClicked}
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
                <Input value={Conversation.ui_name} onChange={this.handleNameChange} />
              </FormItem>
            </Col>
          </Row>
        </Form>

        <DialogEditor conversationAsset={conversationAsset} rebuild={rebuild} />

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
                      <ConversationConditions node={activeNode} />
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
}

ConversationEditor.propTypes = {
  dataStore: PropTypes.object.isRequired,
  nodeStore: PropTypes.object.isRequired,
  conversationAsset: PropTypes.object.isRequired,
};

export default inject('dataStore', 'nodeStore')(observer(ConversationEditor));
