import type { ButtonProps } from 'antd';

type AntdButtonType = ButtonProps['type'];

export type LegacyButtonType = AntdButtonType | 'danger' | 'positive' | undefined;

export function getAntdButtonType(type: LegacyButtonType): AntdButtonType {
  return type === 'danger' || type === 'positive' ? 'primary' : type;
}

export function isAntdButtonDanger(type: LegacyButtonType): boolean {
  return type === 'danger';
}

export function getAntdButtonClassName(type: LegacyButtonType): string | undefined {
  return type === 'positive' ? 'button-positive' : undefined;
}
