import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { message, Button, Row, Col, Form, Input, Icon } from 'antd';

import DialogEditor from '../../components/DialogEditor';

import { updateConversation } from '../../services/api';

import './ConversationEditor.css';

const FormItem = Form.Item;

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
    const { Conversation } = conversationAsset;
    const conversationId = Conversation.idRef.id;

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
        {/*
        <div>Default Speaker Id: {Conversation.default_speaker_id}</div>
        <div>Persistent Conversation: {Conversation.persistent_conversation}</div>
        */}
        <DialogEditor conversationAsset={conversationAsset} />
      </div>
    );
  }
}

ConversationEditor.propTypes = {
  dataStore: PropTypes.object.isRequired,
  conversationAsset: PropTypes.object.isRequired,
};

export default inject('dataStore')(ConversationEditor);
