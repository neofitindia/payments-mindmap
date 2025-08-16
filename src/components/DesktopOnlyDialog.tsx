import React from 'react';
import './DesktopOnlyDialog.css';

interface DesktopOnlyDialogProps {
  isVisible: boolean;
}

const DesktopOnlyDialog: React.FC<DesktopOnlyDialogProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="desktop-only-overlay">
      <div className="desktop-only-dialog">
        <div className="dialog-content">
          <div className="dialog-icon large">🖥️</div>
          
          <h2 className="dialog-title">Desktop Required</h2>
          
          <p className="dialog-message">
            This app requires desktop or laptop for drag-and-drop interactions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DesktopOnlyDialog);