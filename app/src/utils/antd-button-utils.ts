import type { ButtonProps } from 'antd';

type AntdButtonType = ButtonProps['type'];

export type LegacyButtonType = AntdButtonType | 'danger' | undefined;

export function getAntdButtonType(type: LegacyButtonType): AntdButtonType {
  return type === 'danger' ? 'default' : type;
}

export function isAntdButtonDanger(type: LegacyButtonType): boolean {
  return type === 'danger';
}
