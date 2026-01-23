import { useState, useEffect, useCallback } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Gif } from '@giphy/react-components';
import type { IGif } from '@giphy/js-types';
import './GifPicker.css';

// GIPHY API key from environment
const GIPHY_API_KEY = 'H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN';
const gf = new GiphyFetch(GIPHY_API_KEY);

interface GifPickerProps {
    onSelect: (gifUrl: string, gifId: string) => void;
    onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<IGif[]>([]);
    const [loading, setLoading] = useState(false);

    const loadTrending = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await gf.trending({ limit: 20 });
            setGifs(data);
        } catch (err) {
            console.error('Failed to load trending GIFs:', err);
        }
        setLoading(false);
    }, []);

    const searchGifs = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const { data } = await gf.search(query, { limit: 20 });
            setGifs(data);
        } catch (err) {
            console.error('Failed to search GIFs:', err);
        }
        setLoading(false);
    }, []);

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

    const handleGifClick = (gif: IGif) => {
        // Use the downsized version for optimal performance
        const gifUrl = gif.images.fixed_height.url || gif.images.original.url;
        onSelect(gifUrl, String(gif.id));
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
                                <Gif gif={gif} width={120} noLink hideAttribution />
                            </div>
                        ))
                    )}
                </div>

                <div className="gif-picker-footer">
                    <span className="powered-by">Powered by GIPHY</span>
                </div>
            </div>
        </div>
    );
}
