import React, { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  width: number;
};

export const ScalableScrollbar = ({ children, width }: Props) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'scalable-scrollbar-styles';
    style.innerHTML = `
    .scalable-scrollbar::-webkit-scrollbar, .scalable-scrollbar *::-webkit-scrollbar {
        width: ${width}px;
        height: ${width}px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const styleElement = document.getElementById('scalable-scrollbar-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [width]);

  return (
    <div className="scalable-scrollbar" style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};
