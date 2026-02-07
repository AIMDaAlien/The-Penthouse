/**
 * WelcomePanel - Time-aware greeting card
 * 
 * Discord-style design with dark theme
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, Radius, Glows } from '../../designsystem';
import { useAuth } from '../../context/AuthContext';

interface WelcomePanelProps {
  onEnter: () => void;
}

const GREETINGS = {
  MORNING: { headline: 'Early light.', sub: 'Designing the day.' },
  AFTERNOON: { headline: 'Sunlight.', sub: 'Focus and flow.' },
  EVENING: { headline: 'Evening hush.', sub: 'Soft light, quiet conversation.' },
  NIGHT: { headline: '3 AM thoughts.', sub: 'The best conversations happen now.' },
};

function getTimeContext() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 21) return 'EVENING';
  return 'NIGHT';
}

export function WelcomePanel({ onEnter }: WelcomePanelProps) {
  const { user } = useAuth();
  const timeOfDay = getTimeContext();
  const greeting = GREETINGS[timeOfDay];

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={SlideInDown.springify().damping(18).stiffness(90)}
        style={styles.cardContainer}
      >
        {/* Card with blur */}
        <View style={styles.card}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.cardBackground} />
          <View style={styles.cardBorder} />
          
          <View style={styles.cardContent}>
            <Text style={styles.timeLabel}>
              ✨ {timeOfDay.charAt(0) + timeOfDay.slice(1).toLowerCase()}
            </Text>
            
            <Text style={styles.headline}>
              {greeting.headline}
            </Text>
            
            <Text style={styles.subhead}>
              {greeting.sub}
            </Text>

            <View style={styles.divider} />

            <Pressable 
              onPress={onEnter} 
              style={({pressed}) => [
                styles.cta, 
                pressed && styles.ctaPressed
              ]}
            >
              <Text style={styles.ctaText}>[ Step Inside ]</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.Text 
        entering={FadeIn.delay(1000)}
        style={styles.footer}
      >
        Logged in as {user?.username}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.L,
    backgroundColor: 'transparent',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
  },
  card: {
    borderRadius: Radius.L,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.L,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  cardContent: {
    padding: Spacing.XL,
  },
  timeLabel: {
    color: Colors.ACCENT_LIGHT,
    marginBottom: Spacing.S,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headline: {
    ...Typography.DISPLAY,
    color: Colors.TEXT_NORMAL,
    marginBottom: Spacing.XS,
  },
  subhead: {
    ...Typography.BODY,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.XL,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.EFFECTS.PANEL_BORDER,
    marginBottom: Spacing.L,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.XS,
    paddingHorizontal: Spacing.S,
    borderRadius: Radius.S,
  },
  ctaPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
    backgroundColor: Colors.SURFACE_HOVER,
  },
  ctaText: {
    ...Typography.H2,
    color: Colors.ACCENT_LIGHT,
    fontSize: 16,
  },
  footer: {
    ...Typography.OVERLINE,
    position: 'absolute',
    bottom: Spacing.XL,
    color: Colors.TEXT_MUTED,
    opacity: 0.6,
  },
});
