import React, { useState } from 'react';
import { navItems } from '../Sidebar';
import { ShoppingCart, FileText, Send, Smartphone, Menu, X, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'ADMIN' | 'CASHIER';
}> = ({ activeTab, setActiveTab, userRole }) => {
  const { currentUser, logout } = useApp();
  const [showDrawer, setShowDrawer] = useState(false);

  const mainTabs = [
    { id: 'pos', label: 'البيع POS', icon: <ShoppingCart size={19} /> },
    { id: 'invoices', label: 'الفواتير', icon: <FileText size={19} /> },
    { id: 'wallets', label: 'المحافظ', icon: <Send size={19} /> },
    { id: 'phones', label: 'الأجهزة', icon: <Smartphone size={19} /> }
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setShowDrawer(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile ONLY */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 900,
          direction: 'rtl',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
        }}
      >
        {mainTabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? '#fbbf24' : 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.7rem',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                flex: 1
              }}
            >
              <div style={{ padding: '2px 10px', borderRadius: 10, background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent' }}>
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowDrawer(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ padding: '2px 10px' }}>
            <Menu size={19} />
          </div>
          <span>المزيد</span>
        </button>
      </div>

      {/* Slide-out Mobile Drawer */}
      {showDrawer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1001,
            display: 'flex',
            justify: 'flex-start'
          }}
          onClick={() => setShowDrawer(false)}
        >
          <div
            style={{
              width: '280px',
              height: '100%',
              background: '#0f172a',
              borderLeft: '1px solid var(--border-color)',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>محل المهندس</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser?.name} ({currentUser?.role})</span>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
              {navItems.map(item => {
                if (item.adminOnly && userRole !== 'ADMIN') return null;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0.85rem',
                      borderRadius: 10,
                      border: 'none',
                      background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: isActive ? '#fbbf24' : 'var(--text-muted)',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: 10,
                  border: '1px solid rgba(244,63,94,0.3)',
                  background: 'rgba(244,63,94,0.1)',
                  color: '#fda4af',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '0.5rem'
                }}
              >
                <LogOut size={16} /> تسجيل الخروج
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
