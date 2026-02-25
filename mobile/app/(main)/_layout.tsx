/**
 * Main Tab Layout
 * 
 * Uses Expo Router Tabs with custom styled tab bar component.
 * Discord-style 4-tab navigation: Home, Servers, Friends, Profile
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { useServerContext } from '../../src/context/ServerContext';
import { Colors, Spacing, Sizes, SpringConfig } from '../../src/designsystem';

// ─────────────────────────────────────────────────────────────
// Custom Tab Bar Component
// ─────────────────────────────────────────────────────────────

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || Spacing.S }]}>
      {/* Backdrop blur */}
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Top border */}
      <View style={styles.topBorder} />
      
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              label={options.tabBarLabel ?? route.name}
              icon={options.tabBarIconName}
              iconFocused={options.tabBarIconFocused}
              isFocused={isFocused}
              badge={options.tabBarBadge}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Button with Glow Effect
// ─────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused?: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  badge?: number;
  onPress: () => void;
}

function TabButton({ label, icon, iconFocused, isFocused, badge, onPress }: TabButtonProps) {
  const scale = useSharedValue(1);
  const currentIcon = isFocused && iconFocused ? iconFocused : icon;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, SpringConfig.MICRO);
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
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {/* Icon with glow */}
        <View style={styles.iconWrapper}>
          <Ionicons
            name={currentIcon}
            size={24}
            color={isFocused ? Colors.ACCENT_LIGHT : Colors.INTERACTIVE_NORMAL}
          />
          {isFocused && <View style={styles.iconGlow} />}
        </View>
        
        {/* Label */}
        <Text style={[
          styles.label,
          { color: isFocused ? Colors.ACCENT_LIGHT : Colors.INTERACTIVE_NORMAL }
        ]}>
          {label}
        </Text>
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Layout
// ─────────────────────────────────────────────────────────────

export default function MainLayout() {
  const { selectedServerId } = useServerContext();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { 
          backgroundColor: Colors.SECONDARY,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.TEXT_NORMAL,
        headerTitleStyle: { 
          fontWeight: '600',
          fontSize: 16,
        },
        headerTransparent: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: selectedServerId ? 'Channels' : 'Messages',
          headerTitleAlign: 'center',
          tabBarLabel: 'Home',
          tabBarIconName: 'home-outline',
          tabBarIconFocused: 'home',
        } as any}
      />
      <Tabs.Screen
        name="servers"
        options={{
          title: 'Servers',
          headerTitleAlign: 'center',
          tabBarLabel: 'Servers',
          tabBarIconName: 'grid-outline',
          tabBarIconFocused: 'grid',
        } as any}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerTitleAlign: 'center',
          tabBarLabel: 'Friends',
          tabBarIconName: 'people-outline',
          tabBarIconFocused: 'people',
        } as any}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitleAlign: 'center',
          tabBarLabel: 'Me',
          tabBarIconName: 'person-outline',
          tabBarIconFocused: 'person',
        } as any}
      />
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBarContainer: {
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.S,
    paddingHorizontal: Spacing.XS,
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
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: Colors.ACCENT,
    opacity: 0.15,
    borderRadius: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -12,
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
    fontSize: 9,
    fontWeight: '700',
  },
});
