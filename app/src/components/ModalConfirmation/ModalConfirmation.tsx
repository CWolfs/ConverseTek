/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect, MouseEvent, CSSProperties } from 'react';
import { Icon } from 'antd';

import { useStore } from 'hooks/useStore';
import { ModalStore, OnCancelType, OnOkType } from 'stores/modalStore/modal-store';

import './ModalConfirmation.css';

type Props = {
  type: 'info' | 'warning' | 'error';
  title: string;
  header: string;
  body: string;
  width: string;
  buttons: {
    positiveLabel: string;
    negativeLabel?: string;
    onNegative: OnCancelType;
    onPositive: OnOkType;
  };
  closable: boolean;
};

function renderTitleWithType(title: string, type: string) {
  return (
    <>
      <Icon type="exclamation-circle" theme="twoTone" twoToneColor="orange" className="modal-confirmation__icon--warning" />
      {title}
    </>
  );
}

export function ModalConfirmation({ type, title, header, body, width, buttons, closable = true }: Props) {
  const modalStore = useStore<ModalStore>('modal');

  const onOk = (event: MouseEvent<HTMLElement>): void => {
    if (buttons.onPositive) buttons.onPositive(event);
    modalStore.closeModal();
  };

  const setupModal = (): void => {
    modalStore.setTitle(renderTitleWithType(title, type));

    if (buttons?.positiveLabel) {
      modalStore.setOkLabel(buttons.positiveLabel);
      modalStore.setOnOk(onOk);
      modalStore.setShowOkButton(true);
    } else {
      modalStore.setShowOkButton(false);
    }

    if (buttons?.negativeLabel) {
      modalStore.setOnCancel(buttons.onNegative);
      modalStore.setCancelLabel(buttons.negativeLabel);
      modalStore.setShowCancelButton(true);
    } else {
      modalStore.setShowCancelButton(false);
    }

    modalStore.setWidth(width);
    modalStore.setClosable(closable);
  };

  // onMount
  useEffect(() => {
    setupModal();
  }, []);

  return (
    <div className="modal-confirmation">
      <div className="modal-confirmation__content">
        {header && <h3>{header}</h3>}
        <div className="modal-confirmation__content-body">
          <div>{body}</div>
        </div>
      </div>
    </div>
  );
}
