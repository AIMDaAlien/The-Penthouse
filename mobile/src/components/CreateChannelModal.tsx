import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Glows } from '../designsystem';
import { createChannel } from '../services/api';

interface CreateChannelModalProps {
  visible: boolean;
  serverId: number;
  onClose: () => void;
  onCreated?: () => void;
}

type ChannelType = 'text' | 'voice';
type ChannelVibe = 'default' | 'chill' | 'hype' | 'serious';

export default function CreateChannelModal({ visible, serverId, onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [vibe, setVibe] = useState<ChannelVibe>('default');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    try {
      setCreating(true);
      await createChannel(serverId, name.trim(), type, vibe);
      Alert.alert('Success', 'Channel created!');
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      Alert.alert('Error', 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setType('text');
    setVibe('default');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <Animated.View 
              entering={SlideInDown.springify().damping(18).stiffness(90)}
              style={styles.modal}
            >
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.modalBackground} />
              
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.title}>Create Channel</Text>
                  <Pressable onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={Colors.TEXT_MUTED} />
                  </Pressable>
                </View>

                {/* Channel Type */}
                <Text style={styles.label}>CHANNEL TYPE</Text>
                <View style={styles.typeContainer}>
                  <TypeOption 
                    label="Text" 
                    icon="chatbubble-ellipses" 
                    isSelected={type === 'text'} 
                    onSelect={() => setType('text')} 
                  />
                  <TypeOption 
                    label="Voice" 
                    icon="mic" 
                    isSelected={type === 'voice'} 
                    onSelect={() => setType('voice')} 
                  />
                </View>

                {/* Channel Name */}
                <Text style={styles.label}>CHANNEL NAME</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name={type === 'text' ? 'at' : 'volume-medium'} 
                    size={20} 
                    color={Colors.TEXT_MUTED} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="new-channel"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Channel Vibe */}
                <Text style={styles.label}>CHANNEL VIBE ✨</Text>
                <View style={styles.vibeContainer}>
                  {['default', 'chill', 'hype', 'serious'].map((v) => (
                    <VibeOption 
                      key={v} 
                      vibe={v as ChannelVibe} 
                      isSelected={vibe === v} 
                      onSelect={() => setVibe(v as ChannelVibe)} 
                    />
                  ))}
                </View>

                <Pressable
                  onPress={handleCreate}
                  disabled={creating || !name.trim()}
                  style={[
                    styles.createButton,
                    (!name.trim() || creating) && styles.createButtonDisabled
                  ]}
                >
                  {creating ? (
                    <ActivityIndicator color={Colors.TEXT_NORMAL} />
                  ) : (
                    <Text style={styles.createButtonText}>Create Channel</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function TypeOption({ label, icon, isSelected, onSelect }: any) {
  return (
    <Pressable 
      onPress={onSelect}
      style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={isSelected ? Colors.TEXT_NORMAL : Colors.TEXT_MUTED} 
      />
      <View style={styles.typeInfo}>
        <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{label}</Text>
      </View>
      {isSelected && (
        <Ionicons name="radio-button-on" size={24} color={Colors.ACCENT} />
      )}
      {!isSelected && (
        <Ionicons name="radio-button-off" size={24} color={Colors.TEXT_MUTED} />
      )}
    </Pressable>
  );
}

function VibeOption({ vibe, isSelected, onSelect }: any) {
  const getVibeColor = (v: string) => {
    switch(v) {
      case 'chill': return '#6bf'; // Cyan
      case 'hype': return '#f0f'; // Magenta
      case 'serious': return '#888'; // Grey
      default: return Colors.ACCENT;
    }
  };

  return (
    <Pressable 
      onPress={onSelect}
      style={[
        styles.vibeOption, 
        isSelected && { borderColor: getVibeColor(vibe), backgroundColor: getVibeColor(vibe) + '20' }
      ]}
    >
      <Text style={[
        styles.vibeText, 
        isSelected && { color: getVibeColor(vibe), fontWeight: 'bold' }
      ]}>
        {vibe.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingHorizontal: Spacing.M,
    marginBottom: Spacing.M, // Lift slightly
  },
  modal: {
    borderRadius: Radius.L,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.EFFECTS.PANEL_BG,
  },
  content: {
    padding: Spacing.L,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.L,
  },
  title: {
    ...Typography.H2,
    color: Colors.TEXT_NORMAL,
  },
  closeButton: {
    padding: Spacing.XS,
  },
  label: {
    ...Typography.OVERLINE,
    color: Colors.TEXT_MUTED,
    marginBottom: Spacing.XS,
    marginTop: Spacing.M,
  },
  typeContainer: {
    gap: Spacing.S,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.M,
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.M,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    backgroundColor: Colors.SURFACE_HOVER,
    borderColor: Colors.ACCENT,
  },
  typeInfo: {
    flex: 1,
    marginLeft: Spacing.M,
  },
  typeLabel: {
    ...Typography.BODY,
    fontWeight: '600',
    color: Colors.TEXT_MUTED,
  },
  typeLabelSelected: {
    color: Colors.TEXT_NORMAL,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.EFFECTS.INPUT_BG,
    borderRadius: Radius.M,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
    paddingHorizontal: Spacing.M,
  },
  inputIcon: {
    marginRight: Spacing.S,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.M,
    color: Colors.TEXT_NORMAL,
    fontSize: 16,
  },
  vibeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.S,
  },
  vibeOption: {
    paddingHorizontal: Spacing.M,
    paddingVertical: Spacing.S,
    backgroundColor: Colors.SURFACE,
    borderRadius: Radius.PILL,
    borderWidth: 1,
    borderColor: Colors.EFFECTS.PANEL_BORDER,
  },
  vibeText: {
    ...Typography.MICRO,
    color: Colors.TEXT_MUTED,
  },
  createButton: {
    backgroundColor: Colors.ACCENT,
    borderRadius: Radius.M,
    paddingVertical: Spacing.M,
    alignItems: 'center',
    marginTop: Spacing.XL,
    ...Glows.SELECTED,
  },
  createButtonDisabled: {
    backgroundColor: Colors.SURFACE,
    opacity: 0.5,
    shadowOpacity: 0,
  },
  createButtonText: {
    ...Typography.BODY,
    fontWeight: '700',
    color: Colors.TEXT_NORMAL,
  },
});
