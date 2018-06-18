import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { message, Menu } from 'antd';
import { observer, inject } from 'mobx-react';

import FileSystemPicker from '../../components/FileSystemPicker';
import About from '../../components/About';

import { updateConversation } from '../../services/api';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

/* eslint-disable no-return-assign, no-param-reassign */
@observer
class Header extends Component {
  render() {
    const { dataStore, modalStore } = this.props;
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
              <MenuItem>Save Conversation As...</MenuItem>
            )}

            {/*
            <MenuItem>Export as JSON</MenuItem>
            */}
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
