import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button } from 'antd';

import './ToggleEditable.css';

export function ToggleEditable({ children }: { children: ReactElement[] }) {
  const [editable] = useState(false);

  if (!children) return null;

  const renderFirstChild = (): ReactElement => children[0];
  const renderSecondChild = (): ReactElement => children[1];

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
