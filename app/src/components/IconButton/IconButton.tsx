import React, { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import classnames from 'classnames';
import { getAntdButtonClassName, getAntdButtonType, isAntdButtonDanger, LegacyButtonType } from 'utils/antd-button-utils';

import './IconButton.css';

type Props = ButtonProps & TooltipProps;

type ButtonProps = {
  type?: LegacyButtonType;
  icon: ReactNode;
  shape?: 'circle' | 'round' | 'circle-outline' | undefined;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  style?: CSSProperties;
};

type TooltipProps = {
  title?: string;
  placement?: React.ComponentProps<typeof Tooltip>['placement'];
};

export const IconButton = ({ type, icon, shape = 'circle', onClick, className, style = {}, title, placement = 'left' }: Props) => {
  let component = (
    <Button
      className={classnames(className, getAntdButtonClassName(type))}
      type={getAntdButtonType(type)}
      danger={isAntdButtonDanger(type)}
      shape={shape === 'circle-outline' ? 'circle' : shape}
      icon={icon}
      onClick={onClick}
    />
  );

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
