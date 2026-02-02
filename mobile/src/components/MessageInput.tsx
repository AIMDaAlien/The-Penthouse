import { View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface MessageInputProps {
    onSend: (text: string, type: 'text' | 'image', metadata?: any) => Promise<void>;
    onFileSelect?: (file: any) => Promise<void>;
}

export default function MessageInput({ onSend, onFileSelect }: MessageInputProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!text.trim()) return;
        const content = text.trim();
        setText(''); // Optimistic clear
        setSending(true);
        try {
            await onSend(content, 'text');
        } catch (error) {
            Alert.alert('Error', 'Failed to send message');
            setText(content); // Restore on failure
        } finally {
            setSending(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.8,
                // base64: true, // If we want to upload directly
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                // In a real app, we would upload the file here.
                // For this demo, we assume onFileSelect handles it or we send the URI as an "image" message placeholder?
                // Our API expects a file upload.
                Alert.alert('Info', 'Image selection logic ported but upload requires File object adaptation');
                if (onFileSelect) {
                    const asset = result.assets[0];
                    // Adapt for our API
                    await onFileSelect({
                        uri: asset.uri,
                        name: asset.fileName || 'image.jpg',
                        type: asset.mimeType || 'image/jpeg'
                    });
                }
            }
        } catch (err) {
            console.error('Pick image failed', err);
        }
    };

    return (
        <View className="flex-row items-end p-2 bg-zinc-800 border-t border-zinc-700">
            <TouchableOpacity 
                onPress={handlePickImage}
                className="p-3 mr-1"
            >
                <Ionicons name="add-circle" size={26} color="#a1a1aa" />
            </TouchableOpacity>
            
            <View className="flex-1 bg-[#09090b] rounded-2xl border border-zinc-800 justify-center">
                <TextInput
                     className="px-4 py-3 text-white text-base max-h-32"
                     placeholder="Message..."
                     placeholderTextColor="#71717a"
                     multiline
                     value={text}
                     onChangeText={setText}
                     returnKeyType="send"
                     onSubmitEditing={handleSend}
                     // On Android, multiline + returnKeyType='send' + onSubmitEditing usually works to send
                     blurOnSubmit={false} 
                />
            </View>

            <TouchableOpacity 
                onPress={handleSend}
                disabled={sending || !text.trim()}
                className={`p-3 ml-2 rounded-full ${text.trim() ? 'bg-[#cba6f7] shadow-lg shadow-[#cba6f7]/20 origin-center transform scale-100' : 'bg-zinc-800'}`}
                style={text.trim() ? { transform: [{ scale: 1.05 }] } : {}}
            >
                {sending ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <Ionicons name="arrow-up" size={20} color={text.trim() ? "#09090b" : "#71717a"} />
                )}
            </TouchableOpacity>
        </View>
    );
}
