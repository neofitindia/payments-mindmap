import React, { useState, useCallback, useMemo, memo } from 'react';
import CurrencyInput from './CurrencyInput';

interface AddRecipientFormProps {
  onAddRecipient: (name: string, initialTransaction: { amount: number; description: string }) => void;
  availableBalance: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const AddRecipientForm: React.FC<AddRecipientFormProps> = ({
  onAddRecipient,
  availableBalance,
  onShowNotification
}) => {
  // Grouped form state
  const [formData, setFormData] = useState({
    recipientName: '',
    initialAmount: '',
    initialDescription: ''
  });

  // Memoized change handlers to prevent re-renders
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, recipientName: e.target.value }));
  }, []);

  const handleAmountChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, initialAmount: value }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, initialDescription: e.target.value }));
  }, []);

  // Memoized form validation
  const isFormValid = useMemo(() => {
    const { recipientName, initialAmount, initialDescription } = formData;
    return recipientName.trim() && initialAmount.trim() && initialDescription.trim();
  }, [formData]);

  // Memoized submit handler
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const { recipientName, initialAmount, initialDescription } = formData;
    
    if (!recipientName.trim() || !initialAmount || !initialDescription.trim()) {
      onShowNotification('Please fill in all fields', 'error');
      return;
    }

    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount <= 0) {
      onShowNotification('Please enter a valid amount greater than 0', 'error');
      return;
    }

    if (amount > availableBalance) {
      onShowNotification('Amount exceeds available balance', 'error');
      return;
    }

    onAddRecipient(recipientName.trim(), {
      amount,
      description: initialDescription.trim()
    });

    // Reset form
    setFormData({
      recipientName: '',
      initialAmount: '',
      initialDescription: ''
    });
  }, [formData, availableBalance, onAddRecipient, onShowNotification]);

  // Check if budget balance is 0
  if (availableBalance <= 0) {
    return (
      <div className="sidebar-form">
        <div className="form-message">
          <p>No available balance to create new recipients.</p>
          <p>Add funds to your budget or use transfers between existing recipients.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sidebar-form">
      <div className="form-group">
        <label htmlFor="recipient-name">Recipient Name</label>
        <input
          type="text"
          id="recipient-name"
          value={formData.recipientName}
          onChange={handleNameChange}
          placeholder="Enter recipient name"
          className="sidebar-input"
          autoComplete="off"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="initial-amount">Initial Amount</label>
        <CurrencyInput
          id="initial-amount"
          value={formData.initialAmount}
          onChange={handleAmountChange}
          placeholder="0.00"
          min="0"
          className="sidebar-input"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="initial-description">Description</label>
        <input
          type="text"
          id="initial-description"
          value={formData.initialDescription}
          onChange={handleDescriptionChange}
          placeholder="Initial payment for..."
          className="sidebar-input"
          autoComplete="off"
          required
        />
      </div>
      
      <button 
        type="submit" 
        className="sidebar-btn-primary"
        disabled={!isFormValid}
      >
        Add Recipient
      </button>
    </form>
  );
};

export default memo(AddRecipientForm);