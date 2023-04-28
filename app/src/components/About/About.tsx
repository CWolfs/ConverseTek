/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect } from 'react';

import packageJson from 'package.json';

import { useStore } from 'hooks/useStore';
import { ModalStore } from 'stores/modalStore/modal-store';

import './About.css';

export function About() {
  const modalStore = useStore<ModalStore>('modal');
  const globalModalId = 'global1';

  const onOk = (): void => {
    modalStore.closeModal(globalModalId);
  };

  const setupModal = (): void => {
    modalStore.setOnOk(onOk, globalModalId);
    modalStore.setTitle('About ConverseTek', globalModalId);
    modalStore.setOkLabel('Ok', globalModalId);
    modalStore.setDisableOk(false, globalModalId);
    modalStore.setWidth('40vw', globalModalId);
    modalStore.setShowCancelButton(false, globalModalId);
  };

  // onMount
  useEffect(() => {
    setupModal();
  }, []);

  return (
    <div className="about">
      <div className="about__author">
        <h3>Author</h3>
        <div className="about__author-avatar" />
        <div className="about__author-details">
          <div>Richard Griffiths</div>
          <div>CWolf</div>
          <div>cwolfs@gmail.com</div>
        </div>
      </div>
      <div className="about__version">
        <h3>Version</h3>
        <div>v{packageJson.version}</div>
      </div>
    </div>
  );
}
