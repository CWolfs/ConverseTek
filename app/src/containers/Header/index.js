import React from 'react';
import PropTypes from 'prop-types';
import { Menu } from 'antd';
import { observer, inject } from 'mobx-react';

import FileSystemPicker from '../../components/FileSystemPicker';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

const Header = observer(({ modalStore }) => (
  <div className="header">
    <Menu mode="horizontal">
      <SubMenu title="File">
        <MenuItem
          onClick={() => modalStore.setModelContent(FileSystemPicker)}
        >
          Open Folder
        </MenuItem>
        <MenuItem>Save Conversation</MenuItem>
        <MenuItem>Save Conversation As...</MenuItem>
        <MenuItem>Export as JSON</MenuItem>
      </SubMenu>
      <SubMenu title="Options">
        <MenuItem>Option 1</MenuItem>
      </SubMenu>
    </Menu>
  </div>
));

Header.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default inject('modalStore')(Header);
