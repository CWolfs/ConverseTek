import { Children, isValidElement, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent, ReactNode } from 'react';
import classnames from 'classnames';

import './Split.css';

export type SplitHandleDoubleClickContext = {
  containerElement: HTMLDivElement;
  containerSize: number;
  event: ReactMouseEvent<HTMLDivElement>;
  maxPrimarySize: number;
  minPrimarySize: number;
  orientation: 'vertical' | 'horizontal';
  primarySize: number;
  setPrimarySize: (nextPrimarySize: number) => void;
};

type Props = {
  children: ReactNode;
  className?: string;
  horizontal?: boolean;
  onHandleDoubleClick?: (context: SplitHandleDoubleClickContext) => void;
  primaryCollapsed?: boolean;
  primaryCollapsedSize?: string;
  initialPrimarySize?: string;
  minPrimarySize?: string;
  minSecondarySize?: string;
  orientation?: 'vertical' | 'horizontal';
};

function parseSize(size: string | undefined, fallback: number): number {
  if (!size) return fallback;
  if (size.endsWith('%')) {
    const value = Number.parseFloat(size);
    return Number.isFinite(value) ? value : fallback;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function Split({
  children,
  className,
  horizontal = false,
  onHandleDoubleClick,
  primaryCollapsed = false,
  primaryCollapsedSize = '40px',
  initialPrimarySize = '50%',
  minPrimarySize = '0%',
  minSecondarySize = '0%',
  orientation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [primarySize, setPrimarySize] = useState(parseSize(initialPrimarySize, 50));
  const panes = Children.toArray(children).filter(isValidElement);
  const [primaryPane, secondaryPane] = panes;
  const hasSecondaryPane = panes.length > 1;
  const canResize = hasSecondaryPane && !primaryCollapsed;
  const resolvedOrientation = orientation || (horizontal ? 'horizontal' : 'vertical');
  const isHorizontal = resolvedOrientation === 'horizontal';
  const minPrimary = parseSize(minPrimarySize, 0);
  const minSecondary = parseSize(minSecondarySize, 0);
  const maxPrimary = 100 - minSecondary;
  const clampedPrimarySize = hasSecondaryPane ? clamp(primarySize, minPrimary, maxPrimary) : 100;

  const beginResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!canResize || containerRef.current == null) return;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (containerRef.current == null) return;

      const bounds = containerRef.current.getBoundingClientRect();
      const position = isHorizontal ? moveEvent.clientY - bounds.top : moveEvent.clientX - bounds.left;
      const availableSize = isHorizontal ? bounds.height : bounds.width;
      if (availableSize <= 0) return;

      setPrimarySize(clamp((position / availableSize) * 100, minPrimary, maxPrimary));
    };

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!canResize || onHandleDoubleClick == null || containerRef.current == null) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const containerSize = isHorizontal ? bounds.height : bounds.width;
    if (containerSize <= 0) return;

    onHandleDoubleClick({
      containerElement: containerRef.current,
      containerSize,
      event,
      maxPrimarySize: maxPrimary,
      minPrimarySize: minPrimary,
      orientation: resolvedOrientation,
      primarySize: clampedPrimarySize,
      setPrimarySize: (nextPrimarySize: number) => {
        setPrimarySize(clamp(nextPrimarySize, minPrimary, maxPrimary));
      },
    });
  };

  const primaryStyle = {
    '--split-primary-size': primaryCollapsed ? primaryCollapsedSize : `${clampedPrimarySize}%`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={classnames('split', className, `split--${resolvedOrientation}`, {
        'split--primary-collapsed': primaryCollapsed,
      })}
    >
      <div className="split__pane split__pane--primary" style={primaryStyle}>
        {primaryPane}
      </div>
      {hasSecondaryPane && (
        <>
          {canResize && <div className="split__handle" onDoubleClick={handleDoubleClick} onPointerDown={beginResize} />}
          <div className="split__pane split__pane--secondary">{secondaryPane}</div>
        </>
      )}
    </div>
  );
}
