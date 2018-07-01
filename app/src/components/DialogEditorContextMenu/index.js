import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { ContextMenu, Item } from 'react-contexify';

import 'react-contexify/dist/ReactContexify.min.css';

import {
  detectType,
  isAllowedToCreateNode,
  // isAllowedToPasteCopy,
  isAllowedToPasteLink,
} from '../../utils/node-utils';

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
    this.onCopyClicked = this.onCopyClicked.bind(this);
    this.onPasteAsLink = this.onPasteAsLink.bind(this);
    this.onDeleteClicked = this.onDeleteClicked.bind(this);
  }

  onAddClicked({ dataFromProvider }) {
    const { nodeStore } = this.props;
    nodeStore.addNodeByParentId(dataFromProvider.id);
  }

  onCopyClicked({ dataFromProvider }) {
    const { nodeStore } = this.props;
    nodeStore.setClipboard(dataFromProvider.id);
  }

  onPasteAsLink({ dataFromProvider }) {
    const { nodeStore } = this.props;
  }

  onDeleteClicked({ dataFromProvider }) {
    const { nodeStore } = this.props;
    nodeStore.deleteNodeCascadeById(dataFromProvider.id, dataFromProvider.type);
  }

  render() {
    const { nodeStore, id } = this.props;
    const { focusedNode, clipboardNode } = nodeStore;

    // GUARD - no need to render the menu if there's no focused node
    if (!focusedNode) return null;

    const { id: focusedNodeId, type } = focusedNode;
    const { isNode, isResponse } = detectType(type);

    const allowAdd = isAllowedToCreateNode(focusedNodeId);
    // const allowedToPasteCopy = isAllowedToPasteCopy(focusedNodeId, clipboardNode);
    const allowedToPasteLink = isAllowedToPasteLink(focusedNodeId, clipboardNode);

    return (
      <ContextMenu id={id}>
        {(allowAdd) &&
          <Item onClick={this.onAddClicked}>{DialogEditorContextMenu.getAddLabel(type)}</Item>
        }
        {(isNode || isResponse) && <Item onClick={this.onCopyClicked}>Copy</Item>}
        {(allowedToPasteLink) && <Item onClick={this.onPasteAsLink}>Paste as Link</Item>}
        {(type) && <Item onClick={this.onDeleteClicked}>Delete</Item>}
      </ContextMenu>
    );
  }
}

DialogEditorContextMenu.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

export default inject('nodeStore')(DialogEditorContextMenu);
