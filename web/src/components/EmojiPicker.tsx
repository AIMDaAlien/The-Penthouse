import { useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import './EmojiPicker.css';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

interface EmojiData {
    native: string;
    id: string;
    name: string;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };

    const handleEmojiSelect = (emoji: EmojiData) => {
        onSelect(emoji.native);
    };

    return (
        <div
            className="emoji-picker-overlay"
            ref={overlayRef}
            onClick={handleOverlayClick}
        >
            <div className="emoji-picker-container">
                <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="search"
                    emojiSize={24}
                    emojiButtonSize={32}
                    maxFrequentRows={2}
                />
            </div>
        </div>
    );
}
