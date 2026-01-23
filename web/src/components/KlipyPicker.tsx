import { useState, useEffect, useCallback } from 'react';
import './GifPicker.css'; // Reuse same styling

// Klipy API configuration
const KLIPY_API_KEY = 'tc14Tax6viWl5Cenp2rpn9Dj5WbIA4VPTHF0skyutWomHQUfNSSxn4bInYvUaLc0';
const KLIPY_BASE_URL = 'https://api.klipy.co/v1';

interface KlipyGif {
    id: string;
    url: string;
    preview_url: string;
    title: string;
}

interface KlipyPickerProps {
    onSelect: (gifUrl: string, gifId: string) => void;
    onClose: () => void;
}

export default function KlipyPicker({ onSelect, onClose }: KlipyPickerProps) {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<KlipyGif[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchKlipy = useCallback(async (endpoint: string) => {
        const response = await fetch(`${KLIPY_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${KLIPY_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Klipy API error');
        return response.json();
    }, []);

    const loadTrending = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchKlipy('/gifs/trending?limit=20');
            setGifs(data.results || data.data || []);
        } catch (err) {
            console.error('Failed to load trending GIFs from Klipy:', err);
            setGifs([]);
        }
        setLoading(false);
    }, [fetchKlipy]);

    const searchGifs = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const data = await fetchKlipy(`/gifs/search?q=${encodeURIComponent(query)}&limit=20`);
            setGifs(data.results || data.data || []);
        } catch (err) {
            console.error('Failed to search GIFs from Klipy:', err);
            setGifs([]);
        }
        setLoading(false);
    }, [fetchKlipy]);

    useEffect(() => {
        loadTrending();
    }, [loadTrending]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.trim()) {
                searchGifs(search);
            } else {
                loadTrending();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, loadTrending, searchGifs]);

    const handleGifClick = (gif: KlipyGif) => {
        onSelect(gif.url || gif.preview_url, gif.id);
        onClose();
    };

    return (
        <div className="gif-picker-overlay" onClick={onClose}>
            <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
                <div className="gif-picker-header">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search GIFs..."
                        autoFocus
                    />
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="gif-picker-grid">
                    {loading ? (
                        <div className="loading-state">Loading...</div>
                    ) : gifs.length === 0 ? (
                        <div className="empty-state">No GIFs found</div>
                    ) : (
                        gifs.map((gif) => (
                            <div
                                key={gif.id}
                                className="gif-item"
                                onClick={() => handleGifClick(gif)}
                            >
                                <img
                                    src={gif.preview_url || gif.url}
                                    alt={gif.title || 'GIF'}
                                    loading="lazy"
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="gif-picker-footer">
                    <span className="powered-by">Powered by Klipy</span>
                </div>
            </div>
        </div>
    );
}
