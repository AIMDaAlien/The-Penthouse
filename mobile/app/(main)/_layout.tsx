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
  withSpring,
  interpolate,
  interpolateColor
} from 'react-native-reanimated';
import { useServerContext } from '../../src/context/ServerContext';
import { Colors, Spacing, Sizes, SpringConfig } from '../../src/designsystem';

// ─────────────────────────────────────────────────────────────
// Custom Tab Bar Component (Liquid Lens Container)
// ─────────────────────────────────────────────────────────────

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = (insets.bottom || Spacing.XS) + Spacing.M;

  return (
    <View style={[styles.tabBarContainer, { bottom: bottomOffset }]}>
      <View style={[StyleSheet.absoluteFill, styles.blurViewAsymmetric]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      </View>
      
      <View style={styles.topBorder} />
      
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
// Tab Button with Floating Gem Active State
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
  const progress = useSharedValue(isFocused ? 1 : 0);
  const currentIcon = isFocused && iconFocused ? iconFocused : icon;
  
  React.useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 14,
      stiffness: 120,
      mass: 1,
    });
  }, [isFocused]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(progress.value, [0, 1], [48, 110]),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['rgba(136, 136, 184, 0)', 'rgba(136, 136, 184, 0.2)']
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)']
      ),
      borderWidth: 1,
      borderRadius: 24,
      transform: [
        { scale: scale.value },
        { translateY: interpolate(progress.value, [0, 1], [0, -6]) }
      ]
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      maxWidth: interpolate(progress.value, [0, 1], [0, 60]),
      marginLeft: interpolate(progress.value, [0, 1], [0, 6]),
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [-5, 0]) }
      ]
    };
  });

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
      style={styles.tabButtonWrapper}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabContentGem, animatedContainerStyle]}>
        <View style={styles.iconWrapperGem}>
          <Ionicons
            name={currentIcon}
            size={22}
            color={isFocused ? '#ffffff' : Colors.TEXT_MUTED}
          />
        </View>
        <Animated.View style={[styles.labelContainerGem, animatedTextStyle]}>
          <Text style={styles.labelGem} numberOfLines={1}>{label}</Text>
        </Animated.View>
        
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
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: Colors.PRIMARY },
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
    left: 20,
    right: 20,
    backgroundColor: 'rgba(28, 28, 40, 0.4)',
    height: 72,
    borderRadius: 28,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  blurViewAsymmetric: {
    borderRadius: 28,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(136, 136, 184, 0.3)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 4,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentGem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    overflow: 'hidden',
  },
  iconWrapperGem: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainerGem: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  labelGem: {
    color: Colors.TEXT_NORMAL,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    backgroundColor: Colors.ERROR,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderColor: 'rgba(28, 28, 40, 0.8)',
    borderWidth: 1.5,
  },
  badgeText: {
    color: Colors.TEXT_NORMAL,
    fontSize: 9,
    fontWeight: '700',
  },
});
