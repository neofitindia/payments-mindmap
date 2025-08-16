import React, { useState, useEffect, memo } from 'react';
import CurrencyInput from './CurrencyInput';
import NotificationDialog from './NotificationDialog';
import './BudgetCreateDialog.css';

interface BudgetCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBudget: (name: string, initialPayment: number) => Promise<{ success: boolean; error?: string }>;
  isFirstBudget?: boolean;
}

const BudgetCreateDialog: React.FC<BudgetCreateDialogProps> = ({
  isOpen,
  onClose,
  onCreateBudget,
  isFirstBudget = false
}) => {
  const [budgetName, setBudgetName] = useState('');
  const [initialPayment, setInitialPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, message: '', type: 'success' });

  // Close on escape key (unless it's the first budget)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isFirstBudget) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isFirstBudget]);

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

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBudgetName('');
      setInitialPayment('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!budgetName.trim() || !initialPayment) {
      setNotification({
        isOpen: true,
        message: 'Please fill in all fields',
        type: 'error'
      });
      return;
    }

    const amount = parseFloat(initialPayment);
    if (isNaN(amount) || amount < 0) {
      setNotification({
        isOpen: true,
        message: 'Please enter a valid initial payment amount',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onCreateBudget(budgetName.trim(), amount);
      if (result.success) {
        setBudgetName('');
        setInitialPayment('');
        setNotification({
          isOpen: true,
          message: 'Budget created successfully!',
          type: 'success'
        });
        // Close dialog after a short delay to show success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setNotification({
          isOpen: true,
          message: result.error || 'Failed to create budget',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to create budget:', err);
      setNotification({
        isOpen: true,
        message: 'Failed to create budget',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isFirstBudget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="budget-create-backdrop" onClick={handleBackdropClick}>
      <NotificationDialog
        isOpen={notification.isOpen}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="budget-create-dialog">
        <div className="budget-create-header">
          <h2 className="budget-create-title">
            {isFirstBudget ? '🎯 Create Your First Budget' : '💼 New Budget'}
          </h2>
          {!isFirstBudget && (
            <button
              className="budget-create-close"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        <div className="budget-create-content">
          {isFirstBudget && (
            <div className="welcome-message">
              <p>Welcome to Payment Mindmap! Let's create your first budget to get started.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="budget-create-form">
            <div className="form-group">
              <label htmlFor="budget-name">Budget Name</label>
              <input
                type="text"
                id="budget-name"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="e.g., Monthly Expenses, Project Budget"
                required
                disabled={isSubmitting}
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="initial-payment">Initial Payment Amount</label>
              <CurrencyInput
                id="initial-payment"
                value={initialPayment}
                onChange={setInitialPayment}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="btn-create-budget-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : isFirstBudget ? 'Get Started' : 'Create Budget'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default memo(BudgetCreateDialog);
