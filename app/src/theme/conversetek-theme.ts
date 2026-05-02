import type { ThemeConfig } from 'antd';

export const converseTekColourRoles = {
  appPrimary: '#0050b3',
  focusAccent: '#0084c1',
  goldTooltip: '#ffd700',
  inputSurface: '#2f2f2f',
  lightSurfaceText: '#30343a',
  positiveAction: '#52c41a',
  success: '#52c41a',
} as const;

export const converseTekTheme: ThemeConfig = {
  cssVar: {
    key: 'conversetek',
  },
  token: {
    borderRadius: 2,
    colorPrimary: converseTekColourRoles.appPrimary,
    colorSuccess: converseTekColourRoles.success,
    colorText: converseTekColourRoles.lightSurfaceText,
    colorTextHeading: converseTekColourRoles.lightSurfaceText,
    // AntD preset token name; ConverseTek's purpose role is positiveAction.
    green: converseTekColourRoles.positiveAction,
  },
  components: {
    Input: {
      activeBg: converseTekColourRoles.inputSurface,
      activeBorderColor: converseTekColourRoles.focusAccent,
      activeShadow: '0 0 0 2px rgba(0, 132, 193, 0.18)',
      hoverBg: converseTekColourRoles.inputSurface,
      hoverBorderColor: converseTekColourRoles.focusAccent,
    },
    Select: {
      activeBorderColor: converseTekColourRoles.focusAccent,
      activeOutlineColor: 'rgba(0, 132, 193, 0.18)',
      hoverBorderColor: converseTekColourRoles.focusAccent,
      selectorBg: converseTekColourRoles.inputSurface,
    },
    Tooltip: {
      colorBgSpotlight: converseTekColourRoles.goldTooltip,
      colorTextLightSolid: converseTekColourRoles.lightSurfaceText,
    },
  },
};
