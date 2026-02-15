/**
 * Toast - Custom themed toast notifications
 * 
 * Replaces React Native's Alert.alert with app-themed toasts
 * Features:
 * - Slide in from top with spring animation
 * - Auto-dismiss after duration
 * - Support for success, error, info, warning variants
 * - Blur background with glow
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, SpringConfig } from '../designsystem';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  title?: string;
  action?: () => void;
}


interface ToastState extends ToastConfig {
  id: number;
}

interface ToastContextValue {
  show: (config: ToastConfig | string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  hide: () => void;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────
// Variant Config
// ─────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, { icon: keyof typeof Ionicons.glyphMap; color: string; glow: string }> = {
  success: { icon: 'checkmark-circle', color: Colors.SUCCESS, glow: 'rgba(147, 250, 165, 0.3)' },
  error: { icon: 'close-circle', color: Colors.ERROR, glow: 'rgba(248, 113, 113, 0.3)' },
  info: { icon: 'information-circle', color: Colors.INFO, glow: 'rgba(129, 140, 248, 0.3)' },
  warning: { icon: 'warning', color: Colors.WARNING, glow: 'rgba(251, 191, 36, 0.3)' },
};

// ─────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastState;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const insets = useSafeAreaInsets();
  const variant = toast.variant || 'info';
  const config = VARIANT_CONFIG[variant];
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(18).stiffness(90)}
      exiting={SlideOutUp.duration(200)}
      style={[styles.container, { top: insets.top + Spacing.SM }]}
    >
      <Pressable onPress={() => {
        if (toast.action) {
          toast.action();
        }
        onDismiss();
      }}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={[styles.inner, { shadowColor: config.glow }]}>
            {/* Accent bar */}
            <View style={[styles.accentBar, { backgroundColor: config.color }]} />
            
            {/* Icon */}
            <Ionicons name={config.icon} size={24} color={config.color} style={styles.icon} />
            
            {/* Content */}
            <View style={styles.content}>
              {toast.title && (
                <Text style={styles.title}>{toast.title}</Text>
              )}
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            </View>
            
            {/* Close button */}
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={18} color={Colors.TEXT_MUTED} />
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);

  const show = useCallback((config: ToastConfig | string) => {
    const toastConfig = typeof config === 'string' ? { message: config } : config;
    idRef.current += 1;
    setToast({
      ...toastConfig,
      id: idRef.current,
    });
  }, []);

  const success = useCallback((message: string, title?: string) => {
    show({ message, title, variant: 'success' });
  }, [show]);

  const error = useCallback((message: string, title?: string) => {
    show({ message, title, variant: 'error' });
  }, [show]);

  const info = useCallback((message: string, title?: string) => {
    show({ message, title, variant: 'info' });
  }, [show]);

  const warning = useCallback((message: string, title?: string) => {
    show({ message, title, variant: 'warning' });
  }, [show]);

  const hide = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning, hide }}>
      {children}
      {toast && (
        <ToastItem key={toast.id} toast={toast} onDismiss={hide} />
      )}
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.M,
    right: Spacing.M,
    zIndex: 9999,
  },
  blur: {
    borderRadius: Radius.M,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.EFFECTS.PANEL_BG,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
    borderRadius: Radius.M,
    padding: Spacing.SM,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.M,
    borderBottomLeftRadius: Radius.M,
  },
  icon: {
    marginHorizontal: Spacing.S,
  },
  content: {
    flex: 1,
    marginRight: Spacing.S,
  },
  title: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_NORMAL,
    marginBottom: 2,
  },
  message: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    fontSize: 13,
  },
});

// ─────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────

export default ToastProvider;
