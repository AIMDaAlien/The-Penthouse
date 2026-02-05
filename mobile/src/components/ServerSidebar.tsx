import { View, Text, TouchableOpacity, Image, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useServerContext } from '../context/ServerContext';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import JoinServerModal from './JoinServerModal';
import { getMediaUrl } from '../services/api';

export default function ServerSidebar(props: DrawerContentComponentProps) {
  const { servers, selectedServerId, handleServerSelect, loadServerDetails, handleCreateServer, loadServers } = useServerContext();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [newServerName, setNewServerName] = useState('');

  const createAndClose = async () => {
    if (!newServerName.trim()) {
      Alert.alert('Error', 'Server name is required');
      return;
    }
    await handleCreateServer(newServerName);
    setNewServerName('');
    setIsCreateModalVisible(false);
  };

  const handleSelect = async (serverId: number) => {
    // If already selected, just close drawer
    if (serverId === selectedServerId && serverId !== 0) {
      props.navigation.closeDrawer();
      return;
    }

    try {
      await handleServerSelect(serverId);
      if (serverId !== 0) {
        await loadServerDetails(serverId);
      }
      props.navigation.closeDrawer();
    } catch (e) {
      console.error("Selection error:", e);
      Alert.alert("Error", "Failed to switch server. Please check your connection.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = item.id === selectedServerId;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item.id)}
        // Using inline styles for shadow to avoid NativeWind race condition bug
        // See: https://github.com/nativewind/nativewind/issues/1557
        style={[
          styles.serverButton,
          isSelected && styles.serverButtonSelected,
        ]}
      >
        {item.iconUrl ? (
          <Image source={{ uri: getMediaUrl(item.iconUrl) }} style={styles.serverIcon} />
        ) : (
          <Text style={[styles.serverInitials, isSelected && styles.serverInitialsSelected]}>
            {item.name.substring(0, 2).toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left']}>
      {/* DMs Button */}
      <TouchableOpacity
        onPress={() => handleSelect(0)}
        style={[
          styles.dmButton,
          selectedServerId === 0 && styles.dmButtonSelected,
        ]}
      >
        <Ionicons
          name="chatbubbles"
          size={24}
          color={selectedServerId === 0 ? '#fff' : '#a1a1aa'}
        />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Server List */}
      <FlatList
        data={servers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.serverList}
      />

      {/* Join Server Button */}
      <TouchableOpacity
        onPress={() => setIsJoinModalVisible(true)}
        style={styles.joinButton}
      >
        <Ionicons name="enter-outline" size={24} color="#3b82f6" />
      </TouchableOpacity>

      {/* Create Server Button */}
      <TouchableOpacity
        onPress={() => setIsCreateModalVisible(true)}
        style={styles.addButton}
      >
        <Ionicons name="add" size={28} color="#22c55e" />
      </TouchableOpacity>

      {/* Join Server Modal */}
      <JoinServerModal
        visible={isJoinModalVisible}
        onClose={() => setIsJoinModalVisible(false)}
        onJoined={async (serverId) => {
          await loadServers();
          await handleServerSelect(serverId);
          props.navigation.closeDrawer();
        }}
      />

      {/* Create Server Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Server</Text>
            <TextInput
              value={newServerName}
              onChangeText={setNewServerName}
              placeholder="Server name"
              placeholderTextColor="#71717a"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createAndClose}
                style={styles.createButton}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dmButtonSelected: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    // Shadow using inline styles (safe)
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: '#3f3f46',
    borderRadius: 1,
    marginVertical: 8,
  },
  serverList: {
    alignItems: 'center',
  },
  serverButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  serverButtonSelected: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    // Shadow using inline styles (safe)
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  serverIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  serverInitials: {
    fontWeight: '900',
    fontSize: 16,
    color: '#a1a1aa',
  },
  serverInitialsSelected: {
    color: '#ffffff',
  },
  joinButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#3f3f46',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#a1a1aa',
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
