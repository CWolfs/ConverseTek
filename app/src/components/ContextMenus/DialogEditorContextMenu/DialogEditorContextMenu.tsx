import React from 'react';
import { Menu, Item, ItemParams, Separator, useContextMenu } from 'react-contexify';
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
      addItemLabel = 'Add Prompt Node';
      break;
    case 'node':
      addItemLabel = 'Add Response Node';
      break;
    case 'response':
      addItemLabel = 'Add Prompt Node';
      break;
    default:
      addItemLabel = 'Add Root Node';
      break;
  }
  return addItemLabel;
}

export function DialogEditorContextMenu({ id, onVisibilityChange }: { id: string; onVisibilityChange: (flag: boolean) => void }) {
  const nodeStore = useStore<NodeStore>('node');
  const modalStore = useStore<ModalStore>('modal');
  const { hideAll } = useContextMenu({
    id,
  });

  const { focusedTreeNode: focusedNode, clipboard } = nodeStore;

  // GUARD - no need to render the menu if there's no focused node
  if (!focusedNode) return null;

  const { id: focusedNodeId, type } = focusedNode;
  const { isCore, isIsolatedCore, isRoot, isNode, isResponse } = detectType(type);

  const allowAdd = isAllowedToCreateNode(focusedNodeId);
  const allowedToPasteCopy = isAllowedToPasteCopy(focusedNodeId, clipboard);
  const allowedToPasteLink = isAllowedToPasteLink(focusedNodeId, clipboard);

  const onAddClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.addNodeByParentId(props.id);
    hideAll();
  };

  const onCopyClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.setClipboard(props.id);
    hideAll();
  };

  const onPasteAsCopy = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.pasteAsCopyFromClipboard(props.id);
    hideAll();
  };

  const onPasteAsLink = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    nodeStore.pasteAsLinkFromClipboard(props.id);
    hideAll();
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
      positiveType: 'danger',
      positiveLabel: 'Confirm',
      onPositive: proceedWithDelete,
      negativeLabel: 'Cancel',
    };

    const title = `Are you sure you want to delete this ${isLink ? 'link' : 'node'}?`;
    const message = isLink
      ? 'This action will delete the link and only this specific link.'
      : "This action will delete the node and all it's children. Are you sure you want to do this?";

    modalStore.setModelContent(
      ModalConfirmation,
      {
        type: 'warning',
        title,
        body: message,
        width: '30rem',
        buttons,
        disableOk: false,
      },
      'global1',
    );

    hideAll();
  };

  const onExpandBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;
    nodeStore.setExpandOnNodeId(nodeId);
    hideAll();
  };

  const onCollapseBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    nodeStore.setCollapseOnNodeId(nodeId);
    hideAll();
  };

  const onCollapseOtherBranches = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    nodeStore.setCollapseOthersOnNodeId(nodeId);
    hideAll();
  };

  const onIsolateBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    const { id: nodeId } = props;

    nodeStore.setIsolateOnNodeId(nodeId);
    hideAll();
  };

  const onExitIsolateBranch = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;

    nodeStore.setIsolateOnNodeId('exit');
    hideAll();
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {allowAdd && !isIsolatedCore && <Item onClick={onAddClicked}>{getAddLabel(type)}</Item>}
      {(isNode || isResponse) && <Item onClick={onCopyClicked}>Copy</Item>}
      {allowedToPasteCopy && <Item onClick={onPasteAsCopy}>Paste as Copy</Item>}
      {allowedToPasteLink && <Item onClick={onPasteAsLink}>Paste as Link</Item>}
      {!isCore && <Item onClick={onDeleteClicked}>Delete</Item>}
      {(isNode || isResponse || isRoot) && <Separator />}
      {(isNode || isResponse) && <Item onClick={onIsolateBranch}>Isolate Branch</Item>}
      {(isNode || isResponse || isRoot) && <Item onClick={onExpandBranch}>Expand Branch</Item>}
      {(isNode || isResponse || isRoot) && <Item onClick={onCollapseBranch}>Collapse Branch</Item>}
      {(isNode || isResponse || isRoot) && <Item onClick={onCollapseOtherBranches}>Collapse Other Branches</Item>}
      {isIsolatedCore && <Item onClick={onExitIsolateBranch}>Back to Full Conversation</Item>}
    </Menu>
  );
}

export const ObservingDialogEditorContextMenu = observer(DialogEditorContextMenu);
