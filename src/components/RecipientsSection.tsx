import React, { useState, memo } from 'react';
import { UIRecipient } from '../types';
import { formatTransactionAmount } from '../utils/currency';

interface RecipientsSectionProps {
  recipients: UIRecipient[];
  onRemoveRecipient: (recipientId: string) => Promise<void>;
  onRemoveTransaction: (transactionId: string, recipientId: string) => Promise<void>;
}

const RecipientsSection: React.FC<RecipientsSectionProps> = ({
  recipients,
  onRemoveRecipient,
  onRemoveTransaction
}) => {
  const [selectedManageRecipientId, setSelectedManageRecipientId] = useState('');

  const selectedRecipient = recipients.find(r => r.id === selectedManageRecipientId);

  return (
    <div className="manage-section">
      <div className="section-header">
        <h3>Recipients & Transactions</h3>
        <span className="section-badge">{recipients.length} recipients</span>
      </div>
      <div className="section-content">
        {recipients.length === 0 ? (
          <div className="empty-state-handdrawn">
            <div className="empty-icon"></div>
            <p>No recipients to manage yet</p>
          </div>
        ) : (
          <>
            <select
              value={selectedManageRecipientId}
              onChange={(e) => setSelectedManageRecipientId(e.target.value)}
              className="recipient-selector-handdrawn"
            >
              <option value="">Select recipient to manage...</option>
              {recipients.map(recipient => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name} • {formatTransactionAmount(recipient.totalAmount)}
                </option>
              ))}
            </select>

            {selectedRecipient && (
              <div className="recipient-details-handdrawn">
                <div className="recipient-header">
                  <div className="recipient-name">{selectedRecipient.name}</div>
                  <div className="recipient-total">{formatTransactionAmount(selectedRecipient.totalAmount)}</div>
                </div>

                {selectedRecipient.transactions.length > 0 ? (
                  <div className="transactions-section">
                    <div className="transactions-header-handdrawn">
                      <span>Transactions ({selectedRecipient.transactions.length})</span>
                    </div>
                    <div className="transactions-list-handdrawn">
                      {selectedRecipient.transactions.map(transaction => (
                        <div key={transaction.id} className={`transaction-item-handdrawn ${transaction.isConsolidated ? 'consolidated' : ''}`}>
                          <div className="transaction-info">
                            <div className="transaction-amount">
                              {formatTransactionAmount(transaction.amount)}
                            </div>
                            <div className="transaction-description">
                              {transaction.description}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveTransaction(transaction.id, selectedRecipient.id)}
                            className="btn-remove-handdrawn"
                            title="Remove transaction"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state-handdrawn small">
                    <p>No transactions yet</p>
                  </div>
                )}

                <button
                  onClick={() => onRemoveRecipient(selectedRecipient.id)}
                  className="btn-danger-handdrawn"
                  title="Delete recipient and all transactions"
                >
                  Delete Recipient
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(RecipientsSection);