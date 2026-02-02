import { View, Text, TouchableOpacity, Image, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { useServerContext } from '../context/ServerContext';
import { useRouter } from 'expo-router';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ServerSidebar(props: DrawerContentComponentProps) {
  const { servers, selectedServerId, handleServerSelect, loadServerDetails, loadServers, handleCreateServer } = useServerContext();
  const router = useRouter();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
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
    handleServerSelect(serverId);
    await loadServerDetails(serverId);
    props.navigation.closeDrawer();
    // In strict nested navigation, usually selecting a server might navigate to a specific screen
    // For now, we assume the index screen updates based on selectedServerId
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = item.id === selectedServerId;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item.id)}
        className={`w-12 h-12 rounded-full mb-3 items-center justify-center ${isSelected ? 'bg-indigo-600' : 'bg-zinc-700'}`}
      >
        {item.iconUrl ? (
          <Image source={{ uri: item.iconUrl }} className="w-full h-full rounded-full" />
        ) : (
          <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
            {item.name.substring(0, 2).toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-900 border-r border-zinc-800" edges={['top', 'bottom', 'left']}>
      <View className="flex-1 items-center py-4">
        {/* Home / Me */}
        <TouchableOpacity
          onPress={() => handleSelect(0)} // 0 or null for "Home" (DMs)
          className={`w-12 h-12 rounded-2xl mb-4 items-center justify-center ${!selectedServerId ? 'bg-indigo-500' : 'bg-zinc-700'}`}
        >
          <Ionicons name="chatbubbles" size={24} color="white" />
        </TouchableOpacity>

        <View className="w-8 h-[2px] bg-zinc-800 mb-4" />

        <FlatList
          data={servers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center' }}
        />

        <TouchableOpacity
          className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center mt-4 border border-zinc-700 border-dashed"
          onPress={() => {
              setIsCreateModalVisible(true);
              // props.navigation.closeDrawer(); // Don't close, let them create
          }}
        >
          <Ionicons name="add" size={24} color="#a1a1aa" />
        </TouchableOpacity>

        <Modal
          visible={isCreateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCreateModalVisible(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center p-4">
             <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="w-full">
                <View className="bg-[#09090b] w-full p-6 rounded-3xl border border-[#cba6f7]/20 shadow-2xl">
                    <Text className="text-white text-2xl font-black text-center mb-6 tracking-tight">CREATE SERVER</Text>
                    
                    <TextInput 
                        placeholder="Server Name"
                        placeholderTextColor="#71717a"
                        value={newServerName}
                        onChangeText={setNewServerName}
                        className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-6 font-bold"
                    />

                    <View className="gap-3">
                        <TouchableOpacity 
                            onPress={createAndClose}
                            className="bg-[#cba6f7] p-4 rounded-xl items-center shadow-lg shadow-[#cba6f7]/20"
                        >
                            <Text className="text-[#09090b] font-black tracking-widest">CREATE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setIsCreateModalVisible(false)}
                            className="p-4 items-center"
                        >
                            <Text className="text-zinc-500 font-bold uppercase tracking-widest">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
             </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
