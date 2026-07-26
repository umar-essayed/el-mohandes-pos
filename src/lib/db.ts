import Dexie, { Table } from 'dexie';
import {
  PhoneDevice,
  InventoryItem,
  DigitalWallet,
  WalletTransaction,
  Invoice,
  MaintenanceJob,
  Expense,
  SupplierAccount,
  Shift,
  User,
  CreditCustomer,
  CreditPayment
} from '../types';

export interface PendingSyncItem {
  id?: number;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  createdAt: string;
}

export class ElMohandesLocalDB extends Dexie {
  users!: Table<User>;
  phones!: Table<PhoneDevice>;
  inventory!: Table<InventoryItem>;
  wallets!: Table<DigitalWallet>;
  walletTransactions!: Table<WalletTransaction>;
  invoices!: Table<Invoice>;
  maintenanceJobs!: Table<MaintenanceJob>;
  expenses!: Table<Expense>;
  suppliers!: Table<SupplierAccount>;
  shifts!: Table<Shift>;
  creditCustomers!: Table<CreditCustomer>;
  creditPayments!: Table<CreditPayment>;
  pendingSync!: Table<PendingSyncItem>;

  constructor() {
    super('ElMohandesStoreDB_V2');
    this.version(1).stores({
      users: 'id, email, role',
      phones: 'id, imei, status, condition',
      inventory: 'id, barcode, category, stockQuantity',
      wallets: 'id, name, provider',
      walletTransactions: 'id, walletId, date',
      invoices: 'id, invoiceNumber, date',
      maintenanceJobs: 'id, ticketNumber, status',
      expenses: 'id, category, date',
      suppliers: 'id, companyName',
      shifts: 'id, shiftNumber, status',
      pendingSync: '++id, table, action, createdAt'
    });
    // Version 2 adds credit tables
    this.version(2).stores({
      users: 'id, email, role',
      phones: 'id, imei, status, condition',
      inventory: 'id, barcode, category, stockQuantity',
      wallets: 'id, name, provider',
      walletTransactions: 'id, walletId, date',
      invoices: 'id, invoiceNumber, date',
      maintenanceJobs: 'id, ticketNumber, status',
      expenses: 'id, category, date',
      suppliers: 'id, companyName',
      shifts: 'id, shiftNumber, status',
      creditCustomers: 'id, name, phone',
      creditPayments: 'id, customerId, date',
      pendingSync: '++id, table, action, createdAt'
    });
  }
}

export const localDB = new ElMohandesLocalDB();
