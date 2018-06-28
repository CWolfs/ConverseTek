import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import SortableTree from 'react-sortable-tree';

import 'react-sortable-tree/style.css';

import ConverseTekNodeRenderer from './ConverseTekNodeRenderer';
import DialogEditorContextMenu from '../DialogEditorContextMenu';

import './DialogEditor.css';

/* eslint-disable react/no-unused-state, no-param-reassign */
@observer
class DialogEditor extends Component {
  static buildTreeData(nodeStore, conversationAsset) {
    const data = [{
      title: 'Root',
      id: '0',
      children: nodeStore.getChildrenFromRoots(conversationAsset.Conversation.roots),
      expanded: true,
      canDrag: false,
    }];

    return data;
  }

  static canDrop(nodeContainer) {
    const { nextParent, node } = nodeContainer;

    // GUARD - Don't allow drop at the very top of the tree
    if (nextParent === null) return false;

    const { type: nodeType, parentId } = node;
    const { type: nextParentType, id } = nextParent;
    const isRoot = nodeType === 'root';
    let allowDrop = true;

    // Don't allow nodes to be moved under the same type
    if (nodeType === nextParentType) allowDrop = false;

    // Only allow roots to be moved around under the top level node
    if (allowDrop) allowDrop = !(!isRoot && nextParent.id === '0');

    // Only allow draggin within the same parent
    if (allowDrop) allowDrop = (parentId === id);

    return allowDrop;
  }

  constructor(props) {
    super(props);

    const { nodeStore, conversationAsset } = this.props;
    nodeStore.init(conversationAsset);

    this.state = {
      conversationAsset,
      treeData: DialogEditor.buildTreeData(nodeStore, conversationAsset),
    };

    this.onMove = this.onMove.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { conversationAsset: stateConversationAsset } = this.state;
    const { conversationAsset: propConversationAsset, nodeStore, rebuild } = nextProps;

    const newState = { ...this.state };

    if (propConversationAsset !== stateConversationAsset || rebuild) {
      nodeStore.init(propConversationAsset);
      newState.conversationAsset = propConversationAsset;
      newState.treeData = DialogEditor.buildTreeData(nodeStore, propConversationAsset);
      this.setState(newState);
    }
  }

  onMove(nodeContainer) {
    const {
      node,
      nextParentNode,
      prevTreeIndex,
      prevPath,
      nextTreeIndex,
      nextPath,
    } = nodeContainer;
    const { nodeStore } = this.props;
    const { type: nodeType, children } = node;
    const { id: parentNodeId, children: parentChildren } = nextParentNode;
    const isRoot = nodeType === 'root';
    const isNode = nodeType === 'node';
    const isResponse = nodeType === 'response';

    if (isResponse) {
      const responseIds = parentChildren.map(child => child.id);
      nodeStore.setResponses(parentNodeId, responseIds);
    }

    console.log(`prev index was ${prevTreeIndex} and next is ${nextTreeIndex} and prev path was ${JSON.stringify(prevPath)} and next path is ${JSON.stringify(nextPath)}`);
  }

  render() {
    const { nodeStore } = this.props;
    const { treeData: data } = this.state;
    const activeNodeId = nodeStore.getActiveNodeId();

    return (
      <div className="dialog-editor">
        <div className="dialog-editor__tree">
          <DialogEditorContextMenu id="dialog-context-menu" />
          <SortableTree
            treeData={data}
            onChange={treeData => this.setState({ treeData })}
            getNodeKey={({ node, treeIndex }) => {
              if (!node.id) return treeIndex;
              if (node.treeIndex !== treeIndex) {
                node.treeIndex = treeIndex;
              }
              return node.id;
            }}
            rowHeight={40}
            canDrag={nodeContainer => !(nodeContainer.node.id === 0)}
            canDrop={DialogEditor.canDrop}
            onMoveNode={this.onMove}
            generateNodeProps={() => (
              {
                nodeStore,
                activeNodeId,
              }
            )}
            nodeContentRenderer={ConverseTekNodeRenderer}
            reactVirtualizedListProps={{
              autoHeight: false,
              overscanRowCount: 9999,
              style: {
                minHeight: 10,
                height: 'unset',
                width: 9999,
              },
            }}
          />
        </div>
      </div>
    );
  }
}

DialogEditor.defaultProps = {
  rebuild: false,
};

DialogEditor.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  conversationAsset: PropTypes.object.isRequired,
  rebuild: PropTypes.bool,
};

export default inject('nodeStore')(DialogEditor);
