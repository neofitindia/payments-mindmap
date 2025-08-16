import React, { memo } from 'react';
import './NotificationDialog.css';

interface NotificationDialogProps {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const NotificationDialog: React.FC<NotificationDialogProps> = ({
  isOpen,
  message,
  type,
  onClose
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="notification-dialog-overlay" onClick={onClose}>
      <div className="notification-dialog" onClick={(e) => e.stopPropagation()}>
        <svg className="notification-background" viewBox="0 0 350 200">
          <path
            d="M 15 15 L 335 20 L 330 185 L 20 180 Z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="2"
            className="rough-element"
          />
        </svg>
        
        <div className="notification-content">
          <div className={`notification-icon ${type}`}>
            {getIcon()}
          </div>
          
          <p className="notification-message">{message}</p>
          
          <button 
            onClick={onClose}
            className="notification-btn"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(NotificationDialog);