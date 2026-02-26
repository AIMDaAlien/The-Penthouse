/**
 * Animation Design System
 * 
 * Spring configurations for smooth, natural motion.
 * All animations use springs (no linear/tween) per design rules.
 */

import { WithSpringConfig } from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────
// SPRING CONFIGURATIONS
// ─────────────────────────────────────────────────────────────

export const SpringConfig = {
  /** Fast, snappy - toggles, checkboxes, small elements */
  MICRO: {
    damping: 15,
    stiffness: 400,
    mass: 0.8,
  } as WithSpringConfig,

  /** Standard UI - buttons, cards, most interactions */
  STANDARD: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  } as WithSpringConfig,

  /** Smooth panels - sidebars, modals sliding in */
  PANEL: {
    damping: 30,
    stiffness: 280,
    mass: 1,
  } as WithSpringConfig,

  /** Bouncy - playful elements, reactions, animations */
  BOUNCY: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  } as WithSpringConfig,

  /** Gentle - slow reveals, ambient motion */
  GENTLE: {
    damping: 30,
    stiffness: 100,
    mass: 1.5,
  } as WithSpringConfig,

  /** Selection morphs - server icon circle → squircle */
  MORPH: {
    damping: 18,
    stiffness: 250,
    mass: 1,
  } as WithSpringConfig,

  /** Modal entrances - snappy with minimal overshoot */
  MODAL: {
    damping: 22,
    stiffness: 260,
    mass: 1,
  } as WithSpringConfig,
} as const;

// ─────────────────────────────────────────────────────────────
// ANIMATION TOKENS
// ─────────────────────────────────────────────────────────────

export const AnimationTokens = {
  /** Stagger delay between list items (ms) */
  STAGGER_DELAY: 30,

  /** Scale factor for tap feedback */
  TAP_SCALE: 0.97,

  /** Entry animation initial opacity */
  ENTRY_OPACITY: 0,

  /** Entry animation initial offset (pixels) */
  ENTRY_OFFSET: 16,
} as const;

// ─────────────────────────────────────────────────────────────
// SPRING PRESETS (for withSpring shorthand)
// ─────────────────────────────────────────────────────────────

export const Springs = {
  /** Quick response spring */
  quick: (value: number) => ({ 
    value, 
    config: SpringConfig.MICRO 
  }),

  /** Standard spring */
  standard: (value: number) => ({ 
    value, 
    config: SpringConfig.STANDARD 
  }),

  /** Bouncy spring */
  bouncy: (value: number) => ({ 
    value, 
    config: SpringConfig.BOUNCY 
  }),
} as const;

// Legacy alias
/** @deprecated Use AnimationTokens */
export const Tokens = AnimationTokens;
