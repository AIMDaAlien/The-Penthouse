import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useServerContext } from '../../src/context/ServerContext';
import { useChats } from '../../src/hooks/useChats';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';

export default function ChannelList() {
  const { 
    selectedServerId, 
    serverChannels, 
    servers, 
    loadServerDetails,
    loadServers 
  } = useServerContext();
  
  const { user } = useAuth();
  const { chats, loadChats, selectChat } = useChats(user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadServers();
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedServerId && selectedServerId > 0) {
      loadServerDetails(selectedServerId);
    }
  }, [selectedServerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadServers(), loadChats(), selectedServerId ? loadServerDetails(selectedServerId) : Promise.resolve()]);
    setRefreshing(false);
  };

  const handleChannelPress = (channelId: number, name: string) => {
    // In our backend, a Channel is just a Chat with type 'group'/'channel' and a serverId
    // We need to find the chat ID corresponding to this channel.
    // Wait, useServers returns 'Channel[]' which has 'id'. Is this the Chat ID?
    // Let's check web/src/types.ts -> Channel { id: number ... }
    // Yes, typically channels are chats.
    router.push(`/chat/${channelId}?name=${encodeURIComponent(name)}`);
  };

  const handleChatPress = (chat: any) => {
    const name = chat.name || chat.participants?.find((p: any) => p.id !== user?.id)?.username || 'Chat';
    router.push(`/chat/${chat.id}?name=${encodeURIComponent(name)}`);
  };

  const selectedServer = servers.find(s => s.id === selectedServerId);

  // Render DMs if no server selected
  if (!selectedServerId) {
    return (
      <View className="flex-1 bg-[#09090b]">
        <View className="p-4 bg-[#09090b] border-b border-zinc-800">
            <Text className="text-xl font-black text-white tracking-tight">DIRECT MESSAGES</Text>
        </View>
        <FlatList
          data={chats.filter(c => !c.serverId)} // Only DMs (no serverId)
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          renderItem={({ item }) => {
             const otherUser = item.participants?.find((p: any) => p.id !== user?.id);
             const name = item.name || otherUser?.displayName || otherUser?.username || 'Unknown';
             return (
              <TouchableOpacity 
                onPress={() => handleChatPress(item)}
                className="p-4 border-b border-zinc-800 flex-row items-center gap-3"
              >
                <View className="w-12 h-12 rounded-2xl bg-[#cba6f7]/10 items-center justify-center border border-[#cba6f7]/20" style={{ borderTopLeftRadius: 16, borderBottomRightRadius: 16, borderTopRightRadius: 4, borderBottomLeftRadius: 4 }}>
                    {otherUser?.avatarUrl ? (
                         <View /> // Todo Image
                    ) : (
                         <Text className="text-[#cba6f7] font-black text-lg">{name.substring(0, 1).toUpperCase()}</Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-white font-medium">{name}</Text>
                    <Text className="text-zinc-500 text-sm" numberOfLines={1}>{item.lastMessage || 'No messages'}</Text>
                </View>
              </TouchableOpacity>
             );
          }}
          ListEmptyComponent={
            <View className="mt-10 items-center">
                <Text className="text-zinc-500">No conversations yet</Text>
            </View>
          }
        />
      </View>
    );
  }

  // Render Server Channels
  return (
    <View className="flex-1 bg-[#09090b]">
        <View className="p-4 bg-[#09090b] border-b border-zinc-800">
            <Text className="text-xl font-black text-white tracking-tight uppercase">{selectedServer?.name || 'Server'}</Text>
        </View>
        
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            className="flex-1"
        >
            <View className="p-2">
                <Text className="text-zinc-500 text-xs font-bold uppercase ml-2 mb-2 mt-2">Text Channels</Text>
                {serverChannels.filter(c => c.type !== 'voice').map(channel => (
                    <TouchableOpacity
                        key={channel.id}
                        onPress={() => handleChannelPress(channel.id, channel.name)}
                        className="flex-row items-center p-2 rounded-lg active:bg-zinc-800 ml-1"
                    >
                        <Ionicons name="grid" size={20} color="#a1a1aa" />
                        <Text className="text-zinc-300 font-medium ml-2">{channel.name}</Text>
                    </TouchableOpacity>
                ))}

                {/* Voice Channels Placeholder */}
                <Text className="text-zinc-500 text-xs font-bold uppercase ml-2 mb-2 mt-4">Voice Channels</Text>
                 {serverChannels.filter(c => c.type === 'voice').map(channel => (
                    <TouchableOpacity
                        key={channel.id}
                        className="flex-row items-center p-2 rounded-lg active:bg-zinc-800 ml-1 opacity-50"
                        // onPress={() => Alert.alert('Voice not supported on mobile yet')}
                    >
                        <Ionicons name="volume-medium" size={20} color="#a1a1aa" />
                        <Text className="text-zinc-300 font-medium ml-2">{channel.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    </View>
  );
}
