import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassRow } from './glass/GlassRow';
import { Typography } from '../designsystem/Typography';
import { Colors } from '../designsystem/Colors';
import { Spacing } from '../designsystem/Spacing';
import { useServerContext } from '../context/ServerContext';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';

interface MemberSidebarProps {
    isVisible: boolean;
    onClose: () => void;
}

export function MemberSidebar({ isVisible, onClose }: MemberSidebarProps) {
    const { serverMembers } = useServerContext();

    const sections = useMemo(() => {
        // Mock statuses for now as backend might not have real-time sync yet
        // In real app, we check member.status
        const online = serverMembers.filter((m, i) => i % 3 === 0);
        const away = serverMembers.filter((m, i) => i % 3 === 1);
        const offline = serverMembers.filter((m, i) => i % 3 === 2);

        return [
            { title: 'ONLINE', data: online, color: Colors.ONLINE },
            { title: 'AWAY', data: away, color: Colors.AWAY },
            { title: 'OFFLINE', data: offline, color: Colors.OFFLINE },
        ].filter(s => s.data.length > 0);
    }, [serverMembers]);

    if (!isVisible) return null;

    return (
        <Animated.View 
            entering={SlideInRight.springify().damping(20).stiffness(150)}
            exiting={SlideOutRight}
            style={styles.container}
        >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.content}>
                <Text style={[Typography.H2, styles.header]}>Members</Text>
                
                <SectionList
                    sections={sections}
                    keyExtractor={item => String(item.id)}
                    renderSectionHeader={({ section: { title, color } }) => (
                        <Text style={[Typography.MICRO, styles.sectionHeader, { color }]}>
                            {title} — {sections.find(s => s.title === title)?.data.length}
                        </Text>
                    )}
                    renderItem={({ item }) => (
                         <GlassRow style={styles.memberRow}>
                            <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.SURFACE1 }]}>
                                <Text style={Typography.H2}>{item.username.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={[Typography.BODY, { color: Colors.TEXT }]}>{item.username}</Text>
                                {/* Role or Status text could go here */}
                            </View>
                         </GlassRow>
                    )}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 260,
        backgroundColor: 'rgba(18, 18, 28, 0.8)', // Fallback / Overlay
        borderLeftWidth: 1,
        borderLeftColor: Colors.GLASS.PANEL_BORDER,
        zIndex: 50,
    },
    content: {
        flex: 1,
        padding: Spacing.M,
    },
    header: {
        marginBottom: Spacing.L,
        marginTop: Spacing.XL + 20, // Avoid safe area roughly or header
    },
    sectionHeader: {
        marginBottom: Spacing.S,
        marginTop: Spacing.L,
        opacity: 0.8,
    },
    memberRow: {
        marginBottom: 4,
        paddingVertical: 8,
        backgroundColor: 'transparent', // Custom for list
        borderWidth: 0,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.M,
    }
});
