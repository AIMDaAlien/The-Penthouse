import { View, Text, Modal, Pressable, TextInput, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { searchUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface User {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

interface AddMembersModalProps {
    visible: boolean;
    onClose: () => void;
    onAddMember: (userId: number) => Promise<void>;
    existingMemberIds?: number[];
    title?: string;
}

export default function AddMembersModal({
    visible,
    onClose,
    onAddMember,
    existingMemberIds = [],
    title = 'Add Members',
}: AddMembersModalProps) {
    const { user: currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingUserId, setAddingUserId] = useState<number | null>(null);

    // Fetch users on search
    useEffect(() => {
        if (!visible) return;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                const { data } = await searchUsers(searchQuery || undefined);
                // Filter out current user and existing members
                const filteredUsers = (data as User[]).filter(
                    u => u.id !== currentUser?.id && !existingMemberIds.includes(u.id)
                );
                setUsers(filteredUsers);
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, visible, currentUser?.id, existingMemberIds]);

    const handleAddMember = useCallback(async (userId: number) => {
        try {
            setAddingUserId(userId);
            await onAddMember(userId);
            // Remove the user from the list after adding
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error('Failed to add member:', err);
            Alert.alert('Error', 'Failed to add member');
        } finally {
            setAddingUserId(null);
        }
    }, [onAddMember]);

    const handleClose = () => {
        setSearchQuery('');
        setUsers([]);
        onClose();
    };

    const renderUser = ({ item }: { item: User }) => (
        <View className="flex-row items-center py-3 px-4 border-b border-zinc-800">
            <View className="w-12 h-12 rounded-full bg-zinc-700 mr-3 overflow-hidden items-center justify-center">
                {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} className="w-full h-full" />
                ) : (
                    <Text className="text-zinc-400 font-bold text-lg">
                        {item.username.substring(0, 2).toUpperCase()}
                    </Text>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-white font-semibold">{item.displayName || item.username}</Text>
                <Text className="text-zinc-500 text-sm">@{item.username}</Text>
            </View>
            <Pressable
                onPress={() => handleAddMember(item.id)}
                disabled={addingUserId === item.id}
                className="bg-indigo-600 rounded-full px-4 py-2"
            >
                {addingUserId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text className="text-white font-semibold">Add</Text>
                )}
            </Pressable>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-zinc-900">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-zinc-800">
                    <Text className="text-white text-xl font-bold">{title}</Text>
                    <Pressable onPress={handleClose} className="p-2">
                        <Ionicons name="close" size={24} color="#fff" />
                    </Pressable>
                </View>

                {/* Search Input */}
                <View className="px-4 py-3">
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 py-2">
                        <Ionicons name="search" size={20} color="#71717a" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search users..."
                            placeholderTextColor="#71717a"
                            className="flex-1 ml-2 text-white text-base"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#71717a" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* User List */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : users.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-4">
                        <Ionicons name="people-outline" size={48} color="#3f3f46" />
                        <Text className="text-zinc-500 mt-4 text-center">
                            {searchQuery ? 'No users found' : 'Search for users to add'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={users}
                        renderItem={renderUser}
                        keyExtractor={item => String(item.id)}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </Modal>
    );
}
