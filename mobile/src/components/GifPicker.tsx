import { View, Text, Modal, TextInput, FlatList, Image, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GIPHY_API_KEY = 'H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_SIZE = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

interface GifPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (gifUrl: string, metadata?: { gifId?: string; title?: string }) => void;
}

interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_height: {
            url: string;
            width: string;
            height: string;
        };
        original: {
            url: string;
        };
        preview_gif: {
            url: string;
        };
    };
}

export default function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch trending GIFs on mount
    useEffect(() => {
        if (visible && gifs.length === 0) {
            fetchTrending();
        }
    }, [visible]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            fetchTrending();
            return;
        }

        const timeout = setTimeout(() => {
            searchGifs(searchQuery);
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const fetchTrending = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=30&rating=pg-13`
            );
            const { data } = await response.json();
            setGifs(data);
        } catch (err) {
            console.error('Failed to fetch trending GIFs:', err);
            setError('Failed to load GIFs');
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=30&rating=pg-13`
            );
            const { data } = await response.json();
            setGifs(data);
        } catch (err) {
            console.error('Failed to search GIFs:', err);
            setError('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = useCallback((gif: GiphyGif) => {
        onSelect(gif.images.original.url, {
            gifId: gif.id,
            title: gif.title,
        });
        onClose();
        setSearchQuery('');
    }, [onSelect, onClose]);

    const handleClose = () => {
        onClose();
        setSearchQuery('');
    };

    const renderGif = ({ item }: { item: GiphyGif }) => (
        <Pressable
            onPress={() => handleSelect(item)}
            className="m-1"
            style={{ width: GIF_SIZE, height: GIF_SIZE }}
        >
            <Image
                source={{ uri: item.images.fixed_height.url }}
                style={{ width: '100%', height: '100%', borderRadius: 8 }}
                resizeMode="cover"
            />
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView className="flex-1 bg-zinc-900">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <Text className="text-white text-lg font-bold">GIFs</Text>
                    <Pressable onPress={handleClose} className="p-2">
                        <Ionicons name="close" size={24} color="#fff" />
                    </Pressable>
                </View>

                {/* Search Input */}
                <View className="px-4 py-3">
                    <View className="flex-row items-center bg-zinc-800 rounded-xl px-4 py-2">
                        <Ionicons name="search" size={20} color="#71717a" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search GIPHY..."
                            placeholderTextColor="#71717a"
                            className="flex-1 ml-2 text-white text-base"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#71717a" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* GIF Grid */}
                {loading && gifs.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#cba6f7" />
                    </View>
                ) : error ? (
                    <View className="flex-1 items-center justify-center">
                        <Ionicons name="cloud-offline" size={48} color="#71717a" />
                        <Text className="text-zinc-500 mt-2">{error}</Text>
                        <Pressable onPress={fetchTrending} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg">
                            <Text className="text-white font-semibold">Retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={gifs}
                        renderItem={renderGif}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        contentContainerStyle={{ padding: 8 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20">
                                <Text className="text-zinc-500">No GIFs found</Text>
                            </View>
                        }
                    />
                )}

                {/* Powered by GIPHY */}
                <View className="px-4 py-2 items-center border-t border-zinc-800">
                    <Text className="text-zinc-600 text-xs">Powered by GIPHY</Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
