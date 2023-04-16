/* eslint-disable function-paren-newline */
import React from 'react';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

import './FileTree.css';

type Props = {
  title: string;
  data: { key: string; label: string }[] | null;
  onSelected: () => void;
  selectedKeys: string[];
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { TreeNode } = Tree;

export const FileTree = ({ title, data = null, onSelected = () => {}, selectedKeys = [] }: Props) => (
  <div className="file-tree">
    {title && <h4 className="file-tree__title">{title}</h4>}
    <div className="file-tree__tree">
      <CustomScroll heightRelativeToParent="calc(100% - 1px)">
        <Tree showLine defaultExpandedKeys={['0']} onSelect={onSelected} selectedKeys={selectedKeys}>
          <TreeNode title={data && data.length ? 'simGameConversations' : 'No Conversations'} key="0">
            {data && data.map((item) => <TreeNode key={item.key} title={item.label} />)}
          </TreeNode>
        </Tree>
      </CustomScroll>
    </div>
  </div>
);
