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

  constructor(props) {
    super(props);

    const { nodeStore, conversationAsset } = this.props;
    nodeStore.init(conversationAsset);

    this.state = {
      conversationAsset,
      treeData: DialogEditor.buildTreeData(nodeStore, conversationAsset),
    };

    this.onMove = this.onMove.bind(this);
    this.canDrop = this.canDrop.bind(this);
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
    } = nodeContainer;
    const { nodeStore } = this.props;
    const { id: nodeId, type: nodeType, parentId: nodeParentId } = node;
    const { id: parentNodeId, children: parentChildren } = nextParentNode;
    const isRoot = nodeType === 'root';
    const isNode = nodeType === 'node';
    const isResponse = nodeType === 'response';

    if (isRoot) {
      const rootIds = parentChildren.map(child => child.id);
      nodeStore.setRoots(rootIds);
    } else if (isNode) {
      const convoNode = nodeStore.getNode(nodeId);
      const { index: nodeIndex } = convoNode;

      // Set new root/response parent 'nextNodeIndex' to node 'index'
      const nextParent = nodeStore.getNode(parentNodeId);
      nextParent.nextNodeIndex = nodeIndex;

      // Set previous root/response parent 'nextNodeIndex' to -1
      const previousParent = nodeStore.getNode(nodeParentId);
      previousParent.nextNodeIndex = -1;
    } else if (isResponse) {
      // FIXME: This causes key clash if moving a response to another node
      // FIXME: Disabled moving responses to another node for now
      // const previousResponseIds = nodeStore.getNodeResponseIdsFromNodeId(nodeParentId);
      // nodeStore.setResponses(nodeParentId, previousResponseIds);

      const responseIds = parentChildren.map(child => child.id);
      nodeStore.setResponses(parentNodeId, responseIds);
    }
  }

  canDrop(nodeContainer) {
    const { nodeStore } = this.props;
    const { nextParent, node } = nodeContainer;

    // GUARD - Don't allow drop at the very top of the tree
    if (nextParent === null) return false;

    const { type: nodeType, parentId: nodeParentId } = node;
    const { type: nextParentType, id: parentId } = nextParent;
    const isRoot = nodeType === 'root';
    const isNode = nodeType === 'node';
    const isResponse = nodeType === 'response';
    let allowDrop = true;

    // Don't allow nodes to be moved under the same type
    if (nodeType === nextParentType) allowDrop = false;

    // Only allow roots to be moved around under the top level node
    if (allowDrop) allowDrop = !((isNode || isResponse) && (nextParent.id === '0'));

    // Only allow draggin within the same parent for roots and responses,
    // for nodes, only allow if the target response is empty
    if (allowDrop) {
      if (isRoot || isResponse) {
        allowDrop = (nodeParentId === parentId);
      } else if (isNode) {
        const parent = nodeStore.getNode(parentId);
        const { nextNodeIndex } = parent;
        if (nextNodeIndex !== -1) allowDrop = false;
      }
    }

    return allowDrop;
  }

  render() {
    const { nodeStore } = this.props;
    const { treeData: data } = this.state;
    const { scrollToTreeIndex } = nodeStore;
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
            canDrop={this.canDrop}
            onMoveNode={this.onMove}
            generateNodeProps={() => (
              {
                nodeStore,
                activeNodeId,
              }
            )}
            nodeContentRenderer={ConverseTekNodeRenderer}
            reactVirtualizedListProps={{
              /* overscanRowCount: 10, */
              /* scrollToIndex: scrollToTreeIndex, */
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
