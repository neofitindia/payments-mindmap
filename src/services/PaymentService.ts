import {
  PaymentMindmapData,
  UIRecipient,
  TransferRequest,
  Recipient,
  Transaction
} from '../types';
import { databaseService } from './DatabaseService';
import { budgetService } from './BudgetService';
import { recipientService } from './RecipientService';
import { transactionService } from './TransactionService';

export class PaymentService {
  private generateId(prefix: string = 'payment'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private async calculateRecipientPosition(existingCount: number): Promise<{ x: number; y: number }> {
    const centerX = 400;
    const centerY = 300;
    const minDistance = 140; // Minimum distance between recipients to avoid overlap
    
    // Get existing recipient positions
    const existingRecipientsResult = await recipientService.getAllRecipients();
    const existingPositions = existingRecipientsResult.success && existingRecipientsResult.data
      ? existingRecipientsResult.data.map(r => ({ x: r.positionX, y: r.positionY }))
      : [];
    
    // Try positions in a spiral pattern
    for (let radius = 200; radius <= 500; radius += 80) {
      const angleStep = Math.max(30, 360 / Math.max(8, Math.floor(radius / 40)));
      
      for (let angle = 0; angle < 360; angle += angleStep) {
        const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
        const y = centerY + radius * Math.sin((angle * Math.PI) / 180);
        
        const tooClose = existingPositions.some(pos => {
          const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
          return distance < minDistance;
        });
        
        if (!tooClose) {
          return { x, y };
        }
      }
    }
    
    // Fallback: use original method if spiral fails
    const angle = (existingCount * 60) % 360;
    const radius = 200 + (existingCount * 20);
    const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
    const y = centerY + radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  }

  async getTotalDistributed(budgetId?: string): Promise<number> {
    try {
      const transactionsResult = budgetId
        ? await transactionService.getTransactionsByBudgetId(budgetId)
        : await transactionService.getAllTransactions();

      if (!transactionsResult.success || !transactionsResult.data) {
        return 0;
      }

      return transactionsResult.data.reduce((total, transaction) => total + transaction.amount, 0);
    } catch (error) {
      console.error('Failed to get total distributed:', error);
      return 0;
    }
  }

  async getAvailableBalance(budgetId?: string): Promise<number> {
    try {
      const initialPayment = await budgetService.getInitialPayment(budgetId);
      const totalDistributed = await this.getTotalDistributed(budgetId);
      return initialPayment - totalDistributed;
    } catch (error) {
      console.error('Failed to get available balance:', error);
      return 0;
    }
  }

  async loadData(budgetId?: string): Promise<PaymentMindmapData> {
    try {
      if (!budgetId) {
        const activeBudget = await budgetService.getActiveBudget();
        budgetId = activeBudget?.id;
      }

      if (!budgetId) {
        return {
          recipients: [],
          totalDistributed: 0,
          initialPaymentAmount: 0
        };
      }

      const initialPaymentAmount = await budgetService.getInitialPayment(budgetId);
      const dbRecipientsResult = await recipientService.getRecipientsByBudgetId(budgetId);
      const budgetTransactionsResult = await transactionService.getTransactionsByBudgetId(budgetId);

      if (!dbRecipientsResult.success || !budgetTransactionsResult.success) {
        throw new Error('Failed to load recipients or transactions');
      }

      const dbRecipients = dbRecipientsResult.data || [];
      const budgetTransactions = budgetTransactionsResult.data || [];

      const recipients: UIRecipient[] = dbRecipients.map(dbRecipient => {
        const recipientTransactions = budgetTransactions.filter(t => t.recipientId === dbRecipient.id);

        return {
          id: dbRecipient.id,
          name: dbRecipient.name,
          totalAmount: dbRecipient.totalAmount,
          position: {
            x: dbRecipient.positionX,
            y: dbRecipient.positionY
          },
          transactions: recipientTransactions
            .sort((a, b) => {
              const dateA = new Date(a.date + 'T' + (a.createdAt || '00:00:00')).getTime();
              const dateB = new Date(b.date + 'T' + (b.createdAt || '00:00:00')).getTime();
              return dateB - dateA;
            })
            .map(t => ({
              id: t.id,
              amount: t.amount,
              date: t.date,
              description: t.description,
              recipientId: t.recipientId,
              createdAt: t.createdAt,
              transferId: t.transferId,
              transferType: t.transferType,
              budgetId: t.budgetId
            }))
        };
      });

      const totalDistributed = await this.getTotalDistributed(budgetId);

      return {
        recipients,
        totalDistributed,
        initialPaymentAmount,
        budgetId
      };
    } catch (error) {
      console.error('Failed to load data:', error);
      throw new Error('Failed to load payment data from database');
    }
  }

  async updateInitialPayment(amount: number, budgetId?: string): Promise<void> {
    try {
      if (budgetId) {
        const budget = await budgetService.getBudgetById(budgetId);
        if (budget) {
          const updatedBudget = {
            ...budget,
            initialPayment: amount,
            updatedAt: new Date().toISOString()
          };
          await budgetService.updateBudget(updatedBudget);
        } else {
          throw new Error('Budget not found');
        }
      } else {
        await budgetService.updateInitialPayment(amount);
      }
    } catch (error) {
      console.error('Failed to update initial payment:', error);
      throw new Error('Failed to update initial payment amount');
    }
  }

  async addRecipient(
    name: string,
    initialTransaction: { amount: number; description: string },
    budgetId?: string
  ): Promise<{ recipient: UIRecipient; success: boolean; error?: string }> {
    try {
      if (!budgetId) {
        const activeBudget = await budgetService.getActiveBudget();
        budgetId = activeBudget?.id;
      }

      if (!budgetId) {
        return {
          recipient: {} as UIRecipient,
          success: false,
          error: 'No active budget found'
        };
      }

      const availableBalance = await this.getAvailableBalance(budgetId);
      if (initialTransaction.amount > availableBalance) {
        return {
          recipient: {} as UIRecipient,
          success: false,
          error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}`
        };
      }

      const existingRecipientsResult = await recipientService.getAllRecipients();
      if (!existingRecipientsResult.success || !existingRecipientsResult.data) {
        return { recipient: {} as UIRecipient, success: false, error: 'Failed to load existing recipients' };
      }
      const position = await this.calculateRecipientPosition(existingRecipientsResult.data.length);

      const recipientId = this.generateId();
      const recipient = {
        id: recipientId,
        name,
        totalAmount: initialTransaction.amount,
        position
      };

      await recipientService.createRecipient(recipient);

      const transactionId = this.generateId();
      const transaction: {
        id: string;
        recipientId: string;
        amount: number;
        description: string;
        date: string;
        budgetId: string;
      } = {
        id: transactionId,
        recipientId,
        amount: initialTransaction.amount,
        description: initialTransaction.description,
        date: new Date().toISOString().split('T')[0]!,
        budgetId: budgetId!
      };

      const createResult = await transactionService.createTransaction(transaction);
      if (!createResult.success) {
        return { recipient: {} as UIRecipient, success: false, error: createResult.error };
      }

      const result: UIRecipient = {
        ...recipient,
        transactions: [{
          id: transaction.id,
          amount: transaction.amount,
          date: transaction.date,
          description: transaction.description,
          recipientId: transaction.recipientId,
          createdAt: new Date().toISOString()
        }]
      };

      return { recipient: result, success: true };
    } catch (error) {
      console.error('Failed to add recipient:', error);
      return {
        recipient: {} as UIRecipient,
        success: false,
        error: 'Failed to add recipient to database'
      };
    }
  }

  async addTransaction(
    recipientId: string,
    transaction: { amount: number; description: string },
    budgetId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!budgetId) {
        const activeBudget = await budgetService.getActiveBudget();
        budgetId = activeBudget?.id;
      }

      if (!budgetId) {
        return { success: false, error: 'No active budget found' };
      }

      const availableBalance = await this.getAvailableBalance(budgetId);
      if (transaction.amount > availableBalance) {
        return {
          success: false,
          error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}`
        };
      }

      const recipientsResult = await recipientService.getAllRecipients();
      if (!recipientsResult.success || !recipientsResult.data) {
        return { success: false, error: 'Failed to load recipients' };
      }
      const recipient = recipientsResult.data.find(r => r.id === recipientId);

      if (!recipient) {
        return { success: false, error: 'Recipient not found' };
      }

      const transactionId = this.generateId();
      const newTransaction = {
        id: transactionId,
        recipientId,
        amount: transaction.amount,
        description: transaction.description,
        date: new Date().toISOString().split('T')[0]!,
        budgetId
      };

      await transactionService.createTransaction(newTransaction);

      const newTotal = recipient.totalAmount + transaction.amount;
      const updateResult = await recipientService.updateRecipientTotal(recipientId, newTotal);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add transaction:', error);
      return { success: false, error: 'Failed to add transaction to database' };
    }
  }


  async removeRecipient(recipientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteResult = await recipientService.deleteRecipient(recipientId);
      if (!deleteResult.success) {
        return { success: false, error: deleteResult.error };
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to remove recipient:', error);
      return { success: false, error: 'Failed to remove recipient from database' };
    }
  }

  async removeTransaction(transactionId: string, recipientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const allTransactionsResult = await transactionService.getAllTransactions();
      if (!allTransactionsResult.success || !allTransactionsResult.data) {
        return { success: false, error: 'Failed to load transactions' };
      }
      const allTransactions = allTransactionsResult.data;
      const transactionToRemove = allTransactions.find(t => t.id === transactionId);

      if (!transactionToRemove) {
        return { success: false, error: 'Transaction not found' };
      }

      const isTransfer = (transactionToRemove as any).transferId;

      if (isTransfer) {
        return await this.handleTransferTransactionDeletion(transactionToRemove, allTransactions);
      }

      return await this.handleRegularTransactionDeletion(transactionToRemove, recipientId, allTransactions);
    } catch (error) {
      console.error('Failed to remove transaction:', error);
      return { success: false, error: 'Failed to remove transaction from database' };
    }
  }

  private async handleTransferTransactionDeletion(transactionToRemove: Transaction, allTransactions: Transaction[]): Promise<{ success: boolean; error?: string }> {
    const transferId = transactionToRemove.transferId;
    const linkedTransaction = allTransactions.find(t =>
      (t as any).transferId === transferId && t.id !== transactionToRemove.id
    );

    if (linkedTransaction) {
      await transactionService.deleteTransaction(transactionToRemove.id);
      await transactionService.deleteTransaction(linkedTransaction.id);

      const recipientsResult = await recipientService.getAllRecipients();
      if (!recipientsResult.success || !recipientsResult.data) {
        return { success: false, error: 'Failed to load recipients' };
      }
      const recipients = recipientsResult.data;

      const recipient1 = recipients.find(r => r.id === transactionToRemove.recipientId);
      if (recipient1) {
        const newTotal1 = recipient1.totalAmount - transactionToRemove.amount;
        const updateResult1 = await recipientService.updateRecipientTotal(transactionToRemove.recipientId, newTotal1);
        if (!updateResult1.success) {
          console.error('Failed to update recipient total:', updateResult1.error);
        }
      }

      const recipient2 = recipients.find(r => r.id === linkedTransaction.recipientId);
      if (recipient2) {
        const newTotal2 = recipient2.totalAmount - linkedTransaction.amount;
        const updateResult2 = await recipientService.updateRecipientTotal(linkedTransaction.recipientId, newTotal2);
        if (!updateResult2.success) {
          console.error('Failed to update recipient total:', updateResult2.error);
        }
      }
    } else {
      const updatedTransaction = {
        ...transactionToRemove,
        description: `${transactionToRemove.description} [Transfer link removed]`
      };
      delete (updatedTransaction as any).transferId;
      delete (updatedTransaction as any).transferType;

      await transactionService.updateTransaction(updatedTransaction);
    }

    return { success: true };
  }

  private async handleRegularTransactionDeletion(transactionToRemove: Transaction, recipientId: string, allTransactions: Transaction[]): Promise<{ success: boolean; error?: string }> {
    const recipientTransactions = allTransactions.filter(t => t.recipientId === recipientId);

    if (recipientTransactions.length === 1) {
      const deleteResult = await recipientService.deleteRecipient(recipientId);
      if (!deleteResult.success) {
        return { success: false, error: deleteResult.error };
      }
      return { success: true };
    }

    await transactionService.deleteTransaction(transactionToRemove.id);

    const recipientsResult = await recipientService.getAllRecipients();
    if (!recipientsResult.success || !recipientsResult.data) {
      return { success: false, error: 'Failed to load recipients' };
    }
    const recipients = recipientsResult.data;
    const recipient = recipients.find(r => r.id === recipientId);

    if (recipient) {
      const newTotal = recipient.totalAmount - transactionToRemove.amount;
      const updateResult = await recipientService.updateRecipientTotal(recipientId, newTotal);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }
    }

    return { success: true };
  }

  async restoreData(data: PaymentMindmapData, budgetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await recipientService.clearBudgetData(budgetId);
      await transactionService.clearBudgetData(budgetId);

      // Import recipients
      for (const recipient of data.recipients) {
        const recipientForCreation = {
          id: recipient.id,
          name: recipient.name,
          totalAmount: recipient.totalAmount,
          position: { x: recipient.position.x, y: recipient.position.y }
        };
        await recipientService.createRecipient(recipientForCreation);

        for (const transaction of recipient.transactions) {
          const dbTransaction = {
            ...transaction,
            budgetId,
            createdAt: new Date().toISOString()
          };
          await transactionService.createTransaction(dbTransaction);
        }
      }

      // Update budget initial payment if provided
      if (data.initialPaymentAmount) {
        await this.updateInitialPayment(data.initialPaymentAmount, budgetId);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to restore data:', error);
      return { success: false, error: 'Failed to restore data' };
    }
  }

  async resetStorage(): Promise<{ success: boolean; error?: string }> {
    try {
      await databaseService.clearAllData();

      return { success: true };
    } catch (error) {
      console.error('Failed to reset storage:', error);
      return { success: false, error: 'Failed to reset storage' };
    }
  }

  async transferAmount(transfer: TransferRequest, budgetId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!budgetId) {
        const activeBudget = await budgetService.getActiveBudget();
        budgetId = activeBudget?.id;
      }

      if (!budgetId) {
        return { success: false, error: 'No active budget found' };
      }

      const recipientsResult = await recipientService.getAllRecipients();
      if (!recipientsResult.success || !recipientsResult.data) {
        return { success: false, error: 'Failed to load recipients' };
      }
      const recipients = recipientsResult.data;
      const fromRecipient = recipients.find(r => r.id === transfer.fromRecipientId);
      const toRecipient = recipients.find(r => r.id === transfer.toRecipientId);

      if (!fromRecipient || !toRecipient) {
        return { success: false, error: 'One or both recipients not found' };
      }

      if (fromRecipient.totalAmount < transfer.amount) {
        return { success: false, error: 'Insufficient balance in sender account' };
      }

      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentDate = new Date().toISOString();

      const outgoingTransaction: Transaction = {
        id: `txn_${Date.now()}_out_${Math.random().toString(36).substr(2, 9)}`,
        recipientId: transfer.fromRecipientId,
        amount: -transfer.amount,
        description: `Sent to ${toRecipient.name}${transfer.description ? ` - ${transfer.description}` : ''}`,
        date: currentDate,
        createdAt: currentDate,
        budgetId
      };

      const incomingTransaction: Transaction = {
        id: `txn_${Date.now()}_in_${Math.random().toString(36).substr(2, 9)}`,
        recipientId: transfer.toRecipientId,
        amount: transfer.amount,
        description: `Received from ${fromRecipient.name}${transfer.description ? ` - ${transfer.description}` : ''}`,
        date: currentDate,
        createdAt: currentDate,
        budgetId
      };

      (outgoingTransaction as any).transferId = transferId;
      (outgoingTransaction as any).transferType = 'outgoing';
      (incomingTransaction as any).transferId = transferId;
      (incomingTransaction as any).transferType = 'incoming';

      await transactionService.createTransaction(outgoingTransaction);
      await transactionService.createTransaction(incomingTransaction);

      const updatedFromRecipient: Recipient = {
        ...fromRecipient,
        totalAmount: fromRecipient.totalAmount - transfer.amount,
        updatedAt: currentDate
      };

      const updatedToRecipient: Recipient = {
        ...toRecipient,
        totalAmount: toRecipient.totalAmount + transfer.amount,
        updatedAt: currentDate
      };

      const updateFromResult = await recipientService.updateRecipient(updatedFromRecipient);
      const updateToResult = await recipientService.updateRecipient(updatedToRecipient);

      if (!updateFromResult.success) {
        return { success: false, error: updateFromResult.error };
      }
      if (!updateToResult.success) {
        return { success: false, error: updateToResult.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to transfer amount:', error);
      return { success: false, error: 'Failed to process transfer' };
    }
  }

  async consolidateRecipientTransactions(
    recipientId: string,
    consolidatedDescription: string,
    budgetId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!budgetId) {
        const activeBudget = await budgetService.getActiveBudget();
        budgetId = activeBudget?.id;
      }

      if (!budgetId) {
        return { success: false, error: 'No active budget found' };
      }

      const transactionsResult = await transactionService.getTransactionsByRecipientId(recipientId);
      if (!transactionsResult.success || !transactionsResult.data) {
        return { success: false, error: 'Failed to load recipient transactions' };
      }

      const transactions = transactionsResult.data.filter(t => t.budgetId === budgetId);
      
      if (transactions.length <= 1) {
        return { success: false, error: 'Recipient must have more than one transaction to consolidate' };
      }

      // Calculate total amount
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      // Delete all existing transactions
      for (const transaction of transactions) {
        const deleteResult = await transactionService.deleteTransaction(transaction.id);
        if (!deleteResult.success) {
          return { success: false, error: `Failed to delete transaction: ${deleteResult.error}` };
        }
      }

      // Create new consolidated transaction with blue styling
      const consolidatedTransactionId = this.generateId('transaction');
      const consolidatedTransaction = {
        id: consolidatedTransactionId,
        recipientId,
        amount: totalAmount,
        description: consolidatedDescription,
        date: new Date().toISOString(),
        budgetId,
        isConsolidated: true // Mark as consolidated for blue styling
      };

      const createResult = await transactionService.createTransaction(consolidatedTransaction);
      if (!createResult.success) {
        return { success: false, error: 'Failed to create consolidated transaction' };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to consolidate transactions:', error);
      return { success: false, error: 'Failed to consolidate transactions' };
    }
  }

}

export const paymentService = new PaymentService();
