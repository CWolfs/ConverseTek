import React from 'react';
import { Menu } from 'antd';

import './Header.css';

const MenuItem = Menu.Item;
const { SubMenu } = Menu;

export default () => (
  <div className="header">
    <Menu mode="horizontal">
      <SubMenu title="File">
        <MenuItem>Open Folder</MenuItem>
        <MenuItem>Save Conversation</MenuItem>
        <MenuItem>Save Conversation As...</MenuItem>
        <MenuItem>Export as JSON</MenuItem>
      </SubMenu>
      <SubMenu title="Options">
        <MenuItem>Option 1</MenuItem>
      </SubMenu>
    </Menu>
  </div>
);
