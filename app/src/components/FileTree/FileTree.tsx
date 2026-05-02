/* eslint-disable function-paren-newline */
import type { ComponentProps, CSSProperties, Key } from 'react';
import { Tree, type TreeDataNode } from 'antd';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { useContextMenu } from 'react-contexify';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { getId } from 'utils/conversation-utils';
import { observer } from 'mobx-react';

import './FileTree.css';

type TreeSelectInfo = Parameters<NonNullable<ComponentProps<typeof Tree>['onSelect']>>[1];
type TreeRightClickInfo = Parameters<NonNullable<ComponentProps<typeof Tree>['onRightClick']>>[0];
type TreeData = TreeDataNode[];

type Props = {
  title: string;
  data: { key: string; label: string }[] | null;
  onSelected: (selectedKeys: string[], e: TreeSelectInfo) => void;
  selectedKeys: string[];
  selectedDirectoryName: string | null;
};

const rootTreeKey = '0';
const expandedRootTreeKeys = [rootTreeKey];

function getConversationTreeData(dataStore: DataStore, data: { key: string; label: string }[] | null): TreeData {
  const { isConversationDirty, unsavedActiveConversationAsset: conversationAsset } = dataStore;

  if (data)
    return data.map((item) => {
      const { key } = item;
      let style: CSSProperties = { visibility: 'hidden' };

      if (conversationAsset != null && key === getId(conversationAsset.conversation)) {
        if (isConversationDirty) {
          style = { visibility: 'visible', color: 'gold' };
        }
      }

      const label = (
        <span>
          {`${item.label} `}
          <span style={style}>*</span>
        </span>
      );

      return {
        className: 'file-tree__tree__conversation',
        icon: <FileOutlined />,
        key: item.key,
        title: label,
      };
    });
  return [];
}

const FileTree = ({ title, data = null, onSelected = () => {}, selectedKeys = [], selectedDirectoryName }: Props) => {
  const dataStore = useStore<DataStore>('data');

  const { show } = useContextMenu({
    id: 'conversation-context-menu',
  });

  const headerClasses = classnames('file-tree__tree__conversation_header', {
    'file-tree__tree__conversation_header--no-data': data == null || data.length <= 0,
  });
  const treeData: TreeData = [
    {
      children: getConversationTreeData(dataStore, data),
      className: headerClasses,
      icon: <FolderOutlined />,
      key: rootTreeKey,
      title: data && data.length ? selectedDirectoryName : 'No Conversations',
    },
  ];

  const onRightClickTree = ({ event, node }: TreeRightClickInfo) => {
    const eventKey = String(node.key);
    if (eventKey === rootTreeKey) return;

    const item = data?.find((conversation) => conversation.key === eventKey);
    show({ event, props: { id: eventKey, title: item?.label || String(eventKey), selected: selectedKeys.includes(eventKey) } });
  };

  const onSelectTree = (nextSelectedKeys: Key[], event: TreeSelectInfo) => {
    const selectedTreeKeys = nextSelectedKeys.map(String);
    if (selectedTreeKeys.includes(rootTreeKey)) return;

    onSelected(selectedTreeKeys, event);
  };

  return (
    <div className="file-tree">
      {title && <h4 className="file-tree__title">{title}</h4>}
      <div className="file-tree__tree">
        <div className="file-tree__scroll">
          <Tree showIcon showLine expandedKeys={expandedRootTreeKeys} treeData={treeData} onSelect={onSelectTree} selectedKeys={selectedKeys} onRightClick={onRightClickTree} />
        </div>
      </div>
    </div>
  );
};

export const ObservingFileTree = observer(FileTree);
