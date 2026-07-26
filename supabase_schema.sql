-- =========================================================
-- SCHEMAS & TABLES FOR "EL-MOHANDES" STORE MANAGEMENT SYSTEM
-- Run this script in Supabase SQL Editor
-- (Fixes UUID vs String ID mismatch and adds snake_case schema)
-- =========================================================

-- Drop existing tables if they were created with UUID PKs to recreate with TEXT PKs
DROP TABLE IF EXISTS credit_payments CASCADE;
DROP TABLE IF EXISTS credit_customers CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS maintenance_jobs CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS phones CASCADE;
DROP TABLE IF EXISTS store_users CASCADE;

-- 1. Users & Roles Table
CREATE TABLE store_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CASHIER')),
  pin_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Users
INSERT INTO store_users (id, name, email, password_hash, role, pin_code)
VALUES ('usr-admin', 'الأستاذ المهندس (المدير العام)', 'admin@elmohandes.com', 'admin123', 'ADMIN', '1234'),
       ('usr-cashier', 'علي الكاشير', 'cashier@elmohandes.com', 'cashier123', 'CASHIER', '0000')
ON CONFLICT (id) DO NOTHING;

-- 2. Phones Management Table
CREATE TABLE phones (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  storage TEXT,
  battery_health INT,
  condition TEXT NOT NULL CHECK (condition IN ('NEW', 'USED')),
  imei TEXT UNIQUE NOT NULL,
  cost_price NUMERIC NOT NULL,
  sell_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'TRADED_IN')),
  purchase_date DATE DEFAULT CURRENT_DATE,
  seller_name TEXT,
  seller_national_id TEXT,
  seller_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Accessories & Inventory Table
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  category TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  sell_price NUMERIC NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 2,
  unit TEXT DEFAULT 'قطعة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Digital Wallets Table
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#10b981',
  daily_limit NUMERIC,
  monthly_limit NUMERIC,
  send_commission_per_thousand NUMERIC,
  receive_commission_per_thousand NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wallet Transactions Ledger
CREATE TABLE wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT REFERENCES wallets(id) ON DELETE SET NULL,
  wallet_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SEND', 'RECEIVE', 'AIRTIME_TOPUP')),
  amount NUMERIC NOT NULL,
  target_phone TEXT NOT NULL,
  customer_commission NUMERIC DEFAULT 0,
  system_commission NUMERIC DEFAULT 0,
  net_store_profit NUMERIC DEFAULT 0,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  cashier_name TEXT NOT NULL
);

-- 6. Invoices Table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT DEFAULT 'زبون عام',
  customer_phone TEXT,
  items JSONB NOT NULL,
  trade_in JSONB,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_split JSONB NOT NULL,
  cashier_name TEXT NOT NULL,
  is_returned BOOLEAN DEFAULT FALSE,
  return_status TEXT,
  returned_amount NUMERIC,
  returned_date TIMESTAMPTZ,
  credit_customer_id TEXT,
  credit_customer_name TEXT,
  is_paid BOOLEAN,
  paid_date TIMESTAMPTZ,
  notes TEXT
);

-- 7. Maintenance Jobs Table
CREATE TABLE maintenance_jobs (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_model TEXT NOT NULL,
  imei_or_serial TEXT,
  device_passcode TEXT,
  fault_description TEXT NOT NULL,
  deposit_paid NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  final_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  used_spare_parts JSONB DEFAULT '[]'::jsonb,
  received_date TIMESTAMPTZ DEFAULT NOW(),
  delivered_date TIMESTAMPTZ,
  technician_notes TEXT,
  cashier_name TEXT NOT NULL
);

-- 8. Expenses Table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  logged_by TEXT NOT NULL
);

-- 9. Supplier Accounts Table
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  total_purchases NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  remaining_debt NUMERIC DEFAULT 0,
  notes TEXT
);

-- 10. Shifts Table
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  shift_number INT NOT NULL,
  cashier_name TEXT NOT NULL,
  cashier_id TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  initial_drawer_cash NUMERIC NOT NULL,
  expected_drawer_cash NUMERIC NOT NULL,
  actual_drawer_cash NUMERIC,
  cash_difference NUMERIC,
  total_sales NUMERIC,
  total_invoices NUMERIC,
  total_wallet_commissions NUMERIC,
  status TEXT NOT NULL DEFAULT 'OPEN',
  notes TEXT
);

-- 11. Credit Customers (حسابات العملاء بالآجل)
CREATE TABLE credit_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  national_id TEXT,
  total_debt NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  remaining_debt NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 10000,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_transaction_date TIMESTAMPTZ
);

-- 12. Credit Payments (سدادات الديون)
CREATE TABLE credit_payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES credit_customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  cashier_name TEXT
);

-- Enable RLS & Public Policies
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on store_users" ON store_users FOR ALL USING (true);
CREATE POLICY "Allow public all on phones" ON phones FOR ALL USING (true);
CREATE POLICY "Allow public all on inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow public all on wallets" ON wallets FOR ALL USING (true);
CREATE POLICY "Allow public all on wallet_transactions" ON wallet_transactions FOR ALL USING (true);
CREATE POLICY "Allow public all on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow public all on maintenance_jobs" ON maintenance_jobs FOR ALL USING (true);
CREATE POLICY "Allow public all on expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow public all on suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow public all on shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow public all on credit_customers" ON credit_customers FOR ALL USING (true);
CREATE POLICY "Allow public all on credit_payments" ON credit_payments FOR ALL USING (true);
