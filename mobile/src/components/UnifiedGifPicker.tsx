import { View, Text, Modal, TextInput, FlatList, Image, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const GIPHY_API_KEY = 'H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN';
const KLIPY_API_KEY = 'tc14Tax6viWl5Cenp2rpn9Dj5WbIA4VPTHF0skyutWomHQUfNSSxn4bInYvUaLc0';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_SIZE = (SCREEN_WIDTH - 48) / 2;

type GifSource = 'giphy' | 'klipy';

interface UnifiedGifPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (gifUrl: string, metadata?: { source?: string; title?: string; width?: number; height?: number }) => void;
}

interface GifItem {
    id: string;
    url: string;
    previewUrl: string;
    title?: string;
    width?: number;
    height?: number;
    source: GifSource;
}

// Extract URLs from Klipy response
function extractKlipyUrls(gif: any): { url: string; previewUrl: string } | null {
    const url = gif?.files?.gif?.url || gif?.files?.webp?.url || gif?.files?.mp4?.url || gif?.url;
    const previewUrl = gif?.files?.preview?.url || gif?.preview_url || url;
    if (!url) return null;
    return { url, previewUrl };
}

export default function UnifiedGifPicker({ visible, onClose, onSelect }: UnifiedGifPickerProps) {
    const [activeTab, setActiveTab] = useState<GifSource>('giphy');
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState<GifItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch on mount or tab change
    useEffect(() => {
        if (visible) {
            fetchTrending();
        }
    }, [visible, activeTab]);

    // Debounced search
    useEffect(() => {
        if (!visible) return;

        if (!searchQuery.trim()) {
            fetchTrending();
            return;
        }

        const timeout = setTimeout(() => {
            searchGifs(searchQuery);
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, visible, activeTab]);

    const fetchGiphy = async (endpoint: 'trending' | 'search', query?: string) => {
        const url = endpoint === 'trending'
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=30&rating=pg-13`
            : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query || '')}&limit=30&rating=pg-13`;

        const response = await fetch(url);
        const { data } = await response.json();
        return data.map((g: any) => ({
            id: g.id,
            url: g.images.original.url,
            previewUrl: g.images.fixed_height_small.url,
            title: g.title,
            width: parseInt(g.images.original.width, 10) || undefined,
            height: parseInt(g.images.original.height, 10) || undefined,
            source: 'giphy' as GifSource,
        }));
    };

    const fetchKlipy = async (endpoint: 'trending' | 'search', query?: string) => {
        const baseUrl = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}`;
        const url = endpoint === 'trending'
            ? `${baseUrl}/gifs/trending?per_page=30&page=1`
            : `${baseUrl}/gifs/search?q=${encodeURIComponent(query || '')}&per_page=30&page=1`;

        const response = await fetch(url);
        const json = await response.json();
        // Klipy returns: { result: true, data: { data: [...], current_page, per_page, has_next } }
        const results = json?.data?.data || json?.data || [];

        if (!Array.isArray(results)) {
            console.warn('Klipy returned non-array:', typeof results);
            return [];
        }

        return results
            .map((g: any) => {
                const urls = extractKlipyUrls(g);
                if (!urls) return null;
                return {
                    id: g.id || g.slug || String(Math.random()),
                    url: urls.url,
                    previewUrl: urls.previewUrl,
                    title: g.title,
                    width: g.width || g.files?.gif?.width,
                    height: g.height || g.files?.gif?.height,
                    source: 'klipy' as GifSource,
                };
            })
            .filter(Boolean) as GifItem[];
    };

    const fetchTrending = async () => {
        try {
            setLoading(true);
            setError(null);
            const results = activeTab === 'giphy'
                ? await fetchGiphy('trending')
                : await fetchKlipy('trending');
            setGifs(results);
        } catch (err) {
            console.error(`Failed to fetch ${activeTab} trending:`, err);
            setError('Failed to load GIFs');
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        try {
            setLoading(true);
            setError(null);
            const results = activeTab === 'giphy'
                ? await fetchGiphy('search', query)
                : await fetchKlipy('search', query);
            setGifs(results);
        } catch (err) {
            console.error(`Failed to search ${activeTab}:`, err);
            setError('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = useCallback((gif: GifItem) => {
        onSelect(gif.url, {
            source: gif.source,
            title: gif.title,
            width: gif.width,
            height: gif.height,
        });
        onClose();
        setSearchQuery('');
    }, [onSelect, onClose]);

    const handleClose = () => {
        onClose();
        setSearchQuery('');
    };

    const handleTabChange = (tab: GifSource) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setGifs([]);
            setError(null);
        }
    };

    const renderGif = ({ item }: { item: GifItem }) => (
        <Pressable
            onPress={() => handleSelect(item)}
            style={{ width: GIF_SIZE, height: GIF_SIZE, margin: 4, overflow: 'hidden', backgroundColor: '#18181b' }}
        >
            <Image
                source={{ uri: item.previewUrl }}
                style={{ width: '100%', height: '100%' }}
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>GIFs</Text>
                    <Pressable onPress={handleClose} style={{ padding: 8 }}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </Pressable>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 }}>
                    <Pressable
                        onPress={() => handleTabChange('giphy')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            alignItems: 'center',
                            backgroundColor: activeTab === 'giphy' ? '#4f46e5' : '#27272a',
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: activeTab === 'giphy' ? 'bold' : 'normal' }}>GIPHY</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => handleTabChange('klipy')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            alignItems: 'center',
                            backgroundColor: activeTab === 'klipy' ? '#4f46e5' : '#27272a',
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: activeTab === 'klipy' ? 'bold' : 'normal' }}>Klipy</Text>
                    </Pressable>
                </View>

                {/* Search Input */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Ionicons name="search" size={20} color="#71717a" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={`Search ${activeTab === 'giphy' ? 'GIPHY' : 'Klipy'}...`}
                            placeholderTextColor="#71717a"
                            style={{ flex: 1, marginLeft: 8, color: '#fff', fontSize: 16 }}
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
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#cba6f7" />
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cloud-offline" size={48} color="#71717a" />
                        <Text style={{ color: '#71717a', marginTop: 8 }}>{error}</Text>
                        <Pressable onPress={fetchTrending} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#4f46e5', borderRadius: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={gifs}
                        renderItem={renderGif}
                        keyExtractor={(item, index) => `${item.source}-${item.id}-${index}`}
                        numColumns={2}
                        contentContainerStyle={{ padding: 8 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                                <Text style={{ color: '#71717a' }}>No GIFs found</Text>
                            </View>
                        }
                    />
                )}

                {/* Powered by */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#27272a' }}>
                    <Text style={{ color: '#52525b', fontSize: 12 }}>
                        Powered by {activeTab === 'giphy' ? 'GIPHY' : 'Klipy'}
                    </Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
