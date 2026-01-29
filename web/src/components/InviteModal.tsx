import { useState } from 'react';
import { createInvite } from '../services/api';
import './InviteModal.css';

interface InviteModalProps {
    serverId: number;
    onClose: () => void;
}

export default function InviteModal({ serverId, onClose }: InviteModalProps) {
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await createInvite(serverId);
            setInviteCode(response.data.code);
        } catch (error) {
            console.error('Failed to create invite:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (inviteCode) {
            // For now, let's copy just the code. 
            // In a real app, this might be a full URL like https://app.com/invite/CODE
            // Assuming the join flow asks for the code.

            navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="invite-modal-overlay" onClick={onClose}>
            <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
                <div className="invite-modal-header">
                    <h2>Invite People</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="invite-content">
                    <p className="invite-description">
                        Share this code with others to grant them access to this server.
                    </p>

                    {inviteCode ? (
                        <div className="code-display">
                            <div className="code-box">{inviteCode}</div>
                            <button
                                className={`copy-btn ${copied ? 'copied' : ''}`}
                                onClick={handleCopy}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    ) : (
                        <div className="generate-section">
                            <button
                                className="generate-btn"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? 'Generating...' : 'Generate New Invite Code'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="invite-footer">
                    <span className="footer-hint">Invites are permanent by default.</span>
                </div>
            </div>
        </div>
    );
}
