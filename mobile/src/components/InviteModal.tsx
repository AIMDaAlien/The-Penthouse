import { View, Text, Modal, Pressable, TextInput, Share, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { createInvite } from '../services/api';

interface InviteModalProps {
    visible: boolean;
    serverId: number;
    serverName: string;
    onClose: () => void;
}

export default function InviteModal({ visible, serverId, serverName, onClose }: InviteModalProps) {
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [maxUses, setMaxUses] = useState('');

    const generateInvite = async () => {
        try {
            setLoading(true);
            const uses = maxUses ? parseInt(maxUses, 10) : undefined;
            const { data } = await createInvite(serverId, uses);
            setInviteCode(data.code);
        } catch (err) {
            console.error('Failed to create invite:', err);
            Alert.alert('Error', 'Failed to create invite');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!inviteCode) return;
        await Clipboard.setStringAsync(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!inviteCode) return;
        try {
            await Share.share({
                message: `Join "${serverName}" using invite code: ${inviteCode}`,
            });
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handleClose = () => {
        setInviteCode(null);
        setMaxUses('');
        setCopied(false);
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
                        <Text className="text-white text-xl font-bold">Invite People</Text>
                        <Pressable onPress={handleClose} className="p-1">
                            <Ionicons name="close" size={24} color="#71717a" />
                        </Pressable>
                    </View>

                    <Text className="text-zinc-400 mb-4">
                        Share this invite code with friends to let them join {serverName}.
                    </Text>

                    {!inviteCode ? (
                        <>
                            {/* Max uses input */}
                            <View className="mb-4">
                                <Text className="text-zinc-400 text-sm mb-2">Max uses (optional)</Text>
                                <TextInput
                                    value={maxUses}
                                    onChangeText={setMaxUses}
                                    placeholder="Unlimited"
                                    placeholderTextColor="#71717a"
                                    keyboardType="number-pad"
                                    className="bg-zinc-800 rounded-xl px-4 py-3 text-white"
                                />
                            </View>

                            {/* Generate button */}
                            <Pressable
                                onPress={generateInvite}
                                disabled={loading}
                                className="bg-indigo-600 rounded-xl py-4 items-center"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Generate Invite</Text>
                                )}
                            </Pressable>
                        </>
                    ) : (
                        <>
                            {/* Invite code display */}
                            <View className="bg-zinc-800 rounded-xl p-4 mb-4">
                                <Text className="text-zinc-400 text-xs mb-1">INVITE CODE</Text>
                                <Text className="text-white text-2xl font-mono font-bold tracking-widest">
                                    {inviteCode}
                                </Text>
                            </View>

                            {/* Action buttons */}
                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={handleCopy}
                                    className="flex-1 bg-zinc-800 rounded-xl py-3 flex-row items-center justify-center gap-2"
                                >
                                    <Ionicons
                                        name={copied ? 'checkmark' : 'copy'}
                                        size={20}
                                        color={copied ? '#22c55e' : '#fff'}
                                    />
                                    <Text className={`font-semibold ${copied ? 'text-green-500' : 'text-white'}`}>
                                        {copied ? 'Copied!' : 'Copy'}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleShare}
                                    className="flex-1 bg-indigo-600 rounded-xl py-3 flex-row items-center justify-center gap-2"
                                >
                                    <Ionicons name="share" size={20} color="#fff" />
                                    <Text className="text-white font-semibold">Share</Text>
                                </Pressable>
                            </View>

                            {/* Generate new */}
                            <Pressable
                                onPress={() => setInviteCode(null)}
                                className="mt-4 py-2 items-center"
                            >
                                <Text className="text-zinc-400">Generate new code</Text>
                            </Pressable>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}
