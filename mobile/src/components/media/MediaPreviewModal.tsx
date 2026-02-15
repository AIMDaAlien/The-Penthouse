import React, { useState } from 'react';
import { View, Image, StyleSheet, Modal, Pressable, Dimensions, TextInput, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../../designsystem/Colors';
import { Radius, Spacing } from '../../designsystem/Spacing';
import { Typography } from '../../designsystem/Typography';
import { Shadows } from '../../designsystem/Shadows';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MediaPreviewModalProps {
    visible: boolean;
    file: { uri: string; type: string; name?: string } | null;
    onSend: (caption?: string) => void;
    onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MediaPreviewModal({ visible, file, onSend, onClose }: MediaPreviewModalProps) {
    const [caption, setCaption] = useState('');

    if (!file) return null;

    const handleSend = () => {
        onSend(caption);
        setCaption('');
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Backdrop Blur */}
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </Pressable>
                        <Text style={styles.headerTitle}>Preview</Text>
                        <View style={{ width: 40 }} /> 
                    </View>

                    {/* Media Content */}
                    <View style={styles.mediaContainer}>
                        {file.type === 'video' ? (
                            <View style={styles.placeholder}>
                                <Ionicons name="videocam" size={64} color={Colors.OVERLAY1} />
                                <Text style={[Typography.BODY, { color: Colors.OVERLAY1, marginTop: 16 }]}>Video Preview</Text>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: file.uri }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        )}
                    </View>

                    {/* Footer / Caption */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.footer}
                    >
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add a caption..."
                                placeholderTextColor={Colors.OVERLAY1}
                                value={caption}
                                onChangeText={setCaption}
                                multiline
                            />
                            <Pressable 
                                onPress={handleSend}
                                style={({ pressed }) => [
                                    styles.sendBtn,
                                    pressed && { transform: [{ scale: 0.95 }] }
                                ]}
                            >
                                <Ionicons name="send" size={20} color={Colors.CRUST} />
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.M,
        paddingVertical: Spacing.S,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: Radius.CIRCLE,
    },
    headerTitle: {
        ...Typography.H4,
        color: '#fff',
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.M,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: Spacing.M,
        paddingBottom: Platform.OS === 'ios' ? Spacing.M : Spacing.L,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: Colors.SURFACE0,
        borderRadius: Radius.L,
        padding: Spacing.S,
    },
    input: {
        flex: 1,
        color: Colors.TEXT,
        ...Typography.BODY,
        paddingHorizontal: Spacing.S,
        paddingVertical: Spacing.S,
        maxHeight: 100,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: Radius.CIRCLE,
        backgroundColor: Colors.LAVENDER,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.GLOW,
    },
});
