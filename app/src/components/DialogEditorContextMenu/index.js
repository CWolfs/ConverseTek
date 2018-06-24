import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { ContextMenu, Item } from 'react-contexify';

import 'react-contexify/dist/ReactContexify.min.css';

@observer
class DialogEditorContextMenu extends Component {
  static getAddLabel(type) {
    let addItemLabel = 'Add';
    switch (type) {
      case 'root':
        addItemLabel = 'Add Node';
        break;
      case 'node':
        addItemLabel = 'Add Response';
        break;
      case 'response':
        addItemLabel = 'Add Node';
        break;
      default:
        addItemLabel = 'Add Node';
        break;
    }
    return addItemLabel;
  }

  constructor(props) {
    super(props);

    this.onAddClicked = this.onAddClicked.bind(this);
    this.onDeleteClicked = this.onDeleteClicked.bind(this);
  }

  onAddClicked({ dataFromProvider }) {
    const { nodeStore } = this.props;
    nodeStore.addNodeByParentId(dataFromProvider.id);
  }

  onDeleteClicked({ dataFromProvider }) {
    const { nodeStore } = this.props;
    nodeStore.deleteNodeCascadeById(dataFromProvider.id, dataFromProvider.type);
  }

  render() {
    const { nodeStore, id } = this.props;
    const { focusedNode } = nodeStore;

    // GUARD - no need to render the menu if there's no focused node
    if (!focusedNode) return null;

    const { type } = focusedNode;

    return (
      <ContextMenu id={id} >
        <Item onClick={this.onAddClicked}>{DialogEditorContextMenu.getAddLabel(type)}</Item>
        {(type !== 'root') && <Item onClick={this.onDeleteClicked}>Delete</Item>}
      </ContextMenu>
    );
  }
}

DialogEditorContextMenu.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

export default inject('nodeStore')(DialogEditorContextMenu);
