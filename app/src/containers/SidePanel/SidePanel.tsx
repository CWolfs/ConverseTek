import { isValidElement } from 'react';
import type { CSSProperties } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { SidePanelStore } from 'stores/sidePanelStore/side-panel-store';

import './SidePanel.css';

function SidePanel() {
  const sidePanelStore = useStore<SidePanelStore>('sidePanel');
  const { panel, options } = sidePanelStore;

  if (!options.isVisible || panel == null) return null;

  return (
    <aside className="side-panel" style={{ '--side-panel-width': options.width } as CSSProperties}>
      <header className="side-panel__header">
        <div className="side-panel__title">{options.title}</div>
        <Button aria-label="Close side panel" className="side-panel__close" type="text" icon={<CloseOutlined />} onClick={sidePanelStore.closePanel} />
      </header>
      <div className="side-panel__content">{isValidElement(panel) ? panel : null}</div>
    </aside>
  );
}

export const ObservingSidePanel = observer(SidePanel);
