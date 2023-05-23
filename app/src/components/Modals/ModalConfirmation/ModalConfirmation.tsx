/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect, MouseEvent } from 'react';
import { Icon } from 'antd';

import { useStore } from 'hooks/useStore';
import { ModalStore, OnCancelType, OnOkType } from 'stores/modalStore/modal-store';

import './ModalConfirmation.css';

type Props = {
  globalModalId: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  header: string;
  body: string | string[];
  width: string;
  buttons: {
    positiveType?: 'link' | 'primary' | 'default' | 'ghost' | 'dashed' | 'danger' | undefined;
    positiveLabel: string;
    negativeType?: 'link' | 'primary' | 'default' | 'ghost' | 'dashed' | 'danger' | undefined;
    negativeLabel?: string;
    onNegative: OnCancelType;
    onPositive: OnOkType;
  };
  closable: boolean;
};

function renderTitleWithType(title: string) {
  return (
    <>
      <Icon type="exclamation-circle" theme="twoTone" twoToneColor="orange" className="modal-confirmation__icon--warning" />
      {title}
    </>
  );
}

export function ModalConfirmation({ globalModalId, type, title, header, body, width, buttons, closable = true }: Props) {
  const modalStore = useStore<ModalStore>('modal');

  const onOk = (event: MouseEvent<HTMLElement>): void => {
    if (buttons.onPositive) buttons.onPositive(event);
    modalStore.closeModal(globalModalId);
  };

  const setupModal = (): void => {
    modalStore.setTitle(renderTitleWithType(title), globalModalId);

    if (buttons?.positiveLabel) {
      if (buttons.positiveType != null) modalStore.setOkType(buttons.positiveType, globalModalId);
      modalStore.setOkLabel(buttons.positiveLabel, globalModalId);
      modalStore.setOnOk(onOk, globalModalId);
      modalStore.setShowOkButton(true, globalModalId);
    } else {
      modalStore.setShowOkButton(false, globalModalId);
    }

    if (buttons?.negativeLabel) {
      if (buttons.negativeType != null) modalStore.setOkType(buttons.negativeType, globalModalId);
      modalStore.setOnCancel(buttons.onNegative, globalModalId);
      modalStore.setCancelLabel(buttons.negativeLabel, globalModalId);
      modalStore.setShowCancelButton(true, globalModalId);
    } else {
      modalStore.setShowCancelButton(false, globalModalId);
    }

    modalStore.setWidth(width, globalModalId);
    modalStore.setClosable(closable, globalModalId);
  };

  // onMount
  useEffect(() => {
    setupModal();
  }, []);

  const isBodyArray = Array.isArray(body);

  return (
    <div className="modal-confirmation">
      <div className="modal-confirmation__content">
        {header && <h3>{header}</h3>}
        <div className="modal-confirmation__content-body">
          {isBodyArray &&
            body.map((message: string, index: number) => (
              <div key={message} style={index > 0 ? { marginTop: 16 } : {}}>
                {message}
              </div>
            ))}
          {!isBodyArray && <div>{body}</div>}
        </div>
      </div>
    </div>
  );
}
