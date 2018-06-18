import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { message, Menu } from 'antd';
import { observer, inject } from 'mobx-react';
import delay from 'lodash.delay';

import FileSystemPicker from '../../components/FileSystemPicker';
import About from '../../components/About';

import { updateConversation } from '../../services/api';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

/* eslint-disable no-return-assign, no-param-reassign */
@observer
class Header extends Component {
  static removePersistantSelection(itemEvent) {
    itemEvent.domEvent.persist();
    delay(() => {
      itemEvent.domEvent.target.className = '';
      itemEvent.domEvent.target.classList.add('ant-menu-item');
    }, 500);
  }

  render() {
    const { dataStore, modalStore } = this.props;
    const hasActiveConversation = (dataStore.activeConversationAsset !== null);

    return (
      <div className="header">
        <Menu mode="horizontal">
          <SubMenu title="File">
            <MenuItem
              onClick={(itemEvent) => {
                modalStore.setModelContent(FileSystemPicker);
                Header.removePersistantSelection(itemEvent);
              }}
            >
              Open Folder
            </MenuItem>

            {hasActiveConversation && (
            <MenuItem
              onClick={(itemEvent) => {
                const { unsavedActiveConversationAsset: conversationAsset } = dataStore;
                updateConversation(conversationAsset.Conversation.idRef.id, conversationAsset)
                  .then(() => {
                    message.success('Save successful');
                  });
                dataStore.updateActiveConversation(conversationAsset); // local update for speed

                Header.removePersistantSelection(itemEvent);
              }}
            >
              Save Conversation
            </MenuItem>
            )}

            {hasActiveConversation && (
              <MenuItem>Save Conversation As...</MenuItem>
            )}

            {/*
            <MenuItem>Export as JSON</MenuItem>
            */}
          </SubMenu>
          <SubMenu title="Help">
            <MenuItem
              onClick={() => modalStore.setModelContent(About)}
            >
              About
            </MenuItem>
            {/*
            <MenuItem>Save Conversation</MenuItem>
            <MenuItem>Save Conversation As...</MenuItem>
            <MenuItem>Export as JSON</MenuItem>
            */}
          </SubMenu>
          {/*
          <SubMenu title="Options">
            <MenuItem>Option 1</MenuItem>
          </SubMenu>
          */}
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
