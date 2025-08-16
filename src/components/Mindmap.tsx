import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TransferRequest, UIRecipient } from '../types';
import { useMindmapData } from '../hooks/useMindmapData';
import { usePositioning } from '../hooks/usePositioning';
import { mindmapService, budgetService } from '../services';
import BudgetSelector from './BudgetSelector';
import MindmapSummary from './MindmapSummary';
import MindmapCanvas from './MindmapCanvas';
import Sidebar from './Sidebar';
import ManageDialog from './ManageDialog';
import ConfirmDialog from './ConfirmDialog';
import NotificationDialog from './NotificationDialog';
import BudgetCreateDialog from './BudgetCreateDialog';
import DesktopOnlyDialog from './DesktopOnlyDialog';
import ZeroBalanceToggle from './ZeroBalanceToggle';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import FloatingAddTransactionModal from './FloatingAddTransactionModal';
import FloatingAddRecipientModal from './FloatingAddRecipientModal';
import ContextMenu from './ContextMenu';
import ConsolidateRecipientDialog from './ConsolidateRecipientDialog';
import './Mindmap.css';

const Mindmap = React.memo(() => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const {
    mindmapData,
    loading,
    error,
    budgets,
    activeBudget,
    loadData,
    switchBudget,
    addRecipient,
    addTransaction,
    transferAmount,
    removeTransaction,
    removeRecipient,
    updateInitialPayment,
    removeBudget,
    consolidateRecipient,
    setBudgets,
    setActiveBudget
  } = useMindmapData();

  const {
    recipientPositions,
    panOffset,
    loadPositions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  } = usePositioning();

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isBudgetCreateDialogOpen, setIsBudgetCreateDialogOpen] = useState(false);
  const [lastBudgetTimeoutId, setLastBudgetTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showZeroBalanceRecipients, setShowZeroBalanceRecipients] = useState(() => {
    const saved = localStorage.getItem('showZeroBalanceRecipients');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isFloatingTransactionModalOpen, setIsFloatingTransactionModalOpen] = useState(false);
  const [floatingTransactionPreSelectedRecipient, setFloatingTransactionPreSelectedRecipient] = useState<string | undefined>();
  const [isFloatingRecipientModalOpen, setIsFloatingRecipientModalOpen] = useState(false);
  const [isConsolidateDialogOpen, setIsConsolidateDialogOpen] = useState(false);
  const [consolidateTargetRecipient, setConsolidateTargetRecipient] = useState<UIRecipient | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    type: 'recipient' | 'canvas';
    recipientId?: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    type: 'canvas'
  });

  // Custom hook for dialog management
  const useDialogState = <T extends Record<string, any>>(initialState: T) => {
    const [state, setState] = useState<T & { isOpen: boolean }>({
      ...initialState,
      isOpen: false
    });

    const show = useCallback((newState: Partial<T>) => {
      setState(prev => ({ ...prev, ...newState, isOpen: true }));
    }, []);

    const hide = useCallback(() => {
      setState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return { state, show, hide };
  };

  const confirmDialog = useDialogState({
    title: '',
    message: '',
    type: 'warning' as 'danger' | 'warning',
    onConfirm: () => { }
  });

  const notification = useDialogState({
    message: '',
    type: 'success' as 'success' | 'error'
  });

  useEffect(() => {
    loadPositions(mindmapData.recipients);
  }, [mindmapData.recipients, loadPositions]);

  const handleRecipientMouseDown = useCallback((e: React.MouseEvent, recipientId: string) => {
    e.stopPropagation();
    handleMouseDown(e, recipientId);
  }, [handleMouseDown]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
    // Close context menu on any click
    if (contextMenu.isOpen) {
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    }
    handleMouseDown(e);
  }, [handleMouseDown, isSidebarCollapsed, contextMenu.isOpen]);


  const [zoomLevel, setZoomLevel] = useState(1.2); // Starting with 1.2x zoom (default from viewBox)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const anyModalOpen = document.querySelector(
      '.shared-floating-backdrop, .budget-create-backdrop, .manage-dialog-backdrop, .keyboard-shortcuts-backdrop, .confirm-dialog-overlay, .notification-dialog-overlay, .context-menu, .consolidate-dialog-backdrop'
    ) !== null;
    
    // Disable zoom when any modal is open
    if (anyModalOpen) {
      return;
    }
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * delta))); // Limit zoom between 0.5x and 3x
  }, []);

  // Smart keyboard shortcuts - only work when canvas is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' ||
                            activeElement?.tagName === 'SELECT';
      
      const anyModalOpen = document.querySelector(
        '.shared-floating-backdrop, .budget-create-backdrop, .manage-dialog-backdrop, .keyboard-shortcuts-backdrop, .confirm-dialog-overlay, .notification-dialog-overlay, .context-menu, .consolidate-dialog-backdrop'
      ) !== null;

      // Only activate shortcuts when canvas is focused (no inputs, no modals)
      if (!isInputFocused && !anyModalOpen) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            setIsFloatingRecipientModalOpen(true);
            break;
          case 't':
            e.preventDefault();
            setFloatingTransactionPreSelectedRecipient(undefined);
            setIsFloatingTransactionModalOpen(true);
            break;
          case 'm':
            e.preventDefault();
            setIsManageDialogOpen(true);
            break;
          case 'b':
            e.preventDefault();
            setIsBudgetCreateDialogOpen(true);
            break;
          case '?':
            e.preventDefault();
            setIsKeyboardHelpOpen(true);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const availableBalance = useMemo(() =>
    mindmapData.initialPaymentAmount - mindmapData.totalDistributed,
    [mindmapData.initialPaymentAmount, mindmapData.totalDistributed]
  );

  const zeroBalanceCount = useMemo(() =>
    mindmapData.recipients.filter(recipient => recipient.totalAmount === 0).length,
    [mindmapData.recipients]
  );

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    notification.show({ message, type });
  }, [notification]);

  const handleToggleZeroBalance = useCallback(() => {
    setShowZeroBalanceRecipients((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('showZeroBalanceRecipients', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const handleShowKeyboardHelp = useCallback(() => {
    setIsKeyboardHelpOpen(true);
  }, []);

  const handleCloseKeyboardHelp = useCallback(() => {
    setIsKeyboardHelpOpen(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, type: 'recipient' | 'canvas', recipientId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      type,
      recipientId
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    handleContextMenu(e, 'canvas');
  }, [handleContextMenu]);

  const handleRecipientContextMenu = useCallback((e: React.MouseEvent, recipientId: string) => {
    handleContextMenu(e, 'recipient', recipientId);
  }, [handleContextMenu]);

  const getContextMenuItems = useCallback(() => {
    if (contextMenu.type === 'recipient' && contextMenu.recipientId) {
      const recipient = mindmapData.recipients.find(r => r.id === contextMenu.recipientId);
      return [
        {
          label: 'Add Transaction',
          icon: '💳',
          onClick: () => {
            setFloatingTransactionPreSelectedRecipient(contextMenu.recipientId);
            setIsFloatingTransactionModalOpen(true);
          },
          className: 'primary'
        },
        {
          label: `Consolidate "${recipient?.name || 'Recipient'}"`,
          icon: '🔗',
          onClick: () => {
            if (recipient) {
              setConsolidateTargetRecipient(recipient);
              setIsConsolidateDialogOpen(true);
            }
          }
        },
        {
          label: `Remove "${recipient?.name || 'Recipient'}"`,
          icon: '🗑️',
          onClick: () => {
            // Find recipient fresh at execution time to avoid stale closure issues
            const currentRecipient = mindmapData.recipients.find(r => r.id === contextMenu.recipientId);
            
            if (currentRecipient) {
              // Show confirmation dialog (context menu will close automatically)
              confirmDialog.show({
                title: 'Remove Recipient',
                message: `Are you sure you want to remove "${currentRecipient.name}" and all their transactions? This action cannot be undone.`,
                type: 'danger',
                onConfirm: async () => {
                  try {
                    const result = await removeRecipient(currentRecipient.id);
                    if (result.success) {
                      showNotification(`Recipient "${currentRecipient.name}" removed successfully!`);
                    } else {
                      showNotification(result.error || 'Failed to remove recipient', 'error');
                    }
                    confirmDialog.hide();
                  } catch (error) {
                    showNotification('Failed to remove recipient', 'error');
                    confirmDialog.hide();
                  }
                }
              });
            }
          },
          className: 'danger'
        }
      ];
    } else {
      // Canvas context menu
      return [
        {
          label: 'Add Recipient',
          icon: '👤',
          onClick: () => {
            setIsFloatingRecipientModalOpen(true);
          },
          className: 'primary'
        },
        {
          label: 'Create Budget',
          icon: '💼',
          onClick: () => {
            setIsBudgetCreateDialogOpen(true);
          }
        },
        {
          label: 'Manage Budget',
          icon: '⚙️',
          onClick: () => {
            setIsManageDialogOpen(true);
          }
        }
      ];
    }
  }, [contextMenu.type, contextMenu.recipientId, mindmapData.recipients, showNotification, confirmDialog, removeRecipient]);

  const triggerBudgetCreationDialog = useCallback(() => {
    setBudgets([]);
    setActiveBudget(null);
    if (lastBudgetTimeoutId) {
      clearTimeout(lastBudgetTimeoutId);
      setLastBudgetTimeoutId(null);
    }
  }, [setBudgets, setActiveBudget, lastBudgetTimeoutId]);

  const handleBudgetCreate = useCallback(async (name: string, initialAmount: number): Promise<{ success: boolean; shouldClose?: boolean }> => {
    try {
      const createResult = await budgetService.createBudget(name, initialAmount);

      if (!createResult.success || !createResult.budget) {
        showNotification(createResult.error || 'Failed to create budget', 'error');
        return { success: false };
      }

      try {
        await switchBudget(createResult.budget.id);
        const allBudgets = await budgetService.getAllBudgets();
        setBudgets(allBudgets);
        showNotification(`Budget "${name}" created successfully!`);
        setIsBudgetCreateDialogOpen(false);
        return { success: true, shouldClose: true };
      } catch (switchError) {
        const allBudgets = await budgetService.getAllBudgets();
        setBudgets(allBudgets);
        showNotification(`Budget "${name}" created successfully, but failed to switch to it. You can switch manually.`, 'error');
        setIsBudgetCreateDialogOpen(false);
        return { success: true, shouldClose: true };
      }
    } catch (error) {
      showNotification('Failed to create budget', 'error');
      return { success: false };
    }
  }, [setBudgets, switchBudget, showNotification]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your payment data...</p>
      </div>
    );
  }


  if (budgets.length === 0 || !activeBudget) {
    return (
      <div className="handdrawn-mindmap">
        <BudgetCreateDialog
          isOpen={true}
          onClose={() => {}}
          onCreateBudget={handleBudgetCreate}
          isFirstBudget={true}
        />
      </div>
    );
  }

  return (
    <div className="handdrawn-mindmap" onWheel={handleWheel}>
      <div className="mindmap-canvas">
        <BudgetSelector
          budgets={budgets}
          activeBudget={activeBudget}
          onBudgetChange={switchBudget}
          onCreateBudget={() => setIsBudgetCreateDialogOpen(true)}
        />

        <MindmapSummary
          data={mindmapData}
          onManageClick={() => setIsManageDialogOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <MindmapCanvas
          data={mindmapData}
          recipientPositions={recipientPositions}
          panOffset={panOffset}
          zoomLevel={zoomLevel}
          showZeroBalanceRecipients={showZeroBalanceRecipients}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onRecipientMouseDown={handleRecipientMouseDown}
          onCanvasContextMenu={handleCanvasContextMenu}
          onRecipientContextMenu={handleRecipientContextMenu}
        />
      </div>

      <Sidebar
        availableBalance={availableBalance}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onShowKeyboardHelp={handleShowKeyboardHelp}
        onAddRecipient={async (name: string, transaction: { amount: number; description: string }) => {
          const result = await addRecipient(name, transaction);
          if (result.success) {
            showNotification('Recipient added successfully!');
          } else {
            showNotification(result.error || 'Failed to add recipient', 'error');
          }
        }}
        onAddTransaction={async (recipientId: string, transaction: { amount: number; description: string }) => {
          const result = await addTransaction(recipientId, transaction.amount, transaction.description);
          if (result.success) {
            showNotification('Transaction added successfully!');
          } else {
            showNotification(result.error || 'Failed to add transaction', 'error');
          }
        }}
        onTransferAmount={async (transfer: TransferRequest) => {
          const result = await transferAmount(transfer);
          if (result.success) {
            showNotification('Transfer completed successfully!');
          } else {
            showNotification(result.error || 'Failed to transfer amount', 'error');
            throw new Error(result.error || 'Failed to transfer amount');
          }
        }}
        recipients={mindmapData.recipients}
      />

      <ConfirmDialog
        isOpen={confirmDialog.state.isOpen}
        title={confirmDialog.state.title}
        message={confirmDialog.state.message}
        type={confirmDialog.state.type}
        confirmText={confirmDialog.state.type === 'danger' ? 'Delete' : 'Confirm'}
        onConfirm={confirmDialog.state.onConfirm}
        onCancel={confirmDialog.hide}
      />

      <NotificationDialog
        isOpen={notification.state.isOpen}
        message={notification.state.message}
        type={notification.state.type}
        onClose={() => {
          notification.hide();
          if (lastBudgetTimeoutId) {
            triggerBudgetCreationDialog();
          }
        }}
      />

      <ManageDialog
        isOpen={isManageDialogOpen}
        onClose={() => setIsManageDialogOpen(false)}
        recipients={mindmapData.recipients}
        initialPaymentAmount={mindmapData.initialPaymentAmount}
        totalDistributed={mindmapData.totalDistributed}
        availableBalance={availableBalance}
        mindmapData={mindmapData}
        activeBudgetId={activeBudget?.id}
        budgets={budgets}
        onUpdateInitialPayment={async (amount: number) => {
          const result = await updateInitialPayment(amount);
          if (result.success) {
            showNotification('Initial payment updated successfully!');
            return { success: true };
          } else {
            showNotification(result.error || 'Failed to update initial payment', 'error');
            return { success: false, error: result.error };
          }
        }}
        onRemoveTransaction={async (transactionId: string, recipientId: string) => {
          const result = await removeTransaction(transactionId, recipientId);
          if (result.success) {
            showNotification('Transaction removed successfully!');
          } else {
            showNotification(result.error || 'Failed to remove transaction', 'error');
          }
        }}
        onRemoveRecipient={async (recipientId: string) => {
          const result = await removeRecipient(recipientId);
          if (result.success) {
            showNotification('Recipient removed successfully!');
          } else {
            showNotification(result.error || 'Failed to remove recipient', 'error');
          }
        }}
        onRemoveBudget={async (budgetId: string) => {
          const budgetToDelete = budgets.find(b => b.id === budgetId);
          const budgetName = budgetToDelete?.name || 'Budget';
          const isLastBudget = budgets.length === 1;

          if (isLastBudget) {
            try {
              const result = await budgetService.deleteBudget(budgetId);
              
              if (result.success) {
                showNotification(`Budget "${budgetName}" deleted successfully.`);
                setIsManageDialogOpen(false);
                
                const timeoutId = setTimeout(() => {
                  triggerBudgetCreationDialog();
                }, 2500);
                
                setLastBudgetTimeoutId(timeoutId);
                return { success: true };
              } else {
                showNotification(result.error || 'Failed to delete budget', 'error');
                return { success: false, error: result.error };
              }
            } catch (error) {
              showNotification('Failed to delete budget', 'error');
              return { success: false, error: 'Failed to delete budget' };
            }
          }
          const result = await removeBudget(budgetId);
          
          if (result.success) {
            if (result.switchedToBudget) {
              showNotification(`Budget "${budgetName}" deleted. Switched to "${result.switchedToBudget.name}".`);
            } else {
              showNotification(`Budget "${budgetName}" deleted successfully.`);
            }
            setIsManageDialogOpen(false);
            return { success: true };
          } else if (result.switchedToBudget) {
            showNotification(`Budget not found (may have been manually removed). Switched to "${result.switchedToBudget.name}".`, 'error');
            setIsManageDialogOpen(false);
            return { success: false, error: result.error };
          } else {
            showNotification(result.error || 'Failed to delete budget', 'error');
            return { success: false, error: result.error };
          }
        }}
        onRestoreData={async (data) => {
          if (!activeBudget) return;

          const result = await mindmapService.restoreData(data, activeBudget.id);
          if (result.success) {
            await loadData();
            showNotification('Data restored successfully!');
          } else {
            showNotification(result.error || 'Failed to restore data', 'error');
          }
        }}
        onResetStorage={async () => {
          const result = await mindmapService.resetStorage();
          if (result.success) {
            await loadData();
            showNotification('Storage reset successfully!');
          } else {
            showNotification(result.error || 'Failed to reset storage', 'error');
          }
        }}
      />

      <BudgetCreateDialog
        isOpen={isBudgetCreateDialogOpen}
        onClose={() => setIsBudgetCreateDialogOpen(false)}
        onCreateBudget={handleBudgetCreate}
        isFirstBudget={false}
      />

      <DesktopOnlyDialog isVisible={isMobile} />

      <ZeroBalanceToggle
        showZeroBalanceRecipients={showZeroBalanceRecipients}
        onToggle={handleToggleZeroBalance}
        zeroBalanceCount={zeroBalanceCount}
      />

      <KeyboardShortcutsDialog
        isOpen={isKeyboardHelpOpen}
        onClose={handleCloseKeyboardHelp}
      />

      <FloatingAddTransactionModal
        isOpen={isFloatingTransactionModalOpen}
        onClose={() => {
          setIsFloatingTransactionModalOpen(false);
          setFloatingTransactionPreSelectedRecipient(undefined);
        }}
        onAddTransaction={async (recipientId: string, transaction: { amount: number; description: string }) => {
          const result = await addTransaction(recipientId, transaction.amount, transaction.description);
          if (result.success) {
            showNotification('Transaction added successfully!');
          } else {
            showNotification(result.error || 'Failed to add transaction', 'error');
          }
        }}
        recipients={mindmapData.recipients}
        availableBalance={availableBalance}
        onShowNotification={showNotification}
        preSelectedRecipientId={floatingTransactionPreSelectedRecipient}
      />

      <FloatingAddRecipientModal
        isOpen={isFloatingRecipientModalOpen}
        onClose={() => setIsFloatingRecipientModalOpen(false)}
        onAddRecipient={async (name: string, transaction: { amount: number; description: string }) => {
          const result = await addRecipient(name, transaction);
          if (result.success) {
            showNotification('Recipient added successfully!');
          } else {
            showNotification(result.error || 'Failed to add recipient', 'error');
          }
        }}
        availableBalance={availableBalance}
        onShowNotification={showNotification}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        items={getContextMenuItems()}
      />

      <ConsolidateRecipientDialog
        isOpen={isConsolidateDialogOpen}
        onClose={() => {
          setIsConsolidateDialogOpen(false);
          setConsolidateTargetRecipient(null);
        }}
        recipient={consolidateTargetRecipient}
        onConsolidate={async (recipientId: string, description: string) => {
          const result = await consolidateRecipient(recipientId, description);
          if (result.success) {
            showNotification('Transactions consolidated successfully!');
          } else {
            showNotification(result.error || 'Failed to consolidate transactions', 'error');
          }
          return result;
        }}
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
});

export default Mindmap;
