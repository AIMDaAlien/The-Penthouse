import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActionSheetIOS, Platform, Alert, Dimensions, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Message, Reaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import ImageViewer from './ImageViewer';
import VoicePlayer from './VoicePlayer';
import VideoPlayer from './VideoPlayer';
import { getMediaUrl } from '../services/api';
import { Colors } from '../designsystem/Colors';
import { Typography } from '../designsystem/Typography';
import { Spacing, Radius } from '../designsystem/Spacing';
import { AppImage } from './AppImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_MEDIA_WIDTH = Math.min(SCREEN_WIDTH * 0.65, 260);
const MAX_MEDIA_HEIGHT = 360;

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Module-level viewability config (stable reference, no re-creation)
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

// Module-level content container style (stable reference)
const LIST_CONTENT_STYLE = { paddingVertical: 16 };

// Calculate display dimensions maintaining aspect ratio
function getMediaDimensions(metadata?: Record<string, unknown>): { width: number; height: number } {
    const origWidth = typeof metadata?.width === 'number' ? metadata.width : 0;
    const origHeight = typeof metadata?.height === 'number' ? metadata.height : 0;

    if (origWidth && origHeight) {
        const aspectRatio = origWidth / origHeight;
        let width = MAX_MEDIA_WIDTH;
        let height = width / aspectRatio;

        if (height > MAX_MEDIA_HEIGHT) {
            height = MAX_MEDIA_HEIGHT;
            width = height * aspectRatio;
        }

        return { width: Math.round(width), height: Math.round(height) };
    }

    // Default square fallback
    return { width: MAX_MEDIA_WIDTH, height: MAX_MEDIA_WIDTH };
}

interface MessageListProps {
    messages: Message[];
    vibe?: string;
    onReply?: (message: Message) => void;
    onEdit?: (message: Message) => void;
    onDelete?: (messageId: number) => void;
    onReact?: (messageId: number, emoji: string) => void;
    onMarkRead?: (messageId: number) => void;
}

const groupReactions = (reactions: Reaction[]) => {
    const map = new Map<string, number>();
    for (const r of reactions) {
        map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    }
    return Array.from(map.entries())
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count);
};

interface MessageItemProps {
    message: Message;
    isMe: boolean;
    userId: number;
    vibe?: string;
    onImagePress: (uri: string) => void;
    onLongPress: () => void;
    onReact?: (emoji: string) => void;
}

// Helper to get bubble colors based on vibe
const getBubbleColors = (vibe: string | undefined, isMe: boolean) => {
    if (!isMe) return { bg: Colors.GLASS.ROW_BG, text: Colors.TEXT };
    
    switch(vibe) {
        case 'chill': return { bg: '#0ea5e9', text: '#fff' }; // Sky 500
        case 'hype': return { bg: '#d946ef', text: '#fff' }; // Fuchsia 500
        case 'serious': return { bg: '#52525b', text: '#e4e4e7' }; // Zinc 600
        default: return { bg: Colors.LAVENDER, text: Colors.CRUST };
    }
};

