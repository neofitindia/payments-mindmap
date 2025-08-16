import React, { useEffect, memo } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: {
    label: string;
    onClick: () => void;
    icon?: string;
    className?: string;
  }[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  items
}) => {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent scrolling when context menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close menu on outside click */}
      <div 
        className="context-menu-backdrop"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          background: 'transparent'
        }}
      />
      
      <div
        className="context-menu"
        style={{
          left: position.x,
          top: position.y,
          zIndex: 1000
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className={`context-menu-item ${item.className || ''}`}
            onClick={(e) => {
              item.onClick();
              // Always close menu after action, let dialog handle its own state
              onClose();
            }}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default memo(ContextMenu);