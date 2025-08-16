import React, { useEffect, memo } from 'react';
import './KeyboardShortcutsDialog.css';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isOpen,
  onClose
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
    <div className="keyboard-shortcuts-backdrop" onClick={onClose}>
      <div className="keyboard-shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h3 className="keyboard-shortcuts-title">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="keyboard-shortcuts-close-btn"
            aria-label="Close keyboard shortcuts dialog"
          >
            ×
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          <div className="shortcuts-grid">
            <div className="shortcut-item">
              <kbd className="shortcut-key">r</kbd>
              <span className="shortcut-description">Add Recipient</span>
            </div>
            <div className="shortcut-item">
              <kbd className="shortcut-key">t</kbd>
              <span className="shortcut-description">Add Transaction</span>
            </div>
            <div className="shortcut-item">
              <kbd className="shortcut-key">m</kbd>
              <span className="shortcut-description">Manage Budget</span>
            </div>
            <div className="shortcut-item">
              <kbd className="shortcut-key">b</kbd>
              <span className="shortcut-description">Create Budget</span>
            </div>
            <div className="shortcut-item">
              <kbd className="shortcut-key">?</kbd>
              <span className="shortcut-description">Show help</span>
            </div>
            <div className="shortcut-item">
              <kbd className="shortcut-key">esc</kbd>
              <span className="shortcut-description">Close dialogs</span>
            </div>
          </div>
          
          <div className="shortcuts-note">
            <p>Shortcuts only work when canvas is focused</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(KeyboardShortcutsDialog);