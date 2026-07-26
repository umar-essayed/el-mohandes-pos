import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Lock, Eye, EyeOff, Sliders, CheckCircle2, AlertTriangle } from 'lucide-react';

export const UsersView: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders color="#fbbf24" /> إدارة الصلاحيات وأمان الكاشير والمدير
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            التحكم في صلاحيات الوصول لصافي الأرباح، أسعار الشراء، وحذف الفواتير
          </p>
        </div>
      </div>

      {/* User Switcher Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Admin Card */}
        <div
          className="card"
          style={{
            border: currentUser.role === 'ADMIN' ? '2px solid #fbbf24' : '1px solid var(--border-color)',
            background: currentUser.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(15,23,42,0.6)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>صلاحية الأدمن (صاحب المحل)</div>
              <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>الأستاذ المهندس</div>
            </div>
            <ShieldCheck size={28} color="#fbbf24" />
          </div>

          <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> رؤية صافي أرباح المحل اليومية والشهرية</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> رؤية أسعار التكلفة الحقيقية لجميع الأصناف</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> تعديل أسعار المنتجات وإلغاء/حذف الفواتير</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> تقفيل الشيفتات ومطابقة النقدية بالدرج</li>
          </ul>

          <button
            className={`btn ${currentUser.role === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%' }}
            onClick={() => setCurrentUser({ id: 'u-1', name: 'الأستاذ المهندس (المدير العام)', role: 'ADMIN' })}
          >
            {currentUser.role === 'ADMIN' ? 'المستخدم النشط حالياً ✅' : 'التحويل لصلاحية المدير العام'}
          </button>
        </div>

        {/* Cashier Card */}
        <div
          className="card"
          style={{
            border: currentUser.role === 'CASHIER' ? '2px solid #38bdf8' : '1px solid var(--border-color)',
            background: currentUser.role === 'CASHIER' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15,23,42,0.6)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>صلاحية البائع / الكاشير</div>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>علي الكاشير</div>
            </div>
            <UserCheck size={28} color="#38bdf8" />
          </div>

          <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> عمل فواتير بيع واستبدال التلفونات بالـ POS</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> تنفيذ عمليات تحويل وسحب فودافون كاش والانستا باي</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}><CheckCircle2 size={16} /> استلام وتسليم أجهزة الصيانة للزبائن</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fda4af' }}><AlertTriangle size={16} /> حجب أسعار الشراء والتكلفة وصافي أرباح المحل 🔒</li>
          </ul>

          <button
            className={`btn ${currentUser.role === 'CASHIER' ? 'btn-indigo' : 'btn-secondary'}`}
            style={{ width: '100%' }}
            onClick={() => setCurrentUser({ id: 'u-2', name: 'علي الكاشير', role: 'CASHIER' })}
          >
            {currentUser.role === 'CASHIER' ? 'المستخدم النشط حالياً ✅' : 'التحويل لصلاحية الكاشير'}
          </button>
        </div>

      </div>

    </div>
  );
};
