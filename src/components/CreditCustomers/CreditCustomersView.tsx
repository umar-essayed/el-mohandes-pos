import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ShiftModal } from '../Shift/ShiftModal';
import { Users, Plus, X, DollarSign, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const CreditCustomersView: React.FC = () => {
  const { creditCustomers, creditPayments, invoices, addCreditCustomer, collectCreditPayment, currentShift } = useApp();
  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<string | null>(null);
  const [showInvoicesModal, setShowInvoicesModal] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Add Customer Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | ''>(5000);
  const [notes, setNotes] = useState('');

  // Collect Payment Form
  const [payAmount, setPayAmount] = useState<number | ''>('');

  const totalDebt = creditCustomers.reduce((s, c) => s + c.remainingDebt, 0);
  const totalCustomers = creditCustomers.length;

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    addCreditCustomer({ name, phone, nationalId: nationalId || undefined, address: address || undefined, creditLimit: Number(creditLimit || 5000), notes: notes || undefined });
    toast.success(`تم إضافة عميل الآجل: ${name} ✅`);
    setShowAddModal(false);
    setName(''); setPhone(''); setNationalId(''); setAddress(''); setCreditLimit(5000); setNotes('');
  };

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !payAmount) return;

    if (!currentShift || currentShift.status !== 'OPEN') {
      setShowShiftModal(true);
      toast.warning('افتح الشيفت أولاً ⏱️');
      return;
    }

    collectCreditPayment(showPayModal, Number(payAmount));
    const cust = creditCustomers.find(c => c.id === showPayModal);
    toast.success(`تم تحصيل ${payAmount} ج.م من ${cust?.name} ⚡`);
    setShowPayModal(null);
    setPayAmount('');
  };

  const getCustomerInvoices = (customerId: string) =>
    invoices.filter(inv => inv.creditCustomerId === customerId);

  const selectedCustomer = creditCustomers.find(c => c.id === showPayModal || c.id === showInvoicesModal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users color="#f59e0b" size={22} /> حسابات العملاء الآجل 📋
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            تسجيل الديون والمبيعات بالآجل وتتبع التحصيل
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> إضافة عميل آجل
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <div className="card" style={{ padding: '0.8rem', borderRight: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>إجمالي العملاء</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{totalCustomers}</div>
        </div>
        <div className="card" style={{ padding: '0.8rem', borderRight: '4px solid #fda4af' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>إجمالي الديون المتبقية</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f43f5e' }}>{totalDebt.toLocaleString('ar-EG')} ج.م</div>
        </div>
        <div className="card" style={{ padding: '0.8rem', borderRight: '4px solid #34d399' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>عملاء بديون صفرية</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{creditCustomers.filter(c => c.remainingDebt === 0).length}</div>
        </div>
      </div>

      {/* Customer Cards */}
      {creditCustomers.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
          <div>لا يوجد عملاء آجل مسجلين</div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>اضغط "إضافة عميل آجل" لبدء تسجيل الديون</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem' }}>
          {creditCustomers.map(c => {
            const usagePercent = c.creditLimit > 0 ? Math.min(100, (c.remainingDebt / c.creditLimit) * 100) : 0;
            const custInvoices = getCustomerInvoices(c.id);
            return (
              <div key={c.id} className="card" style={{ padding: '1rem', borderTop: `4px solid ${c.remainingDebt === 0 ? '#34d399' : c.remainingDebt > c.creditLimit * 0.8 ? '#f43f5e' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', direction: 'ltr' }}>{c.phone}</div>
                  </div>
                  {c.remainingDebt === 0 ? (
                    <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>✅ مسدد</span>
                  ) : (
                    <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>⏳ عليه دين</span>
                  )}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: 8, marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>إجمالي الديون:</span>
                    <span style={{ fontWeight: 800, color: '#fff' }}>{c.totalDebt.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>المتبقي المستحق:</span>
                    <span style={{ fontWeight: 900, color: c.remainingDebt > 0 ? '#f43f5e' : '#34d399', fontSize: '1rem' }}>{c.remainingDebt.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  {/* Credit limit bar */}
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent > 80 ? '#f43f5e' : usagePercent > 50 ? '#f59e0b' : '#34d399', borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    الحد الائتماني: {c.creditLimit.toLocaleString('ar-EG')} ج.م ({Math.round(usagePercent)}% مستخدم)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                    onClick={() => setShowInvoicesModal(c.id)}
                  >
                    <FileText size={14} /> فواتيره ({custInvoices.length})
                  </button>
                  {c.remainingDebt > 0 && (
                    <button
                      className="btn btn-emerald"
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                      onClick={() => { setShowPayModal(c.id); setPayAmount(''); }}
                    >
                      <DollarSign size={14} /> تحصيل دفعة
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fbbf24', fontWeight: 900 }}>إضافة عميل آجل جديد</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>الاسم *</label>
                  <input type="text" className="input-field" placeholder="اسم العميل" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>التليفون *</label>
                  <input type="tel" className="input-field" placeholder="010..." value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>الرقم القومي</label>
                  <input type="text" className="input-field" placeholder="اختياري" value={nationalId} onChange={e => setNationalId(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>الحد الائتماني (ج.م)</label>
                  <input type="number" className="input-field" value={creditLimit} onChange={e => setCreditLimit(e.target.value !== '' ? Number(e.target.value) : '')} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>العنوان</label>
                <input type="text" className="input-field" placeholder="اختياري" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">إضافة العميل ✅</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" style={{ alignItems: 'flex-end', padding: 0 }}>
          <div className="modal-content" style={{ borderRadius: '24px 24px 0 0', maxWidth: 'none', width: '100%', padding: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <h3 style={{ color: '#34d399', fontWeight: 900, fontSize: '1.1rem' }}>تحصيل دفعة من {selectedCustomer?.name}</h3>
              <button onClick={() => setShowPayModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'rgba(244,63,94,0.1)', padding: '0.6rem', borderRadius: 8, marginBottom: '0.8rem', fontSize: '0.85rem' }}>
              💰 الدين المتبقي: <strong style={{ color: '#fda4af' }}>{selectedCustomer?.remainingDebt.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <form onSubmit={handleCollectPayment} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#34d399', marginBottom: '0.4rem' }}>المبلغ المحصل (ج.م)</label>
                <input type="number" className="input-field" style={{ fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', padding: '0.75rem' }} placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value !== '' ? Number(e.target.value) : '')} autoFocus required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                {[100, 200, 500, 1000].map(v => (
                  <button key={v} type="button" onClick={() => setPayAmount(v)}
                    style={{ padding: '0.45rem', borderRadius: 8, border: payAmount === v ? '1px solid #34d399' : '1px solid var(--border-color)', background: payAmount === v ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.8)', color: payAmount === v ? '#34d399' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                    {v}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn btn-emerald" style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 900 }}>
                ✅ تأكيد التحصيل وتحديث الكاش
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Invoices Modal */}
      {showInvoicesModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fbbf24', fontWeight: 900 }}>فواتير {creditCustomers.find(c => c.id === showInvoicesModal)?.name}</h3>
              <button onClick={() => setShowInvoicesModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {getCustomerInvoices(showInvoicesModal).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد فواتير آجل لهذا العميل</div>
              ) : (
                getCustomerInvoices(showInvoicesModal).map(inv => (
                  <div key={inv.id} style={{ background: 'rgba(15,23,42,0.8)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>فاتورة #{inv.invoiceNumber}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.date}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 900, color: '#fbbf24', fontSize: '1rem' }}>{inv.totalAmount.toLocaleString('ar-EG')} ج.م</div>
                        {inv.isPaid
                          ? <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>✅ مسدد</span>
                          : <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>⏳ آجل</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                      {inv.items.map(i => i.name).join(' + ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ShiftModal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} />
    </div>
  );
};
