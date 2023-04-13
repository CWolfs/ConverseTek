import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { observer, inject } from 'mobx-react';

import ConversationTree from '../ConversationTree';
import { ConversationEditor } from '../ConversationEditor';
import SplashScreen from '../SplashScreen';

import { getConversations, getDefinitions } from '../../services/api';

import './Conversations.css';

const Conversations = ({ dataStore, defStore }) => {
  const { conversationAssets, activeConversationAsset } = dataStore;
  const { definitionCount } = defStore;

  useEffect(() => {
    if (conversationAssets.size <= 0) getConversations();
    if (definitionCount <= 0) getDefinitions();
  }, [conversationAssets.size, definitionCount]);

  const mainView = activeConversationAsset ? <ConversationEditor conversationAsset={activeConversationAsset} /> : <SplashScreen />;

  return (
    <div className="conversations">
      <div className="conversations__tree">
        <ConversationTree />
      </div>
      <div className="conversations__main">{mainView}</div>
    </div>
  );
};

Conversations.propTypes = {
  dataStore: PropTypes.object.isRequired,
  defStore: PropTypes.object.isRequired,
};

export const ObservingConversations = inject('dataStore', 'defStore')(observer(Conversations));
