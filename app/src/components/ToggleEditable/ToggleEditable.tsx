import React, { useState } from 'react';
import { Button } from 'antd';

import './ToggleEditable.css';

export function ToggleEditable({ children }: { children: JSX.Element[] }) {
  const [editable] = useState(false);

  if (!children) return null;

  const renderFirstChild = (): JSX.Element => children[0];
  const renderSecondChild = (): JSX.Element => children[1];

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
