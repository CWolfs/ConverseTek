import React from 'react';
import { observer } from 'mobx-react';
import sortBy from 'lodash.sortby';

import { ConversationAssetType } from 'types';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { FileTree } from 'components/FileTree';
import { ConversationTreeContextMenu } from 'components/ConversationTreeContextMenu';

import './ConversationTree.css';

function remapConversationData(conversationAssets: Map<string, ConversationAssetType>) {
  return sortBy(
    Array.from(conversationAssets.values()).map((asset) => ({
      key: asset.conversation.idRef.id,
      label: asset.conversation.uiName,
    })),
    (c) => c.label,
  );
}

function ConversationTree() {
  const dataStore = useStore<DataStore>('data');

  const { conversationAssets, activeConversationAsset, workingDirectoryName } = dataStore;
  const data = remapConversationData(conversationAssets);
  const selectedKeys = activeConversationAsset ? [activeConversationAsset.conversation.idRef.id] : undefined;

  const onNodeSelected = (newSelectedKeys: string[]): void => {
    dataStore.setActiveConversation(newSelectedKeys[0]);
  };

  return (
    <div className="conversation-tree">
      <ConversationTreeContextMenu id="conversation-context-menu" onVisibilityChange={() => console.log('context menu visibility changed')} />
      <FileTree
        title="Conversations"
        data={data}
        onSelected={onNodeSelected}
        selectedKeys={selectedKeys || []}
        selectedDirectoryName={workingDirectoryName}
      />
    </div>
  );
}

export const ObservingConversationTree = observer(ConversationTree);
