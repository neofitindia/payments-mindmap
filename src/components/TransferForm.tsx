import React, { useState, memo } from 'react';
import { UIRecipient, TransferRequest } from '../types';
import CurrencyInput from './CurrencyInput';
import { formatTransactionAmount } from '../utils/currency';

interface TransferFormProps {
  onTransferAmount: (transfer: TransferRequest) => Promise<void>;
  recipients: UIRecipient[];
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const TransferForm: React.FC<TransferFormProps> = ({
  onTransferAmount,
  recipients,
  onShowNotification
}) => {
  const [fromRecipientId, setFromRecipientId] = useState('');
  const [toRecipientId, setToRecipientId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');

  const getAvailableAmount = (recipientId: string) => {
    const recipient = recipients.find(r => r.id === recipientId);
    return recipient ? Math.max(0, recipient.totalAmount) : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromRecipientId || !toRecipientId || !transferAmount) {
      onShowNotification('Please fill in all required fields', 'error');
      return;
    }

    if (toRecipientId === 'create_new' && !newRecipientName.trim()) {
      onShowNotification('Please enter a name for the new recipient', 'error');
      return;
    }

    if (fromRecipientId === toRecipientId) {
      onShowNotification('Cannot transfer to the same recipient', 'error');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      onShowNotification('Please enter a valid amount greater than 0', 'error');
      return;
    }

    const availableAmount = getAvailableAmount(fromRecipientId);
    if (amount > availableAmount) {
      onShowNotification('Transfer amount exceeds available balance for source recipient', 'error');
      return;
    }

    try {
      await onTransferAmount({
        fromRecipientId,
        toRecipientId,
        amount,
        description: transferDescription.trim(),
        newRecipientName: toRecipientId === 'create_new' ? newRecipientName.trim() : undefined
      });

      // Reset form only on successful transfer
      setFromRecipientId('');
      setToRecipientId('');
      setTransferAmount('');
      setTransferDescription('');
      setNewRecipientName('');
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const selectedFromRecipient = recipients.find(r => r.id === fromRecipientId);
  const recipientsWithBalance = recipients.filter(r => r.totalAmount > 0);

  if (recipients.length === 0) {
    return (
      <div className="sidebar-form">
        <div className="form-message">
          <p>You need at least 1 recipient to use the transfer feature.</p>
          <p>Add a recipient in the "Add Recipient" tab first.</p>
        </div>
      </div>
    );
  }

  if (recipientsWithBalance.length === 0) {
    return (
      <div className="sidebar-form">
        <div className="form-message">
          <p>No recipients have available balance for transfers.</p>
          <p>Add transactions to recipients first to enable transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sidebar-form">
      <div className="form-group">
        <label htmlFor="from-recipient">Transfer From</label>
        <select
          id="from-recipient"
          value={fromRecipientId}
          onChange={(e) => setFromRecipientId(e.target.value)}
          className="sidebar-input"
          autoComplete="off"
          required
        >
          <option value="">Choose source recipient...</option>
          {recipients
            .filter(r => r.totalAmount > 0)
            .map(recipient => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name} ({formatTransactionAmount(recipient.totalAmount)})
              </option>
            ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="to-recipient">Transfer To</label>
        <select
          id="to-recipient"
          value={toRecipientId}
          onChange={(e) => {
            setToRecipientId(e.target.value);
            if (e.target.value !== 'create_new') {
              setNewRecipientName('');
            }
          }}
          className="sidebar-input"
          autoComplete="off"
          required
        >
          <option value="">Choose destination recipient...</option>
          {recipients
            .filter(r => r.id !== fromRecipientId)
            .map(recipient => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
              </option>
            ))}
          <option value="create_new">+ Create New Recipient</option>
        </select>
      </div>

      {toRecipientId === 'create_new' && (
        <div className="form-group">
          <label htmlFor="new-recipient-name">New Recipient Name</label>
          <input
            type="text"
            id="new-recipient-name"
            value={newRecipientName}
            onChange={(e) => setNewRecipientName(e.target.value)}
            placeholder="Enter recipient name"
            className="sidebar-input"
            autoComplete="off"
            required
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="transfer-amount">Amount</label>
        <CurrencyInput
          id="transfer-amount"
          value={transferAmount}
          onChange={setTransferAmount}
          placeholder="0.00"
          min="0"
          className="sidebar-input"
          required
        />
        {selectedFromRecipient && (
          <div className={`form-helper-text ${
            selectedFromRecipient.totalAmount - (parseFloat(transferAmount) || 0) < 0 
              ? 'form-helper-text-error' 
              : ''
          }`}>
            Balance after transfer: {formatTransactionAmount(
              selectedFromRecipient.totalAmount - (parseFloat(transferAmount) || 0)
            )}
            {selectedFromRecipient.totalAmount - (parseFloat(transferAmount) || 0) < 0 && 
              ' (invalid transfer)'
            }
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="transfer-description">Description (Optional)</label>
        <input
          type="text"
          id="transfer-description"
          value={transferDescription}
          onChange={(e) => setTransferDescription(e.target.value)}
          placeholder="Transfer reason"
          className="sidebar-input"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        className="sidebar-btn-primary"
        disabled={
          !fromRecipientId ||
          !toRecipientId ||
          !transferAmount.trim() ||
          (toRecipientId === 'create_new' && !newRecipientName.trim())
        }
      >
        Transfer Amount
      </button>
    </form>
  );
};

export default memo(TransferForm);
