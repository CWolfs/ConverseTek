import React from 'react';
import { Menu, Item, ItemParams } from 'react-contexify';

import 'react-contexify/ReactContexify.css';

export type EventProps = {
  id: string;
  type: string;
  parentId: string;
};

export function ConversationTreeContextMenu({ id, onVisibilityChange }: { id: string; onVisibilityChange: (flag: boolean) => void }) {
  const onRenameClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
  };

  const onDeleteClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      <Item onClick={onRenameClicked}>Rename</Item>
      <Item onClick={onDeleteClicked}>Delete</Item>
    </Menu>
  );
}
