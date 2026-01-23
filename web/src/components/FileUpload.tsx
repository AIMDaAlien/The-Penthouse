import { useRef } from 'react';
import './FileUpload.css';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    onClose: () => void;
}

export default function FileUpload({ onFileSelect, onClose }: FileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
            onClose();
        }
    };

    return (
        <div className="file-upload-menu">
            <button
                className="upload-option"
                onClick={() => imageInputRef.current?.click()}
            >
                <span className="upload-icon">🖼️</span>
                <div className="upload-text">
                    <span className="upload-title">Upload Image</span>
                    <span className="upload-desc">Share photos and images</span>
                </div>
            </button>

            <button
                className="upload-option"
                onClick={() => fileInputRef.current?.click()}
            >
                <span className="upload-icon">📎</span>
                <div className="upload-text">
                    <span className="upload-title">Upload File</span>
                    <span className="upload-desc">Share documents and files</span>
                </div>
            </button>

            <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <input
                type="file"
                ref={fileInputRef}
                accept="*/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}
