import React from 'react';
import { observer } from 'mobx-react';
import sortBy from 'lodash.sortby';

import { useStore } from 'hooks/useStore';
import { FileTree } from 'components/FileTree';

import './ConversationTree.css';

function remapConversationData(conversationAssets) {
  return sortBy(
    Array.from(conversationAssets.values()).map((asset) => ({
      key: asset.conversation.idRef.id,
      label: asset.conversation.uiName,
    })),
    (c) => c.label,
  );
}

function ConversationTree() {
  const dataStore = useStore('data');

  const { conversationAssets, activeConversationAsset } = dataStore;
  const data = remapConversationData(conversationAssets);
  const selectedKeys = activeConversationAsset ? [activeConversationAsset.conversation.idRef.id] : undefined;

  const onNodeSelected = (newSelectedKeys) => {
    dataStore.setActiveConversation(newSelectedKeys[0]);
  };

  return (
    <div className="conversation-tree">
      <FileTree title="Conversations" data={data} onSelected={onNodeSelected} selectedKeys={selectedKeys} />
    </div>
  );
}

export const ObservingConversationTree = observer(ConversationTree);
