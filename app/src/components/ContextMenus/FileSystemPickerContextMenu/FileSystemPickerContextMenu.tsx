import React, { MouseEvent } from 'react';
import { Menu, Item, ItemParams, useContextMenu } from 'react-contexify';

import { DirectoryItemType } from 'types/FileSystemItemType';
import { addQuickLink, removeQuickLink } from 'services/api';
import { ModalStore } from 'stores/modalStore/modal-store';
import { QuickLinkType } from 'types/QuickLinkType';
import { useStore } from 'hooks/useStore';
import { ModalSimpleInput } from 'components/Modals/ModalSimpleInput';

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
  const modalStore = useStore<ModalStore>('modal');
  const { hideAll } = useContextMenu({
    id: 'filesystempicker-context-menu',
  });

  const onAddQuickLinkClicked = ({ props }: ItemParams<EventProps>) => {
    if (!props) return;
    const { item } = props;

    const buttons = {
      positiveLabel: 'Confirm',
      onPositive: (_: MouseEvent<HTMLElement>, quicklinkTitle: string) => {
        void addQuickLink(quicklinkTitle, item.path).then((updatedQuickLinks: QuickLinkType[]) => {
          setQuickLinks(updatedQuickLinks);
        });
      },
      negativeLabel: 'Cancel',
    };

    modalStore.setModelContent(
      ModalSimpleInput,
      {
        type: 'warning',
        title: 'Provide a name',
        body: 'Name',
        width: '30rem',
        buttons,
        centered: true,
      },
      'global2',
    );
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
