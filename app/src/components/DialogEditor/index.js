/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import SortableTree from 'react-sortable-tree';

import 'react-sortable-tree/style.css';

import ConverseTekNodeRenderer from './ConverseTekNodeRenderer';
import DialogEditorContextMenu from '../DialogEditorContextMenu';

import { detectType } from '../../utils/node-utils';

import './DialogEditor.css';

/* eslint-disable react/no-unused-state, no-param-reassign, react/no-did-mount-set-state */
@observer
class DialogEditor extends Component {
  static buildTreeData(nodeStore, conversationAsset) {
    const data = [
      {
        title: 'Root',
        id: '0',
        children: nodeStore.getChildrenFromRoots(conversationAsset.Conversation.roots),
        expanded: true,
        canDrag: false,
      },
    ];

    return data;
  }

  constructor(props) {
    super(props);

    const { nodeStore, conversationAsset } = this.props;
    nodeStore.init(conversationAsset);

    this.state = {
      conversationAsset,
      treeData: DialogEditor.buildTreeData(nodeStore, conversationAsset),
      treeWidth: 0,
    };

    this.resize = this.resize.bind(this);
    this.onMove = this.onMove.bind(this);
    this.canDrop = this.canDrop.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize);

    const treeWidth = this.treeElement.clientWidth;
    this.setState({
      treeWidth,
    });
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

  componentDidUpdate() {
    const { treeWidth } = this.state;
    const calculatedTreeWidth = this.treeElement.clientWidth;

    if (treeWidth !== calculatedTreeWidth) {
      this.resize();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  onMove(nodeContainer) {
    const { node, nextParentNode } = nodeContainer;
    const { nodeStore } = this.props;
    const { id: nodeId, type: nodeType, parentId: nodeParentId } = node;
    const { id: parentNodeId, children: parentChildren } = nextParentNode;
    const { isRoot, isNode, isResponse } = detectType(nodeType);

    if (isRoot) {
      const rootIds = parentChildren.map((child) => child.id);
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

      const responseIds = parentChildren.map((child) => child.id);
      nodeStore.setResponses(parentNodeId, responseIds);
    }
  }

  resize() {
    const treeWidth = this.treeElement.clientWidth;
    this.setState({
      treeWidth,
    });
  }

  canDrop(nodeContainer) {
    const { nodeStore } = this.props;
    const { nextParent, node } = nodeContainer;

    // GUARD - Don't allow drop at the very top of the tree
    if (nextParent === null) return false;

    const { type: nodeType, parentId: nodeParentId } = node;
    const { type: nextParentType, id: parentId } = nextParent;
    const { isRoot, isNode, isResponse } = detectType(nodeType);
    let allowDrop = true;

    // Don't allow nodes to be moved under the same type
    if (nodeType === nextParentType) allowDrop = false;

    // Only allow roots to be moved around under the top level node
    if (allowDrop) allowDrop = !((isNode || isResponse) && nextParent.id === '0');

    // Only allow dragging within the same parent for roots and responses,
    // for nodes, only allow if the target response is empty
    if (allowDrop) {
      if (isRoot) {
        allowDrop = parentId === null || parentId === '0';
      } else if (isResponse) {
        allowDrop = nodeParentId === parentId;
      } else if (isNode) {
        const parent = nodeStore.getNode(parentId);
        const { nextNodeIndex } = parent;
        if (nextNodeIndex !== -1) allowDrop = false;
      }
    }

    return allowDrop;
  }

  onClicked = (event) => {
    const { nodeStore } = this.props;
    if (event.target.className === 'rst__node' || event.target.className === 'rst__lineBlock') {
      nodeStore.clearActiveNode();
    }
  };

  render() {
    const { nodeStore } = this.props;
    const { treeData: data, treeWidth } = this.state;
    const activeNodeId = nodeStore.getActiveNodeId();

    return (
      <div className="dialog-editor">
        <div
          className="dialog-editor__tree"
          ref={(ref) => {
            this.treeElement = ref;
          }}
          onClick={this.onClicked}
        >
          <DialogEditorContextMenu id="dialog-context-menu" />
          <SortableTree
            treeData={data}
            onChange={(treeData) => this.setState({ treeData })}
            getNodeKey={({ node, treeIndex }) => {
              if (node.treeIndex !== treeIndex) {
                node.treeIndex = treeIndex;
              }
              if (!node.id) return treeIndex;

              nodeStore.addNodeIdAndTreeIndexPair(node.id, treeIndex);
              return node.id;
            }}
            rowHeight={40}
            canDrag={(nodeContainer) => !(nodeContainer.node.id === 0)}
            canDrop={this.canDrop}
            onMoveNode={this.onMove}
            generateNodeProps={() => ({
              nodeStore,
              activeNodeId,
            })}
            nodeContentRenderer={ConverseTekNodeRenderer}
            reactVirtualizedListProps={{
              width: treeWidth,
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
