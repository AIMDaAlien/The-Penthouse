import { View, KeyboardAvoidingView, Platform, Text, Pressable, ActionSheetIOS, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/context/AuthContext';
import MessageList from '../../src/components/MessageList';
import MessageInput from '../../src/components/MessageInput';
import AddMembersModal from '../../src/components/AddMembersModal';
import { useEffect, useMemo, useCallback, useState } from 'react';
import { markMessageRead, getChatDetails, startDm } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/designsystem';
import type { Chat, Message } from '../../src/types';

export default function ChatScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const { user } = useAuth();
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [chatDetails, setChatDetails] = useState<any>(null);

    const selectedChat = useMemo<Chat | null>(() => {
        if (!id) return null;
        return {
            id: Number(id),
            name: name || 'Chat',
            isGroup: chatDetails?.isGroup || chatDetails?.type === 'group' || false,
            type: chatDetails?.type || 'dm',
            memberCount: chatDetails?.participants?.length || 0
        };
    }, [id, name, chatDetails]);

    const {
        messages,
        loadMessages,
        sendMessage,
        handleFileSelect,
        handleVoiceSend,
        // Edit state
        editingMessage,
        editContent,
        setEditContent,
        handleEditMessage,
        handleSaveEdit,
        handleCancelEdit,
        // Delete
        handleConfirmDelete,
        // Reactions
        handleReact,
        // Reply
        replyingTo,
        setReplyingTo,
        // Typing
        typingUsers,
    } = useMessages(selectedChat, user);

    // Fetch chat details on mount
    useEffect(() => {
        if (id) {
            loadMessages(Number(id));
            // Fetch chat details for member info (silently fail - not critical)
            getChatDetails(Number(id))
                .then(({ data }) => setChatDetails(data))
                .catch(() => { /* Silent fail - chat works without details */ });
        }
    }, [id, loadMessages]);

    // Get members list - server returns 'members' not 'participants'
    const members = chatDetails?.members || chatDetails?.participants || [];

    // Handle adding a member to the chat
    const handleAddMember = useCallback(async (userId: number) => {
        try {
            // For now, start a DM with the user (group member add would need backend support)
            await startDm(userId);
            Alert.alert('Success', 'Started conversation with user');
        } catch (err) {
            console.error('Failed to add member:', err);
            throw err;
        }
    }, []);

    // Show header menu options
    const showHeaderMenu = useCallback(() => {
        const options = ['View Members', 'Add Members', 'Cancel'];
        const cancelButtonIndex = 2;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        // View members
                        const memberNames = members.map((m: any) => m.displayName || m.username).join('\n');
                        Alert.alert('Members', memberNames || 'No members found');
                    } else if (buttonIndex === 1) {
                        setShowAddMembers(true);
                    }
                }
            );
        } else {
            Alert.alert(
                'Chat Options',
                '',
                [
                    {
                        text: 'View Members',
                        onPress: () => {
                            const memberNames = members.map((m: any) => m.displayName || m.username).join('\n');
                            Alert.alert('Members', memberNames || 'No members found');
                        },
                    },
                    { text: 'Add Members', onPress: () => setShowAddMembers(true) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    }, [members]);

    // Handler for marking messages as read
    const handleMarkRead = useCallback(async (messageId: number) => {
        try {
            await markMessageRead(messageId);
        } catch (err) {
            // Silent fail for read receipts
        }
    }, []);

    // Format typing users display
    const typingDisplay = useMemo(() => {
        const users = Array.from(typingUsers.values());
        if (users.length === 0) return null;
        if (users.length === 1) return `${users[0]} is typing...`;
        if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
        return `${users.length} people are typing...`;
    }, [typingUsers]);

    // Vibe styling
    const vibe = chatDetails?.vibe || 'default';
    
    const getGradientColors = (v: string) => {
        switch(v) {
            case 'chill': return ['#0f172a', '#1e293b']; // Slate 900 -> 800
            case 'hype': return ['#2e1065', '#4c1d95']; // Violet 900 -> 800
            case 'serious': return ['#18181b', '#27272a']; // Zinc 900 -> 800
            default: return ['#18181b', '#18181b']; // Zinc 900
        }
    };

    if (!user || !id) return <View className="flex-1 bg-zinc-900" />;

    return (
        <LinearGradient
            colors={getGradientColors(vibe) as any}
            style={{ flex: 1 }}
        >
            <Stack.Screen
                options={{
                    title: name || 'Chat',
                    headerStyle: { backgroundColor: 'transparent' },
                    headerTransparent: true,
                    headerBlurEffect: 'dark',
                    headerTintColor: '#fff',
                    headerRight: () => (
                        <Pressable onPress={showHeaderMenu} className="pr-2">
                            <Ionicons name="ellipsis-vertical" size={22} color="#a1a1aa" />
                        </Pressable>
                    ),
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={{ flex: 1, marginTop: 100 }}> 
                 {/* Margin top for transparent header */}
                    <MessageList
                        messages={messages}
                        vibe={vibe}
                        onReply={(msg: Message) => setReplyingTo(msg)}
                        onEdit={handleEditMessage}
                        onDelete={handleConfirmDelete}
                        onReact={handleReact}
                        onMarkRead={handleMarkRead}
                    />
                </View>

                {/* Typing indicator */}
                {typingDisplay && (
                    <View className="px-4 py-2 bg-zinc-800/80">
                        <Text className="text-zinc-400 text-sm italic">{typingDisplay}</Text>
                    </View>
                )}

                <MessageInput
                    chatId={selectedChat?.id}
                    onSend={async (content, type, metadata) => {
                        await sendMessage(content, type as any, metadata, replyingTo?.id);
                    }}
                    onFileSelect={handleFileSelect}
                    onVoiceSend={handleVoiceSend}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    editingMessage={editingMessage}
                    editContent={editContent}
                    onEditChange={setEditContent}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                />
            </KeyboardAvoidingView>

            {/* Add Members Modal */}
            <AddMembersModal
                visible={showAddMembers}
                onClose={() => setShowAddMembers(false)}
                onAddMember={handleAddMember}
                existingMemberIds={members.map((m: any) => m.id)}
                title="Start Conversation"
            />
        </LinearGradient>
    );
}
