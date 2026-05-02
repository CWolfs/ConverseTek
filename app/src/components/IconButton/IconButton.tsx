import type { ComponentProps, CSSProperties, MouseEvent, ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { AppButtonIntent, getAntdButtonColor, getAntdButtonType, getAntdButtonVariant, isAntdButtonDanger } from 'utils/antd-button-utils';

import './IconButton.css';

type Props = ButtonProps & TooltipProps;

type ButtonProps = {
  type?: AppButtonIntent;
  icon: ReactNode;
  shape?: 'circle' | 'round' | 'circle-outline' | undefined;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  style?: CSSProperties;
};

type TooltipProps = {
  title?: string;
  placement?: ComponentProps<typeof Tooltip>['placement'];
};

export const IconButton = ({ type, icon, shape = 'circle', onClick, className, style = {}, title, placement = 'left' }: Props) => {
  let component = (
    <Button
      className={className}
      type={getAntdButtonType(type)}
      color={getAntdButtonColor(type)}
      variant={getAntdButtonVariant(type)}
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
