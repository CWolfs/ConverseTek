/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect, MouseEvent, useState } from 'react';
import { Icon, Input } from 'antd';

import { useStore } from 'hooks/useStore';
import { ModalStore, OnCancelType, OnOkType } from 'stores/modalStore/modal-store';

import './ModalSimpleInput.css';

type Props = {
  globalModalId: string;
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

export function ModalSimpleInput({ globalModalId, type, title, header, body, width, buttons, closable = true }: Props) {
  const modalStore = useStore<ModalStore>('modal');
  const [inputValue, setInputValue] = useState<string>('');

  const onOk = (event: MouseEvent<HTMLElement>): void => {
    if (buttons.onPositive) buttons.onPositive(event, inputValue.trim());
    modalStore.closeModal(globalModalId);
  };

  const setupModal = (): void => {
    modalStore.setTitle(renderTitleWithType(title, type), globalModalId);

    if (buttons?.positiveLabel) {
      if (buttons.positiveType != null) modalStore.setOkType(buttons.positiveType, globalModalId);
      modalStore.setOkLabel(buttons.positiveLabel, globalModalId);
      modalStore.setOnOk(onOk, globalModalId);
      modalStore.setShowOkButton(true, globalModalId);
      modalStore.setDisableOk(true, globalModalId);
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

  // update the onOk function when value changes
  useEffect(() => {
    modalStore.setOnOk(onOk, globalModalId);
  }, [inputValue]);

  return (
    <div className="modal-simpleinput">
      <div className="modal-simpleinput__content">
        {header && <h3>{header}</h3>}
        <div className="modal-simpleinput__content-body">
          <div style={{ marginRight: 8 }}>{body}</div>
          <div style={{ width: '100%' }}>
            <Input
              className="inverse"
              value={inputValue}
              onChange={(event) => {
                const value = event.target.value;

                if (value.length > 0) {
                  modalStore.setDisableOk(false, globalModalId);
                } else {
                  modalStore.setDisableOk(true, globalModalId);
                }

                setInputValue(value);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
