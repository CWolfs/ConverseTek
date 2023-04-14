import React from 'react';
import { message, Menu } from 'antd';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';

import { FileSystemPicker } from 'components/FileSystemPicker';
import { SaveConversationAs } from 'components/SaveConversationAs';
import { About } from 'components/About';
import { updateConversation, exportConversation, exportAllConversations } from 'services/api';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

export function Header() {
  const dataStore = useStore<DataStore>('data');
  const modalStore = useStore<ModalStore>('modal');

  const { workingDirectory } = dataStore;
  const hasActiveConversation = dataStore.activeConversationAsset !== null;

  return (
    <div className="header">
      <Menu mode="horizontal">
        <SubMenu title="File">
          <MenuItem onClick={() => modalStore.setModelContent(FileSystemPicker)}>Open Folder</MenuItem>

          {workingDirectory && <MenuItem onClick={() => dataStore.createNewConversation()}>New Conversation</MenuItem>}

          {hasActiveConversation && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                if (!conversationAsset) return;

                void updateConversation(conversationAsset.conversation.idRef.id, conversationAsset).then(() => {
                  message.success('Save successful');
                });
                dataStore.updateActiveConversation(conversationAsset); // local update for speed
              }}
            >
              Save Conversation
            </MenuItem>
          )}

          {hasActiveConversation && <MenuItem onClick={() => modalStore.setModelContent(SaveConversationAs)}>Save Conversation As...</MenuItem>}

          {workingDirectory && (
            <MenuItem onClick={() => modalStore.setModelContent(FileSystemPicker, { fileMode: true })}>Import Conversation from JSON</MenuItem>
          )}

          {hasActiveConversation && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                if (!conversationAsset) return;

                void exportConversation(conversationAsset.conversation.idRef.id, conversationAsset).then(() => {
                  message.success('Export successful');
                });
              }}
            >
              Export Conversation as JSON
            </MenuItem>
          )}

          {workingDirectory && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                if (!conversationAsset) return;

                void exportAllConversations(conversationAsset ? conversationAsset.conversation.idRef.id : '-1', conversationAsset).then(() => {
                  message.success('Export successful');
                });
              }}
            >
              Export All Conversations as JSON
            </MenuItem>
          )}
        </SubMenu>
        <SubMenu title="Help">
          <MenuItem onClick={() => modalStore.setModelContent(About)}>About</MenuItem>
        </SubMenu>
      </Menu>
    </div>
  );
}

export const ObservingHeader = observer(Header);
