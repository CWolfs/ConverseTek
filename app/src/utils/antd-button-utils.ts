import type { ButtonProps } from 'antd';
import { positiveActionButtonProps } from '../theme/conversetek-theme';

type AntdButtonType = ButtonProps['type'];
type AntdButtonColor = ButtonProps['color'];
type AntdButtonVariant = ButtonProps['variant'];

export type LegacyButtonType = AntdButtonType | 'danger' | 'positive' | undefined;

export function getAntdButtonType(type: LegacyButtonType): AntdButtonType {
  if (type === 'danger') return 'primary';
  if (type === 'positive') return undefined;
  return type;
}

export function isAntdButtonDanger(type: LegacyButtonType): boolean {
  return type === 'danger';
}

export function getAntdButtonColor(type: LegacyButtonType): AntdButtonColor {
  return type === 'positive' ? positiveActionButtonProps.color : undefined;
}

export function getAntdButtonVariant(type: LegacyButtonType): AntdButtonVariant {
  return type === 'positive' ? positiveActionButtonProps.variant : undefined;
}
