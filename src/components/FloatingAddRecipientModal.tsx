import React, { useEffect, useRef, memo } from 'react';
import SharedFloatingDialog from './SharedFloatingDialog';
import AddRecipientForm from './AddRecipientForm';

interface FloatingAddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecipient: (name: string, initialTransaction: { amount: number; description: string }) => void;
  availableBalance: number;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const FloatingAddRecipientModal: React.FC<FloatingAddRecipientModalProps> = ({
  isOpen,
  onClose,
  onAddRecipient,
  availableBalance,
  onShowNotification
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstInput = dialogRef.current?.querySelector('input') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleAddRecipient = async (name: string, initialTransaction: { amount: number; description: string }) => {
    try {
      await onAddRecipient(name, initialTransaction);
      onClose(); // Close modal on successful submission
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Add recipient failed:', error);
    }
  };

  return (
    <SharedFloatingDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Recipient"
      maxWidth="450px"
    >
      <div ref={dialogRef}>
        <AddRecipientForm
          onAddRecipient={handleAddRecipient}
          availableBalance={availableBalance}
          onShowNotification={onShowNotification}
        />
      </div>
    </SharedFloatingDialog>
  );
};

export default memo(FloatingAddRecipientModal);