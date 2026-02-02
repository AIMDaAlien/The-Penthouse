import React, { useState, useRef } from 'react';
import type { Message, User } from '../types';
import { markMessageRead } from '../services/api';
import EmojiPicker from './EmojiPicker';
import AudioPlayer from './AudioPlayer';
import ImageLightbox from './ImageLightbox';
import FilePreview from './FilePreview';
import { EditIcon, TrashIcon, PinIcon, UnpinIcon, ReplyIcon } from './Icons';

interface MessageListProps {
    messages: Message[];
    currentUser: User | null;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    editingMessage: Message | null;
    editContent: string;
    setEditContent: (content: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onReply: (msg: Message) => void;
    onEdit: (msg: Message) => void;
    onDelete: (msgId: number) => void;
    onPin: (msgId: number) => void;
    onUnpin: (msgId: number) => void;
    onReact: (msgId: number, emoji: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentUser,
    messagesEndRef,
    editingMessage,
    editContent,
    setEditContent,
    onSaveEdit,
    onCancelEdit,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onReact,
}) => {
    // Hover State for Random Emoji
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);

    // Long-press for mobile
    const longPressTimer = useRef<number | null>(null);
    const [longPressedMsgId, setLongPressedMsgId] = useState<number | null>(null);

    // Reaction emoji picker state
    const [reactionPickerMsgId, setReactionPickerMsgId] = useState<number | null>(null);

    // Lightbox and File Preview state
    const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatExactTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const shouldShowTimeMarker = (msg: Message, index: number) => {
        if (index === 0) return true;
        const prevMsg = messages[index - 1];
        const currentTime = new Date(msg.createdAt).getTime();
        const prevTime = new Date(prevMsg.createdAt).getTime();
        const gapMinutes = (currentTime - prevTime) / (1000 * 60);
        return gapMinutes >= 5;
    };

    const isGifMessage = (msg: Message) => {
        return msg.type === 'gif' || msg.content?.match(/\.(gif|webp)$/i) || msg.content?.includes('giphy.com');
    };

    const isImageMessage = (msg: Message) => {
        return msg.type === 'image' || msg.content?.match(/\.(jpg|jpeg|png|webp)$/i);
    };

    const handleImageClick = (src: string, alt?: string) => {
        setLightboxImage({ src, alt });
    };

    const handleFileClick = (url: string, name: string, type?: string) => {
        setPreviewFile({ url, name, type });
    };

    const renderMessageContent = (msg: Message) => {
        if (isGifMessage(msg)) {
            return (
                <div className="message-gif clickable" onClick={() => handleImageClick(msg.content, 'GIF')}>
                    <img src={msg.content} alt="GIF" loading="lazy" />
                    <div className="media-overlay"><span>🔍</span></div>
                </div>
            );
        }
        if (isImageMessage(msg)) {
            return (
                <div className="message-image clickable" onClick={() => handleImageClick(msg.content, 'Image')}>
                    <img src={msg.content} alt="Image" loading="lazy" />
                    <div className="media-overlay"><span>🔍</span></div>
                </div>
            );
        }
        if (msg.type === 'file' && msg.metadata) {
            const meta = msg.metadata as { fileUrl?: string; fileName?: string };
            const isPDF = meta.fileName?.toLowerCase().endsWith('.pdf');
            return (
                <div className="message-file" onClick={() => handleFileClick(meta.fileUrl || '', meta.fileName || 'file')}>
                    <span className="file-icon">{isPDF ? '📄' : '📎'}</span>
                    <span className="file-name">{meta.fileName}</span>
                    <span className="file-action">{isPDF ? 'View' : 'Download'}</span>
                </div>
            );
        }
        if (msg.type === 'voice') {
            return (
                <div className="message-voice">
                    <AudioPlayer src={msg.content} />
                </div>
            );
        }
        return <div className="message-content">{msg.content}</div>;
    };

    const groupReactions = (reactions: Message['reactions']) => {
        if (!reactions) return [];
        const groups: { emoji: string; count: number; users: string[] }[] = [];
        reactions.forEach(r => {
            const existing = groups.find(g => g.emoji === r.emoji);
            if (existing) {
                existing.count++;
                existing.users.push(r.displayName || r.username);
            } else {
                groups.push({ emoji: r.emoji, count: 1, users: [r.displayName || r.username] });
            }
        });
        return groups;
    };

