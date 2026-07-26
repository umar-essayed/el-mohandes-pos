import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';

export const SyncConflictsModal: React.FC = () => {
  const { syncConflicts, clearSyncConflicts, currentUser } = useApp();

  // Only show to ADMIN, and only when there are conflicts
  if (currentUser?.role !== 'ADMIN') return null;
  if (syncConflicts.length === 0) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 4000, alignItems: 'flex-start', padding: '1rem' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 600,
          width: '100%',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          marginTop: '2rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#fbbf24' }}>
                تنبيه: تعارضات مزامنة الأوفلاين ⚠️
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                تم اكتشاف {syncConflicts.length} تعارض أثناء مزامنة البيانات من الأجهزة اللي كانت أوفلاين
              </p>
            </div>
          </div>
          <button
            onClick={clearSyncConflicts}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Explanation */}
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '0.7rem', marginBottom: '0.8rem', fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.6 }}>
          🔐 لضمان دقة المخزون ومنع الزيادات الوهمية، تم اتخاذ القيمة الأصغر (الأكثر تحفظاً) عند وجود تعارض بين الأجهزة. راجع التفاصيل أدناه وتأكد من مطابقة الأرقام يدوياً.
        </div>

        {/* Conflict List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
          {syncConflicts.map((conflict, idx) => (
            <div
              key={conflict.id}
              style={{
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 10,
                padding: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
                #{idx + 1} {conflict.description}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.4rem' }}>
                <div style={{ background: 'rgba(244,63,94,0.1)', padding: '0.3rem 0.5rem', borderRadius: 6, fontSize: '0.72rem' }}>
                  <div style={{ color: 'var(--text-muted)' }}>قيمة الجهاز أوفلاين:</div>
                  <div style={{ fontWeight: 800, color: '#fda4af' }}>{conflict.localValue}</div>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.3rem 0.5rem', borderRadius: 6, fontSize: '0.72rem' }}>
                  <div style={{ color: 'var(--text-muted)' }}>قيمة سوبابيز:</div>
                  <div style={{ fontWeight: 800, color: '#818cf8' }}>{conflict.remoteValue}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.3rem 0.5rem', borderRadius: 6, fontSize: '0.72rem' }}>
                  <div style={{ color: 'var(--text-muted)' }}>القيمة المطبقة:</div>
                  <div style={{ fontWeight: 800, color: '#34d399' }}>{conflict.resolvedValue} ✅</div>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                🕐 تم الاكتشاف: {conflict.detectedAt}
              </div>
            </div>
          ))}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={clearSyncConflicts}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <CheckCircle size={18} /> فهمت، تم مراجعة التعارضات
        </button>
      </div>
    </div>
  );
};
