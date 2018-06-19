import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { message, Input } from 'antd';

import { updateConversation } from '../../services/api';

import './SaveConversationAs.css';

/* eslint-disable react/prefer-stateless-function, no-useless-constructor, class-methods-use-this */
@observer
class SaveConversationAs extends Component {
  constructor(props) {
    super(props);
    const { dataStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;

    this.state = {
      suggestedFileName: `${conversationAsset.Conversation.idRef.id}.convo.bytes`,
      modifiedFileName: null,
    };

    this.newFilePath = null;
    this.newFileName = null;

    this.onOk = this.onOk.bind(this);
    this.handleFileNameChange = this.handleFileNameChange.bind(this);

    this.setupModal();
  }

  componentWillReceiveProps() {
    this.setupModal();
  }

  onOk() {
    const { suggestedFileName } = this.state;
    const { dataStore, modalStore } = this.props;
    const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
    const { FileName: previousFileName, FilePath: previousFilePath } = conversationAsset;

    conversationAsset.FileName = (this.newFileName || suggestedFileName).replace('.bytes', '');
    conversationAsset.FilePath =
      (this.newFilePath || previousFilePath.replace(previousFileName, conversationAsset.FileName));

    updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset)
      .then(() => {
        message.success('Save successful');
      });
    dataStore.updateActiveConversation(conversationAsset); // local update for speed

    modalStore.closeModal();
  }

  setupModal() {
    const { modalStore } = this.props;
    modalStore.setOnOk(this.onOk);
    modalStore.setTitle('Save Conversation As...');
    modalStore.setOkLabel('Save');
    modalStore.setDisableOk(false);
    modalStore.setWidth('40vw');
    modalStore.setShowCancelButton(true);
  }

  handleFileNameChange(event) {
    const newFileName = event.target.value.trim();
    this.newFileName = newFileName;
    this.setState({ modifiedFileName: newFileName });
  }

  render() {
    const { modifiedFileName, suggestedFileName } = this.state;

    return (
      <div className="save-conversation-as">
        <Input
          value={modifiedFileName || suggestedFileName}
          onChange={this.handleFileNameChange}
        />
      </div>
    );
  }
}

SaveConversationAs.propTypes = {
  dataStore: PropTypes.object.isRequired,
  modalStore: PropTypes.object.isRequired,
};

export default inject('dataStore')(SaveConversationAs);
