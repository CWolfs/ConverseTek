import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { message, Button, Row, Col, Form, Input, Icon, Tabs } from 'antd';

import DialogEditor from '../../components/DialogEditor';
import DialogTextArea from '../../components/DialogTextArea';
import ConversationGeneral from '../ConversationGeneral';

import { updateConversation } from '../../services/api';

import './ConversationEditor.css';

const FormItem = Form.Item;
const { TabPane } = Tabs;

@observer
class ConversationEditor extends Component {
  constructor(props) {
    super(props);

    const { conversationAsset } = this.props;
    const unsavedConversationAsset = { ...conversationAsset };

    this.state = {
      conversationAsset: unsavedConversationAsset,
    };

    this.handleIdChange = this.handleIdChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.onSaveButtonClicked = this.onSaveButtonClicked.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { conversationAsset: stateConversationAsset } = this.state;
    const { conversationAsset: propConversationAsset } = nextProps;

    if (propConversationAsset !== stateConversationAsset) {
      this.createNewUnsavedConversation(propConversationAsset);
    }
  }

  onSaveButtonClicked() {
    const { dataStore } = this.props;
    const { conversationAsset } = this.state;

    this.createNewUnsavedConversation(conversationAsset);

    updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset)
      .then(() => {
        message.success('Save successful');
      });
    dataStore.updateActiveConversation(conversationAsset); // local update for speed
  }

  createNewUnsavedConversation(conversationAsset) {
    const unsavedConversationAsset = { ...conversationAsset };

    this.setState({
      conversationAsset: unsavedConversationAsset,
    });
  }

  handleIdChange(event) {
    const { conversationAsset } = this.state;
    conversationAsset.Conversation.idRef.id = event.target.value.trim();
    this.setState({ conversationAsset });
  }

  handleNameChange(event) {
    const { conversationAsset } = this.state;
    conversationAsset.Conversation.ui_name = event.target.value.trim();
    this.setState({ conversationAsset });
  }

  render() {
    const { conversationAsset } = this.state;
    const { nodeStore } = this.props;
    const { Conversation } = conversationAsset;
    const conversationId = Conversation.idRef.id;
    const { activeNode, rebuild } = nodeStore;

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
          <h2>Editor</h2>
          <Button
            className="conversation-editor__save-button"
            type="primary"
            size="small"
            onClick={this.onSaveButtonClicked}
          >
            <Icon type="save" />
          </Button>
        </div>

        <Form>
          <Row gutter={16}>
            <Col span={11}>
              <FormItem {...formItemLayout} label="Id">
                <Input
                  value={conversationId}
                  onChange={this.handleIdChange}
                />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem {...formItemLayout} label="Name">
                <Input
                  value={Conversation.ui_name}
                  onChange={this.handleNameChange}
                />
              </FormItem>
            </Col>
          </Row>
        </Form>

        <DialogEditor conversationAsset={conversationAsset} rebuild={rebuild} />

        {activeNode && (
        <div className="conversation-editor__details">
          <Row gutter={16}>
            <Col md={24} lg={12} className="conversation-editor__details-left">
              <DialogTextArea node={activeNode} />
            </Col>
            <Col md={24} lg={12} className="conversation-editor__details-right">
              <Tabs defaultActiveKey="1">
                <TabPane tab="General" key="1"><ConversationGeneral node={activeNode} /></TabPane>
                <TabPane tab="Conditions" key="2">Conditions</TabPane>
                <TabPane tab="Actions" key="3">Actions</TabPane>
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

export default inject('dataStore', 'nodeStore')(ConversationEditor);
