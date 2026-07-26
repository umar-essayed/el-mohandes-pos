import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Wallet,
  Smartphone,
  AlertTriangle,
  Wrench,
  DollarSign,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  PlusCircle,
  Clock,
  Users
} from 'lucide-react';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    currentUser,
    drawerCash,
    phones,
    inventory,
    wallets,
    walletTransactions,
    invoices,
    maintenanceJobs,
    expenses,
    suppliers,
    creditCustomers
  } = useApp();

  // Calculations for Today
  const todayStr = new Date().toLocaleDateString('ar-EG');
  
  const todayInvoices = (invoices || []).filter(inv => {
    return inv && inv.date && inv.date.includes(todayStr);
  });

  const todayPhoneSales = todayInvoices.reduce((sum, inv) => {
    return sum + (inv.items || []).filter(i => i && i.type === 'PHONE').reduce((s, i) => s + (i.totalPrice || 0), 0);
  }, 0);

  const todayAccSales = todayInvoices.reduce((sum, inv) => {
    return sum + (inv.items || []).filter(i => i && i.type === 'ACCESSORY').reduce((s, i) => s + (i.totalPrice || 0), 0);
  }, 0);

  const todayWalletTxs = walletTransactions || [];
  const todayWalletCommissions = todayWalletTxs.reduce((sum, tx) => sum + (tx.netStoreProfit || 0), 0);

  const todayTotalSales = todayPhoneSales + todayAccSales;

  // Net Profit Calculation (Sales Profit + Wallet Net Commission - Expenses)
  const salesProfit = todayInvoices.reduce((sum, inv) => {
    const itemProfit = (inv.items || []).reduce((s, item) => s + ((item.totalPrice || 0) - ((item.costPrice || 0) * (item.quantity || 0))), 0);
    return sum + (itemProfit - (inv.discount || 0));
  }, 0);

  const todayExpensesSum = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayNetProfit = (salesProfit + todayWalletCommissions) - todayExpensesSum;

  // Alerts & Credit totals
  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.minStockAlert);
  const readyMaintenance = maintenanceJobs.filter(m => m.status === 'READY' || m.status === 'DONE');
  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + (s.remainingDebt || 0), 0);
  const totalCreditDebts = creditCustomers.reduce((sum, c) => sum + (c.remainingDebt || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome & Quick Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
            أهلاً بك، {currentUser?.name} 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            نظرة عامة ومباشرة على أداء محل المهندس اليوم
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('pos')} style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}>
            <PlusCircle size={16} /> فاتورة بيع سريعة
          </button>
          <button className="btn btn-indigo" onClick={() => onNavigate('wallets')} style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}>
            <Send size={16} /> تحويل محفظة
          </button>
          <button className="btn btn-emerald" onClick={() => onNavigate('maintenance')} style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}>
            <Wrench size={16} /> استلام صيانة
          </button>
        </div>
      </div>

      {/* 4 Primary Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Total Sales Today */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-gold)', padding: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>مبيعات اليوم</span>
            <div style={{ padding: 6, background: 'rgba(245, 158, 11, 0.15)', borderRadius: 8, color: '#fbbf24' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
            {todayTotalSales.toLocaleString('ar-EG')} ج.م
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
            تلفونات: {todayPhoneSales.toLocaleString('ar-EG')} | إكسسوارات: {todayAccSales.toLocaleString('ar-EG')}
          </div>
        </div>

        {/* Net Profit Today (Admin only view) */}
        {currentUser?.role === 'ADMIN' && (
          <div className="card" style={{ borderRight: '4px solid var(--accent-emerald)', padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>صافي الأرباح</span>
              <div style={{ padding: 6, background: 'rgba(16, 185, 129, 0.15)', borderRadius: 8, color: '#34d399' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>
              {todayNetProfit.toLocaleString('ar-EG')} ج.م
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              المبيعات: {salesProfit.toLocaleString('ar-EG')} | عمولات: {todayWalletCommissions.toLocaleString('ar-EG')}
            </div>
          </div>
        )}

        {/* Cash Drawer Available */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-indigo)', padding: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>كاش درج المحل</span>
            <div style={{ padding: 6, background: 'rgba(99, 102, 241, 0.15)', borderRadius: 8, color: '#818cf8' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#818cf8' }}>
            {drawerCash.toLocaleString('ar-EG')} ج.م
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
            النقدية المتاحة لتسجيل المبيعات
          </div>
        </div>

        {/* Total Credit Dues (الآجل على الزبائن) */}
        <div className="card" style={{ borderRight: '4px solid #f59e0b', padding: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>آجل مستحق على العملاء</span>
            <div style={{ padding: 6, background: 'rgba(245,158,11,0.15)', borderRadius: 8, color: '#fbbf24' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>
            {totalCreditDebts.toLocaleString('ar-EG')} ج.م
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
            دين مسجل على {creditCustomers.length} عميل آجل
          </div>
        </div>

      </div>

      {/* Operational Quick Alerts Banner */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle color="#fbbf24" size={18} /> التنبيهات ونواقص المخزن
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
          
          {/* Low Stock Alert */}
          <div className="card" style={{ borderLeft: '4px solid #f43f5e', padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#fda4af', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                <Package size={16} /> نواقص المخزن ({lowStockItems.length})
              </span>
              <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => onNavigate('accessories')}>
                عرض
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المخزن ممتلئ ولا يوجد نواقص حالياً</p>
            ) : (
              <ul style={{ listStyle: 'none', fontSize: '0.78rem', color: 'var(--text-muted)', padding: 0, margin: 0 }}>
                {lowStockItems.slice(0, 3).map(item => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>{item.name}</span>
                    <span style={{ color: '#f43f5e', fontWeight: 700 }}>متبقي {item.stockQuantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Maintenance Ready Alert */}
          <div className="card" style={{ borderLeft: '4px solid #10b981', padding: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                <Wrench size={16} /> أجهزة صيانة منتهية ({readyMaintenance.length})
              </span>
              <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => onNavigate('maintenance')}>
                تسليم
              </button>
            </div>
            {readyMaintenance.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>لا توجد أجهزة صيانة منتهية جاهزة للتسليم</p>
            ) : (
              <ul style={{ listStyle: 'none', fontSize: '0.78rem', color: 'var(--text-muted)', padding: 0, margin: 0 }}>
                {readyMaintenance.slice(0, 3).map(job => (
                  <li key={job.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>{job.deviceModel}</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>جاهز #{job.ticketNumber}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Supplier Debts Alert */}
          {currentUser?.role === 'ADMIN' && (
            <div className="card" style={{ borderLeft: '4px solid #a855f7', padding: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <Clock size={16} /> ديون الموردين والشركات
                </span>
                <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => onNavigate('finance')}>
                  سداد
                </button>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc' }}>
                {totalSupplierDebts.toLocaleString('ar-EG')} ج.م
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                مستحقات الشركات المسجلة بصفحة التقارير والموردين
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
