import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (title: string, type?: ToastType, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, type: ToastType = 'info', message?: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, title, message, duration };
    
    setToasts(prev => [newToast, ...prev].slice(0, 3)); // max 3 toasts to avoid clutter

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => showToast(title, 'success', message, 3000), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast(title, 'error', message, 3000), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast(title, 'warning', message, 3000), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast(title, 'info', message, 3000), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        maxWidth: '320px',
        width: 'auto',
        pointerEvents: 'none',
        direction: 'rtl'
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  let borderColor = '#6366f1';
  let icon = <Info size={16} color="#818cf8" />;
  let bgGradient = 'rgba(15, 23, 42, 0.96)';

  if (toast.type === 'success') {
    borderColor = '#10b981';
    icon = <CheckCircle2 size={18} color="#34d399" />;
    bgGradient = 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(15, 23, 42, 0.96))';
  } else if (toast.type === 'error') {
    borderColor = '#f43f5e';
    icon = <XCircle size={18} color="#fda4af" />;
    bgGradient = 'linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(15, 23, 42, 0.96))';
  } else if (toast.type === 'warning') {
    borderColor = '#f59e0b';
    icon = <AlertTriangle size={18} color="#fbbf24" />;
    bgGradient = 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(15, 23, 42, 0.96))';
  }

  const durationMs = toast.duration || 3000;

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '0.5rem 0.75rem',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
        animation: 'toastIn 0.2s ease-out'
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 1,
          flexShrink: 0
        }}
      >
        <X size={14} />
      </button>

      {/* Progress Bar Countdown Timer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: borderColor,
          animation: `toastProgress ${durationMs}ms linear forwards`
        }}
      />
    </div>
  );
};
