import type { ButtonProps, ThemeConfig } from 'antd';

export const converseTekColourRoles = {
  appPrimary: '#0050b3',
  positiveAction: '#52c41a',
  success: '#52c41a',
} as const;

const antdButtonColourByPurpose = {
  // AntD's Button API uses preset colour names; ConverseTek code imports the purpose-based props below.
  positiveAction: 'green',
} satisfies Record<'positiveAction', NonNullable<ButtonProps['color']>>;

export const converseTekTheme: ThemeConfig = {
  cssVar: {
    key: 'conversetek',
  },
  token: {
    borderRadius: 2,
    colorPrimary: converseTekColourRoles.appPrimary,
    colorSuccess: converseTekColourRoles.success,
    green: converseTekColourRoles.positiveAction,
  },
};

export const positiveActionButtonProps = {
  color: antdButtonColourByPurpose.positiveAction,
  variant: 'solid',
} satisfies Pick<ButtonProps, 'color' | 'variant'>;
