/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect, MouseEvent, useState } from 'react';
import { Icon, Input } from 'antd';

import { useStore } from 'hooks/useStore';
import { ModalStore, OnCancelType, OnOkType } from 'stores/modalStore/modal-store';

import './ModalSimpleInput.css';

type Props = {
  type: 'info' | 'warning' | 'error';
  title: string;
  header: string;
  body: string;
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

function renderTitleWithType(title: string, type: string) {
  return (
    <>
      {/* <Icon type="exclamation-circle" theme="twoTone" twoToneColor="orange" className="modal-confirmation__icon--warning" /> */}
      {title}
    </>
  );
}

export function ModalSimpleInput({ type, title, header, body, width, buttons, closable = true }: Props) {
  const modalStore = useStore<ModalStore>('modal');
  const [inputValue, setInputValue] = useState<string>('');

  const onOk = (event: MouseEvent<HTMLElement>): void => {
    if (buttons.onPositive) buttons.onPositive(event);
    modalStore.closeModal();
  };

  const setupModal = (): void => {
    modalStore.setTitle(renderTitleWithType(title, type));

    if (buttons?.positiveLabel) {
      if (buttons.positiveType != null) modalStore.setOkType(buttons.positiveType);
      modalStore.setOkLabel(buttons.positiveLabel);
      modalStore.setOnOk(onOk);
      modalStore.setShowOkButton(true);
    } else {
      modalStore.setShowOkButton(false);
    }

    if (buttons?.negativeLabel) {
      if (buttons.negativeType != null) modalStore.setOkType(buttons.negativeType);
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
    <div className="modal-simpleinput">
      <div className="modal-simpleinput__content">
        {header && <h3>{header}</h3>}
        <div className="modal-simpleinput__content-body">
          <div style={{ marginRight: 8 }}>{body}</div>
          <div style={{ width: '100%' }}>
            <Input
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value.trim());
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
