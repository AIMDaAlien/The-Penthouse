import { View, Text, FlatList, Image } from 'react-native';
import { Message, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

interface MessageListProps {
  messages: Message[];
}

function MessageItem({ message, isMe }: { message: Message; isMe: boolean }) {
  const showAvatar = !isMe;

  return (
    <View className={`flex-row mb-4 px-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <View className="w-8 h-8 rounded-full bg-zinc-700 mr-2 items-center justify-center overflow-hidden">
            {message.sender.avatarUrl ? (
                <Image source={{ uri: message.sender.avatarUrl }} className="w-full h-full" />
            ) : (
                <Text className="text-zinc-400 text-xs font-bold">{message.sender.username.substring(0, 2).toUpperCase()}</Text>
            )}
        </View>
      )}

      <View className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-indigo-600 rounded-tr-none' : 'bg-zinc-800 rounded-tl-none'}`}>
        {!isMe && (
            <Text className="text-indigo-400 font-bold text-xs mb-1">{message.sender.displayName || message.sender.username}</Text>
        )}
        
        {message.type === 'image' || message.type === 'gif' ? (
            <Image 
                source={{ uri: message.content }} 
                className="w-48 h-48 rounded-lg bg-black/20" 
                resizeMode="cover" 
            />
        ) : (
            <Text className="text-white text-base leading-5">{message.content}</Text>
        )}
        
        <Text className="text-zinc-500 text-[10px] self-end mt-1">
            {format(new Date(message.createdAt), 'h:mm a')}
        </Text>
      </View>
    </View>
  );
}

export default function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <FlatList
      data={[...messages].reverse()} // Invert for chat
      renderItem={({ item }) => <MessageItem message={item} isMe={item.sender.id === user.id} />}
      keyExtractor={item => item.id.toString()}
      inverted
      className="flex-1"
      contentContainerStyle={{ paddingVertical: 16 }}
    />
  );
}
