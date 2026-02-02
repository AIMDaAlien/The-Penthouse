import { View, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useMessages } from '../../src/hooks/useMessages';
import { useAuth } from '../../src/context/AuthContext';
import MessageList from '../../src/components/MessageList';
import MessageInput from '../../src/components/MessageInput';
import { useEffect, useMemo } from 'react';
import type { Chat } from '../../src/types';

export default function ChatScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const { user } = useAuth();

    // Mock selectedChat based on ID params for the hook
    // Ideally useChats would provide the full object, but useMessages mainly needs ID
    const selectedChat = useMemo<Chat | null>(() => {
        if (!id) return null;
        return {
            id: Number(id),
            name: name || 'Chat',
            isGroup: false, // Assumption for now, or derive from metadata
            type: 'dm',
            memberCount: 0
        };
    }, [id, name]);

    const { messages, loadMessages, sendMessage, handleFileSelect } = useMessages(selectedChat, user);

    useEffect(() => {
        if (id) {
            loadMessages(Number(id));
        }
    }, [id, loadMessages]);

    if (!user || !id) return <View className="flex-1 bg-zinc-900" />;

    return (
        <View className="flex-1 bg-zinc-900">
            <Stack.Screen 
                options={{ 
                    title: name || 'Chat',
                    headerStyle: { backgroundColor: '#18181b' },
                    headerTintColor: '#fff',
                }} 
            />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <MessageList messages={messages} />
                
                <MessageInput 
                    onSend={async (content, type) => {
                        await sendMessage(content, type as any);
                    }}
                    onFileSelect={handleFileSelect}
                />
            </KeyboardAvoidingView>
        </View>
    );
}
