import { useState, useRef } from 'react';
import GifPicker from './GifPicker';
import KlipyPicker from './KlipyPicker';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';
import { EmojiIcon, GifIcon, AttachmentIcon, SendIcon, KlipyIcon } from './Icons';
import { sendTyping, stopTyping } from '../services/socket';
import type { Message, Chat } from '../types';

interface MessageInputProps {
    selectedChat: Chat;
    onSend: (content: string, replyToId?: number) => Promise<void>;
    onGifSelect: (gifUrl: string) => Promise<void>;
    onFileSelect: (file: File) => Promise<void>;
    onVoiceSend: (blob: Blob, duration: number, mimeType: string) => Promise<void>;
    replyingTo: Message | null;
    onCancelReply: () => void;
}

export default function MessageInput({
    selectedChat,
    onSend,
    onGifSelect,
    onFileSelect,
    onVoiceSend,
    replyingTo,
    onCancelReply,
}: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');
    const [showGiphyPicker, setShowGiphyPicker] = useState(false);
    const [showKlipyPicker, setShowKlipyPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const lastTypingEmit = useRef<number>(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        stopTyping(selectedChat.id);
        await onSend(newMessage.trim(), replyingTo?.id);
        setNewMessage('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);

        // Debounced typing indicator emit
        if (value.trim()) {
            const now = Date.now();
            if (now - lastTypingEmit.current > 1000) {
                sendTyping(selectedChat.id);
                lastTypingEmit.current = now;
            }
        } else {
            stopTyping(selectedChat.id);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleGifSelect = async (gifUrl: string) => {
        await onGifSelect(gifUrl);
        setShowGiphyPicker(false);
    };

    const handleKlipySelect = async (gifUrl: string) => {
        await onGifSelect(gifUrl);
        setShowKlipyPicker(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="message-input">
                <div className="input-wrapper">
                    <div className="attach-wrapper">
                        <button
                            type="button"
                            className="chat-action-btn"
                            title="Upload file"
                            onClick={() => setShowFileUpload(!showFileUpload)}
                        >
                            <AttachmentIcon size={20} />
                        </button>
                        {showFileUpload && (
                            <FileUpload
                                onFileSelect={onFileSelect}
                                onClose={() => setShowFileUpload(false)}
                            />
                        )}
                    </div>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder={`Message ${selectedChat.type === 'channel' ? '#' + selectedChat.name : '...'}`}
                        autoComplete="off"
                    />
                    <button
                        type="button"
                        className="chat-action-btn"
                        title="Emojis"
                        onClick={() => setShowEmojiPicker(true)}
                    >
                        <EmojiIcon size={20} />
                    </button>
                    <button
                        type="button"
                        className="chat-action-btn"
                        onClick={() => setShowGiphyPicker(true)}
                        title="GIPHY"
                    >
                        <GifIcon size={20} />
                    </button>
                    <button
                        type="button"
                        className="chat-action-btn"
                        onClick={() => setShowKlipyPicker(true)}
                        title="Klipy"
                    >
                        <KlipyIcon size={20} />
                    </button>
                    <VoiceRecorder onSend={onVoiceSend} />
                    <button
                        type="submit"
                        className="chat-action-btn send-btn"
                        disabled={!newMessage.trim()}
                        title="Send"
                    >
                        <SendIcon size={20} />
                    </button>
                </div>
            </form>

            {/* Reply bar above input */}
            {replyingTo && (
                <div className="reply-bar">
                    <div className="reply-bar-content">
                        <span className="reply-bar-line"></span>
                        <span className="reply-bar-text">
                            Replying to <strong>@{replyingTo.sender.displayName || replyingTo.sender.username}</strong>
                        </span>
                        <span className="reply-bar-preview">
                            {replyingTo.content.slice(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}
                        </span>
                    </div>
                    <button className="reply-bar-close" onClick={onCancelReply}>✕</button>
                </div>
            )}

            {/* Pickers */}
            {showEmojiPicker && (
                <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                />
            )}
            {showGiphyPicker && (
                <GifPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowGiphyPicker(false)}
                />
            )}
            {showKlipyPicker && (
                <KlipyPicker
                    onSelect={handleKlipySelect}
                    onClose={() => setShowKlipyPicker(false)}
                />
            )}
        </>
    );
}