// ─────────────────────────────────────────────────────────────
// MessageItem — wrapped in React.memo to prevent re-renders
// when sibling messages change
// ─────────────────────────────────────────────────────────────
const MessageItem = React.memo(function MessageItem({ message, isMe, userId, vibe, onImagePress, onLongPress, onReact }: MessageItemProps) {
    const [showReactions, setShowReactions] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // ... deleted check ... 
    if (message.deletedAt || message.deleted_at) {
        return (
            <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
                {!isMe && (
                    <View style={styles.avatarPlaceholderDeleted}>
                        <Ionicons name="person" size={14} color={Colors.OVERLAY0} />
                    </View>
                )}
                <View style={[styles.bubbleBase, isMe ? styles.bubbleMe : styles.bubbleOther, { opacity: 0.6 }]}>
                    <Text style={[Typography.BODY, { color: Colors.OVERLAY1, fontStyle: 'italic' }]}>Message deleted</Text>
                </View>
            </View>
        );
    }

    const isImage = message.type === 'image' || message.type === 'gif';
    const isVoice = message.type === 'voice';
    const isVideo = message.type === 'video';
    const isMediaOnly = isImage || isVideo;
    const reactions = message.reactions || [];
    const groupedReactions = groupReactions(reactions);
    const hasReacted = (emoji: string) => reactions.some(r => r.emoji === emoji && r.userId === userId);

    const handleLongPress = useCallback(() => {
        setShowReactions(true);
        onLongPress();
    }, [onLongPress]);

    const handleReactionSelect = useCallback((emoji: string) => {
        setShowReactions(false);
        onReact?.(emoji);
    }, [onReact]);

    // Determine bubble styles
    const bubbleColors = getBubbleColors(vibe, isMe);
    const bubbleStyles = isMediaOnly
        ? [styles.mediaBubble]
        : [
            styles.bubbleBase, 
            isMe ? { backgroundColor: bubbleColors.bg, borderTopRightRadius: 2 } : styles.bubbleOther
          ];

    return (
        <View style={[styles.messageContainer, isMe ? styles.alignRight : styles.alignLeft]}>
            {/* Reply context if replying to another message */}
            {message.replyToMessage && (
                <View style={[styles.replyContext, isMe ? { marginRight: Spacing.S } : { marginLeft: 40 }]}>
                    <View style={styles.replyLine} />
                    <Text style={[Typography.MICRO, { color: Colors.OVERLAY1 }]} numberOfLines={1}>
                        <Text style={{ color: Colors.LAVENDER }}>@{message.replyToMessage.sender?.username || 'Unknown'}</Text>
                        {' '}{message.replyToMessage.content?.substring(0, 30)}...
                    </Text>
                </View>
            )}

            <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {message.sender.avatarUrl ? (
                            <AppImage
                                variant="avatar"
                                source={{ uri: getMediaUrl(message.sender.avatarUrl) }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <Text style={[Typography.MICRO, { color: Colors.OVERLAY1, fontWeight: 'bold' }]}>
                                {message.sender.username.substring(0, 2).toUpperCase()}
                            </Text>
                        )}
                    </View>
                )}

                <Pressable
                    onLongPress={handleLongPress}
                    delayLongPress={300}
                    style={bubbleStyles}
                >
                    {!isMe && (
                        <Text style={[Typography.MICRO, styles.senderName]}>
                            {message.sender.displayName || message.sender.username}
                        </Text>
                    )}

                    {isImage ? (() => {
                        const dims = getMediaDimensions(message.metadata);
                        return (
                            <Pressable onPress={() => onImagePress(getMediaUrl(message.content))}>
                                <View style={{ width: dims.width, height: dims.height, overflow: 'hidden', borderRadius: Radius.BUTTON }}>
                                    {imageLoading && (
                                        <View style={styles.mediaPlaceholder}>
                                            <Ionicons name="image-outline" size={32} color={Colors.SURFACE1} />
                                        </View>
                                    )}
                                    {imageError ? (
                                        <View style={styles.mediaPlaceholder}>
                                            <Ionicons name="image-outline" size={32} color={Colors.OVERLAY0} />
                                            <Text style={[Typography.MICRO, { marginTop: 4 }]}>Failed to load</Text>
                                        </View>
                                    ) : (
                                        <AppImage
                                            source={{ uri: getMediaUrl(message.content) }}
                                            style={{ width: dims.width, height: dims.height }}
                                            contentFit="contain"
                                            variant="media"
                                            onLoad={() => setImageLoading(false)}
                                            onError={() => {
                                                setImageLoading(false);
                                                setImageError(true);
                                            }}
                                        />
                                    )}
                                </View>
                            </Pressable>
                        );
                    })() : isVoice ? (
                        <VoicePlayer
                            uri={getMediaUrl(message.content)}
                            duration={typeof message.metadata?.duration === 'number' ? message.metadata.duration : 0}
                            isMe={isMe}
                        />
                    ) : isVideo ? (
                        <VideoPlayer
                            uri={getMediaUrl(message.content)}
                            isMe={isMe}
                        />
                    ) : (
                        <Text style={[Typography.BODY, { color: isMe ? bubbleColors.text : Colors.TEXT }]}>
                            {message.content}
                        </Text>
                    )}

                    {/* Timestamp and status */}
// ... keeping meta row logic same ...
                    <View style={[styles.metaRow, isMediaOnly && styles.mediaMetaRow]}>
                        {(message.editedAt || message.edited_at) && (
                            <Text style={[styles.editedText, isMediaOnly && styles.mediaText]}>edited</Text>
                        )}
                        <Text style={[styles.timestamp, isMediaOnly && styles.mediaText]}>
                            {format(new Date(message.createdAt), 'h:mm a')}
                        </Text>
                        {isMe && (
                            <Text style={[
                                styles.readStatus,
                                { color: message.readAt ? Colors.PERIWINKLE : Colors.OVERLAY1 },
                                isMediaOnly && styles.mediaText
                            ]}>
                                {message.readAt ? '✓✓' : '✓'}
                            </Text>
                        )}
                    </View>
                </Pressable>
            </View>

            {/* Reactions display */}
            {groupedReactions.length > 0 && (
                <View style={[styles.reactionsContainer, isMe ? { marginRight: Spacing.S, justifyContent: 'flex-end' } : { marginLeft: 40 }]}>
                    {groupedReactions.map(({ emoji, count }) => (
                        <Pressable
                            key={emoji}
                            onPress={() => onReact?.(emoji)}
                            style={[
                                styles.reactionPill,
                                hasReacted(emoji) ? { backgroundColor: 'rgba(180, 190, 254, 0.3)' } : { backgroundColor: Colors.SURFACE0 }
                            ]}
                        >
                            <Text style={{ fontSize: 12 }}>{emoji}</Text>
                            {count > 1 && <Text style={[Typography.MICRO, { marginLeft: 4 }]}>{count}</Text>}
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Quick reaction bar on long press */}
            {showReactions && (
                <View style={[styles.quickReactionContainer, isMe ? { marginRight: Spacing.S } : { marginLeft: 40 }]}>
                    {QUICK_REACTIONS.map(emoji => (
                        <Pressable
                            key={emoji}
                            onPress={() => handleReactionSelect(emoji)}
                            style={styles.quickReactionBtn}
                        >
                            <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        </Pressable>
                    ))}
                    <Pressable onPress={() => setShowReactions(false)} style={styles.quickReactionBtn}>
                        <Ionicons name="close" size={18} color={Colors.OVERLAY0} />
                    </Pressable>
                </View>
            )}
        </View>
    );
});

export default function MessageList({
    messages,
    vibe,
    onReply,
    onEdit,
    onDelete,
    onReact,
    onMarkRead,
}: MessageListProps) {
    const { user } = useAuth();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const flatListRef = useRef<any>(null);

    const handleLongPress = useCallback((message: Message, isMe: boolean) => {
        // ... action sheet logic same ...
        const options: string[] = ['Reply', 'Copy Text'];
        const destructiveIndex: number[] = [];

        if (isMe && message.type === 'text') {
            options.push('Edit');
        }
        if (isMe) {
            options.push('Delete');
            destructiveIndex.push(options.length - 1);
        }
        options.push('Cancel');

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex: destructiveIndex[0],
                    cancelButtonIndex: options.length - 1,
                },
                (buttonIndex) => {
                    const action = options[buttonIndex];
                    switch (action) {
                        case 'Reply':
                            onReply?.(message);
                            break;
                        case 'Copy Text':
                            Clipboard.setStringAsync(message.content);
                            break;
                        case 'Edit':
                            onEdit?.(message);
                            break;
                        case 'Delete':
                            Alert.alert(
                                'Delete Message',
                                'Are you sure you want to delete this message?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(message.id) },
                                ]
                            );
                            break;
                    }
                }
            );
        } else {
            // Android fallback
            Alert.alert(
                'Message Options',
                '',
                [
                    { text: 'Reply', onPress: () => onReply?.(message) },
                    { text: 'Copy Text', onPress: () => Clipboard.setStringAsync(message.content) },
                    ...(isMe && message.type === 'text' ? [{ text: 'Edit', onPress: () => onEdit?.(message) }] : []),
                    ...(isMe ? [{
                        text: 'Delete',
                        style: 'destructive' as const,
                        onPress: () => onDelete?.(message.id)
                    }] : []),
                    { text: 'Cancel', style: 'cancel' as const },
                ]
            );
        }
    }, [onReply, onEdit, onDelete]);

    // Auto-mark messages as read
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ item: Message }> }) => {
        viewableItems.forEach(({ item }) => {
            if (item.sender.id !== user?.id && !item.readAt) {
                onMarkRead?.(item.id);
            }
        });
    }, [user?.id, onMarkRead]);

    // Stable renderItem callback
    const renderItem = useCallback(({ item }: { item: Message }) => {
        const isMe = item.sender.id === user?.id;
        return (
            <MessageItem
                message={item}
                isMe={isMe ?? false}
                userId={user?.id ?? 0}
                vibe={vibe}
                onImagePress={setSelectedImage}
                onLongPress={() => handleLongPress(item, isMe ?? false)}
                onReact={(emoji) => onReact?.(item.id, emoji)}
            />
        );
    }, [user?.id, handleLongPress, onReact, vibe]);

    const keyExtractor = useCallback((item: Message) => item.id.toString(), []);

    if (!user) return null;

    return (
        <>
            <FlashList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                estimatedItemSize={120}
                contentContainerStyle={LIST_CONTENT_STYLE}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEWABILITY_CONFIG}
                maintainVisibleContentPosition={{
                    autoscrollToBottomThreshold: 0.2,
                    startRenderingFromBottom: true,
                }}
            />

            {/* Image Viewer Modal */}
            <ImageViewer
                visible={!!selectedImage}
                imageUri={selectedImage || ''}
                onClose={() => setSelectedImage(null)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },
    messageContainer: {
        marginBottom: Spacing.M,
        paddingHorizontal: Spacing.M,
    },
    alignRight: {
        alignItems: 'flex-end',
    },
    alignLeft: {
        alignItems: 'flex-start',
    },
    messageRow: {
        flexDirection: 'row',
    },
    rowRight: {
        justifyContent: 'flex-end',
    },
    rowLeft: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: Spacing.S,
        backgroundColor: Colors.SURFACE1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarPlaceholderDeleted: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: Spacing.S,
        backgroundColor: Colors.SURFACE0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
    },
    bubbleBase: {
        borderRadius: Radius.CARD,
        padding: Spacing.M,
        maxWidth: '80%',
    },
    bubbleMe: {
        backgroundColor: Colors.LAVENDER,
        borderTopRightRadius: 2,
    },
    bubbleOther: {
        backgroundColor: Colors.GLASS.ROW_BG,
        borderTopLeftRadius: 2,
    },
    senderName: {
        color: Colors.LAVENDER,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    mediaPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.MANTLE,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4,
    },
    timestamp: {
        fontSize: 10,
        color: Colors.OVERLAY1,
    },
    editedText: {
        fontSize: 10,
        color: Colors.OVERLAY0,
    },
    readStatus: {
        fontSize: 10,
    },
    replyContext: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        opacity: 0.8,
    },
    replyLine: {
        width: 2,
        height: 16,
        backgroundColor: Colors.OVERLAY0,
        marginRight: Spacing.XS,
    },
    reactionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    reactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.PILL,
    },
    quickReactionContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        padding: 8,
        backgroundColor: Colors.MANTLE,
        borderRadius: Radius.PILL,
    },
    quickReactionBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaBubble: {
        // Transparent — no colored border around media
        padding: 0,
        backgroundColor: 'transparent',
        maxWidth: '80%',
    },
    mediaMetaRow: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.PILL,
    },
    mediaText: {
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
