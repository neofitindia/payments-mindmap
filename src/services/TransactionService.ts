import { Transaction } from '../types';
import { databaseService } from './DatabaseService';

export class TransactionService {
  private async executeDBOperation<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const db = await databaseService.ensureDB();
      const result = await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode);
        transaction.onerror = () => reject(transaction.error);
        operation(transaction).then(resolve).catch(reject);
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Database operation failed:', error);
      return { success: false, error: 'Database operation failed' };
    }
  }

  async getAllTransactions(): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readonly', (transaction) => {
      return new Promise<Transaction[]>((resolve, reject) => {
        const store = transaction.objectStore('transactions');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getTransactionsByBudgetId(budgetId: string): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readonly', (transaction) => {
      return new Promise<Transaction[]>((resolve, reject) => {
        const store = transaction.objectStore('transactions');
        const index = store.index('budgetId');
        const request = index.getAll(budgetId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getTransactionsByRecipientId(recipientId: string): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readonly', (transaction) => {
      return new Promise<Transaction[]>((resolve, reject) => {
        const store = transaction.objectStore('transactions');
        const index = store.index('recipientId');
        const request = index.getAll(recipientId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async createTransaction(transaction: {
    id: string;
    recipientId: string;
    amount: number;
    description: string;
    date: string;
    budgetId?: string;
    transferId?: string;
    transferType?: 'outgoing' | 'incoming';
    isConsolidated?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readwrite', (dbTransaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = dbTransaction.objectStore('transactions');
        const request = store.add({
          ...transaction,
          createdAt: new Date().toISOString()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async updateTransaction(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readwrite', (dbTransaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = dbTransaction.objectStore('transactions');
        const request = store.put(transaction);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('transactions');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }


  async clearBudgetData(budgetId: string): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['transactions'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('transactions');
        const index = store.index('budgetId');
        const request = index.openCursor(IDBKeyRange.only(budgetId));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }
}

export const transactionService = new TransactionService();