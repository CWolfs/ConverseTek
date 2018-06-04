import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Form, Input } from 'antd';

import DialogEditor from '../../components/DialogEditor';

import './ConversationEditor.css';

const FormItem = Form.Item;

const ConversationEditor = ({ conversationAsset }) => {
  const { Conversation } = conversationAsset;

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
      <h2>Editor</h2>

      <Form>
        <Row gutter={16}>
          <Col span={11}>
            <FormItem {...formItemLayout} label="Id">
              <Input value={Conversation.idRef.id} />
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem {...formItemLayout} label="Name">
              <Input value={Conversation.ui_name} />
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
};

ConversationEditor.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
};

export default ConversationEditor;
