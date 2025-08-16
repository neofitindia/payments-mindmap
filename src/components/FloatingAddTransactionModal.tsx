import React, { useEffect, useRef, memo } from 'react';
import SharedFloatingDialog from './SharedFloatingDialog';
import AddTransactionForm from './AddTransactionForm';
import { UIRecipient } from '../types';

interface FloatingAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (recipientId: string, transaction: { amount: number; description: string }) => void;
  recipients: UIRecipient[];
  availableBalance: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  preSelectedRecipientId?: string;
}

const FloatingAddTransactionModal: React.FC<FloatingAddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  recipients,
  availableBalance,
  onShowNotification,
  preSelectedRecipientId
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstInput = dialogRef.current?.querySelector('select, input') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleAddTransaction = async (recipientId: string, transaction: { amount: number; description: string }) => {
    try {
      await onAddTransaction(recipientId, transaction);
      onClose(); // Close modal on successful submission
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Transaction failed:', error);
    }
  };

  return (
    <SharedFloatingDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Transaction"
      maxWidth="450px"
    >
      <div ref={dialogRef}>
        <AddTransactionForm
          onAddTransaction={handleAddTransaction}
          recipients={recipients}
          availableBalance={availableBalance}
          onShowNotification={onShowNotification}
          preSelectedRecipientId={preSelectedRecipientId}
        />
      </div>
    </SharedFloatingDialog>
  );
};

export default memo(FloatingAddTransactionModal);