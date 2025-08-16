import { Recipient } from '../types';
import { databaseService } from './DatabaseService';

export class RecipientService {
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

  async getAllRecipients(): Promise<{ success: boolean; data?: Recipient[]; error?: string }> {
    return this.executeDBOperation('recipients', 'readonly', (transaction) => {
      return new Promise<Recipient[]>((resolve, reject) => {
        const store = transaction.objectStore('recipients');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getRecipientsByBudgetId(budgetId: string): Promise<{ success: boolean; data?: Recipient[]; error?: string }> {
    try {
      const allRecipientsResult = await this.getAllRecipients();
      if (!allRecipientsResult.success || !allRecipientsResult.data) {
        return { success: false, error: 'Failed to load recipients' };
      }

      const db = await databaseService.ensureDB();
      const budgetTransactions = await new Promise<any[]>((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const index = store.index('budgetId');
        const request = index.getAll(budgetId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      const recipientIds = new Set(budgetTransactions.map(t => t.recipientId));
      const filteredRecipients = allRecipientsResult.data.filter(r => recipientIds.has(r.id));

      return { success: true, data: filteredRecipients };
    } catch (error) {
      console.error('Failed to get recipients by budget ID:', error);
      return { success: false, error: 'Failed to get recipients by budget ID' };
    }
  }

  async createRecipient(recipient: {
    id: string;
    name: string;
    totalAmount: number;
    position: { x: number; y: number };
  }): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['recipients'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('recipients');
        const now = new Date().toISOString();

        const request = store.add({
          id: recipient.id,
          name: recipient.name,
          totalAmount: recipient.totalAmount,
          positionX: recipient.position.x,
          positionY: recipient.position.y,
          createdAt: now,
          updatedAt: now
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async updateRecipientTotal(id: string, newTotal: number): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['recipients'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('recipients');
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const recipient = getRequest.result as Recipient;
          if (!recipient) {
            reject(new Error('Recipient not found'));
            return;
          }

          recipient.totalAmount = newTotal;
          recipient.updatedAt = new Date().toISOString();

          const putRequest = store.put(recipient);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async updateRecipient(recipient: Recipient): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['recipients'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('recipients');
        const request = store.put(recipient);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async deleteRecipient(id: string): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['recipients', 'transactions'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const recipientsStore = transaction.objectStore('recipients');
        const transactionsStore = transaction.objectStore('transactions');

        const transactionIndex = transactionsStore.index('recipientId');
        const transactionRequest = transactionIndex.openCursor(IDBKeyRange.only(id));

        transactionRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            recipientsStore.delete(id);
            resolve();
          }
        };

        transactionRequest.onerror = () => reject(transactionRequest.error);
      });
    }).then(result => ({ success: result.success, error: result.error }));
  }

  async clearBudgetData(budgetId: string): Promise<{ success: boolean; error?: string }> {
    return this.executeDBOperation(['recipients'], 'readwrite', (transaction) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore('recipients');

        if (!store.indexNames.contains('budgetId')) {
          resolve();
          return;
        }

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

export const recipientService = new RecipientService();
