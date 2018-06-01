import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';

import FileTree from '../../components/FileTree';

import './ConversationTree.css';

@observer
class ConversationTree extends Component {
  static remapConversationData(conversationAssets) {
    return conversationAssets.values().map(asset => ({
      key: asset.FileName,
      label: asset.Conversation.ui_name,
    }));
  }

  render() {
    const { dataStore } = this.props;
    const { conversationAssets } = dataStore;

    const data = ConversationTree.remapConversationData(conversationAssets);

    return (
      <div className="conversation-tree">
        <FileTree title="Conversations" data={data} />
      </div>
    );
  }
}

ConversationTree.propTypes = {
  dataStore: PropTypes.object.isRequired,
};

export default inject('dataStore')(ConversationTree);
