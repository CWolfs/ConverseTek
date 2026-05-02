import type { ButtonProps } from 'antd';

type AntdButtonType = ButtonProps['type'];
type AntdButtonColor = ButtonProps['color'];
type AntdButtonVariant = ButtonProps['variant'];

export type AppButtonIntent = AntdButtonType | 'danger' | 'positive' | undefined;

export function getAntdButtonType(type: AppButtonIntent): AntdButtonType {
  if (type === 'danger') return 'primary';
  if (type === 'positive') return undefined;
  return type;
}

export function isAntdButtonDanger(type: AppButtonIntent): boolean {
  return type === 'danger';
}

const antdButtonColourByPurpose = {
  // AntD's Button API uses preset colour names; ConverseTek code should use the purpose-based props below.
  positiveAction: 'green',
} satisfies Record<'positiveAction', NonNullable<ButtonProps['color']>>;

export const positiveActionButtonProps = {
  color: antdButtonColourByPurpose.positiveAction,
  variant: 'solid',
} satisfies Pick<ButtonProps, 'color' | 'variant'>;

export function getAntdButtonColor(type: AppButtonIntent): AntdButtonColor {
  return type === 'positive' ? positiveActionButtonProps.color : undefined;
}

export function getAntdButtonVariant(type: AppButtonIntent): AntdButtonVariant {
  return type === 'positive' ? positiveActionButtonProps.variant : undefined;
}
