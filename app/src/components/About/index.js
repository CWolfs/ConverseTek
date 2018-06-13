import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './About.css';

/* eslint-disable react/prefer-stateless-function, no-useless-constructor, class-methods-use-this */
class About extends Component {
  constructor(props) {
    super(props);

    this.onOk = this.onOk.bind(this);

    this.setupModal();
  }

  componentWillReceiveProps() {
    this.setupModal();
  }

  onOk() {
    const { modalStore } = this.props;
    modalStore.closeModal();
  }

  setupModal() {
    const { modalStore } = this.props;
    modalStore.setOnOk(this.onOk);
    modalStore.setTitle('About ConverseTek');
    modalStore.setOkLabel('Ok');
    modalStore.setDisableOk(false);
    modalStore.setWidth('40vw');
    modalStore.setShowCancelButton(false);
  }

  render() {
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
          <div>v0.1.0</div>
        </div>
      </div>
    );
  }
}

About.propTypes = {
  modalStore: PropTypes.object.isRequired,
};

export default About;
