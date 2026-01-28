import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ImageCropper.css';

interface ImageCropperProps {
    imageSrc: string;
    onCrop: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

const CANVAS_SIZE = 320;
const CROP_RADIUS = 140;

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [baseScale, setBaseScale] = useState(1); // Scale to fit image in canvas
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;

        if (!canvas || !ctx || !img) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Move to center
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Apply transformations
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(baseScale * scale, baseScale * scale);
        ctx.translate(offset.x, offset.y);

        // Draw image centered
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Restore context
        ctx.restore();

        // Draw overlay (circular mask)
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, CROP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }, [scale, baseScale, rotation, offset]);

    // Load image and calculate initial fit scale
    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            imageRef.current = img;

            // Calculate scale to fit the image within the crop circle
            // We want the smaller dimension to fit within the crop diameter
            const cropDiameter = CROP_RADIUS * 2;
            const fitScale = cropDiameter / Math.max(img.width, img.height);
            setBaseScale(fitScale);
        };
    }, [imageSrc]);

    // Redraw when state changes
    useEffect(() => {
        draw();
    }, [draw]);

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        // Adjust for rotation so dragging UP always moves image UP on screen
        const rad = (-rotation * Math.PI) / 180;
        const rotDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const rotDy = dx * Math.sin(rad) + dy * Math.cos(rad);

        setOffset(prev => ({
            x: prev.x + rotDx / (baseScale * scale),
            y: prev.y + rotDy / (baseScale * scale)
        }));
    };

    const handleCrop = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob((blob) => {
            if (blob) onCrop(blob);
        }, 'image/png');
    };



    return (
        <div className="cropper-overlay">
            <div className="cropper-modal">
                <h3>Edit Avatar</h3>
                <div className="cropper-canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    />
                    <div className="cropper-guide"></div>
                </div>

                <div className="cropper-controls">
                    <div className="control-group">
                        <label>Zoom</label>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                        />
                    </div>
                    <button type="button" onClick={() => setRotation(r => (r + 90) % 360)} className="rotate-btn">
                        ↻ Rotate
                    </button>
                </div>

                <div className="cropper-actions">
                    <button onClick={onCancel} className="cancel-btn">Cancel</button>
                    <button onClick={handleCrop} className="save-btn">Apply</button>
                </div>
            </div>
        </div>
    );
}
