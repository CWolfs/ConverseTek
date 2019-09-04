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
    const { selectedItem } = this.state;

    this.setState({ loading: true });
    modalStore.setIsLoading(true);

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
      const { directories } = this.state;
      let newDirectories = [...directories];

      const clickedItem = {
        ...item,
        active: !item.active,
      };

      remove(newDirectories, directory => directory.Path === clickedItem.Path);
      newDirectories =
        newDirectories.map(nonSelectedItem => ({ ...nonSelectedItem, active: false }));
      newDirectories.push(clickedItem);
      newDirectories = sortBy(newDirectories, directory => directory.Name.toLowerCase());

      modalStore.setDisableOk(!clickedItem.active);

      this.setState({
        directories: newDirectories,
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
    if (!item.HasChildren) return;

    // If there were click events registered we cancel them
    if (this.debouncedClickEvents && this.debouncedClickEvents.length > 0) {
      this.debouncedClickEvents.forEach(debouncedClickEvent => debouncedClickEvent.cancel());
      this.debouncedClickEvents = [];
    }

    if (item.HasChildren) {
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
    const { fileMode } = this.state;

    if (item.HasChildren) return <Icon type="folder-add" className="file-system-picker__directory-icon" />;

    if (fileMode) return <Icon type="file-text" className="file-system-picker__file-icon" />;

    return <Icon type="folder" className="file-system-picker__directory-icon" />;
  };

  render() {
    const { directories, files, fileMode } = this.state;
    const items = [
      ...directories.filter(directory => (fileMode && directory.HasChildren) || !fileMode),
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
