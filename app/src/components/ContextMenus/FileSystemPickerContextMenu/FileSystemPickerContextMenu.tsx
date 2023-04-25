import React from 'react';
import { Menu, Item, ItemParams, useContextMenu } from 'react-contexify';

import { DirectoryItemType } from 'types/FileSystemItemType';
import { addQuickLink, removeQuickLink } from 'services/api';
import { QuickLinkType } from 'types/QuickLinkType';

import 'react-contexify/ReactContexify.css';

export type EventProps = {
  item: DirectoryItemType;
};

export function FileSystemPickerContextMenu({
  id,
  selectedItem,
  onVisibilityChange,
  setQuickLinks,
}: {
  id: string;
  selectedItem: DirectoryItemType | null;
  onVisibilityChange?: (flag: boolean) => void;
  setQuickLinks: (quicklinks: QuickLinkType[]) => void;
}) {
  const { hideAll } = useContextMenu({
    id: 'filesystempicker-context-menu',
  });

  const onAddQuickLinkClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { item } = props;

    void addQuickLink(item.name, item.path).then((updatedQuickLinks: QuickLinkType[]) => {
      setQuickLinks(updatedQuickLinks);
    });

    hideAll();
  };

  const onRemoveQuickLinkClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { item } = props;

    void removeQuickLink(item.name, item.path).then((updatedQuickLinks: QuickLinkType[]) => {
      setQuickLinks(updatedQuickLinks);
    });

    hideAll();
  };

  return (
    <Menu id={id} onVisibilityChange={onVisibilityChange}>
      {!selectedItem?.isQuickLink && <Item onClick={onAddQuickLinkClicked}>Favourite</Item>}
      {selectedItem?.isQuickLink && <Item onClick={onRemoveQuickLinkClicked}>Remove Favourite</Item>}
    </Menu>
  );
}
