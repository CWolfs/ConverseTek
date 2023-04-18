/* eslint-disable function-paren-newline */
import React from 'react';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';

import { AntTreeNodeSelectedEvent } from 'antd/lib/tree';

import 'react-custom-scroll/dist/customScroll.css';

import './FileTree.css';

type Props = {
  title: string;
  data: { key: string; label: string }[] | null;
  onSelected: (selectedKeys: string[], e: AntTreeNodeSelectedEvent) => void;
  selectedKeys: string[];
};

const { TreeNode } = Tree;

function renderTreeNodes(data: { key: string; label: string }[] | null): JSX.Element[] | undefined {
  if (data) return data.map((item) => <TreeNode className="file-tree__tree__conversation" key={item.key} title={item.label} />);
  return undefined;
}

export const FileTree = ({ title, data = null, onSelected = () => {}, selectedKeys = [] }: Props) => {
  return (
    <div className="file-tree">
      {title && <h4 className="file-tree__title">{title}</h4>}
      <div className="file-tree__tree">
        <CustomScroll heightRelativeToParent="calc(100% - 1px)">
          <Tree showIcon showLine defaultExpandedKeys={['0']} onSelect={onSelected} selectedKeys={selectedKeys}>
            <TreeNode title={data && data.length ? 'simGameConversations' : 'No Conversations'} key="0">
              {renderTreeNodes(data)}
            </TreeNode>
          </Tree>
        </CustomScroll>
      </div>
    </div>
  );
};
