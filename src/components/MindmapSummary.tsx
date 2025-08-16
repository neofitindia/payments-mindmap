import React from 'react';
import { PaymentMindmapData } from '../types';
import { formatTransactionAmount } from '../utils/currency';
import './MindmapSummary.css';

interface MindmapSummaryProps {
  data: PaymentMindmapData;
  onManageClick: () => void;
  isSidebarCollapsed?: boolean;
}

const MindmapSummary: React.FC<MindmapSummaryProps> = React.memo(({ data, onManageClick, isSidebarCollapsed = false }) => {
  return (
    <div className={`summary-overlay ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="summary-item">
        <span className="stat-label">Current:</span>
        <span className="stat-value">
          {formatTransactionAmount(data.initialPaymentAmount)}
        </span>
      </div>
      
      <div className="summary-item">
        <span className="stat-label">Available:</span>
        <span className="stat-value available">
          {formatTransactionAmount(data.initialPaymentAmount - data.totalDistributed)}
        </span>
      </div>
      
      <button 
        onClick={onManageClick}
        className="manage-trigger-btn"
        title="Open management panel"
      >
        Manage
      </button>
    </div>
  );
});

export default MindmapSummary;