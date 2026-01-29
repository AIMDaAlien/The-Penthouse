
import Modal from './Modal';
import './Modal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="confirm-message" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {message}
            </p>
            <div className="modal-actions">
                <button className="btn-secondary" onClick={onClose}>
                    {cancelText}
                </button>
                <button className="btn-danger" onClick={() => {
                    onConfirm();
                    onClose();
                }}>
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
