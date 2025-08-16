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
import { paymentService } from './PaymentService';

export class MindmapService {
  private generateId(prefix: string = 'payment'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private calculateRecipientPosition(existingCount: number): { x: number; y: number } {
    const angle = (existingCount * 60) % 360;
    const radius = 200;
    const centerX = 400;
    const centerY = 300;

    const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
    const y = centerY + radius * Math.sin((angle * Math.PI) / 180);
    
    return { x, y };
  }

  private async validateRecipientName(name: string, budgetId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const existingRecipientsResult = await recipientService.getRecipientsByBudgetId(budgetId);
      if (!existingRecipientsResult.success || !existingRecipientsResult.data) {
        return { valid: false, error: 'Failed to load recipients' };
      }
      const duplicate = existingRecipientsResult.data.find(r => r.name.toLowerCase() === name.toLowerCase());
      
      if (duplicate) {
        return { valid: false, error: `Recipient "${name}" already exists in this budget` };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Failed to validate recipient name' };
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
              // Sort by createdAt timestamp for true chronological order
              const timeA = new Date(a.createdAt || a.date).getTime();
              const timeB = new Date(b.createdAt || b.date).getTime();
              return timeA - timeB; // Oldest first (chronological order)
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

      const totalDistributed = await paymentService.getTotalDistributed(budgetId);

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

  private async validateRecipientCreation(
    name: string,
    amount: number,
    budgetId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const nameValidation = await this.validateRecipientName(name, budgetId);
    if (!nameValidation.valid) {
      return nameValidation;
    }

    if (amount > 0) {
      const availableBalance = await paymentService.getAvailableBalance(budgetId);
      if (amount > availableBalance) {
        return {
          valid: false,
          error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}`
        };
      }
    }

    return { valid: true };
  }

  private async createRecipientWithPosition(name: string, budgetId: string): Promise<{ recipient: Recipient; success: boolean; error?: string }> {
    try {
      const existingRecipientsResult = await recipientService.getRecipientsByBudgetId(budgetId);
      if (!existingRecipientsResult.success || !existingRecipientsResult.data) {
        return { recipient: {} as Recipient, success: false, error: 'Failed to load existing recipients' };
      }
      const position = this.calculateRecipientPosition(existingRecipientsResult.data.length);

      const recipientId = this.generateId();
      const recipient = {
        id: recipientId,
        name,
        totalAmount: 0,
        position
      };

      const createResult = await recipientService.createRecipient(recipient);
      if (!createResult.success) {
        return { recipient: {} as Recipient, success: false, error: createResult.error };
      }

      const dbRecipient: Recipient = {
        id: recipientId,
        name,
        totalAmount: 0,
        positionX: position.x,
        positionY: position.y,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return { recipient: dbRecipient, success: true };
    } catch (error) {
      console.error('Failed to create recipient:', error);
      return { recipient: {} as Recipient, success: false, error: 'Failed to create recipient' };
    }
  }

  private async createInitialTransaction(
    recipientId: string,
    amount: number,
    description: string,
    budgetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transactionId = this.generateId();
      const transaction = {
        id: transactionId,
        recipientId,
        amount,
        description,
        date: new Date().toISOString().split('T')[0]!,
        budgetId
      };

      const createResult = await transactionService.createTransaction(transaction);
      if (!createResult.success) {
        return { success: false, error: createResult.error };
      }

      // Update recipient total
      const updateResult = await recipientService.updateRecipientTotal(recipientId, amount);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to create initial transaction:', error);
      return { success: false, error: 'Failed to create initial transaction' };
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

      // Validate recipient creation
      const validation = await this.validateRecipientCreation(name, initialTransaction.amount, budgetId);
      if (!validation.valid) {
        return {
          recipient: {} as UIRecipient,
          success: false,
          error: validation.error
        };
      }

      // Create recipient with position
      const recipientResult = await this.createRecipientWithPosition(name, budgetId);
      if (!recipientResult.success) {
        return {
          recipient: {} as UIRecipient,
          success: false,
          error: recipientResult.error
        };
      }

      // Create initial transaction
      const transactionResult = await this.createInitialTransaction(
        recipientResult.recipient.id,
        initialTransaction.amount,
        initialTransaction.description,
        budgetId
      );
      if (!transactionResult.success) {
        return {
          recipient: {} as UIRecipient,
          success: false,
          error: transactionResult.error
        };
      }

      const result: UIRecipient = {
        id: recipientResult.recipient.id,
        name: recipientResult.recipient.name,
        totalAmount: initialTransaction.amount,
        position: { x: recipientResult.recipient.positionX, y: recipientResult.recipient.positionY },
        transactions: [{
          id: this.generateId(),
          amount: initialTransaction.amount,
          date: new Date().toISOString().split('T')[0]!,
          description: initialTransaction.description,
          recipientId: recipientResult.recipient.id,
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

  private async validateTransactionCreation(
    recipientId: string,
    amount: number,
    budgetId: string
  ): Promise<{ valid: boolean; error?: string }> {
    const recipientsResult = await recipientService.getAllRecipients();
    if (!recipientsResult.success || !recipientsResult.data) {
      return { valid: false, error: 'Failed to load recipients' };
    }
    const recipient = recipientsResult.data.find(r => r.id === recipientId);
    if (!recipient) {
      return { valid: false, error: 'Recipient not found' };
    }

    if (amount > 0) {
      const availableBalance = await paymentService.getAvailableBalance(budgetId);
      if (amount > availableBalance) {
        return {
          valid: false,
          error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}`
        };
      }
    }

    return { valid: true };
  }

  private async createTransactionRecord(
    recipientId: string,
    amount: number,
    description: string,
    budgetId: string
  ): Promise<{ transactionId: string; success: boolean; error?: string }> {
    try {
      const transactionId = this.generateId();
      const newTransaction = {
        id: transactionId,
        recipientId,
        amount,
        description,
        date: new Date().toISOString().split('T')[0]!,
        budgetId
      };

      const createResult = await transactionService.createTransaction(newTransaction);
      if (!createResult.success) {
        return { transactionId: '', success: false, error: createResult.error };
      }

      return { transactionId, success: true };
    } catch (error) {
      console.error('Failed to create transaction record:', error);
      return { transactionId: '', success: false, error: 'Failed to create transaction record' };
    }
  }

  private async updateRecipientTotalForTransaction(
    recipientId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const recipientsResult = await recipientService.getAllRecipients();
      if (!recipientsResult.success || !recipientsResult.data) {
        return { success: false, error: 'Failed to load recipients' };
      }
      const recipient = recipientsResult.data.find(r => r.id === recipientId);
      
      if (!recipient) {
        return { success: false, error: 'Recipient not found' };
      }

      const newTotal = recipient.totalAmount + amount;
      const updateResult = await recipientService.updateRecipientTotal(recipientId, newTotal);
      
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update recipient total:', error);
      return { success: false, error: 'Failed to update recipient total' };
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

      // Validate transaction creation
      const validation = await this.validateTransactionCreation(recipientId, transaction.amount, budgetId);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create transaction record
      const transactionResult = await this.createTransactionRecord(
        recipientId,
        transaction.amount,
        transaction.description,
        budgetId
      );
      if (!transactionResult.success) {
        return { success: false, error: transactionResult.error };
      }

      // Update recipient total
      const updateResult = await this.updateRecipientTotalForTransaction(recipientId, transaction.amount);
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

      const recipient1 = recipientsResult.data.find(r => r.id === transactionToRemove.recipientId);
      if (recipient1) {
        const newTotal1 = recipient1.totalAmount - transactionToRemove.amount;
        const updateResult1 = await recipientService.updateRecipientTotal(transactionToRemove.recipientId, newTotal1);
        if (!updateResult1.success) {
          console.error('Failed to update recipient total:', updateResult1.error);
        }
      }

      const recipient2 = recipientsResult.data.find(r => r.id === linkedTransaction.recipientId);
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
    const recipient = recipientsResult.data.find(r => r.id === recipientId);

    if (recipient) {
      const newTotal = recipient.totalAmount - transactionToRemove.amount;
      const updateResult = await recipientService.updateRecipientTotal(recipientId, newTotal);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }
    }

    return { success: true };
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
      let toRecipient = recipients.find(r => r.id === transfer.toRecipientId);

      if (!toRecipient && transfer.toRecipientId === 'create_new' && transfer.newRecipientName) {
        const nameValidation = await this.validateRecipientName(transfer.newRecipientName, budgetId);
        if (!nameValidation.valid) {
          return { success: false, error: nameValidation.error };
        }

        const recipientResult = await this.createRecipientWithPosition(transfer.newRecipientName, budgetId);
        if (!recipientResult.success) {
          return { success: false, error: recipientResult.error };
        }

        toRecipient = recipientResult.recipient;
        transfer.toRecipientId = toRecipient.id;
      }

      if (!fromRecipient || !toRecipient) {
        return { success: false, error: 'One or both recipients not found' };
      }

      if (fromRecipient.totalAmount < transfer.amount) {
        return { success: false, error: 'Insufficient balance in sender account' };
      }

      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const currentDate = new Date().toISOString();

      const outgoingTransaction: Transaction = {
        id: `txn_${Date.now()}_out_${Math.random().toString(36).substring(2, 9)}`,
        recipientId: transfer.fromRecipientId,
        amount: -transfer.amount,
        description: `Sent to ${toRecipient.name}${transfer.description ? ` - ${transfer.description}` : ''}`,
        date: currentDate,
        createdAt: currentDate,
        budgetId
      };

      const incomingTransaction: Transaction = {
        id: `txn_${Date.now()}_in_${Math.random().toString(36).substring(2, 9)}`,
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

  async restoreData(data: PaymentMindmapData, budgetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await recipientService.clearBudgetData(budgetId);
      await transactionService.clearBudgetData(budgetId);

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
}

export const mindmapService = new MindmapService();