import React from 'react';
import { observer } from 'mobx-react';
import sortBy from 'lodash.sortby';

import { ConversationAssetType } from 'types';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { FileTree } from 'components/FileTree';
import { ConversationTreeContextMenu } from 'components/ContextMenus/ConversationTreeContextMenu';
import { ModalConfirmation } from 'components/Modals/ModalConfirmation';
import { updateConversation } from 'services/api';

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
  const modalStore = useStore<ModalStore>('modal');

  const { conversationAssets, activeConversationAsset, workingDirectoryName } = dataStore;
  const data = remapConversationData(conversationAssets);
  const selectedKeys = activeConversationAsset ? [activeConversationAsset.conversation.idRef.id] : undefined;

  const onNodeSelected = (newSelectedKeys: string[]): void => {
    const { unsavedActiveConversationAsset: conversationAsset, isConversationDirty } = dataStore;

    if (isConversationDirty) {
      const buttons = {
        positiveLabel: 'Yes',
        onPositive: () => {
          if (conversationAsset != null) {
            void updateConversation(conversationAsset.conversation.idRef.id, conversationAsset);
          }
          dataStore.setActiveConversation(newSelectedKeys[0]);
        },
        onNegative: () => {
          dataStore.setActiveConversation(newSelectedKeys[0]);
        },
        negativeLabel: 'No',
      };

      const modalTitle = `Save your current changes?`;
      modalStore.setModelContent(
        ModalConfirmation,
        {
          type: 'warning',
          title: modalTitle,
          body: `Your current conversation has unsaved changes. Do you want to save them first before changing conversation?`,
          width: '30rem',
          disableOk: false,
          buttons,
        },
        'global1',
      );
    } else {
      dataStore.setActiveConversation(newSelectedKeys[0]);
    }
  };

  return (
    <div className="conversation-tree">
      <ConversationTreeContextMenu id="conversation-context-menu" />
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
