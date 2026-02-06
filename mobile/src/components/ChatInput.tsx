/**
 * ChatInput - Discord-style message input bar
 * 
 * A styled wrapper that presents the input with:
 * - Translucent background
 * - Media action buttons
 * - Send button with glow
 * 
 * This component wraps or extends MessageInput with Discord styling.
 */

import React, { useState, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor 
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, SpringConfig, Glows } from '../designsystem';

interface ChatInputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Send message callback */
  onSend: (text: string) => void;
  /** Open GIF picker */
  onGifPress?: () => void;
  /** Open emoji picker */
  onEmojiPress?: () => void;
  /** Open attachment picker */
  onAttachPress?: () => void;
  /** Open voice recorder */
  onVoicePress?: () => void;
  /** Is currently sending */
  isSending?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function ChatInput({
  placeholder = 'Message...',
  onSend,
  onGifPress,
  onEmojiPress,
  onAttachPress,
  onVoicePress,
  isSending = false,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);
  
  const canSend = text.trim().length > 0 && !isSending && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
    opacity: canSend ? 1 : 0.5,
  }));

  return (
    <View style={styles.container}>
      {/* Blur background */}
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Top border */}
      <View style={styles.topBorder} />

      <View style={styles.inputRow}>
        {/* Attachment button */}
        {onAttachPress && (
          <Pressable 
            onPress={onAttachPress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={Colors.INTERACTIVE_NORMAL} 
            />
          </Pressable>
        )}

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={Colors.TEXT_MUTED}
            style={styles.input}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
          />

          {/* Inline action buttons */}
          <View style={styles.inlineActions}>
            {onGifPress && (
              <Pressable onPress={onGifPress} style={styles.inlineBtn}>
                <Ionicons name="image" size={20} color={Colors.INTERACTIVE_NORMAL} />
              </Pressable>
            )}
            {onEmojiPress && (
              <Pressable onPress={onEmojiPress} style={styles.inlineBtn}>
                <Ionicons name="happy" size={20} color={Colors.INTERACTIVE_NORMAL} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Send / Voice button */}
        {canSend ? (
          <Pressable
            onPress={handleSend}
            onPressIn={() => { sendScale.value = withSpring(0.9, SpringConfig.MICRO); }}
            onPressOut={() => { sendScale.value = withSpring(1, SpringConfig.MICRO); }}
            style={styles.sendButton}
          >
            <Animated.View style={[styles.sendButtonInner, sendButtonStyle]}>
              <Ionicons name="send" size={18} color={Colors.TERTIARY} />
            </Animated.View>
          </Pressable>
        ) : (
          onVoicePress && (
            <Pressable onPress={onVoicePress} style={styles.iconButton}>
              <Ionicons name="mic" size={24} color={Colors.INTERACTIVE_NORMAL} />
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.EFFECTS.PANEL_BG,
    paddingHorizontal: Spacing.SM,
    paddingVertical: Spacing.S,
    position: 'relative',
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.EFFECTS.PANEL_BORDER,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.EFFECTS.INPUT_BG,
    borderRadius: Radius.L,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.SM,
    paddingVertical: Platform.OS === 'ios' ? Spacing.S : 0,
    marginHorizontal: Spacing.XS,
  },
  input: {
    flex: 1,
    color: Colors.TEXT_NORMAL,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'android' ? Spacing.S : 0,
  },
  inlineActions: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.XS,
  },
  inlineBtn: {
    padding: Spacing.XS,
    marginLeft: Spacing.XS,
  },
  sendButton: {
    marginLeft: Spacing.XS,
  },
  sendButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Glows.ACCENT,
  },
});

export default ChatInput;
