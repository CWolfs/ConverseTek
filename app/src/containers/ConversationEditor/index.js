import React from 'react';
import PropTypes from 'prop-types';

import DialogEditor2 from '../../components/DialogEditor2';

import './ConversationEditor.css';

const ConversationEditor = ({ conversationAsset }) => {
  const { Conversation } = conversationAsset;

  return (
    <div className="conversation-editor">
      <h2>Editor</h2>
      <div>Id: {Conversation.idRef.id}</div>
      <div>Name: {Conversation.ui_name}</div>
      <div>Default Speaker Id: {Conversation.default_speaker_id}</div>
      <div>Persistent Conversation: {Conversation.persistent_conversation}</div>
      <DialogEditor2 conversationAsset={conversationAsset} />
    </div>
  );
};

ConversationEditor.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
};

export default ConversationEditor;
