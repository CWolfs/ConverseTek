import { isValidElement, useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react';

import { useStore } from 'hooks/useStore';
import { SidePanelStore } from 'stores/sidePanelStore/side-panel-store';

import './SidePanel.css';

const minSidePanelWidth = 360;
const maxSidePanelWidth = 760;
const keyboardResizeStep = 24;

function clampPanelWidth(width: number): number {
  const viewportMaxWidth = Math.floor(window.innerWidth * 0.55);
  return Math.max(minSidePanelWidth, Math.min(width, Math.min(maxSidePanelWidth, viewportMaxWidth)));
}

function SidePanel() {
  const sidePanelStore = useStore<SidePanelStore>('sidePanel');
  const { panel, options } = sidePanelStore;
  const [shouldRender, setShouldRender] = useState(options.isVisible);

  useEffect(() => {
    if (options.isVisible) {
      setShouldRender(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setShouldRender(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [options.isVisible]);

  if (!shouldRender || panel == null) return null;

  const setPanelWidth = (nextWidth: number) => {
    sidePanelStore.setWidth(`${clampPanelWidth(nextWidth)}px`);
  };

  const getCurrentPanelWidth = () => {
    const sidePanelElement = document.querySelector<HTMLElement>('.side-panel');
    return sidePanelElement?.getBoundingClientRect().width ?? minSidePanelWidth;
  };

  const beginResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const sidePanelElement = event.currentTarget.closest<HTMLElement>('.side-panel');
    if (sidePanelElement == null) return;

    const panelRight = sidePanelElement.getBoundingClientRect().right;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    document.body.classList.add('side-panel-resizing');

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      setPanelWidth(panelRight - moveEvent.clientX);
    };

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      if (target.hasPointerCapture(upEvent.pointerId)) target.releasePointerCapture(upEvent.pointerId);
      document.body.classList.remove('side-panel-resizing');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPanelWidth(getCurrentPanelWidth() + keyboardResizeStep);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPanelWidth(getCurrentPanelWidth() - keyboardResizeStep);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      sidePanelStore.resetWidth();
    }
  };

  return (
    <aside
      className={`side-panel ${options.isVisible ? 'side-panel--open' : 'side-panel--closing'}`}
      style={{ '--side-panel-width': options.width } as CSSProperties}
    >
      <div
        aria-label="Resize side panel"
        aria-orientation="vertical"
        className="side-panel__resize-handle"
        role="separator"
        tabIndex={0}
        onDoubleClick={() => sidePanelStore.resetWidth()}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={beginResize}
      />
      <header className="side-panel__header">
        <div className="side-panel__title">{options.title}</div>
        <Button aria-label="Close side panel" className="side-panel__close" type="text" icon={<CloseOutlined />} onClick={sidePanelStore.closePanel} />
      </header>
      <div className="side-panel__content">{isValidElement(panel) ? panel : null}</div>
    </aside>
  );
}

export const ObservingSidePanel = observer(SidePanel);
