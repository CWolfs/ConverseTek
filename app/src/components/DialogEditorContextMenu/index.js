import React from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';
import { Menu, Item } from 'react-contexify';

import 'react-contexify/ReactContexify.css';

import { detectType, isAllowedToCreateNode, isAllowedToPasteCopy, isAllowedToPasteLink } from '../../utils/node-utils';

function getAddLabel(type) {
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

const DialogEditorContextMenu = ({ id, nodeStore }) => {
  const { focusedNode, clipboard } = nodeStore;

  // GUARD - no need to render the menu if there's no focused node
  if (!focusedNode) return null;

  const { id: focusedNodeId, type } = focusedNode;
  const { isNode, isResponse } = detectType(type);

  const allowAdd = isAllowedToCreateNode(focusedNodeId);
  const allowedToPasteCopy = isAllowedToPasteCopy(focusedNodeId, clipboard);
  const allowedToPasteLink = isAllowedToPasteLink(focusedNodeId, clipboard);

  const onAddClicked = ({ props }) => {
    nodeStore.addNodeByParentId(props.id);
  };

  const onCopyClicked = ({ props }) => {
    nodeStore.setClipboard(props.id);
  };

  const onPasteAsCopy = ({ props }) => {
    nodeStore.pasteAsCopyFromClipboard(props.id);
  };

  const onPasteAsLink = ({ props }) => {
    nodeStore.pasteAsLinkFromClipboard(props.id);
  };

  const onDeleteClicked = ({ props }) => {
    const { id, type, parentId } = props;
    const { isLink } = detectType(type);

    if (isLink) {
      nodeStore.deleteLink(parentId);
    } else {
      nodeStore.deleteNodeCascadeById(id, type);
    }
  };

  return (
    <Menu id={id}>
      {allowAdd && <Item onClick={onAddClicked}>{getAddLabel(type)}</Item>}
      {(isNode || isResponse) && <Item onClick={onCopyClicked}>Copy</Item>}
      {allowedToPasteCopy && <Item onClick={onPasteAsCopy}>Paste as Copy</Item>}
      {allowedToPasteLink && <Item onClick={onPasteAsLink}>Paste as Link</Item>}
      {type && <Item onClick={onDeleteClicked}>Delete</Item>}
    </Menu>
  );
};

DialogEditorContextMenu.propTypes = {
  nodeStore: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

export default inject('nodeStore')(observer(DialogEditorContextMenu));
