import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'antd';

import './ConversationGeneral.css';

const ConversationGeneral = ({ node }) => {
  return (
    <Card className="conversation-general" title={null}>
      <p>id: {node.idRef.id}</p>
      <p>index: {node.index}</p>
      <p>speaker override id: {node.speaker_override_id}</p>
      <p>comment: {node.comment}</p>
    </Card>
  );
};

ConversationGeneral.propTypes = {
  node: PropTypes.object.isRequired,
};

export default ConversationGeneral;
