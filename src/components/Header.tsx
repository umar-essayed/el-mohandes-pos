import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { navItems } from './Sidebar';
import { RefreshCw, Wifi, WifiOff, LogOut, User, Clock, Play } from 'lucide-react';
import { ShiftModal } from './Shift/ShiftModal';
import { ShiftCloseModal } from './Shift/ShiftCloseModal';

export const Header: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { currentUser, logout, isOnlineMode, isSyncing, reloadAllFromDatabase, drawerCash, storeSettings, currentShift, pendingSyncCount } = useApp();
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showShiftCloseModal, setShowShiftCloseModal] = useState(false);

  const currentTab = navItems.find(item => item.id === activeTab) || navItems[0];
  const shiftOpen = currentShift && currentShift.status === 'OPEN';

  return (
    <>
      <header style={{
        height: '56px',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '0.5rem'
      }}>
        
        {/* Title & Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {currentTab.icon}
          </div>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTab.label}
            </h1>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {storeSettings.storeName}
            </div>
          </div>
        </div>

        {/* Status Badges & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          
          {/* SHIFT STATUS PILL — clickable to open shift if not open, or close if open */}
          <button
            onClick={() => {
              if (shiftOpen) {
                setShowShiftCloseModal(true);
              } else {
                setShowShiftModal(true);
              }
            }}
            title={shiftOpen ? `شيفت #${currentShift?.shiftNumber} مفتوح - اضغط لتقفيل الشيفت` : 'اضغط لافتتاح شيفت جديد'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '3px 8px',
              borderRadius: 8,
              border: shiftOpen ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.4)',
              background: shiftOpen ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.15)',
              color: shiftOpen ? '#34d399' : '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              animation: shiftOpen ? 'none' : 'pulse 2s infinite'
            }}
          >
            {shiftOpen ? <Clock size={12} /> : <Play size={12} />}
            <span>{shiftOpen ? `شيفت #${currentShift?.shiftNumber} (إقفال 🛑)` : 'افتح شيفت ⚡'}</span>
          </button>

          {/* Drawer Cash Badge */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '3px 8px',
            borderRadius: 8,
            fontSize: '0.75rem',
            color: '#34d399',
            fontWeight: 800,
            whiteSpace: 'nowrap'
          }}>
            💵 {drawerCash.toLocaleString('ar-EG')} ج.م
          </div>

          {/* Online / Offline Sync Indicator */}
          <button
            onClick={reloadAllFromDatabase}
            disabled={isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '3px 8px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: isOnlineMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: isOnlineMode ? '#818cf8' : '#fda4af',
              whiteSpace: 'nowrap'
            }}
            title="مزامنة مع سوبابيز والداتا بيز المحلية"
          >
            {isSyncing ? (
              <RefreshCw size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : isOnlineMode ? (
              <Wifi size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            <span className="desktop-only">
              {isSyncing ? 'مزامنة...' : isOnlineMode ? 'سوبابيز أونلاين' : 'أوفلاين محلي'}
              {pendingSyncCount > 0 ? ` (معلق: ${pendingSyncCount})` : ''}
            </span>
            {!isSyncing && !isOnlineMode && pendingSyncCount > 0 && (
              <span style={{
                background: '#f43f5e',
                color: '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.6rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '2px'
              }}>{pendingSyncCount}</span>
            )}
          </button>

          {/* User Pill Badge */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '3px 8px',
              borderRadius: 8,
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              <User size={14} color="#fbbf24" />
              <span className="desktop-only" style={{ color: '#fff' }}>{currentUser.name}</span>
            </div>
          )}

          {/* Desktop Logout button */}
          <button
            className="desktop-only"
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f43f5e',
              cursor: 'pointer',
              padding: 4
            }}
            title="تسجيل الخروج"
          >
            <LogOut size={16} />
          </button>

        </div>

      </header>

      {/* Shift Modal triggered from Header */}
      <ShiftModal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} />

      {/* Shift Close Modal triggered from Header */}
      <ShiftCloseModal isOpen={showShiftCloseModal} onClose={() => setShowShiftCloseModal(false)} />
    </>
  );
};

