import { useState } from 'react';
import './FilePreview.css';

interface FilePreviewProps {
    fileUrl: string;
    fileName: string;
    fileType?: string;
    onClose: () => void;
}

export default function FilePreview({ fileUrl, fileName, fileType, onClose }: FilePreviewProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isText = fileType?.startsWith('text/') ||
        /\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|yaml|yml)$/i.test(fileName);

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            // Fallback: open in new tab
            window.open(fileUrl, '_blank');
        }
    };

    const handleOpenInNewTab = () => {
        window.open(fileUrl, '_blank');
    };

    const getFileIcon = () => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return '📄';
            case 'doc':
            case 'docx': return '📝';
            case 'xls':
            case 'xlsx': return '📊';
            case 'ppt':
            case 'pptx': return '📽️';
            case 'zip':
            case 'rar':
            case '7z': return '📦';
            case 'mp3':
            case 'wav':
            case 'ogg': return '🎵';
            case 'mp4':
            case 'mov':
            case 'avi': return '🎥';
            case 'txt':
            case 'md': return '📃';
            case 'js':
            case 'ts':
            case 'py':
            case 'java': return '💻';
            default: return '📎';
        }
    };

    return (
        <div className="file-preview-overlay" onClick={onClose}>
            <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="file-preview-header">
                    <div className="file-info">
                        <span className="file-icon">{getFileIcon()}</span>
                        <span className="file-name">{fileName}</span>
                    </div>
                    <div className="header-actions">
                        <button onClick={handleOpenInNewTab} title="Open in new tab">
                            ↗
                        </button>
                        <button onClick={handleDownload} title="Download">
                            ⤓
                        </button>
                        <button onClick={onClose} title="Close">×</button>
                    </div>
                </div>

                <div className="file-preview-content">
                    {isPDF ? (
                        <>
                            {loading && !error && (
                                <div className="loading-overlay">Loading PDF...</div>
                            )}
                            {error ? (
                                <div className="error-state">
                                    <span className="error-icon">⚠️</span>
                                    <p>Unable to preview PDF</p>
                                    <button onClick={handleOpenInNewTab}>Open in Browser</button>
                                </div>
                            ) : (
                                <iframe
                                    src={`${fileUrl}#toolbar=1&navpanes=0`}
                                    title={fileName}
                                    className="pdf-viewer"
                                    onLoad={() => setLoading(false)}
                                    onError={() => { setLoading(false); setError(true); }}
                                />
                            )}
                        </>
                    ) : isText ? (
                        <iframe
                            src={fileUrl}
                            title={fileName}
                            className="text-viewer"
                            onLoad={() => setLoading(false)}
                        />
                    ) : (
                        <div className="generic-file-preview">
                            <span className="large-icon">{getFileIcon()}</span>
                            <h3>{fileName}</h3>
                            <p className="file-hint">This file type cannot be previewed</p>
                            <div className="preview-actions">
                                <button className="primary" onClick={handleDownload}>
                                    ⤓ Download File
                                </button>
                                <button onClick={handleOpenInNewTab}>
                                    ↗ Open in Browser
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
