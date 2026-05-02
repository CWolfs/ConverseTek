import type { ComponentProps } from 'react';
import { message, Menu } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { useAiFeatureEnabled } from 'hooks/useAiFeatureEnabled';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';

import { FileSystemPicker } from 'components/FileSystemPicker';
import { SaveConversationAs } from 'components/SaveConversationAs';
import { About } from 'components/About';
import { AiDraftModal } from 'components/AiDraftModal';
import { updateConversation, exportConversation, exportAllConversations } from 'services/api';

import './Header.css';

type MenuItems = NonNullable<ComponentProps<typeof Menu>['items']>;

const headerSubMenuPopupOffset: [number, number] = [0, 0];

export function Header() {
  const dataStore = useStore<DataStore>('data');
  const modalStore = useStore<ModalStore>('modal');
  const aiFeatureEnabled = useAiFeatureEnabled(true);

  const { workingDirectory } = dataStore;
  const hasActiveConversation = dataStore.activeConversationAsset !== null;
  const fileMenuItems = [
    {
      key: 'open-folder',
      label: 'Open Folder',
      onClick: () => modalStore.setModelContent(FileSystemPicker, {}, 'global1'),
    },
    workingDirectory && {
      key: 'new-conversation',
      label: 'New Conversation',
      onClick: () => dataStore.createNewConversation(),
    },
    hasActiveConversation && {
      key: 'save-conversation',
      label: 'Save Conversation',
      onClick: () => {
        const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
        if (!conversationAsset) return;

        void updateConversation(conversationAsset.conversation.idRef.id, conversationAsset).then(() => {
          void message.success('Save successful');
        });
        dataStore.updateActiveConversation(conversationAsset); // local update for speed
      },
    },
    hasActiveConversation && {
      key: 'save-conversation-as',
      label: 'Save Conversation As...',
      onClick: () => modalStore.setModelContent(SaveConversationAs, {}, 'global1'),
    },
    workingDirectory && {
      key: 'import-conversation-json',
      label: 'Import Conversation from JSON',
      onClick: () => modalStore.setModelContent(FileSystemPicker, { fileMode: true }, 'global1'),
    },
    hasActiveConversation && {
      key: 'export-conversation-json',
      label: 'Export Conversation as JSON',
      onClick: () => {
        const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
        if (!conversationAsset) return;

        void exportConversation(conversationAsset.conversation.idRef.id, conversationAsset).then(() => {
          void message.success('Export successful');
        });
      },
    },
    workingDirectory && {
      key: 'export-all-conversations-json',
      label: 'Export All Conversations as JSON',
      onClick: () => {
        const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
        const id = conversationAsset ? conversationAsset.conversation.idRef.id : '-1';

        void exportAllConversations(id, conversationAsset).then(() => {
          void message.success('Export successful');
        });
      },
    },
  ].filter(Boolean) as MenuItems;
  const menuItems = [
    {
      children: fileMenuItems,
      key: 'file',
      label: 'File',
      popupClassName: 'header__submenu-popup',
      popupOffset: headerSubMenuPopupOffset,
    },
    workingDirectory &&
      aiFeatureEnabled && {
        children: [
          {
            key: 'draft-conversation',
            label: 'Draft Conversation...',
            onClick: () => modalStore.setModelContent(AiDraftModal, { mode: 'fullConversation' }, 'global1'),
          },
        ],
        key: 'draft-assist',
        label: 'Draft Assist',
        popupClassName: 'header__submenu-popup',
        popupOffset: headerSubMenuPopupOffset,
      },
    {
      children: [
        {
          key: 'about',
          label: 'About',
          onClick: () => modalStore.setModelContent(About, {}, 'global1'),
        },
      ],
      key: 'help',
      label: 'Help',
      popupClassName: 'header__submenu-popup',
      popupOffset: headerSubMenuPopupOffset,
    },
  ].filter(Boolean) as MenuItems;

  return (
    <div className="header">
      <Menu mode="horizontal" items={menuItems} />
    </div>
  );
}

export const ObservingHeader = observer(Header);
