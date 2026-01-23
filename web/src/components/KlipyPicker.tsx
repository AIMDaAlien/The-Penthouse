import { useState, useEffect, useCallback } from 'react';
import './GifPicker.css';

const KLIPY_API_KEY = 'tc14Tax6viWl5Cenp2rpn9Dj5WbIA4VPTHF0skyutWomHQUfNSSxn4bInYvUaLc0';

interface KlipyGif {
    id: string;
    [key: string]: unknown;
}

interface KlipyPickerProps {
    onSelect: (gifUrl: string, gifId: string) => void;
    onClose: () => void;
}

// Extract URL from Klipy GIF object
// Klipy uses: file.{size}.{format}.url where size = sm|md|xs|original, format = gif|webp|mp4
function extractGifUrl(gif: KlipyGif): string {
    // Check Klipy's 'file' property structure
    const file = gif.file as Record<string, Record<string, { url?: string }>> | undefined;
    if (file) {
        const sizes = ['sm', 'md', 'xs', 'original'];
        const formats = ['gif', 'webp', 'mp4'];
        for (const size of sizes) {
            if (file[size]) {
                for (const format of formats) {
                    const formatData = file[size][format];
                    if (formatData && formatData.url) {
                        return formatData.url;
                    }
                }
            }
        }
    }

    // Fallback: Check 'images' structure (for compatibility)
    const images = gif.images as Record<string, Record<string, { url?: string }>> | undefined;
    if (images) {
        const sizes = ['sm', 'md', 'xs', 'original'];
        const formats = ['gif', 'webp'];
        for (const size of sizes) {
            if (images[size]) {
                for (const format of formats) {
                    const formatData = images[size][format];
                    if (formatData && formatData.url) {
                        return formatData.url;
                    }
                }
            }
        }
    }

    // Try common top-level URL fields
    const urlFields = ['gif_url', 'preview_url', 'url', 'gif', 'preview'];
    for (const field of urlFields) {
        const value = gif[field];
        if (typeof value === 'string' && value.startsWith('http')) {
            return value;
        }
    }

    return '';
}

export default function KlipyPicker({ onSelect, onClose }: KlipyPickerProps) {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<KlipyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGifs = useCallback(async (endpoint: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/${endpoint}`,
                {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                }
            );

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Navigate nested structure: {result: true, data: {data: [...]}}
            let results: KlipyGif[] = [];
            let payload = data;

            // Unwrap nested data properties
            while (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                if (payload.data) {
                    payload = payload.data;
                } else {
                    break;
                }
            }

            if (Array.isArray(payload)) {
                results = payload;
            } else if (payload && typeof payload === 'object') {
                for (const key of Object.keys(payload)) {
                    if (Array.isArray(payload[key]) && payload[key].length > 0) {
                        results = payload[key];
                        break;
                    }
                }
            }

            console.log('Klipy loaded', results.length, 'GIFs');
            if (results.length > 0) {
                console.log('Sample GIF URL:', extractGifUrl(results[0]));
            }
            setGifs(results);
        } catch (err) {
            console.error('Klipy API error:', err);
            setError('Unable to load GIFs');
            setGifs([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchGifs('trending?limit=24');
    }, [fetchGifs]);

    useEffect(() => {
        if (search.trim() === '') return;
        const timer = setTimeout(() => {
            fetchGifs(`search?q=${encodeURIComponent(search)}&limit=24`);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, fetchGifs]);

    const handleGifClick = (gif: KlipyGif) => {
        const url = extractGifUrl(gif);
        if (url) {
            onSelect(url, gif.id);
            onClose();
        }
    };

    return (
        <div className="gif-picker-overlay" onClick={onClose}>
            <div className="gif-picker klipy" onClick={(e) => e.stopPropagation()}>
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
                    ) : error ? (
                        <div className="empty-state">{error}</div>
                    ) : gifs.length === 0 ? (
                        <div className="empty-state">
                            {search ? 'No results found' : 'No trending GIFs'}
                        </div>
                    ) : (
                        gifs.map((gif, index) => {
                            const previewUrl = extractGifUrl(gif);
                            return previewUrl ? (
                                <div
                                    key={gif.id || index}
                                    className="gif-item"
                                    onClick={() => handleGifClick(gif)}
                                >
                                    <img
                                        src={previewUrl}
                                        alt="GIF"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : null;
                        })
                    )}
                </div>

                <div className="gif-picker-footer">
                    <span className="powered-by">Powered by Klipy</span>
                </div>
            </div>
        </div>
    );
}