    return (
        <>
            <div className="messages-container timeline-view">
                <div className="timeline-rail"></div>
                <div className="timeline-messages">
                    {messages.length === 0 ? (
                        <div className="no-messages">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className="timeline-message-wrapper"
                                ref={(el) => {
                                    if (el && msg.sender.id !== currentUser?.id && !msg.readAt) {
                                        const observer = new IntersectionObserver(
                                            (entries) => {
                                                entries.forEach(entry => {
                                                    if (entry.isIntersecting) {
                                                        markMessageRead(msg.id).catch(console.error);
                                                        observer.disconnect();
                                                    }
                                                });
                                            },
                                            { threshold: 0.5 }
                                        );
                                        observer.observe(el);
                                    }
                                }}
                            >
                                {shouldShowTimeMarker(msg, index) && (
                                    <div className="timeline-time-marker">
                                        <span className="timeline-time">{formatTime(msg.createdAt)}</span>
                                    </div>
                                )}
                                <div
                                    id={`msg-${msg.id}`}
                                    className={`message ${msg.sender.id === currentUser?.id ? 'own' : ''} ${hoveredMsgId === msg.id || longPressedMsgId === msg.id ? 'hovered' : ''}`}
                                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                                    onMouseLeave={() => setHoveredMsgId(null)}
                                    onTouchStart={() => {
                                        longPressTimer.current = setTimeout(() => {
                                            setLongPressedMsgId(msg.id);
                                        }, 500);
                                    }}
                                    onTouchEnd={() => {
                                        if (longPressTimer.current) {
                                            clearTimeout(longPressTimer.current);
                                        }
                                    }}
                                >
                                    <span className="exact-timestamp">{formatExactTime(msg.createdAt)}</span>
                                    <div className="avatar">
                                        {msg.sender.avatarUrl ? (
                                            <img src={msg.sender.avatarUrl} alt="avatar" />
                                        ) : (
                                            <div className="avatar-placeholder">{msg.sender.username[0]}</div>
                                        )}
                                    </div>
                                    <div className="message-body">
                                        {msg.replyToMessage && (
                                            <div className="reply-context" onClick={() => {
                                                const el = document.getElementById(`msg-${msg.replyToMessage?.id}`);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    el.classList.add('highlighted');
                                                    setTimeout(() => el.classList.remove('highlighted'), 2000);
                                                }
                                            }}>
                                                <span className="reply-line"></span>
                                                <span className="reply-author">@{msg.replyToMessage.sender.displayName || msg.replyToMessage.sender.username}</span>
                                                <span className="reply-preview">{msg.replyToMessage.content}</span>
                                            </div>
                                        )}
                                        <div className="message-header">
                                            <span className="sender">{msg.sender.displayName || msg.sender.username}</span>
                                            <span className="time">
                                                {formatTime(msg.createdAt)}
                                                {msg.sender.id === currentUser?.id && !msg.deleted_at && (
                                                    <span className="read-status" title={msg.readAt ? "Read" : "Sent"}>
                                                        {msg.readAt ?
                                                            <span style={{ color: '#4da6ff', marginLeft: '4px' }}>✓✓</span> :
                                                            <span style={{ color: '#666', marginLeft: '4px' }}>✓</span>
                                                        }
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {msg.deleted_at ? (
                                            <div className="message-content deleted">
                                                <i>Message deleted</i>
                                            </div>
                                        ) : editingMessage?.id === msg.id ? (
                                            <div className="edit-message-container">
                                                <input
                                                    type="text"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') onSaveEdit();
                                                        if (e.key === 'Escape') onCancelEdit();
                                                    }}
                                                    autoFocus
                                                />
                                                <div className="edit-actions">
                                                    <span className="edit-hint">enter to save • esc to cancel</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {renderMessageContent(msg)}
                                                {msg.edited_at && <span className="edited-label">(edited)</span>}
                                            </>
                                        )}

                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className="reactions-row">
                                                {groupReactions(msg.reactions).map(({ emoji, count, users }) => (
                                                    <button
                                                        key={emoji}
                                                        className="reaction-chip"
                                                        title={users.join(', ')}
                                                        onClick={() => onReact(msg.id, emoji)}
                                                    >
                                                        <span className="reaction-emoji">{emoji}</span>
                                                        {count > 1 && <span className="reaction-count">{count}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="message-actions">
                                        <button
                                            onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                                            title="Add Reaction"
                                            className={`action-btn react-btn ${reactionPickerMsgId === msg.id ? 'active' : ''}`}
                                        >
                                            😊
                                        </button>

                                        {reactionPickerMsgId === msg.id && (
                                            <EmojiPicker
                                                onSelect={(emoji) => {
                                                    onReact(msg.id, emoji);
                                                    setReactionPickerMsgId(null);
                                                }}
                                                onClose={() => setReactionPickerMsgId(null)}
                                            />
                                        )}

                                        <button onClick={() => onReply(msg)} title="Reply" className="action-btn"><ReplyIcon size={16} /></button>

                                        <button
                                            onClick={() => msg.pinId ? onUnpin(msg.id) : onPin(msg.id)}
                                            title={msg.pinId ? "Unpin" : "Pin"}
                                            className={`action-btn ${msg.pinId ? "active" : ""}`}
                                        >
                                            {msg.pinId ? <UnpinIcon size={16} /> : <PinIcon size={16} />}
                                        </button>

                                        {msg.sender.id === currentUser?.id && !msg.deleted_at && (
                                            <>
                                                <button onClick={() => onEdit(msg)} title="Edit" className="action-btn"><EditIcon size={16} /></button>
                                                <button onClick={() => onDelete(msg.id)} title="Delete" className="action-btn"><TrashIcon size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {lightboxImage && (
                <ImageLightbox
                    src={lightboxImage.src}
                    alt={lightboxImage.alt}
                    onClose={() => setLightboxImage(null)}
                />
            )}

            {previewFile && (
                <FilePreview
                    fileUrl={previewFile.url}
                    fileName={previewFile.name}
                    fileType={previewFile.type}
                    onClose={() => setPreviewFile(null)}
                />
            )}
        </>
    );
};

export default MessageList;
