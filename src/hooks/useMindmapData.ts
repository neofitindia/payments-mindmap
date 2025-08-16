import { useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentMindmapData, Budget, TransferRequest } from '../types';
import { mindmapService } from '../services';
import { budgetService } from '../services/BudgetService';
import { paymentService } from '../services/PaymentService';
import { executeAsyncOperation } from '../utils/asyncHelpers';

interface AppState {
  mindmapData: PaymentMindmapData;
  loading: boolean;
  error: string;
}

interface BudgetState {
  budgets: Budget[];
  activeBudget: Budget | null;
}

export const useMindmapData = () => {
  const [appState, setAppState] = useState<AppState>({
    mindmapData: {
      recipients: [],
      totalDistributed: 0,
      initialPaymentAmount: 0
    },
    loading: true,
    error: ''
  });
  
  const [budgetState, setBudgetState] = useState<BudgetState>({
    budgets: [],
    activeBudget: null
  });

  // Memoized derived state
  const hasNoBudgets = useMemo(() => budgetState.budgets.length === 0, [budgetState.budgets.length]);
  
  const activeBudgetId = useMemo(() => budgetState.activeBudget?.id, [budgetState.activeBudget?.id]);
  
  const reloadData = useCallback(async () => {
    const data = await mindmapService.loadData(activeBudgetId);
    setAppState(prev => ({
      ...prev,
      mindmapData: data,
      error: ''
    }));
  }, [activeBudgetId]);

  const loadData = useCallback(async () => {
    setAppState(prev => ({ ...prev, loading: true }));
    
    try {
      const allBudgets = await budgetService.getAllBudgets();
      
      if (allBudgets.length === 0) {
        setBudgetState({ budgets: [], activeBudget: null });
        setAppState({
          mindmapData: {
            recipients: [],
            totalDistributed: 0,
            initialPaymentAmount: 0
          },
          loading: false,
          error: ''
        });
        return { showBudgetDialog: true };
      }

      const currentActiveBudget = await budgetService.getActiveBudget();
      const data = await mindmapService.loadData(currentActiveBudget?.id);
      
      setAppState({
        mindmapData: data,
        loading: false,
        error: ''
      });
      setBudgetState({
        budgets: allBudgets,
        activeBudget: currentActiveBudget
      });
      return { showBudgetDialog: false };
    } catch (err) {
      console.error('Failed to load data:', err);
      setAppState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data from database'
      }));
      return { showBudgetDialog: false };
    }
  }, []);

  const switchBudget = useCallback(async (budgetId: string) => {
    const result = await executeAsyncOperation(
      async () => {
        // Update localStorage and get the budget
        await budgetService.setActiveBudget(budgetId);
        const budget = await budgetService.getBudgetById(budgetId);
        
        // Update React state
        setBudgetState(prev => ({ ...prev, activeBudget: budget }));
        
        // Load data for the switched budget
        const data = await mindmapService.loadData(budgetId);
        setAppState(prev => ({ ...prev, mindmapData: data }));
        
        return { success: true };
      },
      {
        errorMessage: 'Failed to switch budget',
        onError: (error) => setAppState(prev => ({ ...prev, error }))
      }
    );
    
    return result;
  }, []);

  const addRecipient = useCallback(async (name: string, initialTransaction: { amount: number; description: string }) => {
    return executeAsyncOperation(
      () => mindmapService.addRecipient(name, initialTransaction, activeBudgetId),
      {
        errorMessage: 'Failed to add recipient',
        onSuccess: reloadData
      }
    );
  }, [activeBudgetId, reloadData]);

  const addTransaction = useCallback(async (recipientId: string, amount: number, description: string) => {
    return executeAsyncOperation(
      () => mindmapService.addTransaction(recipientId, { amount, description }, activeBudgetId),
      {
        errorMessage: 'Failed to add transaction',
        onSuccess: reloadData
      }
    );
  }, [activeBudgetId, reloadData]);

  const transferAmount = useCallback(async (transfer: TransferRequest) => {
    return executeAsyncOperation(
      () => mindmapService.transferAmount(transfer, activeBudgetId),
      {
        errorMessage: 'Failed to transfer amount',
        onSuccess: reloadData
      }
    );
  }, [activeBudgetId, reloadData]);

  const removeTransaction = useCallback(async (transactionId: string, recipientId: string) => {
    return executeAsyncOperation(
      () => mindmapService.removeTransaction(transactionId, recipientId),
      {
        errorMessage: 'Failed to remove transaction',
        onSuccess: reloadData
      }
    );
  }, [reloadData]);

  const removeRecipient = useCallback(async (recipientId: string) => {
    return executeAsyncOperation(
      () => mindmapService.removeRecipient(recipientId),
      {
        errorMessage: 'Failed to remove recipient',
        onSuccess: reloadData
      }
    );
  }, [reloadData]);

  const updateInitialPayment = useCallback(async (amount: number) => {
    return executeAsyncOperation(
      () => mindmapService.updateInitialPayment(amount, activeBudgetId),
      {
        errorMessage: 'Failed to update initial payment',
        onSuccess: reloadData
      }
    );
  }, [activeBudgetId, reloadData]);

  const removeBudget = useCallback(async (budgetId: string): Promise<{ success: boolean; error?: string; switchedToBudget?: Budget }> => {
    try {
      const result = await budgetService.deleteBudget(budgetId);
      
      const wasSuccessfulOrRecovered = result.success || result.switchedToBudget;
      
      if (!wasSuccessfulOrRecovered) {
        setAppState(prev => ({ ...prev, error: result.error || 'Failed to remove budget' }));
        return { success: false, error: result.error };
      }
      
      // Reload budgets
      const allBudgets = await budgetService.getAllBudgets();
      setBudgetState(prev => ({ ...prev, budgets: allBudgets }));
      
      if (activeBudgetId === budgetId || result.switchedToBudget) {
        if (result.switchedToBudget) {
          setBudgetState(prev => ({ ...prev, activeBudget: result.switchedToBudget! }));
          await reloadData();
        } else {
          setBudgetState(prev => ({ ...prev, activeBudget: null }));
          setAppState(prev => ({
            ...prev,
            mindmapData: {
              initialPaymentAmount: 0,
              totalDistributed: 0,
              recipients: []
            }
          }));
        }
      }
      
      setAppState(prev => ({ ...prev, error: '' }));
      return { 
        success: result.success,
        switchedToBudget: result.switchedToBudget,
        error: result.success ? undefined : result.error
      };
    } catch (error) {
      setAppState(prev => ({ ...prev, error: 'Failed to remove budget' }));
      return { success: false, error: 'Failed to remove budget' };
    }
  }, [activeBudgetId, reloadData]);

  const consolidateRecipient = useCallback(async (recipientId: string, description: string) => {
    try {
      const result = await paymentService.consolidateRecipientTransactions(recipientId, description, activeBudgetId);
      if (result.success) {
        await reloadData();
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Failed to consolidate recipient transactions' };
    }
  }, [activeBudgetId, reloadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized setter functions to prevent recreation
  const setBudgets = useCallback((budgets: Budget[]) => 
    setBudgetState(prev => ({ ...prev, budgets })), []);
  
  const setActiveBudget = useCallback((activeBudget: Budget | null) => 
    setBudgetState(prev => ({ ...prev, activeBudget })), []);

  return {
    ...appState,
    ...budgetState,
    hasNoBudgets,
    activeBudgetId,
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
  };
};