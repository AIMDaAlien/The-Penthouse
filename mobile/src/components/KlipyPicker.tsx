import { View, Text, Modal, TextInput, FlatList, Image, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const KLIPY_API_KEY = 'tc14Tax6viWl5Cenp2rpn9Dj5WbIA4VPTHF0skyutWomHQUfNSSxn4bInYvUaLc0';
const KLIPY_BASE_URL = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}`;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_SIZE = (SCREEN_WIDTH - 48) / 2;

interface KlipyPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (gifUrl: string, metadata?: { title?: string }) => void;
}

interface KlipyGif {
    id: string;
    title?: string;
    files?: {
        gif?: { url: string };
        webp?: { url: string };
        mp4?: { url: string };
        preview?: { url: string };
    };
    // Alternative structure
    url?: string;
    preview_url?: string;
}

// Extract the best available URL from Klipy response
function extractGifUrl(gif: KlipyGif): string | null {
    // Try different URL sources
    if (gif.files?.gif?.url) return gif.files.gif.url;
    if (gif.files?.webp?.url) return gif.files.webp.url;
    if (gif.url) return gif.url;
    if (gif.files?.preview?.url) return gif.files.preview.url;
    if (gif.preview_url) return gif.preview_url;
    return null;
}

function extractPreviewUrl(gif: KlipyGif): string | null {
    if (gif.files?.preview?.url) return gif.files.preview.url;
    if (gif.preview_url) return gif.preview_url;
    return extractGifUrl(gif);
}

export default function KlipyPicker({ visible, onClose, onSelect }: KlipyPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState<KlipyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && gifs.length === 0) {
            fetchTrending();
        }
    }, [visible]);

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
            const response = await fetch(`${KLIPY_BASE_URL}/gifs/trending?per_page=30&page=1`);
            const json = await response.json();
            console.log('Klipy trending response:', JSON.stringify(json).slice(0, 500));
            // Klipy returns: { result: true, data: { data: [...], current_page, per_page, has_next } }
            const results = json?.data?.data || json?.data || json?.results || [];
            setGifs(Array.isArray(results) ? results : []);
        } catch (err) {
            console.error('Failed to fetch Klipy trending:', err);
            setError('Failed to load clips');
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${KLIPY_BASE_URL}/gifs/search?q=${encodeURIComponent(query)}&per_page=30&page=1`);
            const json = await response.json();
            console.log('Klipy search response:', JSON.stringify(json).slice(0, 500));
            // Klipy returns: { result: true, data: { data: [...], current_page, per_page, has_next } }
            const results = json?.data?.data || json?.data || json?.results || [];
            setGifs(Array.isArray(results) ? results : []);
        } catch (err) {
            console.error('Failed to search Klipy:', err);
            setError('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = useCallback((gif: KlipyGif) => {
        const url = extractGifUrl(gif);
        if (url) {
            onSelect(url, { title: gif.title });
            onClose();
            setSearchQuery('');
        }
    }, [onSelect, onClose]);

    const handleClose = () => {
        onClose();
        setSearchQuery('');
    };

    const renderGif = ({ item }: { item: KlipyGif }) => {
        const previewUrl = extractPreviewUrl(item);
        if (!previewUrl) return null;

        return (
            <Pressable
                onPress={() => handleSelect(item)}
                className="m-1"
                style={{ width: GIF_SIZE, height: GIF_SIZE }}
            >
                <Image
                    source={{ uri: previewUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                    resizeMode="cover"
                />
            </Pressable>
        );
    };

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
                    <Text className="text-white text-lg font-bold">Klipy</Text>
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
                            placeholder="Search Klipy..."
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
                        keyExtractor={(item, index) => item.id || index.toString()}
                        numColumns={2}
                        contentContainerStyle={{ padding: 8 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20">
                                <Text className="text-zinc-500">No clips found</Text>
                            </View>
                        }
                    />
                )}

                {/* Powered by Klipy */}
                <View className="px-4 py-2 items-center border-t border-zinc-800">
                    <Text className="text-zinc-600 text-xs">Powered by Klipy</Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
