import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'antd';

import './ToggleEditable.css';

export function ToggleEditable({ children }) {
  const [editable] = useState(false);

  const renderFirstChild = () => children[0];
  const renderSecondChild = () => children[1];

  const content = editable ? renderSecondChild() : renderFirstChild();

  return (
    <div className="toggle-editable">
      <div className="toggle-editable__content">{content}</div>
      <div className="toggle-editable__controls">
        <Button />
      </div>
    </div>
  );
}

ToggleEditable.propTypes = {
  children: PropTypes.node.isRequired,
};
