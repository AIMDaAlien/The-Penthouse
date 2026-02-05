import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useServerContext } from '../../src/context/ServerContext';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import JoinServerModal from '../../src/components/JoinServerModal';
import InviteModal from '../../src/components/InviteModal';

export default function ServersScreen() {
    const router = useRouter();
    const { servers, selectedServerId, handleServerSelect, loadServers, loadServerDetails } = useServerContext();
    const [refreshing, setRefreshing] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [inviteServer, setInviteServer] = useState<{ id: number; name: string } | null>(null);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadServers();
        setRefreshing(false);
    };

    const handleServerPress = async (serverId: number) => {
        await handleServerSelect(serverId);
        await loadServerDetails(serverId);
        router.push('/(main)');
    };

    const renderServer = ({ item }: { item: any }) => {
        const isSelected = item.id === selectedServerId;
        return (
            <TouchableOpacity
                onPress={() => handleServerPress(item.id)}
                onLongPress={() => setInviteServer({ id: item.id, name: item.name })}
                style={[styles.serverCard, isSelected && styles.serverCardSelected]}
            >
                <View style={[styles.serverIcon, isSelected && styles.serverIconSelected]}>
                    {item.iconUrl ? (
                        <Image source={{ uri: item.iconUrl }} style={styles.serverImage} />
                    ) : (
                        <Text style={styles.serverInitials}>
                            {item.name.substring(0, 2).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.serverInfo}>
                    <Text style={styles.serverName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.serverMeta}>
                        {item.memberCount || 0} members
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color="#cba6f7" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Action buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShowJoinModal(true)}
                >
                    <Ionicons name="enter-outline" size={20} color="#3b82f6" />
                    <Text style={styles.actionText}>Join Server</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.createButton]}
                    onPress={() => {/* TODO: Create server modal */}}
                >
                    <Ionicons name="add" size={20} color="#22c55e" />
                    <Text style={[styles.actionText, { color: '#22c55e' }]}>Create Server</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={servers}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderServer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cba6f7" />
                }
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="planet-outline" size={64} color="#3f3f46" />
                        <Text style={styles.emptyTitle}>No Servers Yet</Text>
                        <Text style={styles.emptyText}>Join or create a server to get started</Text>
                    </View>
                }
            />

            {/* Join Server Modal */}
            <JoinServerModal
                visible={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onJoined={async (serverId) => {
                    await loadServers();
                    await handleServerSelect(serverId);
                    router.push('/(main)');
                }}
            />

            {/* Invite Modal */}
            {inviteServer && (
                <InviteModal
                    visible={!!inviteServer}
                    serverId={inviteServer.id}
                    serverName={inviteServer.name}
                    onClose={() => setInviteServer(null)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    actionRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: '#27272a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
    },
    createButton: {
        borderColor: '#22c55e',
    },
    actionText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    list: {
        padding: 12,
    },
    serverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#18181b',
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    serverCardSelected: {
        borderColor: '#cba6f7',
        backgroundColor: '#1f1f23',
    },
    serverIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    serverIconSelected: {
        backgroundColor: '#4f46e5',
    },
    serverImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    serverInitials: {
        color: '#a1a1aa',
        fontWeight: 'bold',
        fontSize: 16,
    },
    serverInfo: {
        flex: 1,
    },
    serverName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    serverMeta: {
        color: '#71717a',
        fontSize: 12,
        marginTop: 2,
    },
    selectedIndicator: {
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
    },
    emptyText: {
        color: '#71717a',
        marginTop: 4,
    },
});
