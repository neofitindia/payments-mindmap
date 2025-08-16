import React, { useState, useEffect, memo } from 'react';
import { UIRecipient } from '../types';
import { formatTransactionAmount } from '../utils/currency';
import './ConsolidateRecipientDialog.css';

interface ConsolidateRecipientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: UIRecipient | null;
  onConsolidate: (recipientId: string, description: string) => Promise<{ success: boolean; error?: string }>;
}

const ConsolidateRecipientDialog: React.FC<ConsolidateRecipientDialogProps> = ({
  isOpen,
  onClose,
  recipient,
  onConsolidate
}) => {
  const [consolidatedDescription, setConsolidatedDescription] = useState('');
  const [isConsolidating, setIsConsolidating] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && recipient) {
      setConsolidatedDescription('Consolidated');
    } else {
      setConsolidatedDescription('');
    }
  }, [isOpen, recipient]);

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

  if (!isOpen || !recipient) return null;

  const handleConsolidate = async () => {
    if (!consolidatedDescription.trim() || !recipient) return;

    setIsConsolidating(true);
    try {
      const result = await onConsolidate(recipient.id, consolidatedDescription.trim());
      if (result.success) {
        onClose();
      }
    } finally {
      setIsConsolidating(false);
    }
  };

  const canConsolidate = recipient.transactions.length > 1;

  return (
    <div className="consolidate-dialog-backdrop" onClick={onClose}>
      <div className="consolidate-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="consolidate-dialog-header">
          <h3 className="consolidate-dialog-title">Consolidate Recipient</h3>
          <button
            onClick={onClose}
            className="consolidate-dialog-close-btn"
            aria-label="Close consolidate dialog"
          >
            ×
          </button>
        </div>

        <div className="consolidate-dialog-content">
          <div className="consolidate-recipient-info">
            <h4>Recipient: {recipient.name}</h4>
            <div className="recipient-summary">
              <span className="total-amount">{formatTransactionAmount(recipient.totalAmount)}</span>
              <span className="transaction-count">{recipient.transactions.length} transactions</span>
            </div>
          </div>

          {!canConsolidate && (
            <div className="consolidate-not-available">
              <p>This recipient only has one transaction and cannot be consolidated.</p>
            </div>
          )}

          {canConsolidate && (
            <>
              <div className="current-transactions">
                <h4>Current Transactions</h4>
                <div className="transaction-list">
                  {recipient.transactions.map((transaction, index) => (
                    <div key={transaction.id} className="transaction-item">
                      <span className="transaction-amount">{formatTransactionAmount(transaction.amount)}</span>
                      <span className="transaction-description">{transaction.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="consolidate-arrow">→</div>

              <div className="consolidated-preview">
                <h4>After Consolidation</h4>
                <div className="transaction-item consolidated">
                  <span className="transaction-amount">{formatTransactionAmount(recipient.totalAmount)}</span>
                  <input
                    type="text"
                    value={consolidatedDescription}
                    onChange={(e) => setConsolidatedDescription(e.target.value)}
                    className="consolidated-description-input"
                    placeholder="Enter description for consolidated transaction"
                    disabled={isConsolidating}
                    autoComplete="off"
                  />
                </div>
                <p className="consolidate-warning">
                  This will replace all {recipient.transactions.length} transactions with a single consolidated transaction. 
                  This action cannot be undone.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="consolidate-dialog-actions">
          <button
            onClick={onClose}
            className="consolidate-cancel-btn"
            disabled={isConsolidating}
          >
            Cancel
          </button>
          <button
            onClick={handleConsolidate}
            className="consolidate-confirm-btn"
            disabled={!canConsolidate || !consolidatedDescription.trim() || isConsolidating}
          >
            {isConsolidating ? 'Consolidating...' : 'Consolidate Transactions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ConsolidateRecipientDialog);