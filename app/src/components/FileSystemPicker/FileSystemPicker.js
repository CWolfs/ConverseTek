/* eslint-disable operator-linebreak */
import React, { useState, useEffect } from 'react';
import { List, Icon, Tooltip } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import debounce from 'lodash.debounce';
import toPairs from 'lodash.topairs';

import { getRootDrives, getDirectories, getQuickLinks, saveWorkingDirectory, getConversations, importConversation } from 'services/api';
import { useStore } from 'hooks/useStore';

import './FileSystemPicker.css';

const ListItem = List.Item;

function getItemIcon(item) {
  if (item.HasChildren) return <Icon type="folder-add" className="file-system-picker__directory-icon" />;
  if (item.File) return <Icon type="file-text" className="file-system-picker__file-icon" />;
  return <Icon type="folder" className="file-system-picker__directory-icon" />;
}

let debouncedClickEvents = [];

export function FileSystemPicker() {
  const modalStore = useStore('modal');

  const [loading, setLoading] = useState(false);
  const [fileMode, setFileMode] = useState(modalStore.props.fileMode);
  const [selectedItem, setSelectedItem] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [quickLinks, setQuickLinks] = useState(null);

  const onOk = () => {
    setLoading(true);
    modalStore.setIsLoading(true);

    if (fileMode) {
      importConversation(selectedItem.Path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          setSelectedItem(null);
          setLoading(false);
          return modalStore.closeModal();
        });
    } else {
      saveWorkingDirectory(selectedItem.Path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          setSelectedItem(null);
          setLoading(false);
          return modalStore.closeModal();
        });
    }
  };

  const onDirectoryClicked = (item) => {
    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - prevent selection of backLinks
    if (item.Name === '..') return;

    // Array of debounced click events
    debouncedClickEvents = debouncedClickEvents || [];

    const callback = debounce(() => {
      let newFsItems = [...sortBy(directories, (fsItem) => fsItem.Name.toLowerCase()), ...sortBy(files, (fsItem) => fsItem.Name.toLowerCase())];

      const clickedItem = {
        ...item,
        active: !item.active,
      };

      remove(newFsItems, (fsItem) => fsItem.Path === clickedItem.Path);
      newFsItems = newFsItems.map((nonSelectedItem) => ({ ...nonSelectedItem, active: false }));
      newFsItems.push(clickedItem);
      newFsItems = sortBy(newFsItems, (fsItem) => fsItem.Name.toLowerCase());

      modalStore.setDisableOk(!clickedItem.active);
      if (fileMode && clickedItem.IsDirectory) modalStore.setDisableOk(true);

      setDirectories(newFsItems.filter((fsItem) => fsItem.IsDirectory));
      setFiles(newFsItems.filter((fsItem) => fsItem.IsFile));
      setSelectedItem(clickedItem.active ? clickedItem : null);

      debouncedClickEvents = [];
    }, 100);

    debouncedClickEvents.push(callback);
    callback();
  };

  const onDirectoryDoubleClicked = (item) => {
    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - If item has no children then ignore double clicks
    if (!fileMode && !item.HasChildren) return;

    // If there were click events registered we cancel them
    if (debouncedClickEvents && debouncedClickEvents.length > 0) {
      debouncedClickEvents.forEach((debouncedClickEvent) => debouncedClickEvent.cancel());
      debouncedClickEvents = [];
    }

    if (item.HasChildren || (fileMode && item.IsDirectory)) {
      setSelectedItem(null);
      modalStore.setDisableOk(true);
      getDirectories(item.Path, fileMode).then(({ directories: updatedDirectories, files: updatedFiles }) => {
        setDirectories(updatedDirectories);
        setFiles(updatedFiles);
      });
    }
  };

  const setupModal = () => {
    modalStore.setOnOk(onOk);
    modalStore.setTitle(`Select a conversation ${fileMode ? '' : 'directory'}`);
    modalStore.setOkLabel('Load');
    modalStore.setLoadingLabel('Loading');
  };

  const onDirectNavigation = (path) => {
    getDirectories(path, false).then(({ directories: updatedDirectories, files: updatedFiles }) => {
      setDirectories(updatedDirectories);
      setFiles(updatedFiles);
    });
  };

  // onMount
  useEffect(() => {
    getRootDrives().then((updatedDirectories) => setDirectories(updatedDirectories));
    getQuickLinks().then((updatedQuickLinks) => setQuickLinks(updatedQuickLinks));
  }, []);

  useEffect(() => {
    setFileMode(modalStore.props.fileMode);
    setupModal();
  });

  const items = [...directories, ...files];
  const quickLinkPairs = quickLinks ? toPairs(quickLinks) : [];

  return (
    <div className="file-system-picker">
      <div className="file-system-picker__quick-links">
        <Icon type="desktop" style={{ fontSize: 20 }} />
        {quickLinkPairs &&
          quickLinkPairs.map(([name, path]) => (
            <Tooltip title={name} onClick={() => onDirectNavigation(path)}>
              <Icon type="book" style={{ fontSize: 20 }} />
            </Tooltip>
          ))}
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
                onClick={() => onDirectoryClicked(item)}
                onDoubleClick={() => onDirectoryDoubleClicked(item)}
              >
                {getItemIcon(item)}
                <span className="file-system-picker__directory-name">{item.Name}</span>
              </ListItem>
            );
          }}
        />
      </div>
    </div>
  );
}
