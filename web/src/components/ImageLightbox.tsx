import { useState, useEffect, useRef, useCallback } from 'react';
import './ImageLightbox.css';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt = 'Image', onClose }: ImageLightboxProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const MIN_SCALE = 0.5;
    const MAX_SCALE = 5;

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [handleWheel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === '+' || e.key === '=') setScale(prev => Math.min(MAX_SCALE, prev + 0.2));
            if (e.key === '-') setScale(prev => Math.max(MIN_SCALE, prev - 0.2));
            if (e.key === '0') { setScale(1); setPosition({ x: 0, y: 0 }); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && e.touches.length === 1) {
            setPosition({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => setScale(prev => Math.min(MAX_SCALE, prev + 0.5));
    const handleZoomOut = () => setScale(prev => Math.max(MIN_SCALE, prev - 0.5));
    const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    const handleDownload = async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = alt || 'image';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download image:', error);
            // Fallback: open in new tab
            window.open(src, '_blank');
        }
    };

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <div
                ref={containerRef}
                className="lightbox-container"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt}
                    className="lightbox-image"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                    }}
                    draggable={false}
                    onClick={() => { if (scale === 1) handleZoomIn(); }}
                />
            </div>

            <div className="lightbox-controls" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleZoomOut} title="Zoom Out (-)">−</button>
                <span className="zoom-level">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} title="Zoom In (+)">+</button>
                <button onClick={handleReset} title="Reset (0)">↺</button>
                <button onClick={handleDownload} title="Download">⤓</button>
            </div>

            <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close (Esc)">×</button>
        </div>
    );
}
