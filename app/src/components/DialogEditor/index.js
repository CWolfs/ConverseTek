import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SortableTree from 'react-sortable-tree';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';
import 'react-sortable-tree/style.css';

import './DialogEditor.css';

/* eslint-disable react/no-unused-state */
class DialogEditor extends Component {
  static buildTreeData(conversationAsset) {
    const data = [{
      title: 'Root',
      id: 0,
      children: conversationAsset.Conversation.roots.map(node => ({
        title: node.text,
        id: node.idRef.id,
        expanded: true,
      })),
      expanded: true,
    }];

    return data;
  }

  static getDerivedStateFromProps(props, state) {
    let modifiedState = false;
    const { conversationAsset: stateConversationAsset } = state;
    const { conversationAsset: propConversationAsset } = props;

    const newState = { ...state };

    if (propConversationAsset !== stateConversationAsset) {
      newState.conversationAsset = propConversationAsset;
      newState.treeData = DialogEditor.buildTreeData(propConversationAsset);
      modifiedState = true;
    }

    if (modifiedState) return newState;
    return state;
  }

  constructor(props) {
    super(props);

    const { conversationAsset } = this.props;

    this.state = {
      conversationAsset,
      treeData: DialogEditor.buildTreeData(conversationAsset),
    };
  }

  render() {
    const { onSelected } = this.props;
    const { treeData: data } = this.state;

    return (
      <div className="dialog-editor">
        <div className="dialog-editor__tree">
          <CustomScroll heightRelativeToParent="55vh">
            <SortableTree
              treeData={data}
              onChange={treeData => this.setState({ treeData })}
              getNodeKey={nodeContainer => nodeContainer.node.id}
              rowHeight={40}
              canDrag={nodeContainer => !(nodeContainer.node.id === 0)}
              canDrop={nodeContainer => !(nodeContainer.nextParent === null)}
              reactVirtualizedListProps={{
                autoHeight: false,
                overscanRowCount: 9999,
                style: {
                  minHeight: 10,
                  height: 'unset',
                },
              }}
            />
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
