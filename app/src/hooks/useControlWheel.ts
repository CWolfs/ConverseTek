import { RefObject, useEffect, useState } from 'react';

export const useControlWheel = (targetRef: RefObject<HTMLElement>, onControlWheel: (increaseZoom: boolean) => void) => {
  const [controlPressed, setControlPressed] = useState(false);
  const [, setWheelEvent] = useState(false);

  useEffect(() => {
    if (!targetRef.current) return;
    const targetElement = targetRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setControlPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setControlPressed(false);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const { deltaY } = event;

      if (controlPressed) {
        const mouseWheelMovedAwayFromUser = deltaY < 0;

        setWheelEvent(true);
        onControlWheel(mouseWheelMovedAwayFromUser);
      } else {
        setWheelEvent(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    targetElement.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      targetElement.removeEventListener('wheel', handleWheel);
    };
  }, [controlPressed, onControlWheel]);
};
