import React, { Component } from 'react';

import FileTree from '../../components/FileTree';

class ConversationTree extends Component {
  render() {
    return (
      <div className="conversation-tree">
        <FileTree title="Conversations" />
      </div>
    );
  }
}

export default ConversationTree;
