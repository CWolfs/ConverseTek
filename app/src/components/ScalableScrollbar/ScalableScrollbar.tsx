import React, { useState, useEffect } from 'react';

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

function runScrollScale(width: number, hideScrollOnScale: boolean) {
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
}

export const ScalableScrollbar = ({ children, activeNodeId, width, hideScrollOnScale = true }: Props) => {
  const [previousActiveNodeId, setPreviousActiveNodeId] = useState<string | null>(activeNodeId);

  useEffect(() => {
    runScrollScale(width, hideScrollOnScale);
  }, [width]);

  useEffect(() => {
    if (previousActiveNodeId == null) {
      runScrollScale(width, hideScrollOnScale);
    }
    setPreviousActiveNodeId(activeNodeId);
  }, [activeNodeId]);

  return (
    <div className="scalable-scrollbar" style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};
