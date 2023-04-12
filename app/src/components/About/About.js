/* eslint-disable react/jsx-one-expression-per-line */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import packageJson from '../../../package.json';

import './About.css';

export function About({ modalStore }) {
  const onOk = () => {
    modalStore.closeModal();
  };

  const setupModal = () => {
    modalStore.setOnOk(onOk);
    modalStore.setTitle('About ConverseTek');
    modalStore.setOkLabel('Ok');
    modalStore.setDisableOk(false);
    modalStore.setWidth('40vw');
    modalStore.setShowCancelButton(false);
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

About.propTypes = {
  modalStore: PropTypes.object.isRequired,
};
