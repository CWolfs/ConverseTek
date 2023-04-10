import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import sortBy from 'lodash.sortby';

import FileTree from '../../components/FileTree';

import './ConversationTree.css';

class ConversationTree extends Component {
  static remapConversationData(conversationAssets) {
    return sortBy(
      Array.from(conversationAssets.values()).map((asset) => ({
        key: asset.Conversation.idRef.id,
        label: asset.Conversation.ui_name,
      })),
      (c) => c.label,
    );
  }

  constructor(props) {
    super(props);

    this.onNodeSelected = this.onNodeSelected.bind(this);
  }

  onNodeSelected(selectedKeys) {
    const { dataStore } = this.props;
    dataStore.setActiveConversation(selectedKeys[0]);
  }

  render() {
    const { dataStore } = this.props;
    const { conversationAssets, activeConversationAsset } = dataStore;

    const data = ConversationTree.remapConversationData(conversationAssets);
    const selectedKeys = activeConversationAsset ? [activeConversationAsset.Conversation.idRef.id] : undefined;

    return (
      <div className="conversation-tree">
        <FileTree title="Conversations" data={data} onSelected={this.onNodeSelected} selectedKeys={selectedKeys} />
      </div>
    );
  }
}

ConversationTree.propTypes = {
  dataStore: PropTypes.object.isRequired,
};

export default inject('dataStore')(observer(ConversationTree));
