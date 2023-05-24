import React from 'react';
import { Menu, Item, ItemParams } from 'react-contexify';
import { observer } from 'mobx-react';

import 'react-contexify/ReactContexify.css';

import { useStore } from 'hooks/useStore';
import { NodeStore } from 'stores/nodeStore/node-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { detectType, isAllowedToCreateNode, isAllowedToPasteCopy, isAllowedToPasteLink } from 'utils/node-utils';
import { ModalConfirmation } from 'components/Modals/ModalConfirmation';

export type EventProps = {
  id: string;
  type: string;
  parentId: string;
};

function getAddLabel(type: string) {
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

export function DialogEditorContextMenu({ id, onVisibilityChange }: { id: string; onVisibilityChange: (flag: boolean) => void }) {
  const nodeStore = useStore<NodeStore>('node');
  const modalStore = useStore<ModalStore>('modal');

  const { focusedTreeNode: focusedNode, clipboard } = nodeStore;

  // GUARD - no need to render the menu if there's no focused node
  if (!focusedNode) return null;

  const { id: focusedNodeId, type } = focusedNode;
  const { isRoot, isNode, isResponse } = detectType(type);

  const allowAdd = isAllowedToCreateNode(focusedNodeId);
  const allowedToPasteCopy = isAllowedToPasteCopy(focusedNodeId, clipboard);
  const allowedToPasteLink = isAllowedToPasteLink(focusedNodeId, clipboard);

  const onAddClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.addNodeByParentId(props.id);
  };

  const onCopyClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.setClipboard(props.id);
  };

  const onPasteAsCopy = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.pasteAsCopyFromClipboard(props.id);
  };

  const onPasteAsLink = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.pasteAsLinkFromClipboard(props.id);
  };

  const onDeleteClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId, type: nodeType, parentId } = props;
    const { isLink } = detectType(nodeType);

    const proceedWithDelete = () => {
      if (isLink) {
        nodeStore.deleteLink(parentId);
      } else {
        nodeStore.deleteNodeCascadeById(nodeId);
      }
    };

    const buttons = {
      positiveLabel: 'Confirm',
      onPositive: proceedWithDelete,
      negativeLabel: 'Cancel',
    };

    const title = 'Are you sure you want to delete this node?';
    modalStore.setModelContent(
      ModalConfirmation,
      {
        type: 'warning',
        title,
        body: 'This action will delete the node and all its children. Are you sure you want to do this?,',
        width: '30rem',
        buttons,
        disableOk: false,
      },
      'global1',
    );
  };

  // const onIsolateBranch = ({ props }: ItemParams<EventProps>) => {
  //   if (!props) return;

  //   const { id: nodeId, type: nodeType, parentId } = props;
  // };

  const onExpandBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    // nodeStore.setCollapseOnNodeId(nodeId);
  };

  const onCollapseBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    // nodeStore.setCollapseOnNodeId(nodeId);
  };

  const onCollapseOtherBranches = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    nodeStore.setCollapseOnNodeId(nodeId);
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {allowAdd && <Item onClick={onAddClicked}>{getAddLabel(type)}</Item>}
      {(isNode || isResponse) && <Item onClick={onCopyClicked}>Copy</Item>}
      {allowedToPasteCopy && <Item onClick={onPasteAsCopy}>Paste as Copy</Item>}
      {allowedToPasteLink && <Item onClick={onPasteAsLink}>Paste as Link</Item>}
      {type != 'root' && <Item onClick={onDeleteClicked}>Delete</Item>}
      {/* {(isNode || isResponse || isRoot) && <Item onClick={onIsolateBranch}>Isolate Branch</Item>} */}
      {(isNode || isResponse || isRoot) && <Item onClick={onExpandBranch}>Expand Branch</Item>}
      {(isNode || isResponse || isRoot) && <Item onClick={onCollapseBranch}>Collapse Branch</Item>}
      {(isNode || isResponse || isRoot) && <Item onClick={onCollapseOtherBranches}>Collapse Other Branches</Item>}
    </Menu>
  );
}

export const ObservingDialogEditorContextMenu = observer(DialogEditorContextMenu);
