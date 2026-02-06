/**
 * Typography Design System
 * 
 * Uses system fonts for reliability across platforms.
 * Colors reference the muted periwinkle palette.
 */

import { TextStyle } from 'react-native';
import { Colors } from './Colors';

// System font stack - more reliable than custom fonts
export const Fonts = {
  SANS: {
    REGULAR: 'System',
    MEDIUM: 'System',
    BOLD: 'System',
  },
  MONO: {
    REGULAR: 'Courier',
  },
} as const;

export const Typography = {
  // ─────────────────────────────────────────────────────────────
  // DISPLAY (Large headers, hero text)
  // ─────────────────────────────────────────────────────────────
  
  DISPLAY: {
    fontFamily: Fonts.SANS.BOLD,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // HEADINGS
  // ─────────────────────────────────────────────────────────────
  
  H1: {
    fontFamily: Fonts.SANS.BOLD,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  H2: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  H3: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // BODY TEXT
  // ─────────────────────────────────────────────────────────────
  
  BODY: {
    fontFamily: Fonts.SANS.REGULAR,
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  BODY_SMALL: {
    fontFamily: Fonts.SANS.REGULAR,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // CAPTIONS & LABELS
  // ─────────────────────────────────────────────────────────────
  
  CAPTION: {
    fontFamily: Fonts.SANS.REGULAR,
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.TEXT_MUTED,
  } as TextStyle,

  /** Category headers, section labels */
  OVERLINE: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.TEXT_MUTED,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // INTERACTIVE
  // ─────────────────────────────────────────────────────────────
  
  /** Channel names, list items */
  CHANNEL: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.CHANNEL_DEFAULT,
  } as TextStyle,

  /** Timestamps */
  TIMESTAMP: {
    fontFamily: Fonts.SANS.REGULAR,
    fontWeight: '400',
    fontSize: 11,
    lineHeight: 14,
    color: Colors.TEXT_MUTED,
  } as TextStyle,

  /** Username in messages */
  USERNAME: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // CODE / MONO
  // ─────────────────────────────────────────────────────────────
  
  MONO: {
    fontFamily: Fonts.MONO.REGULAR,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.TEXT_NORMAL,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // LINK
  // ─────────────────────────────────────────────────────────────
  
  LINK: {
    fontFamily: Fonts.SANS.REGULAR,
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.TEXT_LINK,
  } as TextStyle,

  // ─────────────────────────────────────────────────────────────
  // LEGACY ALIASES
  // ─────────────────────────────────────────────────────────────
  
  /** @deprecated Use OVERLINE */
  MICRO: {
    fontFamily: Fonts.SANS.MEDIUM,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.TEXT_MUTED,
  } as TextStyle,
} as const;
