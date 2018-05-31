import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tree } from 'antd';

import './FileTree.css';

const { TreeNode } = Tree;

class FileTree extends Component {
  onSelect = (selectedKeys, info) => {
    console.log('selected', selectedKeys, info);
  }

  render() {
    const { title } = this.props;

    return (
      <div className="file-tree">
        {title && <h4 className="file-tree__title">{title}</h4>}
        <Tree
          showLine
          defaultExpandedKeys={['0']}
          onSelect={this.onSelect}
        >
          <TreeNode title="simGameConversations" key="0">
            <TreeNode title="5a3ab7376230353c12005c60.convo" key="0-0" />
            <TreeNode title="5a3abc456230353c12005f73.convo" key="0-1" />
            <TreeNode title="5a3abc646230353c12005f7d.convo" key="0-2" />
            <TreeNode title="5a3d5fc2623035dc17000045.convo" key="0-3" />
            <TreeNode title="5a5cf51a623035b41e00002a.convo" key="0-4" />
            <TreeNode title="5a9c39f462303538160005e7.convo" key="0-5" />
          </TreeNode>
        </Tree>
      </div>
    );
  }
}

FileTree.defaultProps = {
  title: undefined,
};

FileTree.propTypes = {
  title: PropTypes.string,
};

export default FileTree;
