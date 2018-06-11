import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { List, Icon } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';

import { getRootDrives } from '../../services/api';

import './FileSystemPicker.css';

const ListItem = List.Item;

/* eslint-disable react/prefer-stateless-function, no-useless-constructor, class-methods-use-this */
class FileSystemPicker extends Component {
  constructor(props) {
    super(props);
    const { modalStore } = this.props;

    this.state = {
      directories: [],
    };

    getRootDrives().then((directories) => {
      console.log(`Directories ${JSON.stringify(directories)}`);
      this.setState({ directories });
    });

    this.onOk = this.onOk.bind(this);
    this.onDirectoryClicked = this.onDirectoryClicked.bind(this);

    modalStore.setOnOk(this.onOk);
    modalStore.setOkLabel('Load');
  }

  onOk() {
    const { modalStore } = this.props;
    modalStore.closeModal();
  }

  onDirectoryClicked(item) {
    const { directories } = this.state;
    let newDirectories = [...directories];

    const clickedItem = {
      ...item,
      active: !item.active,
    };

    remove(newDirectories, directory => directory.Path === clickedItem.Path);
    newDirectories = newDirectories.map(nonSelectedItem => ({ ...nonSelectedItem, active: false }));
    newDirectories.push(clickedItem);
    newDirectories = sortBy(newDirectories, directory => directory.Name);

    this.setState({ directories: newDirectories });
  }

  onDirectoryDoubleClicked(item) {

  }

  render() {
    const { directories } = this.state;

    return (
      <div className="file-system-picker">
        <div className="file-system-picker__quick-links">
          Nav
        </div>
        <div className="file-system-picker__directory-list">
          <List
            itemLayout="horizontal"
            dataSource={directories}
            renderItem={(item) => {
              const itemClasses = classnames('file-system-picker__directory-item', {
                'file-system-picker__directory-item--active': item.active,
              });

              return (
                <ListItem
                  key={item.Path}
                  className={itemClasses}
                  onClick={() => this.onDirectoryClicked(item)}
                  onDoubleClick={() => this.onDirectoryDoubleClicked(item)}
                >
                  {(item.HasChildren) ?
                    <Icon type="folder-add" className="file-system-picker__directory-icon" />
                  :
                    <Icon type="folder" className="file-system-picker__directory-icon" />
                  }
                  <span className="file-system-picker__directory-name">{item.Name}</span>
                </ListItem>
              );
            }}
          />
        </div>
      </div>
    );
  }
}

FileSystemPicker.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default FileSystemPicker;
