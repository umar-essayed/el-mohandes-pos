import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Lock, User, Smartphone } from 'lucide-react';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { setCurrentUser, storeSettings } = useApp();
  const toast = useToast();

  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [pinCode, setPinCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === 'ADMIN' && pinCode === (storeSettings.adminPin || '1234')) {
      const adminUser = { id: 'u-admin', name: storeSettings.adminName || 'أحمد حسن', role: 'ADMIN' as const };
      setCurrentUser(adminUser);
      toast.success(`أهلاً بك يا ${adminUser.name} 👑`, 'تم تسجيل الدخول بصلاحيات أدمن المحل');
      onLoginSuccess();
    } else if (selectedRole === 'CASHIER' && pinCode === (storeSettings.cashierPin || '0000')) {
      const cashierUser = { id: 'u-cashier', name: storeSettings.cashierName || 'أنس الكاشير', role: 'CASHIER' as const };
      setCurrentUser(cashierUser);
      toast.success(`مرحباً يا ${cashierUser.name} ⚡`, 'تم تسجيل الدخول، جاهز للبيع الفوري');
      onLoginSuccess();
    } else {
      toast.error('رمز غير صحيح ❌', selectedRole === 'ADMIN' ? `رمز الأدمن غير صحيح` : `رمز الكاشير غير صحيح`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent 50%), radial-gradient(circle at bottom left, rgba(99, 102, 241, 0.1), transparent 50%), #0b0f19',
      padding: '1.5rem'
    }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '2.2rem', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
        
        {/* Header Branding */}
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #f59e0b, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <Smartphone size={32} color="#fff" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{storeSettings.storeName}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          نظام كاشير وإدارة المبيعات والمحافظ السريع ⚡
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Role Switcher Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedRole('CASHIER')}
              style={{
                padding: '0.6rem',
                borderRadius: 9,
                border: 'none',
                background: selectedRole === 'CASHIER' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: selectedRole === 'CASHIER' ? '#000' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              ⚡ بائع / كاشير
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('ADMIN')}
              style={{
                padding: '0.6rem',
                borderRadius: 9,
                border: 'none',
                background: selectedRole === 'ADMIN' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              👑 أدمن (المدير)
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'right' }}>
              أدخل رمز الـ PIN الخاص بك:
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 13 }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingRight: 38, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.3em' }}
                placeholder="••••"
                maxLength={6}
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6, textAlign: 'right' }}>
              * الرمز الافتراضي للكاشير: <code style={{ color: '#fbbf24' }}>0000</code> | للأدمن: <code style={{ color: '#818cf8' }}>1234</code>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 900, marginTop: '0.5rem' }}
          >
            دخول النظام 🚀
          </button>

        </form>

      </div>
    </div>
  );
};
