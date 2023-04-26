import React from 'react';
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

    // void addQuickLink(item.name, item.path).then((updatedQuickLinks: QuickLinkType[]) => {
    //   setQuickLinks(updatedQuickLinks);
    // });

    const buttons = {
      positiveLabel: 'Confirm',
      onPositive: () => {},
      negativeLabel: 'Cancel',
    };

    modalStore.setModelContent(
      ModalSimpleInput,
      {
        type: 'warning',
        title: 'Please give this favourite a title?',
        body: 'Title',
        inputLabel: 'Title',
        width: '30rem',
        buttons,
      },
      'global2',
    );

    // hideAll();
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
