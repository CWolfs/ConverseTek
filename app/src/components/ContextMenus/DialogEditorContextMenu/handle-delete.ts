import { ModalConfirmation } from 'components/Modals/ModalConfirmation';
import { detectType } from 'utils/node-utils';
import { buildDeleteConfirmationContent } from 'utils/delete-confirmation-utils';
import type { NodeStore } from 'stores/nodeStore/node-store';
import type { ModalStore } from 'stores/modalStore/modal-store';
import type { PromptNodeType } from 'types';

export type DeleteEventProps = { id: string; type: string; parentId: string };

export function handleDeleteIntent({
  props,
  nodeStore,
  modalStore,
}: {
  props: DeleteEventProps;
  nodeStore: NodeStore;
  modalStore: ModalStore;
}): void {
  const { id: nodeId, type: nodeType, parentId } = props;
  const { isLink, isNode } = detectType(nodeType);

  const proceedWithDelete = () => {
    if (isLink) {
      nodeStore.deleteLink(parentId);
    } else {
      nodeStore.deleteNodeCascadeById(nodeId);
    }
  };

  let inboundLinkCount = 0;
  if (isNode) {
    const promptNode = nodeStore.getNode(nodeId) as PromptNodeType | null;
    if (promptNode) {
      inboundLinkCount = nodeStore.getInboundLinksToPromptNodeIndex(promptNode.index).length;
    }
  }

  const { title, body } = buildDeleteConfirmationContent({ isLink, inboundLinkCount });

  modalStore.setModelContent(
    ModalConfirmation,
    {
      type: 'warning',
      title,
      body,
      width: '30rem',
      buttons: {
        positiveType: 'danger',
        positiveLabel: 'Confirm',
        onPositive: proceedWithDelete,
        negativeLabel: 'Cancel',
      },
      disableOk: false,
    },
    'global1',
  );
}
