import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  PhoneDevice,
  InventoryItem,
  DigitalWallet,
  WalletTransaction,
  Invoice,
  MaintenanceJob,
  Expense,
  SupplierAccount,
  Shift,
  TradeInDevice,
  StoreSettings,
  CreditCustomer,
  CreditPayment
} from '../types';
import { localDB } from '../lib/db';
import { syncTableFromSupabase, syncPushToSupabase, processPendingOfflineSync, isOnline, getAndClearConflicts, SyncConflict, getPendingSyncCount } from '../lib/syncEngine';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;

  // Global Settings
  storeSettings: StoreSettings;
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => void;

  // Sync state status
  isOnlineMode: boolean;
  isSyncing: boolean;
  reloadAllFromDatabase: () => Promise<void>;

  // Drawer cash state
  drawerCash: number;
  setDrawerCash: React.Dispatch<React.SetStateAction<number>>;

  // Shift management
  currentShift: Shift | null;
  startShift: (initialCash: number) => void;
  closeShift: (actualCash: number, notes?: string) => void;
  shifts: Shift[];

  // Phones
  phones: PhoneDevice[];
  addPhone: (phone: Omit<PhoneDevice, 'id' | 'status' | 'purchaseDate'>) => void;
  updatePhoneStatus: (id: string, status: PhoneDevice['status']) => void;

  // Inventory / Accessories
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateStockQuantity: (id: string, delta: number) => void;
  deleteInventoryItem: (id: string) => void;

  // Wallets
  wallets: DigitalWallet[];
  walletTransactions: WalletTransaction[];
  addWallet: (wallet: Omit<DigitalWallet, 'id'>) => void;
  executeWalletTransaction: (tx: Omit<WalletTransaction, 'id' | 'date' | 'cashierName'>) => boolean;

  // Invoices & POS
  invoices: Invoice[];
  createInvoice: (
    items: { itemId: string; type: 'PHONE' | 'ACCESSORY'; quantity: number; unitPrice: number; costPrice: number; name: string; imei?: string }[],
    customerName: string,
    customerPhone: string,
    discount: number,
    paymentSplit: { cashAmount: number; walletAmount: number; walletId?: string; cardAmount: number },
    tradeIn?: TradeInDevice,
    notes?: string
  ) => Invoice;
  processInvoiceReturn: (invoiceId: string, refundAmount: number, isFullReturn: boolean) => void;

  // Maintenance
  maintenanceJobs: MaintenanceJob[];
  addMaintenanceJob: (job: Omit<MaintenanceJob, 'id' | 'ticketNumber' | 'receivedDate' | 'status' | 'cashierName'>) => MaintenanceJob;
  updateMaintenanceStatus: (id: string, status: MaintenanceJob['status'], technicianNotes?: string) => void;
  deliverMaintenanceJob: (id: string, finalPaymentCash: number) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'date' | 'loggedBy'>) => void;

  // Suppliers
  suppliers: SupplierAccount[];
  addSupplier: (s: Omit<SupplierAccount, 'id' | 'totalPurchases' | 'totalPaid' | 'remainingDebt'>) => void;
  addSupplierPayment: (supplierId: string, amount: number) => void;

  // Credit Customers (آجل)
  creditCustomers: CreditCustomer[];
  creditPayments: CreditPayment[];
  addCreditCustomer: (c: Omit<CreditCustomer, 'id' | 'createdAt' | 'totalDebt' | 'totalPaid' | 'remainingDebt'>) => void;
  collectCreditPayment: (customerId: string, amount: number) => void;

  // Pending offline sync count badge
  pendingSyncCount: number;

  // Reset Clean State
  clearAllData: () => void;

  // Print Modal state helper
  activePrintDocument: { type: 'INVOICE' | 'CONTRACT' | 'MAINTENANCE'; data: any } | null;
  setActivePrintDocument: (doc: { type: 'INVOICE' | 'CONTRACT' | 'MAINTENANCE'; data: any } | null) => void;

  // Sync conflict notifications for admin
  syncConflicts: SyncConflict[];
  clearSyncConflicts: () => void;
}

