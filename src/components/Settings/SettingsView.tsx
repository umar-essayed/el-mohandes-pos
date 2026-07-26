import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreSettings } from '../../types';
import { Settings, ShieldCheck, UserCheck, Printer, Wallet, DollarSign, Store, Save, Lock, RefreshCw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentUser, setCurrentUser, storeSettings, updateStoreSettings } = useApp();

  const [settings, setSettings] = useState<StoreSettings>(storeSettings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings color="#fbbf24" /> إعدادات المحل والنظام الشاملة
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            تحديث عمولات التحويل والسحب، ليميت الكاش، صلاحيات الكاشير، وإعدادات الطباعة
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={handleSaveSettings} style={{ padding: '0.8rem 1.5rem' }}>
          <Save size={18} /> {isSaved ? 'تم حفظ وتعميم الإعدادات ✅' : 'حفظ الإعدادات الشاملة'}
        </button>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Section 1: Store & Invoice Info */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Store size={18} /> بيانات المحل ورأس الفاتورة
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>اسم المحل (يظهر بالفواتير والعقود)</label>
              <input
                type="text"
                className="input-field"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>رقم تليفون التواصل الرئيسي</label>
              <input
                type="text"
                className="input-field"
                value={settings.storePhone}
                onChange={e => setSettings({ ...settings, storePhone: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>العنوان والفرع</label>
            <input
              type="text"
              className="input-field"
              value={settings.storeAddress}
              onChange={e => setSettings({ ...settings, storeAddress: e.target.value })}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>الملاحظة أو التذييل المطبوع بأسفل الفاتورة</label>
            <input
              type="text"
              className="input-field"
              value={settings.receiptFooterText}
              onChange={e => setSettings({ ...settings, receiptFooterText: e.target.value })}
            />
          </div>
        </div>

        {/* Section 2: Wallet Commissions & Limit Defaults */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-indigo)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wallet size={18} /> إعدادات عمولات وسقف ليميت المحافظ الإلكترونية
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', marginBottom: '0.3rem' }}>
                عمولة التحويل الافتراضية لكل 1000 ج.م ⚡
              </label>
              <input
                type="number"
                className="input-field"
                style={{ fontSize: '1.1rem', fontWeight: 800 }}
                value={settings.defaultSendCommission}
                onChange={e => setSettings({ ...settings, defaultSendCommission: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#34d399', marginBottom: '0.3rem' }}>
                عمولة السحب الافتراضية لكل 1000 ج.م ⚡
              </label>
              <input
                type="number"
                className="input-field"
                style={{ fontSize: '1.1rem', fontWeight: 800 }}
                value={settings.defaultReceiveCommission}
                onChange={e => setSettings({ ...settings, defaultReceiveCommission: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>حد الليميت اليومي الافتراضي للخطوط (ج.م)</label>
              <input
                type="number"
                className="input-field"
                value={settings.defaultDailyLimit}
                onChange={e => setSettings({ ...settings, defaultDailyLimit: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>حد الليميت الشهري الافتراضي للخطوط (ج.م)</label>
              <input
                type="number"
                className="input-field"
                value={settings.defaultMonthlyLimit}
                onChange={e => setSettings({ ...settings, defaultMonthlyLimit: Number(e.target.value) })}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cashier Permissions & Discounts */}
        <div className="card" style={{ borderRight: '4px solid var(--accent-emerald)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={18} /> صلاحيات الكاشير والخصومات المسموحة
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>أقصى خصم مسموح للكاشير عمله بدون أدمن (ج.م)</label>
              <input
                type="number"
                className="input-field"
                value={settings.maxCashierDiscount}
                onChange={e => setSettings({ ...settings, maxCashierDiscount: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>حظر وحجب رؤية أرباح التكلفة عن البائعين</label>
              <select className="input-field" value="YES" disabled>
                <option value="YES">محظورة تلقائياً للبائعين 🔒</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Thermal Printer Settings */}
        <div className="card" style={{ borderRight: '4px solid #a855f7' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Printer size={18} /> إعدادات الطابعة الحرارية
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>عرض الورق الحراري للطابعة</label>
              <select
                className="input-field"
                value={settings.thermalPaperWidth}
                onChange={(e: any) => setSettings({ ...settings, thermalPaperWidth: e.target.value })}
              >
                <option value="80mm">80mm (مقاس الفواتير الحرارية القياسي)</option>
                <option value="58mm">58mm (مقاس الطابعات المحمولة الصغيرة)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>إظهار الفاتورة فور الدفع والإنهاء</label>
              <select
                className="input-field"
                value={settings.autoPrintInvoice ? 'YES' : 'NO'}
                onChange={e => setSettings({ ...settings, autoPrintInvoice: e.target.value === 'YES' })}
              >
                <option value="YES">تلقائياً فور إنهاء الفاتورة ⚡</option>
                <option value="NO">يدوياً عند الطلب</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: User Management & PINs */}
        <div className="card" style={{ borderRight: '4px solid #6366f1' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Lock size={18} /> إدارة المستخدمين وأرقام PIN
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#fbbf24' }}>اسم الأدمن 👑</label>
              <input type="text" className="input-field"
                value={settings.adminName || ''}
                onChange={e => setSettings({ ...settings, adminName: e.target.value })}
                placeholder="أحمد حسن" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#fbbf24' }}>PIN الأدمن 🔑</label>
              <input type="password" className="input-field"
                value={settings.adminPin || ''}
                onChange={e => setSettings({ ...settings, adminPin: e.target.value })}
                placeholder="1234" maxLength={6} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#34d399' }}>اسم الكاشير ⚡</label>
              <input type="text" className="input-field"
                value={settings.cashierName || ''}
                onChange={e => setSettings({ ...settings, cashierName: e.target.value })}
                placeholder="أنس الكاشير" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#34d399' }}>PIN الكاشير 🔑</label>
              <input type="password" className="input-field"
                value={settings.cashierPin || ''}
                onChange={e => setSettings({ ...settings, cashierPin: e.target.value })}
                placeholder="0000" maxLength={6} />
            </div>
          </div>
        </div>

        {/* Active Role Switcher Card */}
        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={18} /> تبديل مستخدم النظام الحالي للتجربة
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button"
              className={`btn ${currentUser?.role === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCurrentUser({ id: 'u-admin', name: settings.adminName || 'أحمد حسن', role: 'ADMIN' })}>
              التحويل لصلاحيات الأدمن
            </button>
            <button type="button"
              className={`btn ${currentUser?.role === 'CASHIER' ? 'btn-indigo' : 'btn-secondary'}`}
              onClick={() => setCurrentUser({ id: 'u-cashier', name: settings.cashierName || 'أنس الكاشير', role: 'CASHIER' })}>
              التحويل لصلاحيات الكاشير
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
