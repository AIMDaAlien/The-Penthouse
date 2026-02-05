import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../designsystem/Colors';
import { Spacing, Radius } from '../../designsystem/Spacing';

interface GlassRowProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    selected?: boolean;
}

export function GlassRow({ children, onPress, style, selected }: GlassRowProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                selected && styles.selected,
                pressed && !selected && styles.pressed,
                style
            ]}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.M, // 16dp
        backgroundColor: Colors.GLASS.ROW_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.GLASS.ROW_BORDER,
        marginBottom: Spacing.S,
    },
    pressed: {
        backgroundColor: Colors.GLASS.ROW_HOVER,
    },
    selected: {
        backgroundColor: 'rgba(180, 190, 254, 0.15)', // Lavender hint
        borderColor: Colors.LAVENDER,
    }
});
