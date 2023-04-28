import React from 'react';
import { Menu, Item, ItemParams } from 'react-contexify';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';
import { ModalStore } from 'stores/modalStore/modal-store';
import { ModalConfirmation } from 'components/Modals/ModalConfirmation';

import 'react-contexify/ReactContexify.css';

export type EventProps = {
  id: string;
  title: string;
  selected: boolean;
};

export function ConversationTreeContextMenu({ id, onVisibilityChange }: { id: string; onVisibilityChange?: (flag: boolean) => void }) {
  const dataStore = useStore<DataStore>('data');
  const modalStore = useStore<ModalStore>('modal');

  // const onRenameClicked = ({ props }: ItemParams<EventProps>) => {
  //   if (!props) return;
  // };

  const onDeleteClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { id, title, selected } = props;

    const buttons = {
      positiveType: 'danger',
      positiveLabel: 'Confirm',
      onPositive: () => {
        dataStore.deleteConversation(id);
        if (selected) dataStore.clearActiveConversation();
      },
      negativeLabel: 'Cancel',
    };

    const modalTitle = `Are you sure you want to delete this conversation?`;
    modalStore.setModelContent(
      ModalConfirmation,
      {
        type: 'warning',
        title: modalTitle,
        body: `This action will delete conversation '${title}' with the id '${id}'. This action is irreversible. Are you sure you want to delete it?`,
        width: '30rem',
        disableOk: false,
        buttons,
      },
      'global1',
    );
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {/* <Item onClick={onRenameClicked}>Rename</Item> */}
      <Item onClick={onDeleteClicked}>Delete</Item>
    </Menu>
  );
}
