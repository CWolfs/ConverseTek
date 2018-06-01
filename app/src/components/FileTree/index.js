import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

import './FileTree.css';

const { TreeNode } = Tree;

class FileTree extends Component {
  onSelect = (selectedKeys, info) => {
    console.log('selected', selectedKeys, info);
  }

  render() {
    const { title, data } = this.props;

    return (
      <div className="file-tree">
        {title && <h4 className="file-tree__title">{title}</h4>}
        <div className="file-tree__tree">
          <CustomScroll heightRelativeToParent="calc(100% - 1px)">
            <Tree
              showLine
              defaultExpandedKeys={['0']}
              onSelect={this.onSelect}
            >
              <TreeNode title="simGameConversations" key="0">
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
};

FileTree.propTypes = {
  title: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
  })),
};

export default FileTree;
