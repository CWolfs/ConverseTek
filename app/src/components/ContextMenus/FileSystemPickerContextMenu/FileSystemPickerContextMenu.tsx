import React, { useState } from 'react';
import { Menu, Item, ItemParams } from 'react-contexify';

import { DirectoryItemType } from 'types/FileSystemItemType';

import 'react-contexify/ReactContexify.css';

export type EventProps = {
  item: DirectoryItemType;
};

export function FileSystemPickerContextMenu({
  id,
  selectedItem,
  onVisibilityChange,
}: {
  id: string;
  selectedItem: DirectoryItemType | null;
  onVisibilityChange?: (flag: boolean) => void;
}) {
  const onAddQuickLinkClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { item } = props;
  };

  const onRemoveQuickLinkClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { item } = props;
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {!selectedItem?.isQuickLink && <Item onClick={onAddQuickLinkClicked}>Favourite</Item>}
      {selectedItem?.isQuickLink && <Item onClick={onRemoveQuickLinkClicked}>Remove Favourite</Item>}
    </Menu>
  );
}
