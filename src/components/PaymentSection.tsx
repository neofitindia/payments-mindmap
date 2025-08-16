import React, { useState, memo } from 'react';
import CurrencyInput from './CurrencyInput';
import { formatTransactionAmount } from '../utils/currency';

interface PaymentSectionProps {
  initialPaymentAmount: number;
  totalDistributed: number;
  availableBalance: number;
  onUpdateInitialPayment: (amount: number) => Promise<{ success: boolean; error?: string }>;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  initialPaymentAmount,
  totalDistributed,
  availableBalance,
  onUpdateInitialPayment,
  onShowNotification
}) => {
  const [initialPaymentInput, setInitialPaymentInput] = useState('');

  const handleUpdateInitialPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialPaymentInput) {
      onShowNotification('Please enter an initial payment amount', 'error');
      return;
    }

    const amount = parseFloat(initialPaymentInput);
    if (isNaN(amount) || amount < 0) {
      onShowNotification('Please enter a valid amount', 'error');
      return;
    }

    if (amount < totalDistributed) {
      onShowNotification(`Initial payment cannot be less than distributed amount (${formatTransactionAmount(totalDistributed)})`, 'error');
      return;
    }

    try {
      const result = await onUpdateInitialPayment(amount);
      if (result.success) {
        setInitialPaymentInput('');
      }
    } catch (error) {
      // Error handling is done at parent level
    }
  };

  return (
    <div className="manage-section">
      <div className="section-header">
        <h3>Budget's Initial Payment</h3>
      </div>
      <div className="section-content">
        <div className="payment-stats">
          <div className="stat-item">
            <span className="stat-label">Current:</span>
            <span className="stat-value current">{formatTransactionAmount(initialPaymentAmount)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Available:</span>
            <span className="stat-value available">{formatTransactionAmount(availableBalance)}</span>
          </div>
        </div>
        <form onSubmit={handleUpdateInitialPayment} className="payment-update-form">
          <label htmlFor="manage-initial-payment-amount" className="visually-hidden">New Amount</label>
          <CurrencyInput
            id="manage-initial-payment-amount"
            value={initialPaymentInput}
            onChange={setInitialPaymentInput}
            placeholder="Enter new amount"
            min="0"
            required
          />
          <button 
            type="submit" 
            className="btn-update-handdrawn"
            disabled={!initialPaymentInput.trim()}
          >
            Update Budget Payment
          </button>
        </form>
      </div>
    </div>
  );
};

export default memo(PaymentSection);