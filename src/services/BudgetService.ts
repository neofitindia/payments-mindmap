import { Budget } from '../types';
import { databaseService } from './DatabaseService';

export class BudgetService {
  private static readonly ACTIVE_BUDGET_KEY = 'activeBudgetId';

  async createBudget(name: string, initialPayment: number): Promise<{ success: boolean; budget?: Budget; error?: string }> {
    try {
      // Check for duplicate names
      const existingBudgets = await this.getAllBudgets();
      const duplicateName = existingBudgets.find(budget => 
        budget.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (duplicateName) {
        return { success: false, error: 'A budget with this name already exists' };
      }

      const budgetId = `budget-${Date.now()}`;
      const currentDate = new Date().toISOString();

      const newBudget: Budget = {
        id: budgetId,
        name: name.trim(),
        initialPayment,
        createdAt: currentDate,
        updatedAt: currentDate
      };

      await this.createBudgetRecord(newBudget);
      return { success: true, budget: newBudget };
    } catch (error) {
      console.error('Failed to create budget:', error);
      return { success: false, error: 'Failed to create budget' };
    }
  }

  private async createBudgetRecord(budget: Budget): Promise<void> {
    const db = await databaseService.ensureDB();
    const transaction = db.transaction(['budgets'], 'readwrite');
    const store = transaction.objectStore('budgets');

    store.add({
      id: budget.id,
      name: budget.name,
      initialPayment: budget.initialPayment,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt
    });
  }

  async getAllBudgets(): Promise<Budget[]> {
    const db = await databaseService.ensureDB();
    const transaction = db.transaction(['budgets'], 'readonly');
    const store = transaction.objectStore('budgets');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const budgets = request.result.map((dbBudget: any) => ({
          id: dbBudget.id,
          name: dbBudget.name,
          initialPayment: dbBudget.initialPayment,
          createdAt: dbBudget.createdAt,
          updatedAt: dbBudget.updatedAt
        }));
        resolve(budgets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveBudget(): Promise<Budget | null> {
    const activeBudgetId = localStorage.getItem(BudgetService.ACTIVE_BUDGET_KEY);
    if (!activeBudgetId) return null;
    
    const budget = await this.getBudgetById(activeBudgetId);
    if (!budget) {
      // Stale ID - clean it up and auto-select first available
      localStorage.removeItem(BudgetService.ACTIVE_BUDGET_KEY);
      const allBudgets = await this.getAllBudgets();
      if (allBudgets.length > 0 && allBudgets[0]) {
        await this.setActiveBudget(allBudgets[0].id);
        return allBudgets[0];
      }
    }
    
    return budget;
  }

  async getBudgetById(budgetId: string): Promise<Budget | null> {
    const db = await databaseService.ensureDB();
    const transaction = db.transaction(['budgets'], 'readonly');
    const store = transaction.objectStore('budgets');

    return new Promise((resolve, reject) => {
      const request = store.get(budgetId);
      request.onsuccess = () => {
        const dbBudget = request.result;
        if (dbBudget) {
          resolve({
            id: dbBudget.id,
            name: dbBudget.name,
            initialPayment: dbBudget.initialPayment,
            createdAt: dbBudget.createdAt,
            updatedAt: dbBudget.updatedAt
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setActiveBudget(budgetId: string): Promise<void> {
    // Verify the budget exists before setting as active
    const budget = await this.getBudgetById(budgetId);
    if (!budget) {
      throw new Error(`Budget with id ${budgetId} not found`);
    }
    
    localStorage.setItem(BudgetService.ACTIVE_BUDGET_KEY, budgetId);
  }

  async updateBudget(budget: Budget): Promise<void> {
    const db = await databaseService.ensureDB();
    const transaction = db.transaction(['budgets'], 'readwrite');
    const store = transaction.objectStore('budgets');

    store.put({
      id: budget.id,
      name: budget.name,
      initialPayment: budget.initialPayment,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt
    });
  }

  async deleteBudget(budgetId: string): Promise<{ success: boolean; switchedToBudget?: Budget; error?: string }> {
    try {
      const budgetToDelete = await this.getBudgetById(budgetId);
      if (!budgetToDelete) {
        const activeId = localStorage.getItem(BudgetService.ACTIVE_BUDGET_KEY);
        if (activeId === budgetId) {
          const allBudgets = await this.getAllBudgets();
          if (allBudgets.length > 0 && allBudgets[0]) {
            await this.setActiveBudget(allBudgets[0].id);
            return { success: false, error: 'Budget not found, but switched to an available budget', switchedToBudget: allBudgets[0] };
          } else {
            localStorage.removeItem(BudgetService.ACTIVE_BUDGET_KEY);
          }
        }
        return { success: false, error: 'Budget not found' };
      }

      const db = await databaseService.ensureDB();
      const transaction = db.transaction(['budgets'], 'readwrite');
      const store = transaction.objectStore('budgets');
      store.delete(budgetId);
      
      const activeId = localStorage.getItem(BudgetService.ACTIVE_BUDGET_KEY);
      let switchedToBudget: Budget | undefined;
      
      if (activeId === budgetId) {
        const remainingBudgets = await this.getAllBudgets().then(budgets => 
          budgets.filter(b => b.id !== budgetId)
        );
        
        if (remainingBudgets.length > 0 && remainingBudgets[0]) {
          await this.setActiveBudget(remainingBudgets[0].id);
          switchedToBudget = remainingBudgets[0];
        } else {
          localStorage.removeItem(BudgetService.ACTIVE_BUDGET_KEY);
        }
      }

      return { success: true, switchedToBudget };
    } catch (error) {
      console.error('Failed to delete budget:', error);
      return { success: false, error: 'Failed to delete budget' };
    }
  }

  async getInitialPayment(budgetId?: string): Promise<number> {
    if (budgetId) {
      const budget = await this.getBudgetById(budgetId);
      return budget?.initialPayment || 0;
    }
    
    const db = await databaseService.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['initial_payment'], 'readonly');
      const store = transaction.objectStore('initial_payment');
      const request = store.get(1);

      request.onsuccess = () => {
        const result = request.result as { amount: number } | undefined;
        resolve(result?.amount || 0);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateInitialPayment(amount: number): Promise<void> {
    const db = await databaseService.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['initial_payment'], 'readwrite');
      const store = transaction.objectStore('initial_payment');
      const request = store.put({
        id: 1,
        amount,
        updatedAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const budgetService = new BudgetService();