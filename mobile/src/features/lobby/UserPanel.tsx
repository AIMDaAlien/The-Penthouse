import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Typography, Spacing, Radius } from '../../designsystem';
import { useAuth } from '../../context/AuthContext';
import { BlurView } from 'expo-blur';

interface UserPanelProps {
    onOpenSettings: () => void;
}

export function UserPanel({ onOpenSettings }: UserPanelProps) {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <View style={styles.container}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            
            <View style={styles.content}>
                <View style={styles.userInfo}>
                    <View style={styles.avatarContainer}>
                        {user.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.initials}>
                                    {user.username?.[0]?.toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.statusDot} />
                    </View>
                    <View style={styles.textArea}>
                        <Text style={styles.username} numberOfLines={1}>
                            {user.username}
                        </Text>
                        <Text style={styles.handle} numberOfLines={1}>
                            #{user.id.toString().padStart(4, '0')}
                        </Text>
                    </View>
                </View>

                <View style={styles.controls}>
                    <Pressable style={styles.iconBtn}>
                        <Ionicons name="mic" size={20} color={Colors.TEXT_NORMAL} />
                    </Pressable>
                    <Pressable style={styles.iconBtn}>
                        <Ionicons name="headset" size={20} color={Colors.TEXT_NORMAL} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={onOpenSettings}>
                        <Ionicons name="settings-sharp" size={20} color={Colors.TEXT_NORMAL} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: Colors.EFFECTS.PANEL_BG,
        borderTopWidth: 1,
        borderTopColor: Colors.GLASS.PANEL_BORDER,
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.SM,
        justifyContent: 'space-between',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        marginRight: Spacing.S,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
        backgroundColor: Colors.ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        ...Typography.MICRO,
        fontWeight: 'bold',
        color: Colors.TEXT_NORMAL,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.SUCCESS, // Online
        borderWidth: 2,
        borderColor: Colors.EFFECTS.PANEL_BG,
    },
    textArea: {
        justifyContent: 'center',
    },
    username: {
        ...Typography.BODY,
        fontWeight: 'bold',
        fontSize: 13,
        color: Colors.TEXT_NORMAL,
    },
    handle: {
        ...Typography.MICRO,
        color: Colors.TEXT_MUTED,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBtn: {
        padding: 6,
        marginLeft: 2,
        borderRadius: Radius.S,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
