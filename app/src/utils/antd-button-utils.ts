import { ButtonType } from 'antd/lib/button';

export type LegacyButtonType = ButtonType | 'danger' | undefined;

export function getAntdButtonType(type: LegacyButtonType): ButtonType | undefined {
  return type === 'danger' ? 'default' : type;
}

export function isAntdButtonDanger(type: LegacyButtonType): boolean {
  return type === 'danger';
}
