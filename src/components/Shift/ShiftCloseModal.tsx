import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShiftModal } from '../Shift/ShiftModal';
import { Clock, DollarSign, X, CheckCircle, AlertCircle } from 'lucide-react';

export const ShiftCloseModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentShift, closeShift, drawerCash, invoices, walletTransactions } = useApp();
  const toast = useToast();
  const [actualCash, setActualCash] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [showDenomCalc, setShowDenomCalc] = useState(false);
  const [denoms, setDenoms] = useState({ d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0 });

  if (!isOpen || !currentShift) return null;

  const shiftInvoices = invoices.filter(inv => {
    return inv.cashierName === currentShift.cashierName;
  });
  const shiftSales = shiftInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const shiftWalletProfit = walletTransactions.reduce((s, t) => s + t.netStoreProfit, 0);
  const expected = currentShift.expectedDrawerCash;
  const numActual = Number(actualCash || 0);
  const diff = numActual - expected;

  const updateDenom = (key: keyof typeof denoms, val: number) => {
    const newDenoms = { ...denoms, [key]: Math.max(0, val) };
    setDenoms(newDenoms);
    const sum = newDenoms.d200 * 200 + newDenoms.d100 * 100 + newDenoms.d50 * 50 + newDenoms.d20 * 20 + newDenoms.d10 * 10 + newDenoms.d5 * 5;
    setActualCash(sum);
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCash === '') {
      toast.warning('ادخل مبلغ الكاش الفعلي بالدرج أولاً');
      return;
    }
    closeShift(numActual, notes);
    toast.success(
      `تم تقفيل شيفت #${currentShift.shiftNumber} ✅`,
      diff === 0 ? 'الكاش مطابق 100% 🎯' : diff > 0 ? `زيادة ${diff} ج.م` : `عجز ${Math.abs(diff)} ج.م`
    );
    setActualCash('');
    setNotes('');
    setShowDenomCalc(false);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3500 }}>
      <div className="modal-content" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} color="#f43f5e" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>تقفيل الشيفت #{currentShift.shiftNumber}</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>الكاشير: {currentShift.cashierName} | بدأ: {currentShift.startTime}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Shift Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="card" style={{ padding: '0.65rem', borderRight: '3px solid #34d399' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الكاش الابتدائي</div>
            <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>{currentShift.initialDrawerCash.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div className="card" style={{ padding: '0.65rem', borderRight: '3px solid #fbbf24' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الكاش المتوقع الآن</div>
            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1rem' }}>{expected.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div className="card" style={{ padding: '0.65rem', borderRight: '3px solid #818cf8' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>إجمالي مبيعات الشيفت</div>
            <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.95rem' }}>{shiftSales.toLocaleString('ar-EG')} ج.م</div>
          </div>
          <div className="card" style={{ padding: '0.65rem', borderRight: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>عمولات المحافظ</div>
            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.95rem' }}>{shiftWalletProfit.toLocaleString('ar-EG')} ج.م</div>
          </div>
        </div>

        <form onSubmit={handleClose} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          {/* Actual Cash Count */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24' }}>
                عد الكاش الفعلي بالدرج الآن (ج.م) 🔢
              </label>
              <button
                type="button"
                onClick={() => setShowDenomCalc(!showDenomCalc)}
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
              >
                {showDenomCalc ? 'إخفاء الحاسبة' : '🧮 حاسبة عدد الفئات'}
              </button>
            </div>

            <input
              type="number"
              className="input-field"
              style={{ fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', padding: '0.75rem', border: '2px solid rgba(245,158,11,0.4)', background: '#0f172a' }}
              placeholder="0"
              value={actualCash}
              onChange={e => setActualCash(e.target.value !== '' ? Number(e.target.value) : '')}
              autoFocus
              required
            />
          </div>

          {/* Denomination Counter Breakdown */}
          {showDenomCalc && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.65rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>أدخل عدد الورق لكل فئة:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {[
                  { key: 'd200', label: '200 ج.م', val: 200 },
                  { key: 'd100', label: '100 ج.م', val: 100 },
                  { key: 'd50', label: '50 ج.م', val: 50 },
                  { key: 'd20', label: '20 ج.م', val: 20 },
                  { key: 'd10', label: '10 ج.م', val: 10 },
                  { key: 'd5', label: '5 ج.م', val: 5 }
                ].map(d => (
                  <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>{d.label}</span>
                    <input
                      type="number"
                      className="input-field"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'center', height: '32px' }}
                      placeholder="0"
                      value={denoms[d.key as keyof typeof denoms] || ''}
                      onChange={e => updateDenom(d.key as any, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Difference Display */}
          {actualCash !== '' && (
            <div style={{
              padding: '0.75rem',
              borderRadius: 12,
              background: diff === 0 ? 'rgba(16,185,129,0.12)' : diff > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(244,63,94,0.12)',
              border: `1px solid ${diff === 0 ? 'rgba(16,185,129,0.3)' : diff > 0 ? 'rgba(99,102,241,0.3)' : 'rgba(244,63,94,0.3)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                {diff === 0 ? '✅ الكاش مطابق تماماً!' : diff > 0 ? '📈 زيادة في الكاش:' : '📉 عجز في الكاش:'}
              </span>
              <span style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: diff === 0 ? '#34d399' : diff > 0 ? '#818cf8' : '#f43f5e'
              }}>
                {diff > 0 ? '+' : ''}{diff} ج.م
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              ملاحظات الإقفال (اختياري)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="مثال: كل حاجه تمام، مفيش مشاكل"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.9rem',
              fontSize: '1.05rem',
              fontWeight: 900,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.3rem'
            }}
          >
            <CheckCircle size={20} /> تأكيد إقفال الشيفت
          </button>

        </form>
      </div>
    </div>
  );
};
