import { View, Text, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getInvite, joinServer } from '../services/api';

interface JoinServerModalProps {
    visible: boolean;
    onClose: () => void;
    onJoined?: (serverId: number) => void;
}

interface InviteInfo {
    code: string;
    serverName: string;
    memberCount: number;
    uses: number;
    maxUses?: number;
}

export default function JoinServerModal({ visible, onClose, onJoined }: JoinServerModalProps) {
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(false);
    const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleLookup = async () => {
        if (!inviteCode.trim()) return;

        try {
            setLoading(true);
            setError(null);
            const { data } = await getInvite(inviteCode.trim());
            const responseData = data as any;
            setInviteInfo({
                code: inviteCode.trim(),
                serverName: responseData.serverName || responseData.server_name || 'Unknown Server',
                memberCount: responseData.memberCount || responseData.member_count || 0,
                uses: responseData.uses || 0,
                maxUses: responseData.maxUses || responseData.max_uses,
            });
        } catch (err: any) {
            console.error('Failed to lookup invite:', err);
            setError(err.response?.data?.error || 'Invalid invite code');
            setInviteInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!inviteInfo) return;

        try {
            setJoining(true);
            const { data } = await joinServer(inviteInfo.code);
            const responseData = data as any;
            Alert.alert('Success', `You've joined ${inviteInfo.serverName}!`);
            onJoined?.(responseData.serverId || responseData.server_id);
            handleClose();
        } catch (err: any) {
            console.error('Failed to join server:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to join server');
        } finally {
            setJoining(false);
        }
    };

    const handleClose = () => {
        setInviteCode('');
        setInviteInfo(null);
        setError(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable className="flex-1 bg-black/60 justify-center px-6" onPress={handleClose}>
                <Pressable className="bg-zinc-900 rounded-2xl p-6" onPress={e => e.stopPropagation()}>
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white text-xl font-bold">Join Server</Text>
                        <Pressable onPress={handleClose} className="p-1">
                            <Ionicons name="close" size={24} color="#71717a" />
                        </Pressable>
                    </View>

                    {!inviteInfo ? (
                        <>
                            <Text className="text-zinc-400 mb-4">
                                Enter an invite code to join a server
                            </Text>

                            {/* Invite code input */}
                            <View className="mb-4">
                                <TextInput
                                    value={inviteCode}
                                    onChangeText={(text) => {
                                        setInviteCode(text);
                                        setError(null);
                                    }}
                                    placeholder="Enter invite code"
                                    placeholderTextColor="#71717a"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="bg-zinc-800 rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-widest"
                                />
                                {error && (
                                    <Text className="text-red-500 text-sm mt-2 text-center">{error}</Text>
                                )}
                            </View>

                            {/* Lookup button */}
                            <Pressable
                                onPress={handleLookup}
                                disabled={loading || !inviteCode.trim()}
                                className={`rounded-xl py-4 items-center ${inviteCode.trim() ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Look Up Invite</Text>
                                )}
                            </Pressable>
                        </>
                    ) : (
                        <>
                            {/* Server info */}
                            <View className="bg-zinc-800 rounded-xl p-4 mb-4 items-center">
                                <View className="w-16 h-16 rounded-2xl bg-indigo-600 items-center justify-center mb-3">
                                    <Text className="text-white text-2xl font-bold">
                                        {inviteInfo.serverName.substring(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <Text className="text-white text-xl font-bold mb-1">
                                    {inviteInfo.serverName}
                                </Text>
                                <Text className="text-zinc-400">
                                    {inviteInfo.memberCount} {inviteInfo.memberCount === 1 ? 'member' : 'members'}
                                </Text>
                            </View>

                            {/* Join button */}
                            <Pressable
                                onPress={handleJoin}
                                disabled={joining}
                                className="bg-indigo-600 rounded-xl py-4 items-center"
                            >
                                {joining ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Join Server</Text>
                                )}
                            </Pressable>

                            {/* Back button */}
                            <Pressable
                                onPress={() => setInviteInfo(null)}
                                className="mt-4 py-2 items-center"
                            >
                                <Text className="text-zinc-400">Try different code</Text>
                            </Pressable>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
