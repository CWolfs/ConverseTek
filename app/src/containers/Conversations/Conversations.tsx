import React, { useEffect } from 'react';
import { observer } from 'mobx-react';

import type { DataStore } from 'stores/dataStore/data-store';
import type { DefStore } from 'stores/defStore/def-store';

import { getConversations, getDefinitions } from 'services/api';
import { useStore } from 'hooks/useStore';

import { ConversationTree } from '../ConversationTree';
import { ConversationEditor } from '../ConversationEditor';
import { SplashScreen } from '../SplashScreen';

import './Conversations.css';

const Conversations = () => {
  const dataStore = useStore<DataStore>('data');
  const defStore = useStore<DefStore>('def');

  const { conversationAssets, activeConversationAsset } = dataStore;
  const { definitionCount } = defStore;

  useEffect(() => {
    if (conversationAssets.size <= 0) void getConversations();
    if (definitionCount <= 0) void getDefinitions();
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

export const ObservingConversations = observer(Conversations);
