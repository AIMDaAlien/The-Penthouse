import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ImageCropper from './ImageCropper';
import './ProfileModal.css';

interface ProfileModalProps {
    onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
    const { user, updateProfile } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCropper, setShowCropper] = useState(false);
    const [tempAvatarSrc, setTempAvatarSrc] = useState<string | null>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempAvatarSrc(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const handleCrop = (croppedBlob: Blob) => {
        // Convert blob to file
        const file = new File([croppedBlob], "avatar.png", { type: "image/png" });
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
        setTempAvatarSrc(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Upload avatar if changed
            let avatarUrl = user?.avatarUrl;
            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);

                const response = await fetch('/api/media/avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    avatarUrl = data.avatarUrl;
                }
            }

            // Update profile
            await updateProfile(displayName, avatarUrl);
            setSuccess('Profile updated!');

            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            setError('Failed to update profile');
            console.error(err);
        }

        setLoading(false);
    };

    return (
        <div className="profile-modal-overlay" onClick={showCropper ? undefined : onClose}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="profile-modal-header">
                    <h2>Edit Profile</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="avatar-section">
                        <div className="avatar-preview">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user?.username?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <label className="avatar-upload-btn">
                            Change Avatar
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                hidden
                            />
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={user?.username || ''}
                            disabled
                            className="input-disabled"
                        />
                    </div>

                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="How should others see you?"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="save-btn">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>

            </div>

            {
                showCropper && tempAvatarSrc && (
                    <ImageCropper
                        imageSrc={tempAvatarSrc}
                        onCrop={handleCrop}
                        onCancel={() => {
                            setShowCropper(false);
                            setTempAvatarSrc(null);
                        }}
                    />
                )
            }
        </div >
    );
}
