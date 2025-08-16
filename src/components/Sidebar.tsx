import React, { useState, useCallback, useMemo, memo } from 'react';
import { UIRecipient, TransferRequest } from '../types';
import logo from '../assets/logo.png';
import AddRecipientForm from './AddRecipientForm';
import AddTransactionForm from './AddTransactionForm';
import TransferForm from './TransferForm';
import NotificationDialog from './NotificationDialog';
import HamburgerToggle from './HamburgerToggle';
import './Sidebar.css';

interface SidebarProps {
  onAddRecipient: (name: string, initialTransaction: { amount: number; description: string }) => void;
  onAddTransaction: (recipientId: string, transaction: { amount: number; description: string }) => void;
  onTransferAmount: (transfer: TransferRequest) => Promise<void>;
  recipients: UIRecipient[];
  availableBalance: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onShowKeyboardHelp?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onAddRecipient,
  onAddTransaction,
  onTransferAmount,
  recipients,
  availableBalance,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  onShowKeyboardHelp
}) => {
  const [activeTab, setActiveTab] = useState<'add-recipient' | 'add-transaction' | 'transfer-amount'>('add-recipient');
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalIsCollapsed(prev => !prev));
  
  // Grouped notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, message: '', type: 'success' });

  // Memoized callback to prevent form re-renders
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, message, type });
  }, []);

  // Memoized callback to prevent NotificationDialog re-renders
  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Memoized form rendering to prevent unnecessary re-creates
  const activeForm = useMemo(() => {
    switch (activeTab) {
      case 'add-recipient':
        return (
          <AddRecipientForm
            onAddRecipient={onAddRecipient}
            availableBalance={availableBalance}
            onShowNotification={showNotification}
          />
        );
      case 'add-transaction':
        return (
          <AddTransactionForm
            onAddTransaction={onAddTransaction}
            recipients={recipients}
            availableBalance={availableBalance}
            onShowNotification={showNotification}
          />
        );
      case 'transfer-amount':
        return (
          <TransferForm
            onTransferAmount={onTransferAmount}
            recipients={recipients}
            onShowNotification={showNotification}
          />
        );
      default:
        return null;
    }
  }, [activeTab, onAddRecipient, onAddTransaction, onTransferAmount, recipients, availableBalance, showNotification]);

  if (isCollapsed) {
    return (
      <div className="sidebar collapsed">
        <HamburgerToggle
          isExpanded={false}
          onClick={toggleCollapse}
          title="Expand sidebar"
          className="sidebar-toggle"
        />
        <div className="sidebar-spacer"></div>
        {onShowKeyboardHelp && (
          <button
            onClick={onShowKeyboardHelp}
            className="help-btn-collapsed"
            title="Keyboard shortcuts"
          >
            ?
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sidebar">
      <NotificationDialog
        isOpen={notification.isOpen}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
      />

      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={logo} alt="Payment Mindmap" className="logo-img" />
          <span className="logo-text">Payment Mindmap</span>
        </div>
        <HamburgerToggle
          isExpanded={true}
          onClick={toggleCollapse}
          title="Collapse sidebar"
          className="sidebar-toggle"
        />
      </div>

      <div className="sidebar-content">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'add-recipient' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-recipient')}
          >
            Add Recipient
          </button>
          <button
            className={`tab-btn ${activeTab === 'add-transaction' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-transaction')}
          >
            Add Transaction
          </button>
          <button
            className={`tab-btn ${activeTab === 'transfer-amount' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer-amount')}
          >
            Transfer
          </button>
        </div>

        <div className="tab-content">
          {activeForm}
        </div>
        
        {onShowKeyboardHelp && (
          <button
            onClick={onShowKeyboardHelp}
            className="help-btn-expanded"
            title="Show keyboard shortcuts"
          >
            Keyboard Shortcuts
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(Sidebar);