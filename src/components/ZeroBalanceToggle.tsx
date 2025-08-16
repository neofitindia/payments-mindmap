import React from 'react';
import './ZeroBalanceToggle.css';

interface ZeroBalanceToggleProps {
  showZeroBalanceRecipients: boolean;
  onToggle: () => void;
  zeroBalanceCount: number;
}

const ZeroBalanceToggle: React.FC<ZeroBalanceToggleProps> = React.memo(({ 
  showZeroBalanceRecipients, 
  onToggle, 
  zeroBalanceCount 
}) => {
  // Only show the toggle if there are recipients with zero balance
  if (zeroBalanceCount === 0) {
    return null;
  }

  return (
    <div className="zero-balance-toggle-container">
      <label className="toggle-label">
        <span className="toggle-text">Show Empty Recipients</span>
        <div className="toggle-switch">
          <input
            type="checkbox"
            checked={showZeroBalanceRecipients}
            onChange={onToggle}
            className="toggle-input"
            aria-label={`Toggle visibility of ${zeroBalanceCount} empty recipient${zeroBalanceCount === 1 ? '' : 's'}`}
          />
          <span className="toggle-slider"></span>
        </div>
      </label>
    </div>
  );
});

export default ZeroBalanceToggle;