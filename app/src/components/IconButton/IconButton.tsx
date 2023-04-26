import React, { CSSProperties, MouseEvent } from 'react';
import { Button, Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/lib/tooltip';

import './IconButton.css';

type Props = ButtonProps & TooltipProps;

type ButtonProps = {
  type?: 'link' | 'default' | 'ghost' | 'primary' | 'dashed' | 'danger' | undefined;
  icon: string;
  shape?: 'circle' | 'round' | 'circle-outline' | undefined;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  style?: CSSProperties;
};

type TooltipProps = {
  title?: string;
  placement?: TooltipPlacement;
};

export const IconButton = ({ type, icon, shape = 'circle', onClick, className, style = {}, title, placement = 'left' }: Props) => {
  let component = <Button className={className} type={type} shape={shape} icon={icon} onClick={onClick} />;

  if (title != null) {
    component = (
      <Tooltip key={title} title={title} placement={placement}>
        {component}
      </Tooltip>
    );
  }

  return (
    <div className="icon-button" style={style}>
      {component}
    </div>
  );
};
