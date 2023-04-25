/* eslint-disable function-paren-newline */
import React from 'react';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';
import classnames from 'classnames';
import { useContextMenu } from 'react-contexify';

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

function renderTreeNodes(data: { key: string; label: string }[] | null): JSX.Element[] | undefined {
  if (data) return data.map((item) => <TreeNode className="file-tree__tree__conversation" key={item.key} title={item.label} />);
  return undefined;
}

export const FileTree = ({ title, data = null, onSelected = () => {}, selectedKeys = [], selectedDirectoryName }: Props) => {
  const { show } = useContextMenu({
    id: 'conversation-context-menu',
  });

  const headerClasses = classnames('file-tree__tree__conversation_header', {
    'file-tree__tree__conversation_header--no-data': data == null || data.length <= 0,
  });

  const onRightClickTree = ({ event, node }: AntTreeNodeMouseEvent) => {
    show({ event, props: { id: node.props.eventKey, title: node.props.title, selected: node.props.selected } });
  };

  return (
    <div className="file-tree">
      {title && <h4 className="file-tree__title">{title}</h4>}
      <div className="file-tree__tree">
        <CustomScroll heightRelativeToParent="calc(100% - 1px)">
          <Tree showIcon showLine defaultExpandedKeys={['0']} onSelect={onSelected} selectedKeys={selectedKeys} onRightClick={onRightClickTree}>
            <TreeNode className={headerClasses} title={data && data.length ? selectedDirectoryName : 'No Conversations'} key="0">
              {renderTreeNodes(data)}
            </TreeNode>
          </Tree>
        </CustomScroll>
      </div>
    </div>
  );
};
