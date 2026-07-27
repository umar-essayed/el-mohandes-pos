export type UserRole = 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pinCode?: string;
}

export type PhoneCondition = 'NEW' | 'USED';
export type PhoneStatus = 'AVAILABLE' | 'SOLD' | 'TRADED_IN';

export interface PhoneDevice {
  id: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  batteryHealth?: number;
  condition: PhoneCondition;
  imei: string;
  costPrice: number;
  sellPrice: number;
  status: PhoneStatus;
  notes?: string;
  purchaseDate: string;
  sellerName?: string;
  sellerNationalId?: string;
  sellerPhone?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  unit: string;
}

export interface DigitalWallet {
  id: string;
  name: string;
  provider: 'VODAFONE_CASH' | 'INSTAPAY' | 'ORANGE_CASH' | 'ETISALAT_CASH' | 'WE_PAY' | 'BANK_ACC';
  phoneNumber: string;
  currentBalance: number;
  color: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  sendCommissionPerThousand?: number;
  receiveCommissionPerThousand?: number;
}

export type WalletTxType = 'SEND' | 'RECEIVE' | 'AIRTIME_TOPUP';

export interface WalletTransaction {
  id: string;
  walletId: string;
  walletName: string;
  type: WalletTxType;
  amount: number;
  targetPhone: string;
  customerCommission: number;
  systemCommission: number;
  netStoreProfit: number;
  date: string;
  notes?: string;
  cashierName: string;
}

// CREDIT replaces CARD
export type PaymentMethod = 'CASH' | 'WALLET' | 'CREDIT';

export interface SplitPayment {
  cashAmount: number;
  walletAmount: number;
  walletId?: string;
  creditAmount: number;
  creditCustomerId?: string;
}

export interface InvoiceItem {
  id: string;
  type: 'PHONE' | 'ACCESSORY';
  itemId: string;
  name: string;
  imei?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  isReturned?: boolean;
}

export interface TradeInDevice {
  model: string;
  imei: string;
  condition: string;
  agreedPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  cashierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentSplit: SplitPayment;
  tradeIn?: TradeInDevice;
  notes?: string;
  isReturned?: boolean;
  returnStatus?: 'FULL' | 'PARTIAL';
  returnedAmount?: number;
  returnedDate?: string;
  // Credit fields
  creditCustomerId?: string;
  creditCustomerName?: string;
  isPaid?: boolean;
  paidDate?: string;
}

export interface MaintenanceJob {
  id: string;
  ticketNumber: string;
  receivedDate: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  devicePasscode?: string;
  faultDescription: string;
  estimatedCost: number;
  depositPaid: number;
  status: 'RECEIVED' | 'IN_PROGRESS' | 'DONE' | 'DELIVERED' | 'CANCELLED';
  technicianNotes?: string;
  finalCost?: number;
  deliveredDate?: string;
  cashierName: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'RENT' | 'ELECTRICITY' | 'SALARIES' | 'FOOD_DRINKS' | 'MAINTENANCE_TOOLS' | 'OTHER';
  amount: number;
  notes?: string;
  date: string;
  loggedBy: string;
}

export interface SupplierAccount {
  id: string;
  companyName: string;
  name: string;
  phone: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  remainingDebt: number;
  notes?: string;
}

export interface Shift {
  id: string;
  shiftNumber: number;
  cashierName: string;
  cashierId: string;
  startTime: string;
  endTime?: string;
  initialDrawerCash: number;
  expectedDrawerCash: number;
  actualDrawerCash?: number;
  cashDifference?: number;
  totalSales?: number;
  totalInvoices?: number;
  totalWalletCommissions?: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptFooterText: string;
  defaultSendCommission: number;
  defaultReceiveCommission: number;
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  maxCashierDiscount: number;
  autoPrintInvoice: boolean;
  thermalPaperWidth: '58mm' | '80mm';
  // User PINs
  adminPin: string;
  cashierPin: string;
  adminName: string;
  cashierName: string;
}

// CREDIT CUSTOMERS (آجل)
export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  nationalId?: string;
  totalDebt: number;       // total owed to store
  totalPaid: number;       // total paid back
  remainingDebt: number;   // totalDebt - totalPaid
  creditLimit: number;     // max allowed debt
  notes?: string;
  createdAt: string;
  lastTransactionDate?: string;
}

export interface CreditPayment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  notes?: string;
  cashierName: string;
}

export interface BarcodeConfig {
  widthMm: number;
  heightMm: number;
  gap: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;

  storeX: number;
  storeY: number;
  storeFontSize: number;

  nameX: number;
  nameY: number;
  nameFontSize: number;

  barcodeX: number;
  barcodeY: number;
  scaleWidth: number;
  scaleHeight: number;
  showText: boolean;

  priceX: number;
  priceY: number;
  priceFontSize: number;

  originX: number;
  originY: number;
  originFontSize: number;

  showStoreName: boolean;
  showProductName: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  showOrigin: boolean;

  customStoreName?: string;
  customOriginText?: string;
  dpi?: number;
}

export interface BarcodePrintItem {
  id: string;
  title: string;
  barcode: string;
  price: number;
  origin?: string;
  storeName?: string;
  qty: number;
}

