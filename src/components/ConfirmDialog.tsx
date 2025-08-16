import React, { memo } from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <div className="dialog-content">
          <div className={`dialog-icon ${type}`}>
            {type === 'danger' && '⚠️'}
            {type === 'warning' && '❗'}
            {type === 'info' && 'ℹ️'}
          </div>
          
          <h3 className="dialog-title">{title}</h3>
          <p className="dialog-message">{message}</p>
          
          <div className="dialog-actions">
            <button 
              onClick={onCancel}
              className="dialog-btn cancel-btn"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className={`dialog-btn confirm-btn ${type}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ConfirmDialog);