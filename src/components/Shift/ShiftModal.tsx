import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Clock, Play, DollarSign, Lock, AlertCircle } from 'lucide-react';

export const ShiftModal: React.FC<{ isOpen: boolean; onClose: () => void; onShiftOpened?: () => void }> = ({
  isOpen,
  onClose,
  onShiftOpened
}) => {
  const { startShift, currentUser } = useApp();
  const toast = useToast();
  const [initialCash, setInitialCash] = useState<number | ''>(500);

  if (!isOpen) return null;

  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(initialCash || 0);

    startShift(cash);
    toast.success('تم افتتاح الشيفت بنجاح ⚡', `النقدية الابتدائية بالدرج: ${cash.toLocaleString('ar-EG')} ج.م`);
    if (onShiftOpened) onShiftOpened();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem auto' }}>
            <Clock size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>افتتاح الشيفت اليومي للمحل ⚡</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            يجب افتتاح شيفت جديد وتأكيد النقدية بالدرج أولاً لبدء البيع والتحويلات!
          </p>
        </div>

        <form onSubmit={handleStartShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>المسؤول عن الشيفت:</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#34d399', marginTop: 2 }}>{currentUser?.name}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.4rem' }}>
              النقدية الفائضة بعهدة الدرج عند البدء (ج.م)
            </label>
            <input
              type="number"
              className="input-field"
              style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', padding: '0.75rem', border: '2px solid rgba(245,158,11,0.4)', background: '#0f172a' }}
              placeholder="أدخل المبلغ (مثال: 500)"
              value={initialCash}
              onChange={e => setInitialCash(e.target.value !== '' ? Number(e.target.value) : '')}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
            {[0, 200, 500, 1000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setInitialCash(val)}
                style={{
                  padding: '0.45rem 0',
                  borderRadius: 8,
                  border: initialCash === val ? '1px solid #fbbf24' : '1px solid var(--border-color)',
                  background: initialCash === val ? 'rgba(245,158,11,0.2)' : 'rgba(15,23,42,0.8)',
                  color: initialCash === val ? '#fbbf24' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {val === 0 ? '0 كاش' : `${val}ج`}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            <Play size={20} fill="#000" /> بدء الشيفت وافتتاح الدرج 🚀
          </button>

        </form>

      </div>
    </div>
  );
};
