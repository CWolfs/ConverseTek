/* eslint-disable function-paren-newline */
import React, { CSSProperties } from 'react';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';
import classnames from 'classnames';
import { useContextMenu } from 'react-contexify';
import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { getId } from 'utils/conversation-utils';
import { observer } from 'mobx-react';

import type { AntTreeNodeMouseEvent, AntTreeNodeSelectedEvent } from 'antd/lib/tree';

import 'react-custom-scroll/dist/customScroll.css';

import './FileTree.css';

type Props = {
  title: string;
  data: { key: string; label: string }[] | null;
  onSelected: (selectedKeys: string[], e: AntTreeNodeSelectedEvent) => void;
  selectedKeys: string[];
  selectedDirectoryName: string | null;
};

const { TreeNode } = Tree;

function renderTreeNodes(dataStore: DataStore, data: { key: string; label: string }[] | null): JSX.Element[] | undefined {
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

      return <TreeNode className="file-tree__tree__conversation" key={item.key} title={label} />;
    });
  return undefined;
}

const FileTree = ({ title, data = null, onSelected = () => {}, selectedKeys = [], selectedDirectoryName }: Props) => {
  const dataStore = useStore<DataStore>('data');

  const { show } = useContextMenu({
    id: 'conversation-context-menu',
  });

  const headerClasses = classnames('file-tree__tree__conversation_header', {
    'file-tree__tree__conversation_header--no-data': data == null || data.length <= 0,
  });

  const onRightClickTree = ({ event, node }: AntTreeNodeMouseEvent) => {
    const { eventKey } = node.props;
    if (eventKey === '0') return;

    show({ event, props: { id: eventKey, title: node.props.title, selected: node.props.selected } });
  };

  return (
    <div className="file-tree">
      {title && <h4 className="file-tree__title">{title}</h4>}
      <div className="file-tree__tree">
        <CustomScroll heightRelativeToParent="calc(100% - 1px)">
          <Tree showIcon showLine defaultExpandedKeys={['0']} onSelect={onSelected} selectedKeys={selectedKeys} onRightClick={onRightClickTree}>
            <TreeNode className={headerClasses} title={data && data.length ? selectedDirectoryName : 'No Conversations'} key="0">
              {renderTreeNodes(dataStore, data)}
            </TreeNode>
          </Tree>
        </CustomScroll>
      </div>
    </div>
  );
};

export const ObservingFileTree = observer(FileTree);
