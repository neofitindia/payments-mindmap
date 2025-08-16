import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { UIRecipient, PaymentMindmapData } from '../types';
import PaymentSection from './PaymentSection';
import RecipientsSection from './RecipientsSection';
import ImportExportSection from './ImportExportSection';
import NotificationDialog from './NotificationDialog';
import './ManageDialog.css';

interface ManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateInitialPayment: (amount: number) => Promise<{ success: boolean; error?: string }>;
  onRestoreData: (data: PaymentMindmapData) => void;
  onRemoveRecipient: (recipientId: string) => Promise<void>;
  onRemoveTransaction: (transactionId: string, recipientId: string) => Promise<void>;
  onRemoveBudget: (budgetId: string) => void;
  onResetStorage: () => void;
  recipients: UIRecipient[];
  totalDistributed: number;
  initialPaymentAmount: number;
  availableBalance: number;
  mindmapData: PaymentMindmapData;
  activeBudgetId: string | undefined;
  budgets: Array<{ id: string; name: string; }>;
}

const ManageDialog: React.FC<ManageDialogProps> = ({
  isOpen,
  onClose,
  onUpdateInitialPayment,
  onRestoreData,
  onRemoveRecipient,
  onRemoveTransaction,
  onRemoveBudget,
  onResetStorage,
  recipients,
  totalDistributed,
  initialPaymentAmount,
  availableBalance,
  mindmapData,
  activeBudgetId,
  budgets
}) => {
  // Grouped notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, message: '', type: 'success' });

  // Memoized callbacks to prevent child re-renders
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, message, type });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Memoized escape handler to prevent recreation
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

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

  // Memoized backdrop click handler
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Memoized current budget info to prevent recalculation
  const currentBudgetName = useMemo(() => 
    budgets.find(b => b.id === activeBudgetId)?.name, 
    [budgets, activeBudgetId]
  );

  if (!isOpen) return null;

  return (
    <div className="manage-dialog-backdrop" onClick={handleBackdropClick}>
      <NotificationDialog
        isOpen={notification.isOpen}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />

      <div className="manage-dialog">
        <div className="manage-dialog-header">
          <h2 className="manage-dialog-title">Manage Your Payments</h2>
          <button
            className="manage-dialog-close"
            onClick={onClose}
            title="Close"
          >
×
          </button>
        </div>

        <div className="manage-dialog-content">
          {/* Section 1: Budget's Initial Payment Management */}
          <PaymentSection
            initialPaymentAmount={initialPaymentAmount}
            totalDistributed={totalDistributed}
            availableBalance={availableBalance}
            onUpdateInitialPayment={onUpdateInitialPayment}
            onShowNotification={showNotification}
          />

          {/* Section 2: Recipients & Transactions Management */}
          <RecipientsSection
            recipients={recipients}
            onRemoveRecipient={onRemoveRecipient}
            onRemoveTransaction={onRemoveTransaction}
          />

          {/* Section 3: Import & Export */}
          <ImportExportSection
            mindmapData={mindmapData}
            budgets={budgets}
            activeBudgetId={activeBudgetId}
            onRestoreData={onRestoreData}
            onShowNotification={showNotification}
          />

          {/* Section 4: Budget Management */}
          <div className="manage-section">
            <div className="section-header">
              <h3>Budget Management</h3>
            </div>
            <div className="section-content">
              <div className="budget-management">
                <p>Delete the current budget and all its data. This will reset the app if it's the last budget.</p>
                <div className="current-budget-info">
                  <span>Current Budget: <strong>{currentBudgetName}</strong></span>
                </div>
                <button
                  onClick={() => activeBudgetId && onRemoveBudget(activeBudgetId)}
                  className="btn-danger-handdrawn"
                  disabled={!activeBudgetId}
                >
                  Delete Current Budget
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Danger Zone */}
          <div className="manage-section danger-section">
            <div className="section-header danger-header">
              <h3>Danger Zone</h3>
            </div>
            <div className="section-content">
              <div className="danger-warning">
                <div className="warning-icon"></div>
                <div className="warning-text">
                  <strong>Reset All Data</strong>
                  <p>This will permanently delete all recipients, transactions, and payment data. This action cannot be undone.</p>
                </div>
              </div>
              <button
                onClick={onResetStorage}
                className="btn-danger-large-handdrawn"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ManageDialog);