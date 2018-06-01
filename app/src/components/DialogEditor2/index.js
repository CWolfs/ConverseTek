import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SortableTree from 'react-sortable-tree';
import CustomScroll from 'react-custom-scroll';

import 'react-custom-scroll/dist/customScroll.css';
import 'react-sortable-tree/style.css';

import './DialogEditor2.css';

/* eslint-disable react/no-unused-state */
class DialogEditor2 extends Component {
  static buildTreeData(conversationAsset) {
    const data = [{
      title: 'Root',
      children: conversationAsset.Conversation.nodes.map(node => ({
        title: node.text,
        id: node.idRef.id,
        expanded: true,
      })),
    }];

    return data;
  }

  constructor(props) {
    super(props);

    const { conversationAsset } = this.props;

    this.state = {
      conversationAsset,
      treeData: DialogEditor2.buildTreeData(conversationAsset),
    };
  }

  render() {
    const { onSelected } = this.props;
    const { treeData: data } = this.state;

    return (
      <div className="dialog-editor">
        <div className="dialog-editor__tree">
          {/* <CustomScroll heightRelativeToParent="calc(100% - 1px)"> */}
          <SortableTree
            treeData={data}
            onChange={treeData => this.setState({ treeData })}
            getNodeKey={node => node.id}
          />
          {/* </CustomScroll> */}
        </div>
      </div>
    );
  }
}

DialogEditor2.defaultProps = {
  onSelected: () => {},
};

DialogEditor2.propTypes = {
  conversationAsset: PropTypes.object.isRequired,
  onSelected: PropTypes.func,
};

export default DialogEditor2;
