import React from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';

import ConversationTree from '../ConversationTree';
import ConversationEditor from '../ConversationEditor';
import SplashScreen from '../SplashScreen';

import { getConversations } from '../../services/api';

import './Conversations.css';

const Conversations = ({ dataStore }) => {
  const { activeConversationAsset } = dataStore;

  getConversations();

  const mainView = (activeConversationAsset) ?
    <ConversationEditor conversationAsset={activeConversationAsset} /> : <SplashScreen />;

  return (
    <div className="conversations">
      <div className="conversations__tree">
        <ConversationTree />
      </div>
      <div className="conversations__main">
        {mainView}
      </div>
    </div>
  );
};

Conversations.propTypes = {
  dataStore: PropTypes.object.isRequired,
};

export default inject('dataStore')(observer(Conversations));
