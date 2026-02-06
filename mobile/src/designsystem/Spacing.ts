/**
 * Spacing Design System
 * 
 * Consistent spacing scale based on 4px grid.
 * Discord-like values for familiar feel.
 */

export const Spacing = {
  /** 4px - Tight spacing */
  XS: 4,
  
  /** 8px - Small gaps */
  S: 8,
  
  /** 12px - Compact spacing */
  SM: 12,
  
  /** 16px - Standard spacing */
  M: 16,
  
  /** 20px - Medium-large */
  ML: 20,
  
  /** 24px - Large spacing */
  L: 24,
  
  /** 32px - Extra large */
  XL: 32,
  
  /** 48px - Section spacing */
  XXL: 48,
  
  /** 64px - Major sections */
  XXXL: 64,
} as const;

export const Radius = {
  /** No rounding */
  NONE: 0,
  
  /** 4px - Subtle rounding (buttons, tags) */
  XS: 4,
  
  /** 8px - Standard rounding (cards, panels) */
  S: 8,
  
  /** 12px - Medium rounding */
  M: 12,
  
  /** 16px - Large rounding (modals) */
  L: 16,
  
  /** 20px - Extra large */
  XL: 20,
  
  /** Circle/pill shape */
  FULL: 9999,

  // Legacy aliases
  /** @deprecated Use XS */
  BUTTON: 4,
  /** @deprecated Use S */
  CARD: 8,
  /** @deprecated Use M */
  INPUT: 12,
  /** @deprecated Use L */
  PANEL: 16,
  /** @deprecated Use FULL */
  PILL: 9999,
  /** @deprecated Use FULL */
  CIRCLE: 9999,
} as const;

/** Standard sizes for common elements */
export const Sizes = {
  /** Server icon in rail */
  SERVER_ICON: 48,
  
  /** Avatar in message list */
  AVATAR_MESSAGE: 40,
  
  /** Avatar in member list */
  AVATAR_MEMBER: 32,
  
  /** Avatar in user popout */
  AVATAR_LARGE: 80,
  
  /** Status dot size */
  STATUS_DOT: 12,
  
  /** Bottom tab bar height */
  TAB_BAR_HEIGHT: 56,
  
  /** Header height */
  HEADER_HEIGHT: 48,
  
  /** Server rail width */
  SERVER_RAIL_WIDTH: 72,
  
  /** Channel sidebar width */
  CHANNEL_SIDEBAR_WIDTH: 240,
  
  /** Chat input minimum height */
  INPUT_MIN_HEIGHT: 44,
  
  /** Custom emote/sticker display size in chat */
  EMOTE_SIZE: 48,
} as const;
