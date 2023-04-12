import React from 'react';
import PropTypes from 'prop-types';
import { message, Menu } from 'antd';
import { observer, inject } from 'mobx-react';

import { FileSystemPicker } from '../../components/FileSystemPicker';
import { SaveConversationAs } from '../../components/SaveConversationAs';
import { About } from '../../components/About';

import { updateConversation, exportConversation, exportAllConversations } from '../../services/api';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

export function Header({ dataStore, modalStore }) {
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
                updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset).then(() => {
                  message.success('Save successful');
                });
                dataStore.updateActiveConversation(conversationAsset); // local update for speed
              }}
            >
              Save Conversation
            </MenuItem>
          )}

          {hasActiveConversation && (
            <MenuItem onClick={() => modalStore.setModelContent(SaveConversationAs)}>Save Conversation As...</MenuItem>
          )}

          {workingDirectory && (
            <MenuItem onClick={() => modalStore.setModelContent(FileSystemPicker, { fileMode: true })}>
              Import Conversation from JSON
            </MenuItem>
          )}

          {hasActiveConversation && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                exportConversation(conversationAsset.Conversation.idRef.id, conversationAsset).then(() => {
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
                exportAllConversations(conversationAsset ? conversationAsset.Conversation.idRef.id : -1, conversationAsset).then(() => {
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

Header.propTypes = {
  dataStore: PropTypes.object.isRequired,
  modalStore: PropTypes.object.isRequired,
};

export default inject('dataStore', 'modalStore')(observer(Header));
