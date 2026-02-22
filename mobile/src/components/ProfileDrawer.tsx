import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassButton } from './glass/GlassButton';
import { Typography } from '../designsystem/Typography';
import { Colors } from '../designsystem/Colors';
import { Spacing, Radius } from '../designsystem/Spacing';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

interface User {
    id: number;
    username: string;
    avatarUrl?: string;
    bio?: string;
}

interface ProfileDrawerProps {
    isVisible: boolean;
    user: User | null;
    onClose: () => void;
}

export function ProfileDrawer({ isVisible, user, onClose }: ProfileDrawerProps) {
    if (!isVisible || !user) return null;

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <Animated.View 
                entering={SlideInRight.springify().damping(25).stiffness(150)}
                exiting={SlideOutRight}
                style={styles.container}
            >
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                
                {/* Header Banner (Gradient) */}
                <View style={styles.banner}>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="white" />
                    </Pressable>
                </View>

                <View style={styles.content}>
                    {/* Avatar Overlap */}
                    <View style={styles.avatarContainer}>
                        {user.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: Colors.SURFACE1, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={Typography.H1}>{user.username.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={styles.statusDot} />
                    </View>

                    <Text style={[Typography.H2, styles.username]}>{user.username}</Text>
                    <Text style={[Typography.BODY, styles.handle]}>#{user.id.toString().padStart(4, '0')}</Text>

                    <View style={styles.divider} />

                    <Text style={[Typography.MICRO, styles.sectionTitle]}>ABOUT ME</Text>
                    <View style={styles.bioCard}>
                        <Text style={[Typography.BODY, { color: Colors.TEXT }]}>
                            {user.bio || "No bio yet. Just vibing in The Penthouse."}
                        </Text>
                    </View>

                    <Text style={[Typography.MICRO, styles.sectionTitle]}>ROLES</Text>
                    <View style={styles.rolesRow}>
                        <View style={[styles.rolePill, { borderColor: Colors.LAVENDER }]}>
                            <View style={[styles.roleDot, { backgroundColor: Colors.LAVENDER }]} />
                            <Text style={[Typography.MICRO, { color: Colors.LAVENDER }]}>MEMBER</Text>
                        </View>
                    </View>

                    <View style={{ flex: 1 }} />

                    <GlassButton 
                        title="Send Message" 
                        onPress={() => {}} 
                        icon={<Ionicons name="chatbubble-outline" size={18} color={Colors.CRUST} />}
                    />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300, // Wider than MemberSidebar
        backgroundColor: Colors.GLASS.PANEL_BG,
        borderLeftWidth: 1,
        borderLeftColor: Colors.GLASS.PANEL_BORDER,
        overflow: 'hidden',
    },
    banner: {
        height: 120,
        backgroundColor: Colors.MANTLE, // Fallback
        borderBottomWidth: 1,
        borderBottomColor: Colors.GLASS.PANEL_BORDER,
    },
    closeBtn: {
        position: 'absolute',
        top: 50, // Safe area
        right: Spacing.M,
        padding: Spacing.S,
    },
    content: {
        flex: 1,
        padding: Spacing.L,
        marginTop: -50, // Pull up to overlap banner
    },
    avatarContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Colors.CRUST,
        padding: 4,
        marginBottom: Spacing.M,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
    },
    statusDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.ONLINE,
        borderWidth: 3,
        borderColor: Colors.CRUST,
    },
    username: {
        marginBottom: 2,
    },
    handle: {
        color: Colors.OVERLAY1,
        marginBottom: Spacing.L,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.GLASS.PANEL_BORDER,
        marginBottom: Spacing.L,
    },
    sectionTitle: {
        color: Colors.OVERLAY0,
        marginBottom: Spacing.S,
    },
    bioCard: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: Radius.CARD,
        padding: Spacing.M,
        marginBottom: Spacing.L,
    },
    rolesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    rolePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.S,
        paddingVertical: 4,
        borderRadius: Radius.PILL,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    roleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    }
});
