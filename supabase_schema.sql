-- =========================================================
-- SCHEMAS & TABLES FOR "EL-MOHANDES" STORE MANAGEMENT SYSTEM
-- Run this script in Supabase SQL Editor
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Roles Table
CREATE TABLE IF NOT EXISTS store_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CASHIER')),
  pin_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Admin User (Password: admin123, PIN: 1234)
INSERT INTO store_users (name, email, password_hash, role, pin_code)
VALUES ('الأستاذ المهندس (المدير العام)', 'admin@elmohandes.com', 'admin123', 'ADMIN', '1234')
ON CONFLICT (email) DO NOTHING;

-- Default Cashier User (Password: cashier123, PIN: 0000)
INSERT INTO store_users (name, email, password_hash, role, pin_code)
VALUES ('علي الكاشير', 'cashier@elmohandes.com', 'cashier123', 'CASHIER', '0000')
ON CONFLICT (email) DO NOTHING;

-- 2. Phones Management Table
CREATE TABLE IF NOT EXISTS phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  sell_price NUMERIC NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 2,
  unit TEXT DEFAULT 'قطعة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Digital Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wallet Transactions Ledger
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT DEFAULT 'زبون عام',
  customer_phone TEXT,
  items JSONB NOT NULL,
  trade_in JSONB,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_split JSONB NOT NULL,
  cashier_name TEXT NOT NULL,
  notes TEXT
);

-- 7. Maintenance Jobs Table
CREATE TABLE IF NOT EXISTS maintenance_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_model TEXT NOT NULL,
  imei_or_serial TEXT,
  device_passcode TEXT,
  fault_description TEXT NOT NULL,
  deposit_paid NUMERIC DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  final_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'INSPECTION' CHECK (status IN ('INSPECTION', 'REPAIRING', 'READY', 'DELIVERED')),
  used_spare_parts JSONB DEFAULT '[]'::jsonb,
  received_date TIMESTAMPTZ DEFAULT NOW(),
  delivered_date TIMESTAMPTZ,
  technician_notes TEXT,
  cashier_name TEXT NOT NULL
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  logged_by TEXT NOT NULL
);

-- 9. Supplier Accounts Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  total_purchases NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_debt NUMERIC DEFAULT 0,
  notes TEXT
);

-- 10. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_number INT NOT NULL,
  cashier_name TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  initial_drawer_cash NUMERIC NOT NULL,
  expected_drawer_cash NUMERIC NOT NULL,
  actual_drawer_cash NUMERIC,
  cash_difference NUMERIC,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT
);

-- Enable RLS & Policies (Public access for shop demo API)
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
