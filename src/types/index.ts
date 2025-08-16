export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  recipientId: string;
  createdAt: string;
  transferId?: string;
  transferType?: 'outgoing' | 'incoming';
  budgetId?: string;
  isConsolidated?: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  totalAmount: number;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
  transactions?: Transaction[];
  budgetId?: string;
}

export interface UIRecipient {
  id: string;
  name: string;
  totalAmount: number;
  position: { x: number; y: number };
  transactions: Transaction[];
  budgetId?: string;
}

export interface Budget {
  id: string;
  name: string;
  initialPayment: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMindmapData {
  recipients: UIRecipient[];
  totalDistributed: number;
  initialPaymentAmount: number;
  budgetId?: string;
}

export interface TransferRequest {
  fromRecipientId: string;
  toRecipientId: string;
  amount: number;
  description?: string;
  newRecipientName?: string; // For creating new recipient during transfer
}

