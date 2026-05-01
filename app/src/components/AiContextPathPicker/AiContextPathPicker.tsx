import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Alert, List, Spin } from 'antd';
import { ArrowUpOutlined, FileTextOutlined, FolderAddOutlined, FolderOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import sortBy from 'lodash.sortby';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';
import { getDirectories, getRootDrives } from 'services/api';
import { DirectoryItemType, FileItemSystemType, FileSystemItemType } from 'types';

import './AiContextPathPicker.css';

const ListItem = List.Item;
const contextFileExtensions = ['.md', '.txt', '.json', '.jsonc', '.html', '.cs'];

type Props = {
  globalModalId: string;
  initialPath?: string;
  onSelectPath: (path: string) => void;
};

function getItemIcon(item: FileSystemItemType) {
  if (item.isFile) return <FileTextOutlined className="ai-context-path-picker__file-icon" />;
  if (item.name === '..') return <ArrowUpOutlined className="ai-context-path-picker__directory-icon" />;
  return item.hasChildren ? (
    <FolderAddOutlined className="ai-context-path-picker__directory-icon" />
  ) : (
    <FolderOutlined className="ai-context-path-picker__directory-icon" />
  );
}

function AiContextPathPicker({ globalModalId, initialPath, onSelectPath }: Props) {
  const modalStore = useStore<ModalStore>('modal');
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileSystemItemType | null>(null);
  const [directories, setDirectories] = useState<DirectoryItemType[]>([]);
  const [files, setFiles] = useState<FileItemSystemType[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const listItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const loadPath = (path: string) => {
    setLoading(true);
    setSelectedItem(null);
    modalStore.setDisableOk(true, globalModalId);

    if (path === '') {
      void getRootDrives()
        .then((updatedDirectories: DirectoryItemType[]) => {
          setDirectories(updatedDirectories);
          setFiles([]);
          setCurrentPath('');
        })
        .finally(() => setLoading(false));
      return;
    }

    void getDirectories(path, true, contextFileExtensions)
      .then(({ directories: updatedDirectories, files: updatedFiles }: { directories: DirectoryItemType[]; files: FileItemSystemType[] }) => {
        setDirectories(updatedDirectories);
        setFiles(updatedFiles);
        setCurrentPath(path);
      })
      .finally(() => setLoading(false));
  };

  const selectItem = (item: FileSystemItemType) => {
    if (loading || item.name === '..') return;

    const nextSelectedItem = selectedItem && selectedItem.path === item.path ? null : item;
    setSelectedItem(nextSelectedItem);
    modalStore.setDisableOk(nextSelectedItem == null, globalModalId);
  };

  const openDirectory = (item: DirectoryItemType) => {
    if (loading) return;
    loadPath(item.path === '{drives}' ? '' : item.path);
  };

  const setupModal = () => {
    modalStore.setTitle(`Select AI Context Path${selectedItem ? ' - ' + selectedItem.name : ''}`, globalModalId);
    modalStore.setWidth('58vw', globalModalId);
    modalStore.setOkLabel('Add Path', globalModalId);
    modalStore.setCancelLabel('Cancel', globalModalId);
    modalStore.setDisableOk(selectedItem == null, globalModalId);
    modalStore.setOnOk(() => {
      if (!selectedItem) return;
      onSelectPath(selectedItem.path);
      modalStore.closeModal(globalModalId);
    }, globalModalId);
  };

  useEffect(() => {
    loadPath(initialPath || '');
  }, []);

  useEffect(() => {
    setupModal();
  });

  useEffect(() => {
    listItemRefs.current = {};
  }, [directories, files]);

  const items = [...sortBy(directories, (item) => item.name.toLowerCase()), ...sortBy(files, (item) => item.name.toLowerCase())];

  return (
    <div className="ai-context-path-picker">
      <Alert
        className="ai-context-path-picker__alert"
        type="info"
        title={`Choose a folder or one supported context file (${contextFileExtensions.join(', ')}).`}
      />
      {currentPath && <div className="ai-context-path-picker__path">{currentPath}</div>}
      <div className="ai-context-path-picker__list">
        {loading ? (
          <div className="ai-context-path-picker__loading">
            <Spin />
          </div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={items}
            renderItem={(item: FileSystemItemType) => {
              const itemClasses = classnames('ai-context-path-picker__item', {
                'ai-context-path-picker__item--active': selectedItem != null && selectedItem.path === item.path,
              });

              return (
                <ListItem key={item.path} className={itemClasses}>
                  <div
                    ref={(el) => (listItemRefs.current[item.path] = el)}
                    className="ai-context-path-picker__item-content"
                    onClick={() => selectItem(item)}
                    onDoubleClick={() => item.isDirectory && openDirectory(item)}
                  >
                    {getItemIcon(item)}
                    <span className="ai-context-path-picker__name">{item.name}</span>
                    {item.isDirectory && item.name !== '..' && (
                      <Fragment>
                        <span className="ai-context-path-picker__kind">folder</span>
                      </Fragment>
                    )}
                  </div>
                </ListItem>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

export const ObservingAiContextPathPicker = AiContextPathPicker;
