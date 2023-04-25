/* eslint-disable operator-linebreak */
import React, { useState, useEffect, CSSProperties, Fragment, useRef } from 'react';
import { List, Icon } from 'antd';
import classnames from 'classnames';
import remove from 'lodash.remove';
import sortBy from 'lodash.sortby';
import debounce from 'lodash.debounce';
import type { DebouncedFunc } from 'lodash';
import { useContextMenu } from 'react-contexify';

import { getRootDrives, getDirectories, getQuickLinks, saveWorkingDirectory, getConversations, importConversation } from 'services/api';
import { useStore } from 'hooks/useStore';
import { FSModalProps, ModalStore } from 'stores/modalStore/modal-store';
import { DirectoryItemType, FileItemSystemType, FileSystemItemType, QuickLinkType } from 'types';
import { IconButton } from 'components/IconButton';
import { FileSystemPickerContextMenu } from 'components/ContextMenus/FileSystemPickerContextMenu';

import './FileSystemPicker.css';

const ListItem = List.Item;

const rootDrivePathPattern = /^[a-zA-Z]:[\\/]{1}$/;

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
  const [contextSelectedItem, setContextSelectedItem] = useState<DirectoryItemType | null>(null);
  const [directories, setDirectories] = useState<DirectoryItemType[]>([]);
  const [files, setFiles] = useState<FileItemSystemType[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLinkType[]>([]);
  const listItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { show } = useContextMenu({
    id: 'filesystempicker-context-menu',
  });

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
      void saveWorkingDirectory(selectedItem.path, selectedItem.name)
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

      setDirectories(newFsItems.filter((fsItem) => fsItem.isDirectory) as DirectoryItemType[]);
      setFiles(newFsItems.filter((fsItem) => fsItem.isFile) as FileItemSystemType[]);
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
        ({ directories: updatedDirectories, files: updatedFiles }: { directories: DirectoryItemType[]; files: FileItemSystemType[] }) => {
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
    if (path === 'MyComputer') {
      void getRootDrives().then((updatedDirectories: DirectoryItemType[]) => setDirectories(updatedDirectories));
    } else {
      const isSpecialFolder = path === 'Desktop' || path === 'Favourites' || path === 'MyDocuments';
      const isRootPath = rootDrivePathPattern.test(path);
      const modifiedPath = !isRootPath && !isSpecialFolder ? path.substring(0, path.lastIndexOf('/') + 1) : path;

      void getDirectories(modifiedPath, false).then(
        ({ directories: updatedDirectories, files: updatedFiles }: { directories: DirectoryItemType[]; files: FileItemSystemType[] }) => {
          setDirectories(updatedDirectories);
          setFiles(updatedFiles);

          updatedDirectories.forEach((fileSystemItem) => {
            if (fileSystemItem.name === path.substring(path.lastIndexOf('/') + 1)) {
              fileSystemItem.active = true;
              setSelectedItem(fileSystemItem);
              scrollToSelectedItem(fileSystemItem.path);
            }
          });
        },
      );
    }
  };

  const scrollToSelectedItem = (key: string) => {
    if (listItemRefs.current[key]) {
      listItemRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const setQuicklinkStatus = () => {
    directories.forEach((directory: DirectoryItemType) => {
      directory.isQuickLink = false;
    });

    directories.forEach((directory: DirectoryItemType) => {
      quickLinks.forEach((quicklink: QuickLinkType) => {
        if (directory.path.replaceAll('\\', '/') === quicklink.path) {
          directory.isQuickLink = true;
        }
      });
    });
  };

  // onMount
  useEffect(() => {
    void getRootDrives().then((updatedDirectories: DirectoryItemType[]) => setDirectories(updatedDirectories));
    void getQuickLinks().then((updatedQuickLinks: QuickLinkType[]) => {
      setQuickLinks(updatedQuickLinks);
    });
  }, []);

  useEffect(() => {
    const modalProps: FSModalProps = modalStore.props;
    setFileMode(modalProps.fileMode || false);
    setupModal();
  });

  useEffect(() => {
    listItemRefs.current = {};
  }, [directories, files]);

  const items = [...directories, ...files];

  const quicklinkButtonStyle: CSSProperties = {
    marginTop: 12,
  };

  const quicklinkLabelStyle: CSSProperties = {
    marginTop: 4,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 500,
  };

  setQuicklinkStatus();

  return (
    <div className="file-system-picker">
      <FileSystemPickerContextMenu id="filesystempicker-context-menu" selectedItem={contextSelectedItem} />
      <div className="file-system-picker__quick-links">
        <IconButton style={quicklinkButtonStyle} className="button-primary-pale" icon="desktop" onClick={() => onDirectNavigation('Desktop')} />
        <div style={quicklinkLabelStyle}>Desktop</div>

        <IconButton style={quicklinkButtonStyle} className="button-primary-pale" icon="desktop" onClick={() => onDirectNavigation('MyComputer')} />
        <div style={quicklinkLabelStyle}>My Computer</div>

        <IconButton style={quicklinkButtonStyle} className="button-primary-pale" icon="desktop" onClick={() => onDirectNavigation('MyDocuments')} />
        <div style={quicklinkLabelStyle}>My Documents</div>

        <IconButton style={quicklinkButtonStyle} className="button-primary-pale" icon="desktop" onClick={() => onDirectNavigation('Favourites')} />
        <div style={quicklinkLabelStyle}>Favourites</div>

        {quickLinks &&
          quickLinks.map(({ title, path }) => (
            <Fragment key={title}>
              <IconButton className="button-secondary-pale" style={quicklinkButtonStyle} icon="book" onClick={() => onDirectNavigation(path)} />
              <div style={quicklinkLabelStyle}>{title}</div>
            </Fragment>
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
                  ref={(el) => (listItemRefs.current[item.path] = el)}
                  className="file-system-picker__directory-item-subcontainer"
                  onClick={() => onDirectoryClicked(item)}
                  onDoubleClick={() => item.isDirectory && onDirectoryDoubleClicked(item)}
                  onContextMenu={(event) => {
                    if (item.isDirectory) {
                      setContextSelectedItem(item);
                      show({ event, props: { item } });
                    }
                  }}
                >
                  {getItemIcon(item)}
                  <span className="file-system-picker__directory-name">{item.name}</span>
                  {item.isDirectory && item.isQuickLink && <Icon style={{ marginLeft: 8 }} type="book" theme="twoTone" />}
                </div>
              </ListItem>
            );
          }}
        />
      </div>
    </div>
  );
}
