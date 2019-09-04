import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { message, Menu } from 'antd';
import { observer, inject } from 'mobx-react';

import FileSystemPicker from '../../components/FileSystemPicker';
import SaveConversationAs from '../../components/SaveConversationAs';
import About from '../../components/About';

import { updateConversation, exportConversation, exportAllConversations } from '../../services/api';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

/* eslint-disable no-return-assign, no-param-reassign */
@observer
class Header extends Component {
  render() {
    const { dataStore, modalStore } = this.props;
    const { workingDirectory } = dataStore;
    const hasActiveConversation = (dataStore.activeConversationAsset !== null);

    return (
      <div className="header">
        <Menu mode="horizontal">
          <SubMenu title="File">
            <MenuItem
              onClick={() => modalStore.setModelContent(FileSystemPicker)}
            >
              Open Folder
            </MenuItem>

            {workingDirectory && (
              <MenuItem
                onClick={() => dataStore.createNewConversation()}
              >
                New Conversation
              </MenuItem>
            )}

            {hasActiveConversation && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset)
                  .then(() => {
                    message.success('Save successful');
                  });
                dataStore.updateActiveConversation(conversationAsset); // local update for speed
              }}
            >
              Save Conversation
            </MenuItem>
            )}

            {hasActiveConversation && (
            <MenuItem
              onClick={() => modalStore.setModelContent(SaveConversationAs)}
            >
              Save Conversation As...
            </MenuItem>
            )}

            {hasActiveConversation && (
            <MenuItem
              onClick={() => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                exportConversation(conversationAsset.Conversation.idRef.id, conversationAsset)
                  .then(() => {
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
                  exportAllConversations(
                    conversationAsset ? conversationAsset.Conversation.idRef.id : -1,
                    conversationAsset,
                  )
                    .then(() => {
                      message.success('Export successful');
                    });
                }}
              >
                Export All Conversations as JSON
              </MenuItem>
            )}
          </SubMenu>
          {/*
          <SubMenu title="Options">
            <MenuItem>Option 1</MenuItem>
          </SubMenu>
          */}
          <SubMenu title="Help">
            <MenuItem
              onClick={() => modalStore.setModelContent(About)}
            >
              About
            </MenuItem>
          </SubMenu>
        </Menu>
      </div>
    );
  }
}

Header.propTypes = {
  dataStore: PropTypes.object.isRequired,
  modalStore: PropTypes.object.isRequired,
};

export default inject('dataStore', 'modalStore')(Header);
