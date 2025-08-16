import React, { useState, useEffect, memo } from 'react';
import { UIRecipient } from '../types';
import CurrencyInput from './CurrencyInput';
import { formatTransactionAmount } from '../utils/currency';

interface AddTransactionFormProps {
  onAddTransaction: (recipientId: string, transaction: { amount: number; description: string }) => void;
  recipients: UIRecipient[];
  availableBalance: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  preSelectedRecipientId?: string;
}

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({
  onAddTransaction,
  recipients,
  availableBalance,
  onShowNotification,
  preSelectedRecipientId
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState(preSelectedRecipientId || '');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  // Update selected recipient when preSelectedRecipientId changes
  useEffect(() => {
    if (preSelectedRecipientId) {
      setSelectedRecipientId(preSelectedRecipientId);
    }
  }, [preSelectedRecipientId]);

  const handleAmountChange = (value: string) => {
    setTransactionAmount(value);

    // Auto-populate description with "Return" for negative amounts
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue < 0) {
      setTransactionDescription('Return');
    } else if (transactionDescription === 'Return') {
      // Clear "Return" if amount becomes positive or empty
      setTransactionDescription('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRecipientId || !transactionAmount || !transactionDescription.trim()) {
      onShowNotification('Please fill in all fields', 'error');
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount === 0) {
      onShowNotification('Please enter a valid amount', 'error');
      return;
    }

    // Check balance only for positive amounts (payments out)
    if (amount > 0 && amount > availableBalance) {
      onShowNotification('Amount exceeds available balance', 'error');
      return;
    }

    onAddTransaction(selectedRecipientId, {
      amount,
      description: transactionDescription.trim()
    });

    // Reset form except recipient (keep selected for convenience)
    setTransactionAmount('');
    setTransactionDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="sidebar-form">
      <div className="form-group">
        <label htmlFor="transaction-recipient">Select Recipient</label>
        <select
          id="transaction-recipient"
          value={selectedRecipientId}
          onChange={(e) => setSelectedRecipientId(e.target.value)}
          className="sidebar-input"
          autoComplete="off"
          required
        >
          <option value="">Choose recipient...</option>
          {recipients.map(recipient => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.name} ({formatTransactionAmount(recipient.totalAmount)})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="transaction-amount">Amount</label>
        <CurrencyInput
          id="transaction-amount"
          value={transactionAmount}
          onChange={handleAmountChange}
          placeholder="0.00 (negative for returns)"
          className="sidebar-input"
          required
        />
        {selectedRecipientId && (
          <div className={`form-helper-text ${(() => {
            const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);
            if (!selectedRecipient) return '';
            const transactionAmountNum = parseFloat(transactionAmount) || 0;
            return transactionAmountNum > 0 && transactionAmountNum > availableBalance ? 'form-helper-text-error' : '';
          })()}`}>
            Final balance: {(() => {
              const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);
              if (!selectedRecipient) return '₹0';
              const currentAmount = selectedRecipient.totalAmount;
              const transactionAmountNum = parseFloat(transactionAmount) || 0;
              const finalAmount = currentAmount + transactionAmountNum;
              return formatTransactionAmount(finalAmount);
            })()}
            {(() => {
              const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);
              if (!selectedRecipient) return '';
              const transactionAmountNum = parseFloat(transactionAmount) || 0;
              return transactionAmountNum > 0 && transactionAmountNum > availableBalance ? ' (invalid transaction)' : '';
            })()}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="transaction-description">Description</label>
        <input
          type="text"
          id="transaction-description"
          value={transactionDescription}
          onChange={(e) => setTransactionDescription(e.target.value)}
          placeholder="Payment description"
          className="sidebar-input"
          autoComplete="off"
          required
        />
      </div>

      <button
        type="submit"
        className="sidebar-btn-primary"
        disabled={!selectedRecipientId || !transactionAmount.trim() || !transactionDescription.trim()}
      >
        Add Transaction
      </button>
    </form>
  );
};

export default memo(AddTransactionForm);
