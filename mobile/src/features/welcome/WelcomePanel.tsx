import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { GlassCard } from '../../components/glass/GlassCard';
import { Typography } from '../../designsystem/Typography';
import { Spacing } from '../../designsystem/Spacing';
import { Colors } from '../../designsystem/Colors';
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
                <GlassCard style={styles.card}>
                    <Text style={[Typography.H2, styles.timeLabel]}>
                        ✨ {timeOfDay.charAt(0) + timeOfDay.slice(1).toLowerCase()}
                    </Text>
                    
                    <Text style={[Typography.DISPLAY, styles.headline]}>
                        {greeting.headline}
                    </Text>
                    
                    <Text style={[Typography.BODY, styles.subhead]}>
                        {greeting.sub}
                    </Text>

                    <View style={styles.divider} />

                    <Pressable onPress={onEnter} style={({pressed}) => [styles.cta, pressed && styles.ctaPressed]}>
                        <Text style={[Typography.H2, { color: Colors.LAVENDER }]}>
                            [ Step Inside ]
                        </Text>
                    </Pressable>
                </GlassCard>
            </Animated.View>

            <Animated.Text 
                entering={FadeIn.delay(1000)}
                style={[Typography.MICRO, styles.footer]}
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
    },
    cardContainer: {
        width: '100%',
        maxWidth: 340,
    },
    card: {
        padding: Spacing.XL,
    },
    timeLabel: {
        color: Colors.LAVENDER,
        marginBottom: Spacing.S,
        fontSize: 14, 
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    headline: {
        marginBottom: Spacing.XS,
    },
    subhead: {
        marginBottom: Spacing.XL,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.GLASS.PANEL_BORDER,
        marginBottom: Spacing.L,
    },
    cta: {
        alignSelf: 'flex-start',
    },
    ctaPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }]
    },
    footer: {
        position: 'absolute',
        bottom: Spacing.XL,
        opacity: 0.6,
    }
});
