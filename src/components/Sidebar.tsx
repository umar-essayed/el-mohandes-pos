import React from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Headphones,
  Send,
  ShoppingCart,
  Wrench,
  BarChart3,
  Settings,
  FileText,
  Users,
  Barcode
} from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

export const navItems: TabItem[] = [
  { id: 'pos', label: 'شاشة البيع POS ⚡', icon: <ShoppingCart size={20} /> },
  { id: 'invoices', label: 'سجل الفواتير والمرتجعات', icon: <FileText size={20} /> },
  { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard size={20} /> },
  { id: 'phones', label: 'إدارة الأجهزة والتلفونات', icon: <Smartphone size={20} /> },
  { id: 'accessories', label: 'الإكسسوارات والمخزن', icon: <Headphones size={20} /> },
  { id: 'barcode', label: 'مصمم ومحرك الباركود 🏷️', icon: <Barcode size={20} /> },
  { id: 'wallets', label: 'التحويلات والمحافظ', icon: <Send size={20} /> },
  { id: 'maintenance', label: 'قسم الصيانة', icon: <Wrench size={20} /> },
  { id: 'credit', label: 'حسابات الآجل 📋', icon: <Users size={20} /> },
  { id: 'finance', label: 'الحسابات والتقارير', icon: <BarChart3 size={20} />, adminOnly: true },
  { id: 'settings', label: 'إعدادات المحل', icon: <Settings size={20} />, adminOnly: true }
];

export const Sidebar: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'ADMIN' | 'CASHIER';
}> = ({ activeTab, setActiveTab, userRole }) => {
  return (
    <aside className="desktop-sidebar desktop-only">
      <div style={{ padding: '0 0.6rem 0.8rem 0.6rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
        قائمة كاشير المهندس
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {navItems.map(item => {
          if (item.adminOnly && userRole !== 'ADMIN') return null;

          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(99, 102, 241, 0.15))' : 'transparent',
                color: isActive ? '#fbbf24' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.15s ease',
                borderRight: isActive ? '4px solid var(--accent-gold)' : '4px solid transparent'
              }}
            >
              <span style={{ color: isActive ? '#fbbf24' : 'var(--text-muted)' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.adminOnly && (
                <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 4px', borderRadius: 4 }}>
                  أدمن
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Info */}
      <div style={{ marginTop: 'auto', padding: '0.8rem 0.6rem 0 0.6rem', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>نظام كاشير المهندس السريع ⚡</div>
        <div>Supabase + Local Database</div>
      </div>
    </aside>
  );
};
