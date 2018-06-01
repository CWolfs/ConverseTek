import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tree } from 'antd';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';

import './DialogEditor.css';

const { TreeNode } = Tree;

/* eslint-disable react/prefer-stateless-function */
class DialogEditor extends Component {
  render() {
    const { conversationAsset, onSelected } = this.props;
    const { Conversation: conversation } = conversationAsset;

    return (
      <div className="dialog-editor">
        <div className="dialog-editor__tree">
          <CustomScroll heightRelativeToParent="calc(100% - 1px)">
            <Tree
              showLine
              defaultExpandedKeys={['0']}
              onSelect={onSelected}
            >
              <TreeNode title="Root" key="0">
                {conversation.nodes.map(node => <TreeNode key={node.idRef.id} title={node.text} />)}
              </TreeNode>
            </Tree>
          </CustomScroll>
        </div>
      </div>
    );
  }
}

DialogEditor.defaultProps = {
  onSelected: () => {},
};

DialogEditor.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
  onSelected: PropTypes.func,
};

export default DialogEditor;
