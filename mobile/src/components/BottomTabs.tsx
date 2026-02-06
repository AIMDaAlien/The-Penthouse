/**
 * BottomTabs - Discord-style tab bar navigation
 * 
 * Premium features:
 * - Translucent background with backdrop blur
 * - Glow effect on active tab
 * - Spring-animated indicator
 * - Unread badges
 */

import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Colors, 
  Typography, 
  Spacing, 
  Sizes, 
  SpringConfig,
  Glows 
} from '../designsystem';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface BottomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Tab Button Component
// ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ tab, isActive, onPress }: TabButtonProps) {
  const scale = useSharedValue(1);
  const iconName = isActive && tab.iconFocused ? tab.iconFocused : tab.icon;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, SpringConfig.MICRO);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfig.MICRO);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {/* Icon with glow effect when active */}
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <Ionicons
            name={iconName}
            size={24}
            color={isActive ? Colors.ACCENT_LIGHT : Colors.INTERACTIVE_NORMAL}
          />
          
          {/* Glow effect */}
          {isActive && <View style={styles.iconGlow} />}
        </View>
        
        {/* Label */}
        <Text
          style={[
            styles.label,
            { color: isActive ? Colors.ACCENT_LIGHT : Colors.INTERACTIVE_NORMAL }
          ]}
        >
          {tab.label}
        </Text>
        
        {/* Badge */}
        {tab.badge !== undefined && tab.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function BottomTabs({ tabs, activeTab, onTabPress }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = tabs.findIndex(t => t.key === activeTab);
  
  // Animated indicator position
  const indicatorPosition = useSharedValue(activeIndex);
  
  React.useEffect(() => {
    indicatorPosition.value = withSpring(activeIndex, SpringConfig.STANDARD);
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / tabs.length;
    return {
      left: `${indicatorPosition.value * tabWidth}%`,
      width: `${tabWidth}%`,
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Backdrop blur */}
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Top border with gradient effect */}
      <View style={styles.topBorder} />
      
      {/* Active indicator */}
      <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
      
      {/* Tab buttons */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
    minHeight: Sizes.TAB_BAR_HEIGHT,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.EFFECTS.PANEL_BORDER,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    height: 2,
    backgroundColor: Colors.ACCENT,
    borderRadius: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.S,
    paddingHorizontal: Spacing.S,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.S,
  },
  iconContainerActive: {
    // Active state handled by color
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.ACCENT,
    opacity: 0.2,
    borderRadius: Spacing.S,
    transform: [{ scale: 1.5 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    backgroundColor: Colors.ERROR,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.TEXT_NORMAL,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default BottomTabs;
