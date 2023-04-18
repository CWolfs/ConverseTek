/* eslint-disable operator-linebreak */
import React, { useState, useEffect } from 'react';
import { List, Icon, Tooltip } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import debounce from 'lodash.debounce';
import type { DebouncedFunc } from 'lodash';

import { getRootDrives, getDirectories, getQuickLinks, saveWorkingDirectory, getConversations, importConversation } from 'services/api';
import { useStore } from 'hooks/useStore';
import { FSModalProps, ModalStore } from 'stores/modalStore/modal-store';
import { DirectoryItemType, FileSystemItemType } from 'types/FileSystemItemType';

import './FileSystemPicker.css';
import { QuickLinkType } from 'types/QuickLinkType';

const ListItem = List.Item;

function getItemIcon(item: FileSystemItemType) {
  if (item.isDirectory && item.hasChildren) return <Icon type="folder-add" className="file-system-picker__directory-icon" />;
  if (item.isFile) return <Icon type="file-text" className="file-system-picker__file-icon" />;
  return <Icon type="folder" className="file-system-picker__directory-icon" />;
}

let debouncedClickEvents: DebouncedFunc<() => void>[] = [];

export function FileSystemPicker() {
  const modalStore = useStore<ModalStore>('modal');
  const modalProps: FSModalProps = modalStore.props;

  const [loading, setLoading] = useState(false);
  const [fileMode, setFileMode] = useState<boolean>(modalProps.fileMode || false);
  const [selectedItem, setSelectedItem] = useState<FileSystemItemType | null>(null);
  const [directories, setDirectories] = useState<FileSystemItemType[]>([]);
  const [files, setFiles] = useState<FileSystemItemType[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLinkType[]>([]);

  const onOk = () => {
    if (selectedItem == null) return;

    setLoading(true);
    modalStore.setIsLoading(true);

    if (fileMode) {
      void importConversation(selectedItem.path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          setSelectedItem(null);
          setLoading(false);
          return modalStore.closeModal();
        });
    } else {
      void saveWorkingDirectory(selectedItem.path)
        .then(() => getConversations())
        .then(() => {
          selectedItem.active = false;
          setSelectedItem(null);
          setLoading(false);
          return modalStore.closeModal();
        });
    }
  };

  const onDirectoryClicked = (item: FileSystemItemType) => {
    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - prevent selection of backLinks
    if (item.name === '..') return;

    // Array of debounced click events
    debouncedClickEvents = debouncedClickEvents || [];

    const callback = debounce(() => {
      let newFsItems = [...sortBy(directories, (fsItem) => fsItem.name.toLowerCase()), ...sortBy(files, (fsItem) => fsItem.name.toLowerCase())];

      const clickedItem = {
        ...item,
        active: !item.active,
      };

      remove(newFsItems, (fsItem) => fsItem.path === clickedItem.path);
      newFsItems = newFsItems.map((nonSelectedItem) => ({ ...nonSelectedItem, active: false }));
      newFsItems.push(clickedItem);
      newFsItems = sortBy(newFsItems, (fsItem) => fsItem.name.toLowerCase());

      modalStore.setDisableOk(!clickedItem.active);
      if (fileMode && clickedItem.isDirectory) modalStore.setDisableOk(true);

      setDirectories(newFsItems.filter((fsItem) => fsItem.isDirectory));
      setFiles(newFsItems.filter((fsItem) => fsItem.isFile));
      setSelectedItem(clickedItem.active ? clickedItem : null);

      debouncedClickEvents = [];
    }, 100);

    debouncedClickEvents.push(callback);
    callback();
  };

  const onDirectoryDoubleClicked = (item: DirectoryItemType) => {
    // GUARD - lock down things if loading
    if (loading) return;

    // GUARD - If item has no children then ignore double clicks
    if (!fileMode && !item.hasChildren) return;

    // If there were click events registered we cancel them
    if (debouncedClickEvents && debouncedClickEvents.length > 0) {
      debouncedClickEvents.forEach((debouncedClickEvent) => debouncedClickEvent.cancel());
      debouncedClickEvents = [];
    }

    if (item.hasChildren || (fileMode && item.isDirectory)) {
      setSelectedItem(null);
      modalStore.setDisableOk(true);
      void getDirectories(item.path, fileMode).then(
        ({ directories: updatedDirectories, files: updatedFiles }: { directories: FileSystemItemType[]; files: FileSystemItemType[] }) => {
          setDirectories(updatedDirectories);
          setFiles(updatedFiles);
        },
      );
    }
  };

  const setupModal = () => {
    modalStore.setOnOk(onOk);
    modalStore.setTitle(`Select a conversation ${fileMode ? '' : 'directory'}${selectedItem ? ' - ' + selectedItem.name : ''}`);
    modalStore.setOkLabel('Load');
    modalStore.setLoadingLabel('Loading');
  };

  const onDirectNavigation = (path: string) => {
    void getDirectories(path, false).then(
      ({ directories: updatedDirectories, files: updatedFiles }: { directories: FileSystemItemType[]; files: FileSystemItemType[] }) => {
        setDirectories(updatedDirectories);
        setFiles(updatedFiles);
      },
    );
  };

  // onMount
  useEffect(() => {
    void getRootDrives().then((updatedDirectories: FileSystemItemType[]) => setDirectories(updatedDirectories));
    void getQuickLinks().then((updatedQuickLinks: QuickLinkType[]) => {
      setQuickLinks(updatedQuickLinks);
    });
  }, []);

  useEffect(() => {
    const modalProps: FSModalProps = modalStore.props;
    setFileMode(modalProps.fileMode || false);
    setupModal();
  });

  const items = [...directories, ...files];

  return (
    <div className="file-system-picker">
      <div className="file-system-picker__quick-links">
        <Icon type="desktop" style={{ fontSize: 20 }} />
        {quickLinks &&
          quickLinks.map(({ title, path }) => (
            <Tooltip title={title} placement="left">
              <div onClick={() => onDirectNavigation(path)}>
                <Icon type="book" style={{ fontSize: 20 }} />
              </div>
            </Tooltip>
          ))}
      </div>
      <div className="file-system-picker__directory-list">
        <List
          itemLayout="horizontal"
          dataSource={items}
          renderItem={(item: FileSystemItemType) => {
            const itemClasses = classnames('file-system-picker__directory-item', {
              'file-system-picker__directory-item--active': item.active,
            });

            return (
              <ListItem key={item.path} className={itemClasses}>
                <div
                  className="file-system-picker__directory-item-subcontainer"
                  onClick={() => onDirectoryClicked(item)}
                  onDoubleClick={() => item.isDirectory && onDirectoryDoubleClicked(item)}
                >
                  {getItemIcon(item)}
                  <span className="file-system-picker__directory-name">{item.name}</span>
                </div>
              </ListItem>
            );
          }}
        />
      </div>
    </div>
  );
}
