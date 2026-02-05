import { View, TextInput, Pressable, ActivityIndicator, Alert, Text, StyleSheet } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Message } from '../types';
import { sendTyping, stopTyping } from '../services/socket';
import UnifiedGifPicker from './UnifiedGifPicker';
import VoiceRecorder from './VoiceRecorder';
import EmojiKeyboard from './EmojiKeyboard';
import { Colors } from '../designsystem/Colors';
import { Typography } from '../designsystem/Typography';
import { Spacing, Radius } from '../designsystem/Spacing';
import { Shadows } from '../designsystem/Shadows';
import { GlassInput } from './glass/GlassInput';

interface MessageInputProps {
    chatId?: number;
    onSend: (text: string, type: 'text' | 'image' | 'gif' | 'voice', metadata?: any) => Promise<void>;
    onFileSelect?: (file: any) => Promise<void>;
    onVoiceSend?: (uri: string, duration: number, mimeType: string) => Promise<void>;
    replyingTo?: Message | null;
    onCancelReply?: () => void;
    editingMessage?: Message | null;
    editContent?: string;
    onEditChange?: (text: string) => void;
    onSaveEdit?: () => void;
    onCancelEdit?: () => void;
}

type PickerMode = 'none' | 'gif' | 'voice' | 'emoji';

