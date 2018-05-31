import React from 'react';
import { Link } from 'react-router-dom';

import ConversationTree from '../ConversationTree';

import { getConversations } from '../../services/api';

import './Conversations.css';

export default () => {
  getConversations();

  return (
    <div className="conversations">
      <div className="conversations__tree">
        <ConversationTree />
      </div>
      <div className="conversations__editor">
        <div>Conversations</div>
        <Link to="/test">Test Link</Link>
      </div>
    </div>
  );
};