const defaultSettings: StoreSettings = {
  storeName: 'محل المهندس للاتصالات والتكنولوجيا',
  storePhone: '01012345678',
  storeAddress: 'شارع المحطة - الفرع الرئيسي',
  receiptFooterText: 'شكراً لزيارتكم محل المهندس! البضاعة المباعة لا ترد بعد 14 يوماً.',
  defaultSendCommission: 5,
  defaultReceiveCommission: 10,
  defaultDailyLimit: 60000,
  defaultMonthlyLimit: 200000,
  maxCashierDiscount: 50,
  autoPrintInvoice: true,
  thermalPaperWidth: '80mm',
  adminPin: '1234',
  cashierPin: '0000',
  adminName: 'أحمد حسن',
  cashierName: 'أنس الكاشير'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elmohandes_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('elmohandes_store_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [drawerCash, setDrawerCash] = useState<number>(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [phones, setPhones] = useState<PhoneDevice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [wallets, setWallets] = useState<DigitalWallet[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState<MaintenanceJob[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [activePrintDocument, setActivePrintDocument] = useState<{ type: 'INVOICE' | 'CONTRACT' | 'MAINTENANCE'; data: any } | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);

  const updateStoreSettings = (newSettings: Partial<StoreSettings>) => {
    const updated = { ...storeSettings, ...newSettings };
    setStoreSettings(updated);
    localStorage.setItem('elmohandes_store_settings', JSON.stringify(updated));

    if (newSettings.defaultSendCommission !== undefined || newSettings.defaultReceiveCommission !== undefined) {
      setWallets(prev => prev.map(w => ({
        ...w,
        sendCommissionPerThousand: newSettings.defaultSendCommission ?? w.sendCommissionPerThousand ?? updated.defaultSendCommission,
        receiveCommissionPerThousand: newSettings.defaultReceiveCommission ?? w.receiveCommissionPerThousand ?? updated.defaultReceiveCommission
      })));
    }
  };

  const reloadAllFromDatabase = async () => {
    setIsSyncing(true);
    try {
      await processPendingOfflineSync();

      const [loadedPhones, loadedInv, loadedWallets, loadedWtxs, loadedInvoices, loadedJobs, loadedExp, loadedSups, loadedShifts, loadedCredCusts, loadedCredPays] = await Promise.all([
        syncTableFromSupabase<PhoneDevice>('phones', localDB.phones),
        syncTableFromSupabase<InventoryItem>('inventory', localDB.inventory),
        syncTableFromSupabase<DigitalWallet>('wallets', localDB.wallets),
        syncTableFromSupabase<WalletTransaction>('wallet_transactions', localDB.walletTransactions),
        syncTableFromSupabase<Invoice>('invoices', localDB.invoices),
        syncTableFromSupabase<MaintenanceJob>('maintenance_jobs', localDB.maintenanceJobs),
        syncTableFromSupabase<Expense>('expenses', localDB.expenses),
        syncTableFromSupabase<SupplierAccount>('suppliers', localDB.suppliers),
        syncTableFromSupabase<Shift>('shifts', localDB.shifts),
        syncTableFromSupabase<CreditCustomer>('credit_customers', localDB.creditCustomers),
        syncTableFromSupabase<CreditPayment>('credit_payments', localDB.creditPayments)
      ]);

      setPhones(loadedPhones);
      setInventory(loadedInv);
      setWallets(loadedWallets);
      setWalletTransactions(loadedWtxs);
      setInvoices(loadedInvoices);
      setMaintenanceJobs(loadedJobs);
      setExpenses(loadedExp);
      setSuppliers(loadedSups);
      setShifts(loadedShifts);
      setCreditCustomers(loadedCredCusts);
      setCreditPayments(loadedCredPays);

      // Collect any conflicts detected during offline sync push
      const newConflicts = getAndClearConflicts();
      if (newConflicts.length > 0) {
        setSyncConflicts(prev => [...prev, ...newConflicts]);
      }

      // Update pending sync badge count
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
    } catch (err) {
      console.error('[AppContext] Failed syncing from DB:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    reloadAllFromDatabase();

    const handleOnlineStatus = () => setIsOnlineMode(isOnline());
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (currentUser) localStorage.setItem('elmohandes_auth_user', JSON.stringify(currentUser));
    else localStorage.removeItem('elmohandes_auth_user');
  }, [currentUser]);

  const currentShift = shifts.find(s => s.status === 'OPEN') || null;

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('elmohandes_auth_user');
  };

  const clearAllData = async () => {
    setPhones([]);
    setInventory([]);
    setWallets([]);
    setWalletTransactions([]);
    setInvoices([]);
    setMaintenanceJobs([]);
    setExpenses([]);
    setSuppliers([]);
    setShifts([]);
    setDrawerCash(0);
    await localDB.delete();
    await localDB.open();
  };

  const startShift = (initialCash: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber: shifts.length + 1,
      cashierName: currentUser?.name || 'كاشير المحل',
      startTime: new Date().toLocaleString('ar-EG'),
      initialDrawerCash: initialCash,
      expectedDrawerCash: initialCash,
      status: 'OPEN'
    };
    setShifts([newShift, ...shifts]);
    setDrawerCash(initialCash);

    localDB.shifts.put(newShift);
    syncPushToSupabase('shifts', 'INSERT', newShift);
  };

  const closeShift = (actualCash: number, notes?: string) => {
    if (!currentShift) return;
    const diff = actualCash - drawerCash;
    const updatedShift = {
      ...currentShift,
      endTime: new Date().toLocaleString('ar-EG'),
      expectedDrawerCash: drawerCash,
      actualDrawerCash: actualCash,
      cashDifference: diff,
      status: 'CLOSED' as const,
      notes
    };
    
    setShifts(shifts.map(s => s.id === currentShift.id ? updatedShift : s));
    localDB.shifts.put(updatedShift);
    syncPushToSupabase('shifts', 'UPDATE', updatedShift);
  };

  const addPhone = (phoneData: Omit<PhoneDevice, 'id' | 'status' | 'purchaseDate'>) => {
    const newPhone: PhoneDevice = {
      ...phoneData,
      id: `p-${Date.now()}`,
      status: 'AVAILABLE',
      purchaseDate: new Date().toISOString().split('T')[0]
    };
    setPhones([newPhone, ...phones]);
    localDB.phones.put(newPhone);
    syncPushToSupabase('phones', 'INSERT', newPhone);
  };

  const updatePhoneStatus = (id: string, status: PhoneDevice['status']) => {
    const updated = phones.map(p => p.id === id ? { ...p, status } : p);
    setPhones(updated);
    const target = updated.find(p => p.id === id);
    if (target) {
      localDB.phones.put(target);
      syncPushToSupabase('phones', 'UPDATE', target);
    }
  };

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`
    };
    setInventory([newItem, ...inventory]);
    localDB.inventory.put(newItem);
    syncPushToSupabase('inventory', 'INSERT', newItem);
  };

  const updateStockQuantity = (id: string, delta: number) => {
    const updated = inventory.map(i => {
      if (i.id === id) {
        return { ...i, stockQuantity: Math.max(0, i.stockQuantity + delta) };
      }
      return i;
    });
    setInventory(updated);
    const target = updated.find(i => i.id === id);
    if (target) {
      localDB.inventory.put(target);
      syncPushToSupabase('inventory', 'UPDATE', target);
    }
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    localDB.inventory.delete(id);
    syncPushToSupabase('inventory', 'DELETE', { id } as any);
  };

  const addWallet = (walletData: Omit<DigitalWallet, 'id'>) => {
    const newWallet: DigitalWallet = {
      ...walletData,
      id: `w-${Date.now()}`,
      sendCommissionPerThousand: walletData.sendCommissionPerThousand ?? storeSettings.defaultSendCommission,
      receiveCommissionPerThousand: walletData.receiveCommissionPerThousand ?? storeSettings.defaultReceiveCommission
    };
    setWallets([...wallets, newWallet]);
    localDB.wallets.put(newWallet);
    syncPushToSupabase('wallets', 'INSERT', newWallet);
  };

  const executeWalletTransaction = (txData: Omit<WalletTransaction, 'id' | 'date' | 'cashierName'>): boolean => {
    const wallet = wallets.find(w => w.id === txData.walletId);
    if (!wallet) return false;

    let updatedWallet = { ...wallet };

    if (txData.type === 'SEND') {
      const totalDeductedFromWallet = txData.amount + txData.systemCommission;
      if (wallet.currentBalance < totalDeductedFromWallet) {
        return false;
      }
      const cashReceivedInDrawer = txData.amount + txData.customerCommission;
      updatedWallet.currentBalance -= totalDeductedFromWallet;
      setDrawerCash(prev => prev + cashReceivedInDrawer);
    } else if (txData.type === 'RECEIVE') {
      const cashHandedToCustomer = txData.amount - txData.customerCommission;
      if (drawerCash < cashHandedToCustomer) {
        return false;
      }
      updatedWallet.currentBalance += txData.amount;
      setDrawerCash(prev => prev - cashHandedToCustomer);
    } else if (txData.type === 'AIRTIME_TOPUP') {
      updatedWallet.currentBalance -= txData.amount;
      setDrawerCash(prev => prev + (txData.amount + txData.customerCommission));
    }

    setWallets(wallets.map(w => w.id === wallet.id ? updatedWallet : w));
    localDB.wallets.put(updatedWallet);
    syncPushToSupabase('wallets', 'UPDATE', updatedWallet);

    const newTx: WalletTransaction = {
      ...txData,
      id: `wtx-${Date.now()}`,
      date: new Date().toLocaleString('ar-EG'),
      cashierName: currentUser?.name || 'كاشير المحل'
    };

    setWalletTransactions([newTx, ...walletTransactions]);
    localDB.walletTransactions.put(newTx);
    syncPushToSupabase('wallet_transactions', 'INSERT', newTx);
    return true;
  };

  const createInvoice = (
    items: { itemId: string; type: 'PHONE' | 'ACCESSORY'; quantity: number; unitPrice: number; costPrice: number; name: string; imei?: string }[],
    customerName: string,
    customerPhone: string,
    discount: number,
    paymentSplit: { cashAmount: number; walletAmount: number; walletId?: string; creditAmount: number; creditCustomerId?: string },
    tradeIn?: TradeInDevice,
    notes?: string
  ): Invoice => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tradeInValue = tradeIn ? tradeIn.agreedPrice : 0;
    const finalTotal = Math.max(0, subtotal - discount - tradeInValue);

    const creditCust = paymentSplit.creditCustomerId
      ? creditCustomers.find(c => c.id === paymentSplit.creditCustomerId)
      : undefined;

    const payMethod = paymentSplit.creditAmount > 0 ? 'CREDIT' : paymentSplit.walletAmount > 0 ? 'WALLET' : 'CASH';

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${1000 + invoices.length + 1}`,
      date: new Date().toLocaleString('ar-EG'),
      customerName: creditCust?.name || customerName || 'زبون عام',
      customerPhone: creditCust?.phone || customerPhone,
      items: items.map((it, idx) => ({
        id: `ii-${idx}-${Date.now()}`,
        type: it.type,
        itemId: it.itemId,
        name: it.name,
        imei: it.imei,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        costPrice: it.costPrice,
        totalPrice: it.quantity * it.unitPrice
      })),
      tradeIn,
      subtotal,
      discount,
      totalAmount: finalTotal,
      paymentMethod: payMethod,
      paymentSplit: paymentSplit,
      cashierName: currentUser?.name || 'كاشير المحل',
      notes,
      creditCustomerId: creditCust?.id,
      creditCustomerName: creditCust?.name,
      isPaid: payMethod !== 'CREDIT'
    };

    items.forEach(it => {
      if (it.type === 'ACCESSORY') {
        updateStockQuantity(it.itemId, -it.quantity);
      } else if (it.type === 'PHONE') {
        updatePhoneStatus(it.itemId, 'SOLD');
      }
    });

    if (tradeIn) {
      addPhone({
        brand: tradeIn.model.split(' ')[0] || 'مستعمل',
        model: tradeIn.model,
        color: 'استبدال',
        storage: 'غير محدد',
        condition: tradeIn.condition,
        imei: tradeIn.imei,
        costPrice: tradeIn.agreedPrice,
        sellPrice: Math.round(tradeIn.agreedPrice * 1.15),
        sellerName: tradeIn.sellerName,
        sellerNationalId: tradeIn.sellerNationalId,
        sellerPhone: tradeIn.sellerPhone,
        notes: `تم استبداله في الفاتورة رقم ${newInvoice.invoiceNumber}`
      });
    }

    if (paymentSplit.cashAmount > 0) {
      setDrawerCash(prev => prev + paymentSplit.cashAmount);
    }
    if (paymentSplit.walletAmount > 0 && paymentSplit.walletId) {
      setWallets(prev => prev.map(w => w.id === paymentSplit.walletId ? { ...w, currentBalance: w.currentBalance + paymentSplit.walletAmount } : w));
    }
    // Credit: add debt to credit customer
    if (paymentSplit.creditAmount > 0 && paymentSplit.creditCustomerId) {
      setCreditCustomers(prev => prev.map(c => {
        if (c.id === paymentSplit.creditCustomerId) {
          return {
            ...c,
            totalDebt: c.totalDebt + paymentSplit.creditAmount,
            remainingDebt: c.remainingDebt + paymentSplit.creditAmount,
            lastTransactionDate: new Date().toISOString()
          };
        }
        return c;
      }));
      const updCust = creditCustomers.find(c => c.id === paymentSplit.creditCustomerId);
      if (updCust) {
        const updatedCust = { ...updCust, totalDebt: updCust.totalDebt + paymentSplit.creditAmount, remainingDebt: updCust.remainingDebt + paymentSplit.creditAmount };
        localDB.creditCustomers.put(updatedCust);
        syncPushToSupabase('credit_customers', 'UPDATE', updatedCust);
      }
    }

    setInvoices([newInvoice, ...invoices]);
    localDB.invoices.put(newInvoice);
    syncPushToSupabase('invoices', 'INSERT', newInvoice);
    return newInvoice;
  };

  const processInvoiceReturn = (invoiceId: string, refundAmount: number, isFullReturn: boolean) => {
    const targetInvoice = invoices.find(i => i.id === invoiceId);
    if (!targetInvoice) return;

    // Restore stock and phone statuses
    targetInvoice.items.forEach(it => {
      if (it.type === 'ACCESSORY') {
        updateStockQuantity(it.itemId, it.quantity); // restore inventory stock
      } else if (it.type === 'PHONE') {
        updatePhoneStatus(it.itemId, 'AVAILABLE'); // restore phone availability
      }
    });

    // Deduct cash from drawer
    setDrawerCash(prev => Math.max(0, prev - refundAmount));

    const updatedInvoice: Invoice = {
      ...targetInvoice,
      isReturned: true,
      returnStatus: isFullReturn ? 'FULL_RETURN' : 'PARTIAL_RETURN',
      returnedDate: new Date().toLocaleString('ar-EG'),
      returnedAmount: refundAmount
    };

    setInvoices(invoices.map(i => i.id === invoiceId ? updatedInvoice : i));
    localDB.invoices.put(updatedInvoice);
    syncPushToSupabase('invoices', 'UPDATE', updatedInvoice);
  };

  const addMaintenanceJob = (jobData: Omit<MaintenanceJob, 'id' | 'ticketNumber' | 'receivedDate' | 'status' | 'cashierName'>): MaintenanceJob => {
    const newJob: MaintenanceJob = {
      ...jobData,
      id: `m-${Date.now()}`,
      ticketNumber: `MT-${1000 + maintenanceJobs.length + 1}`,
      receivedDate: new Date().toLocaleString('ar-EG'),
      status: 'INSPECTION',
      cashierName: currentUser?.name || 'كاشير المحل'
    };

    if (jobData.depositPaid > 0) {
      setDrawerCash(prev => prev + jobData.depositPaid);
    }

    setMaintenanceJobs([newJob, ...maintenanceJobs]);
    localDB.maintenanceJobs.put(newJob);
    syncPushToSupabase('maintenance_jobs', 'INSERT', newJob);
    return newJob;
  };

  const updateMaintenanceStatus = (id: string, status: MaintenanceJob['status'], technicianNotes?: string) => {
    const updated = maintenanceJobs.map(j => {
      if (j.id === id) {
        return {
          ...j,
          status,
          technicianNotes: technicianNotes !== undefined ? technicianNotes : j.technicianNotes
        };
      }
      return j;
    });
    setMaintenanceJobs(updated);
    const target = updated.find(j => j.id === id);
    if (target) {
      localDB.maintenanceJobs.put(target);
      syncPushToSupabase('maintenance_jobs', 'UPDATE', target);
    }
  };

  const deliverMaintenanceJob = (id: string, finalPaymentCash: number) => {
    const updated = maintenanceJobs.map(j => {
      if (j.id === id) {
        j.usedSpareParts.forEach(part => {
          updateStockQuantity(part.inventoryItemId, -part.quantity);
        });

        return {
          ...j,
          status: 'DELIVERED' as const,
          finalCost: j.depositPaid + finalPaymentCash,
          deliveredDate: new Date().toLocaleString('ar-EG')
        };
      }
      return j;
    });
    setMaintenanceJobs(updated);
    const target = updated.find(j => j.id === id);
    if (target) {
      localDB.maintenanceJobs.put(target);
      syncPushToSupabase('maintenance_jobs', 'UPDATE', target);
    }

    if (finalPaymentCash > 0) {
      setDrawerCash(prev => prev + finalPaymentCash);
    }
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date' | 'loggedBy'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `e-${Date.now()}`,
      date: new Date().toLocaleString('ar-EG'),
      loggedBy: currentUser?.name || 'كاشير المحل'
    };
    setExpenses([newExpense, ...expenses]);
    setDrawerCash(prev => prev - expenseData.amount);

    localDB.expenses.put(newExpense);
    syncPushToSupabase('expenses', 'INSERT', newExpense);
  };

  const addSupplier = (sData: Omit<SupplierAccount, 'id' | 'totalPurchases' | 'totalPaid' | 'remainingDebt'>) => {
    const newSupplier: SupplierAccount = {
      ...sData,
      id: `sup-${Date.now()}`,
      totalPurchases: 0,
      totalPaid: 0,
      remainingDebt: 0
    };
    setSuppliers(prev => [newSupplier, ...prev]);
    localDB.suppliers.put(newSupplier);
    syncPushToSupabase('suppliers', 'INSERT', newSupplier);
  };

  const addSupplierPayment = (supplierId: string, amount: number) => {
    const updated = suppliers.map(s => {
      if (s.id === supplierId) {
        return {
          ...s,
          totalPaid: (s.totalPaid || 0) + amount,
          remainingDebt: Math.max(0, s.remainingDebt - amount)
        };
      }
      return s;
    });
    setSuppliers(updated);
    setDrawerCash(prev => prev - amount);

    const target = updated.find(s => s.id === supplierId);
    if (target) {
      localDB.suppliers.put(target);
      syncPushToSupabase('suppliers', 'UPDATE', target);
    }
  };

  const addCreditCustomer = (cData: Omit<CreditCustomer, 'id' | 'createdAt' | 'totalDebt' | 'totalPaid' | 'remainingDebt'>) => {
    const newCust: CreditCustomer = {
      ...cData,
      id: `cc-${Date.now()}`,
      totalDebt: 0,
      totalPaid: 0,
      remainingDebt: 0,
      createdAt: new Date().toISOString()
    };
    setCreditCustomers(prev => [newCust, ...prev]);
    localDB.creditCustomers.put(newCust);
    syncPushToSupabase('credit_customers', 'INSERT', newCust);
  };

  const collectCreditPayment = (customerId: string, amount: number) => {
    const updatedCusts = creditCustomers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          totalPaid: c.totalPaid + amount,
          remainingDebt: Math.max(0, c.remainingDebt - amount)
        };
      }
      return c;
    });
    setCreditCustomers(updatedCusts);
    setDrawerCash(prev => prev + amount);

    const newPayment: CreditPayment = {
      id: `cp-${Date.now()}`,
      customerId,
      amount,
      date: new Date().toLocaleString('ar-EG'),
      cashierName: currentUser?.name || 'كاشير'
    };
    setCreditPayments(prev => [newPayment, ...prev]);
    localDB.creditPayments.put(newPayment);
    syncPushToSupabase('credit_payments', 'INSERT', newPayment);

    const target = updatedCusts.find(c => c.id === customerId);
    if (target) {
      localDB.creditCustomers.put(target);
      syncPushToSupabase('credit_customers', 'UPDATE', target);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        logout,
        storeSettings,
        updateStoreSettings,
        isOnlineMode,
        isSyncing,
        reloadAllFromDatabase,
        drawerCash,
        setDrawerCash,
        currentShift,
        startShift,
        closeShift,
        shifts,
        phones,
        addPhone,
        updatePhoneStatus,
        inventory,
        addInventoryItem,
        updateStockQuantity,
        deleteInventoryItem,
        wallets,
        walletTransactions,
        addWallet,
        executeWalletTransaction,
        invoices,
        createInvoice,
        processInvoiceReturn,
        maintenanceJobs,
        addMaintenanceJob,
        updateMaintenanceStatus,
        deliverMaintenanceJob,
        expenses,
        addExpense,
        suppliers,
        addSupplier,
        addSupplierPayment,
        creditCustomers,
        creditPayments,
        addCreditCustomer,
        collectCreditPayment,
        pendingSyncCount,
        clearAllData,
        activePrintDocument,
        setActivePrintDocument,
        syncConflicts,
        clearSyncConflicts: () => setSyncConflicts([])
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
