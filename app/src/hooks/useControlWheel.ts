import { RefObject, useEffect } from 'react';

export const useControlWheel = (targetRef: RefObject<HTMLElement>, onControlWheel: (increaseZoom: boolean) => void) => {
  useEffect(() => {
    if (!targetRef.current) return;
    const targetElement = targetRef.current;

    const handleWheel = (event: WheelEvent) => {
      const { deltaY } = event;

      if (!event.ctrlKey || deltaY === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const mouseWheelMovedAwayFromUser = deltaY < 0;

      onControlWheel(mouseWheelMovedAwayFromUser);
    };
    const wheelListenerOptions: AddEventListenerOptions = { capture: true, passive: false };

    targetElement.addEventListener('wheel', handleWheel, wheelListenerOptions);

    return () => {
      targetElement.removeEventListener('wheel', handleWheel, wheelListenerOptions);
    };
  }, [targetRef, onControlWheel]);
};
