import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

import './FileTree.css';

const { TreeNode } = Tree;

/* eslint-disable react/prefer-stateless-function */
class FileTree extends Component {
  render() {
    const { title, data, onSelected } = this.props;

    return (
      <div className="file-tree">
        {title && <h4 className="file-tree__title">{title}</h4>}
        <div className="file-tree__tree">
          <CustomScroll heightRelativeToParent="calc(100% - 1px)">
            <Tree
              showLine
              defaultExpandedKeys={['0']}
              onSelect={onSelected}
            >
              <TreeNode title={(data && data.length) ? 'simGameConversations' : 'No Conversations'} key="0">
                {data.map(item => <TreeNode key={item.key} title={item.label} />)}
              </TreeNode>
            </Tree>
          </CustomScroll>
        </div>
      </div>
    );
  }
}

FileTree.defaultProps = {
  title: undefined,
  data: null,
  onSelected: () => {},
};

FileTree.propTypes = {
  title: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
  })),
  onSelected: PropTypes.func,
};

export default FileTree;