export default function MessageInput({
    chatId,
    onSend,
    onFileSelect,
    onVoiceSend,
    replyingTo,
    onCancelReply,
    editingMessage,
    editContent,
    onEditChange,
    onSaveEdit,
    onCancelEdit,
}: MessageInputProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [pickerMode, setPickerMode] = useState<PickerMode>('none');
    const inputRef = useRef<TextInput>(null);
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);

    // Handle editing mode
    const isEditing = !!editingMessage;
    const displayText = isEditing ? (editContent || '') : text;

    // Typing indicator logic
    const handleTextChange = useCallback((newText: string) => {
        if (isEditing) {
            onEditChange?.(newText);
        } else {
            setText(newText);

            // Send typing indicator
            if (chatId && newText.trim()) {
                sendTyping(chatId);

                // Clear previous timeout
                if (typingTimeout.current) {
                    clearTimeout(typingTimeout.current);
                }

                // Stop typing after 2 seconds of no input
                typingTimeout.current = setTimeout(() => {
                    if (chatId) stopTyping(chatId);
                }, 2000);
            }
        }
    }, [chatId, isEditing, onEditChange]);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            if (chatId) stopTyping(chatId);
        };
    }, [chatId]);

    const handleSend = async () => {
        if (isEditing) {
            onSaveEdit?.();
            return;
        }

        if (!displayText.trim()) return;
        const content = displayText.trim();
        setText('');
        setSending(true);

        // Stop typing indicator
        if (chatId) stopTyping(chatId);

        try {
            await onSend(content, 'text');
        } catch (error) {
            Alert.alert('Error', 'Failed to send message');
            setText(content);
        } finally {
            setSending(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                if (onFileSelect) {
                    const asset = result.assets[0];
                    await onFileSelect({
                        uri: asset.uri,
                        name: asset.fileName || 'image.jpg',
                        type: asset.mimeType || 'image/jpeg',
                    });
                }
            }
        } catch (err) {
            console.error('Pick image failed', err);
        }
    };

    const handleGifSelect = async (gifUrl: string, metadata?: { gifId?: string; title?: string }) => {
        try {
            setSending(true);
            await onSend(gifUrl, 'gif', metadata);
        } catch (error) {
            Alert.alert('Error', 'Failed to send GIF');
        } finally {
            setSending(false);
            setPickerMode('none');
        }
    };

    const handleVoiceSend = async (uri: string, duration: number, mimeType: string) => {
        if (onVoiceSend) {
            await onVoiceSend(uri, duration, mimeType);
        }
        setPickerMode('none');
    };

    const handleEmojiSelect = (emoji: string) => {
        if (isEditing) {
            onEditChange?.((editContent || '') + emoji);
        } else {
            setText(prev => prev + emoji);
        }
        inputRef.current?.focus();
    };

    const togglePicker = (mode: PickerMode) => {
        setPickerMode(prev => prev === mode ? 'none' : mode);
    };

    // Render voice recorder mode
    if (pickerMode === 'voice') {
        return (
            <VoiceRecorder
                onSend={handleVoiceSend}
                onCancel={() => setPickerMode('none')}
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Reply preview bar */}
            {replyingTo && (
                <View style={styles.contextBar}>
                    <View style={styles.contextContent}>
                        <Text style={[Typography.MICRO, { color: Colors.LAVENDER }]}>
                            Replying to {replyingTo.sender.displayName || replyingTo.sender.username}
                        </Text>
                        <Text style={[Typography.BODY, { color: Colors.SUBTEXT0 }]} numberOfLines={1}>
                            {replyingTo.content}
                        </Text>
                    </View>
                    <Pressable onPress={onCancelReply} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color={Colors.OVERLAY0} />
                    </Pressable>
                </View>
            )}

            {/* Edit mode bar */}
            {isEditing && (
                <View style={[styles.contextBar, { borderLeftColor: Colors.WARNING }]}>
                    <View style={styles.contextContent}>
                        <Text style={[Typography.MICRO, { color: Colors.WARNING }]}>Editing message</Text>
                    </View>
                    <Pressable onPress={onCancelEdit} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color={Colors.OVERLAY0} />
                    </Pressable>
                </View>
            )}

            {/* Emoji keyboard */}
            {pickerMode === 'emoji' && (
                <EmojiKeyboard
                    onSelect={handleEmojiSelect}
                    onClose={() => setPickerMode('none')}
                />
            )}

            {/* Main input area */}
            <BlurView intensity={20} tint="dark" style={styles.inputArea}>
                {/* Attachment button */}
                <Pressable onPress={handlePickImage} style={styles.iconBtn}>
                    <Ionicons name="add-circle" size={26} color={Colors.OVERLAY1} />
                </Pressable>

                {/* Text input */}
                <GlassInput
                    ref={inputRef}
                    placeholder="Message..."
                    value={displayText}
                    onChangeText={handleTextChange}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                    multiline
                    containerStyle={styles.textInputContainer}
                    style={{ maxHeight: 100 }}
                />

                {/* Action buttons */}
                <View style={styles.actionRow}>
                    {/* Emoji button */}
                    <Pressable onPress={() => togglePicker('emoji')} style={styles.iconBtn}>
                        <Ionicons
                            name={pickerMode === 'emoji' ? 'happy' : 'happy-outline'}
                            size={24}
                            color={pickerMode === 'emoji' ? Colors.LAVENDER : Colors.OVERLAY1}
                        />
                    </Pressable>

                    {/* GIF button (when no text) */}
                    {!displayText.trim() && !isEditing && (
                        <Pressable onPress={() => togglePicker('gif')} style={styles.iconBtn}>
                            <Text style={[Typography.MICRO, { color: pickerMode === 'gif' ? Colors.LAVENDER : Colors.OVERLAY1, fontSize: 10 }]}>GIF</Text>
                        </Pressable>
                    )}

                    {/* Voice button (when no text) */}
                    {!displayText.trim() && !isEditing && (
                        <Pressable onPress={() => togglePicker('voice')} style={styles.iconBtn}>
                            <Ionicons name="mic" size={24} color={Colors.OVERLAY1} />
                        </Pressable>
                    )}

                    {/* Send button (when has text or editing) */}
                    {(displayText.trim() || isEditing) && (
                        <Pressable
                            onPress={handleSend}
                            disabled={sending || (!displayText.trim() && !isEditing)}
                            style={({ pressed }) => [
                                styles.sendBtn,
                                pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 }
                            ]}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color={Colors.CRUST} />
                            ) : (
                                <Ionicons
                                    name={isEditing ? 'checkmark' : 'arrow-up'}
                                    size={20}
                                    color={Colors.CRUST}
                                />
                            )}
                        </Pressable>
                    )}
                </View>
            </BlurView>

            {/* Unified GIF Picker (Klipy + GIPHY with tabs) */}
            <UnifiedGifPicker
                visible={pickerMode === 'gif'}
                onClose={() => setPickerMode('none')}
                onSelect={handleGifSelect}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Wrapper
    },
    contextBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 24, 37, 0.9)', // Mantle with opacity
        paddingHorizontal: Spacing.M,
        paddingVertical: Spacing.S,
        borderLeftWidth: 4,
        borderLeftColor: Colors.LAVENDER,
    },
    contextContent: {
        flex: 1,
    },
    closeBtn: {
        padding: Spacing.S,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: Spacing.S,
        backgroundColor: 'rgba(17, 17, 27, 0.7)', // Crust
        borderTopWidth: 1,
        borderTopColor: Colors.GLASS.PANEL_BORDER,
    },
    textInputContainer: {
        flex: 1,
        marginHorizontal: Spacing.XS,
        // Make GlassInput flexible height for multiline
        height: undefined, 
        minHeight: 44,
    },
    iconBtn: {
        padding: Spacing.S,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 4, // Align with input
    },
    sendBtn: {
        padding: Spacing.S,
        marginLeft: Spacing.XS,
        borderRadius: Radius.CIRCLE,
        backgroundColor: Colors.LAVENDER,
        ...Shadows.GLOW,
    }
});
