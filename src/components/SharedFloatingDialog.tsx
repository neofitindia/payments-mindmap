import React, { useEffect, memo } from 'react';
import './SharedFloatingDialog.css';

interface SharedFloatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  canClose?: boolean;
}

const SharedFloatingDialog: React.FC<SharedFloatingDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
  canClose = true
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && canClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, canClose]);

  // Prevent background scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="shared-floating-backdrop" onClick={canClose ? onClose : undefined}>
      <div 
        className="shared-floating-dialog" 
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shared-floating-header">
          <h3 className="shared-floating-title">{title}</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="shared-floating-close-btn"
              aria-label={`Close ${title} dialog`}
            >
              ×
            </button>
          )}
        </div>

        <div className="shared-floating-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default memo(SharedFloatingDialog);