import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { Colors } from '../designsystem/Colors';
import { Radius, Spacing } from '../designsystem/Spacing';
import { useServerContext } from '../context/ServerContext';
import { getMediaUrl } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

// Note: Using existing Context logic, just styling update.
// We might need to implement the "Create/Join" modals if they were inside ServerSidebar.
// For now, removing them to focus on Rail UI, will re-add slot for them.

interface ServerRailProps {
    onAddServer?: () => void;
}

export function ServerRail({ onAddServer }: ServerRailProps) {
    const { servers, selectedServerId, handleServerSelect } = useServerContext();

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Home / DMs */}
            <Pressable 
                onPress={() => handleServerSelect(0)}
                style={[styles.serverBtn, selectedServerId === 0 && styles.serverBtnSelected]}
            >
                <Ionicons 
                    name="chatbubbles" 
                    size={24} 
                    color={selectedServerId === 0 ? Colors.MANTLE : Colors.OVERLAY1} 
                />
            </Pressable>

            <View style={styles.divider} />

            {/* Server List */}
            {servers.map(server => {
                const isSelected = server.id === selectedServerId;
                return (
                    <View key={server.id} style={styles.itemWrapper}>
                        {isSelected && <View style={styles.activePill} />}
                        <Pressable 
                            onPress={() => handleServerSelect(server.id)}
                            style={[
                                styles.serverBtn,
                                isSelected && styles.serverBtnSelected
                            ]}
                        >
                            {server.iconUrl ? (
                                <Image source={{ uri: getMediaUrl(server.iconUrl) }} style={styles.icon} />
                            ) : (
                                <Text style={[styles.initials, isSelected && { color: Colors.CRUST }]}>
                                    {server.name.substring(0, 2).toUpperCase()}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                );
            })}

            {/* Add Server */}
            <Pressable 
                onPress={onAddServer}
                style={[styles.serverBtn, styles.addBtn]}
            >
                 <Ionicons name="add" size={24} color={Colors.SUCCESS} />
            </Pressable>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 72, // Fixed width Rail
        flex: 1,
        // Background handled by LobbyPanel's rail container or transparent
    },
    contentContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.L,
        paddingBottom: Spacing.XXXL,
    },
    divider: {
        width: 32,
        height: 2,
        backgroundColor: Colors.GLASS.PANEL_BORDER,
        marginVertical: Spacing.M,
        borderRadius: 1,
    },
    itemWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.M,
        position: 'relative', 
    },
    activePill: {
        position: 'absolute',
        left: -12, // Pull stick to edge
        width: 4,
        height: 32,
        backgroundColor: Colors.LAVENDER,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    serverBtn: {
        width: 48,
        height: 48,
        borderRadius: 24, // Circle by default
        backgroundColor: Colors.GLASS.CARD_BG,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.GLASS.CARD_BORDER,
    },
    serverBtnSelected: {
        backgroundColor: Colors.LAVENDER,
        borderRadius: 16, // Squircle on select (Discord style)
    },
    icon: {
        width: '100%',
        height: '100%',
        borderRadius: 16, // Matches squircle
    },
    initials: {
        color: Colors.TEXT,
        fontWeight: 'bold',
        fontSize: 14,
    },
    addBtn: {
        borderStyle: 'dashed',
        borderColor: Colors.SUCCESS,
        marginTop: Spacing.S,
    }
});
