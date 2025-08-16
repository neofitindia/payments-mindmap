const DB_NAME = 'PaymentMindmapDB';
const DB_VERSION = 1;

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(
        new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`)
      );
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.db = db;
        this.setupSchema(db);
      };
    });
  }

  private setupSchema(db: IDBDatabase): void {
    this.setupInitialPaymentStore(db);
    this.setupRecipientsStore(db);
    this.setupTransactionsStore(db);
    this.setupBudgetsStore(db);
  }

  private setupInitialPaymentStore(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('initial_payment')) {
      const store = db.createObjectStore('initial_payment', { keyPath: 'id' });
      store.add({ id: 1, amount: 0, updatedAt: new Date().toISOString() });
    }
  }

  private setupRecipientsStore(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('recipients')) {
      const store = db.createObjectStore('recipients', { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: false });
    }
  }

  private setupTransactionsStore(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('transactions')) {
      const store = db.createObjectStore('transactions', { keyPath: 'id' });
      store.createIndex('recipientId', 'recipientId', { unique: false });
      store.createIndex('budgetId', 'budgetId', { unique: false });
    }
  }

  private setupBudgetsStore(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains('budgets')) {
      const store = db.createObjectStore('budgets', { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: false });
    }
  }

  async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database connection');
    }
    return this.db;
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['recipients', 'transactions', 'initial_payment', 'budgets'], 'readwrite');

      transaction.objectStore('recipients').clear();
      transaction.objectStore('transactions').clear();
      transaction.objectStore('budgets').clear();

      transaction.objectStore('initial_payment').put({
        id: 1,
        amount: 0,
        updatedAt: new Date().toISOString()
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        new Error(`Failed to clear database: ${transaction.error?.message || 'Unknown error'}`)
      );
    });
  }
}

export const databaseService = new DatabaseService();
