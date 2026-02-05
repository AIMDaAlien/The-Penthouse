import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { searchUsers, startDm, getMediaUrl } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

interface User {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export default function FriendsScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = async (query?: string) => {
        try {
            setLoading(true);
            const { data } = await searchUsers(query);
            // Filter out current user
            setUsers((data as User[]).filter(u => u.id !== currentUser?.id));
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchUsers(searchQuery || undefined);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers(searchQuery || undefined);
        setRefreshing(false);
    };

    const handleStartDm = async (userId: number, name: string) => {
        try {
            const { data } = await startDm(userId);
            const chatId = (data as any).chatId || (data as any).id;
            router.push(`/chat/${chatId}?name=${encodeURIComponent(name)}`);
        } catch (err) {
            console.error('Failed to start DM:', err);
        }
    };

    const renderUser = ({ item }: { item: User }) => (
        <TouchableOpacity
            onPress={() => handleStartDm(item.id, item.displayName || item.username)}
            style={styles.userCard}
        >
            <View style={styles.avatar}>
                {item.avatarUrl ? (
                    <Image source={{ uri: getMediaUrl(item.avatarUrl) }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>
                        {item.username.substring(0, 2).toUpperCase()}
                    </Text>
                )}
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.displayName}>{item.displayName || item.username}</Text>
                <Text style={styles.username}>@{item.username}</Text>
            </View>
            <View style={styles.actionIcon}>
                <Ionicons name="chatbubble-outline" size={20} color="#71717a" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#71717a" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search users..."
                        placeholderTextColor="#71717a"
                        style={styles.searchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#71717a" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && users.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#cba6f7" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderUser}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cba6f7" />
                    }
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color="#3f3f46" />
                            <Text style={styles.emptyTitle}>No Users Found</Text>
                            <Text style={styles.emptyText}>Try a different search</Text>
                        </View>
                    }
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
    searchContainer: {
        padding: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272a',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        padding: 12,
        paddingTop: 0,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#18181b',
        borderRadius: 16,
        marginBottom: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    avatarText: {
        color: '#a1a1aa',
        fontWeight: 'bold',
        fontSize: 16,
    },
    userInfo: {
        flex: 1,
    },
    displayName: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    username: {
        color: '#71717a',
        fontSize: 13,
        marginTop: 2,
    },
    actionIcon: {
        padding: 8,
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
