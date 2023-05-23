import React, { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  activeNodeId: string | null;
  width: number;
  hideScrollOnScale?: boolean;
};

function createScrollBarStyling(width: number, hideScroll: boolean): HTMLStyleElement {
  const style = document.createElement('style');
  const id = `scalable-scrollbar-styles-${Math.random() * 1000}`;
  style.id = id;
  style.innerHTML = `
    .scalable-scrollbar::-webkit-scrollbar, .scalable-scrollbar *::-webkit-scrollbar {
      width: ${width}px;
      height: ${width}px;
      display: ${hideScroll ? 'none' : 'block'};
    }
    `;
  document.head.appendChild(style);
  return style;
}

export const ScalableScrollbar = ({ children, activeNodeId, width, hideScrollOnScale = true }: Props) => {
  useEffect(() => {
    const styleElement = createScrollBarStyling(width, hideScrollOnScale);
    const elementId = styleElement.id;

    if (hideScrollOnScale) {
      setTimeout(() => {
        const styleElement = document.getElementById(elementId);
        if (styleElement) {
          styleElement.remove();
          createScrollBarStyling(width, false);
        }
      }, 350);
    }

    return () => {
      const styleElement = document.getElementById(elementId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [activeNodeId, width]);

  return (
    <div className="scalable-scrollbar" style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};
