import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { DashboardView } from './components/Dashboard/DashboardView';
import { PhonesView } from './components/Phones/PhonesView';
import { InventoryView } from './components/Inventory/InventoryView';
import { WalletsView } from './components/Wallets/WalletsView';
import { POSView } from './components/POS/POSView';
import { InvoicesView } from './components/Invoices/InvoicesView';
import { MaintenanceView } from './components/Maintenance/MaintenanceView';
import { FinanceView } from './components/Finance/FinanceView';
import { SettingsView } from './components/Settings/SettingsView';
import { LoginPage } from './components/Auth/LoginPage';
import { PrintablesModal } from './components/Printables/PrintablesModal';
import { SyncConflictsModal } from './components/Sync/SyncConflictsModal';
import { CreditCustomersView } from './components/CreditCustomers/CreditCustomersView';
import { ShiftCloseModal } from './components/Shift/ShiftCloseModal';
import { BarcodeDesignerModal } from './components/Barcode/BarcodeDesignerModal';
import './styles/theme.css';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated, currentShift } = useApp();
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [posInitialImei, setPosInitialImei] = useState<string | undefined>(undefined);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [showBarcodeDesigner, setShowBarcodeDesigner] = useState(false);

  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLoginSuccess={() => setActiveTab('pos')} />;
  }

  const handleNavigateToPOSWithIMEI = (imei?: string) => {
    setPosInitialImei(imei);
    setActiveTab('pos');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setPosInitialImei(undefined);
          if (tab === 'barcode') {
            setShowBarcodeDesigner(true);
          } else {
            setActiveTab(tab);
          }
        }}
        userRole={currentUser.role}
      />

      {/* Main App Content Area */}
      <div className="main-content">
        <Header activeTab={activeTab} />
        
        <main className="page-body">
          {activeTab === 'pos' && <POSView initialImei={posInitialImei} />}
          {activeTab === 'invoices' && <InvoicesView />}
          {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
          {activeTab === 'phones' && <PhonesView onNavigateToPOS={handleNavigateToPOSWithIMEI} />}
          {activeTab === 'accessories' && <InventoryView />}
          {activeTab === 'wallets' && <WalletsView />}
          {activeTab === 'maintenance' && <MaintenanceView />}
          {activeTab === 'credit' && <CreditCustomersView />}
          {activeTab === 'finance' && currentUser.role === 'ADMIN' && <FinanceView />}
          {activeTab === 'settings' && currentUser.role === 'ADMIN' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setPosInitialImei(undefined);
          if (tab === 'barcode') {
            setShowBarcodeDesigner(true);
          } else {
            setActiveTab(tab);
          }
        }}
        userRole={currentUser.role}
      />

      {/* Global Printable Modal */}
      <PrintablesModal />

      {/* Barcode Designer & TSPL Printing Engine Modal */}
      <BarcodeDesignerModal
        isOpen={showBarcodeDesigner || activeTab === 'barcode'}
        onClose={() => {
          setShowBarcodeDesigner(false);
          if (activeTab === 'barcode') setActiveTab('pos');
        }}
      />

      {/* Admin Sync Conflict Notifications */}
      <SyncConflictsModal />

      {/* Shift Close Modal */}
      <ShiftCloseModal isOpen={showShiftClose} onClose={() => setShowShiftClose(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ToastProvider>
  );
};

export default App;
