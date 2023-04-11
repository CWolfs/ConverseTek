import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Menu, Item } from 'react-contexify';

import 'react-contexify/ReactContexify.css';

import { detectType, isAllowedToCreateNode, isAllowedToPasteCopy, isAllowedToPasteLink } from '../../utils/node-utils';

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
    this.onPasteAsCopy = this.onPasteAsCopy.bind(this);
    this.onPasteAsLink = this.onPasteAsLink.bind(this);
    this.onDeleteClicked = this.onDeleteClicked.bind(this);
  }

  onAddClicked({ props }) {
    const { nodeStore } = this.props;
    nodeStore.addNodeByParentId(props.id);
  }

  onCopyClicked({ props }) {
    const { nodeStore } = this.props;
    nodeStore.setClipboard(props.id);
  }

  onPasteAsCopy({ props }) {
    const { nodeStore } = this.props;
    nodeStore.pasteAsCopyFromClipboard(props.id);
  }

  onPasteAsLink({ props }) {
    const { nodeStore } = this.props;
    nodeStore.pasteAsLinkFromClipboard(props.id);
  }

  onDeleteClicked({ props }) {
    const { nodeStore } = this.props;
    const { id, type, parentId } = props;
    const { isLink } = detectType(type);

    if (isLink) {
      nodeStore.deleteLink(parentId);
    } else {
      nodeStore.deleteNodeCascadeById(id, type);
    }
  }

  render() {
    const { nodeStore, id } = this.props;
    const { focusedNode, clipboard } = nodeStore;

    // GUARD - no need to render the menu if there's no focused node
    if (!focusedNode) return null;

    const { id: focusedNodeId, type } = focusedNode;
    const { isNode, isResponse } = detectType(type);

    const allowAdd = isAllowedToCreateNode(focusedNodeId);
    const allowedToPasteCopy = isAllowedToPasteCopy(focusedNodeId, clipboard);
    const allowedToPasteLink = isAllowedToPasteLink(focusedNodeId, clipboard);

    return (
      <Menu id={id}>
        {allowAdd && <Item onClick={this.onAddClicked}>{DialogEditorContextMenu.getAddLabel(type)}</Item>}
        {(isNode || isResponse) && <Item onClick={this.onCopyClicked}>Copy</Item>}
        {allowedToPasteCopy && <Item onClick={this.onPasteAsCopy}>Paste as Copy</Item>}
        {allowedToPasteLink && <Item onClick={this.onPasteAsLink}>Paste as Link</Item>}
        {type && <Item onClick={this.onDeleteClicked}>Delete</Item>}
      </Menu>
    );
  }
}

DialogEditorContextMenu.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

export default inject('nodeStore')(observer(DialogEditorContextMenu));
