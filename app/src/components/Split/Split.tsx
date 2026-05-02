import { Children, isValidElement, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import classnames from 'classnames';

import './Split.css';

type Props = {
  children: ReactNode;
  className?: string;
  horizontal?: boolean;
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
  initialPrimarySize = '50%',
  minPrimarySize = '0%',
  minSecondarySize = '0%',
  orientation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [primarySize, setPrimarySize] = useState(parseSize(initialPrimarySize, 50));
  const panes = Children.toArray(children).filter(isValidElement);
  const [primaryPane, secondaryPane] = panes;
  const canResize = panes.length > 1;
  const resolvedOrientation = orientation || (horizontal ? 'horizontal' : 'vertical');
  const isHorizontal = resolvedOrientation === 'horizontal';
  const minPrimary = parseSize(minPrimarySize, 0);
  const minSecondary = parseSize(minSecondarySize, 0);
  const maxPrimary = 100 - minSecondary;
  const clampedPrimarySize = canResize ? clamp(primarySize, minPrimary, maxPrimary) : 100;

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

  const primaryStyle = { '--split-primary-size': `${clampedPrimarySize}%` } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={classnames('split', className, `split--${resolvedOrientation}`)}
    >
      <div className="split__pane split__pane--primary" style={primaryStyle}>
        {primaryPane}
      </div>
      {canResize && (
        <>
          <div className="split__handle" onPointerDown={beginResize} />
          <div className="split__pane split__pane--secondary">{secondaryPane}</div>
        </>
      )}
    </div>
  );
}
