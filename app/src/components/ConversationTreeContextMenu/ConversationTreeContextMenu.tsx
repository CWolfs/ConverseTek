import React from 'react';
import { Menu, Item, ItemParams } from 'react-contexify';

import { useStore } from 'hooks/useStore';
import { DataStore } from 'stores/dataStore/data-store';

import 'react-contexify/ReactContexify.css';

export type EventProps = {
  id: string;
  type: string;
  parentId: string;
};

export function ConversationTreeContextMenu({ id, onVisibilityChange }: { id: string; onVisibilityChange?: (flag: boolean) => void }) {
  const dataStore = useStore<DataStore>('data');

  // const onRenameClicked = ({ props }: ItemParams<EventProps>) => {
  //   if (!props) return;
  // };

  const onDeleteClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { id } = props;
    console.log('Deleting...', props);
    dataStore.deleteConversation(id);
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {/* <Item onClick={onRenameClicked}>Rename</Item> */}
      <Item onClick={onDeleteClicked}>Delete</Item>
    </Menu>
  );
}
