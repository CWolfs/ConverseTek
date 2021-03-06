import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { List, Icon } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import debounce from 'lodash.debounce';

import {
  getRootDrives,
  getDirectories,
  saveWorkingDirectory,
  getConversations,
  importConversation,
} from '../../services/api';

import './FileSystemPicker.css';

const ListItem = List.Item;

/* eslint-disable react/prefer-stateless-function, no-useless-constructor, class-methods-use-this */
class FileSystemPicker extends Component {
  constructor(props) {
    super(props);

    const { modalStore } = props;

    this.state = {
      directories: [],
      files: [],
      selectedItem: null,
      loading: false,
      fileMode: modalStore.props.fileMode,
    };

    getRootDrives().then(directories => this.setState({ directories }));

    this.onOk = this.onOk.bind(this);
    this.onDirectoryClicked = this.onDirectoryClicked.bind(this);
    this.onDirectoryDoubleClicked = this.onDirectoryDoubleClicked.bind(this);

    this.setupModal();
  }

  componentWillReceiveProps(nextProps) {
    const { modalStore } = nextProps;
    this.setState({ fileMode: modalStore.props.fileMode });

    this.setupModal();
  }

  onOk() {
    const { modalStore } = this.props;
    const { selectedItem, fileMode } = this.state;

    this.setState({ loading: true });
    modalStore.setIsLoading(true);

    if (fileMode) {
      importConversation(selectedItem.Path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          this.setState({
            selectedItem: null,
            loading: false,
          });
          return modalStore.closeModal();
        });
    } else {
      saveWorkingDirectory(selectedItem.Path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          this.setState({
            selectedItem: null,
            loading: false,
          });
          return modalStore.closeModal();
        });
    }
  }

  onDirectoryClicked(item) {
    const { modalStore } = this.props;
    const { loading, fileMode } = this.state;

    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - prevent selection of backLinks
    if (item.Name === '..') return;

    // Array of debounced click events
    this.debouncedClickEvents = this.debouncedClickEvents || [];

    const callback = debounce(() => {
      const { directories, files } = this.state;
      let newFsItems = [
        ...sortBy(directories, fsItem => fsItem.Name.toLowerCase()),
        ...sortBy(files, fsItem => fsItem.Name.toLowerCase()),
      ];

      const clickedItem = {
        ...item,
        active: !item.active,
      };

      remove(newFsItems, fsItem => fsItem.Path === clickedItem.Path);
      newFsItems =
        newFsItems.map(nonSelectedItem => ({ ...nonSelectedItem, active: false }));
      newFsItems.push(clickedItem);
      newFsItems = sortBy(newFsItems, fsItem => fsItem.Name.toLowerCase());

      modalStore.setDisableOk(!clickedItem.active);
      if (fileMode && clickedItem.IsDirectory) modalStore.setDisableOk(true);

      this.setState({
        directories: newFsItems.filter(fsItem => fsItem.IsDirectory),
        files: newFsItems.filter(fsItem => fsItem.IsFile),
        selectedItem: (clickedItem.active) ? clickedItem : null,
      });

      this.debouncedClickEvents = [];
    }, 100);

    this.debouncedClickEvents.push(callback);
    callback();
  }

  onDirectoryDoubleClicked(item) {
    const { modalStore } = this.props;
    const { loading, fileMode } = this.state;

    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - If item has no children then ignore double clicks
    if (!fileMode && !item.HasChildren) return;

    // If there were click events registered we cancel them
    if (this.debouncedClickEvents && this.debouncedClickEvents.length > 0) {
      this.debouncedClickEvents.forEach(debouncedClickEvent => debouncedClickEvent.cancel());
      this.debouncedClickEvents = [];
    }

    if (item.HasChildren || (fileMode && item.IsDirectory)) {
      this.setState({ selectedItem: null });
      modalStore.setDisableOk(true);
      getDirectories(item.Path, fileMode)
        .then(({ directories, files }) => this.setState({ directories, files }));
    }
  }

  setupModal() {
    const { modalStore } = this.props;
    const { fileMode } = this.state;

    modalStore.setOnOk(this.onOk);
    modalStore.setTitle(`Select a conversation ${fileMode ? '' : 'directory'}`);
    modalStore.setOkLabel('Load');
    modalStore.setLoadingLabel('Loading');
  }

  getItemIcon = (item) => {
    if (item.HasChildren) return <Icon type="folder-add" className="file-system-picker__directory-icon" />;

    if (item.File) return <Icon type="file-text" className="file-system-picker__file-icon" />;

    return <Icon type="folder" className="file-system-picker__directory-icon" />;
  };

  render() {
    const { directories, files } = this.state;
    const items = [
      ...directories,
      ...files,
    ];

    return (
      <div className="file-system-picker">
        <div className="file-system-picker__quick-links">
          <Icon type="desktop" />
        </div>
        <div className="file-system-picker__directory-list">
          <List
            itemLayout="horizontal"
            dataSource={items}
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
                  {this.getItemIcon(item)}
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
