import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { MaintenanceJob } from '../../types';
import { Wrench, Plus, Search, FileText } from 'lucide-react';

export const MaintenanceView: React.FC = () => {
  const { maintenanceJobs, addMaintenanceJob, updateMaintenanceStatus, deliverMaintenanceJob, inventory, setActivePrintDocument } = useApp();
  const toast = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState<MaintenanceJob | null>(null);

  // New Maintenance Job Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [devicePasscode, setDevicePasscode] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [depositPaid, setDepositPaid] = useState<number | ''>(0);
  const [estimatedCost, setEstimatedCost] = useState<number | ''>(500);

  const [deliverFinalPayment, setDeliverFinalPayment] = useState<number>(0);

  const filteredJobs = maintenanceJobs.filter(j => {
    const matchSearch = j.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        j.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        j.ticketNumber.includes(searchTerm) ||
                        j.customerPhone.includes(searchTerm);
    const matchStatus = selectedStatusTab === 'ALL' || j.status === selectedStatusTab;
    return matchSearch && matchStatus;
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deviceModel || !faultDescription) {
      toast.warning('بيانات ناقصة', 'أكمل بيانات الزبون وعطل الجهاز!');
      return;
    }

    const createdJob = addMaintenanceJob({
      customerName,
      customerPhone,
      deviceModel,
      imeiOrSerial,
      devicePasscode,
      faultDescription,
      depositPaid: Number(depositPaid || 0),
      estimatedCost: Number(estimatedCost || 0),
      usedSpareParts: []
    });

    setShowAddModal(false);
    toast.success(`تذكرة صيانة #${createdJob.ticketNumber}`, `تم استلام ${deviceModel} بنجاح`);
    setActivePrintDocument({ type: 'MAINTENANCE', data: createdJob });

    setCustomerName(''); setCustomerPhone(''); setDeviceModel(''); setImeiOrSerial(''); setDevicePasscode(''); setFaultDescription(''); setDepositPaid(0);
  };

  const handleCompleteDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDeliverModal) return;

    deliverMaintenanceJob(showDeliverModal.id, Number(deliverFinalPayment));
    setShowDeliverModal(null);
    toast.success('تم التسليم والتحصيل 📦', `تمت إضافة ${deliverFinalPayment} ج.م للدرج وتسليم الجهاز للزبون`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench color="#fbbf24" /> قسم الصيانة وتتبع حالة الأجهزة
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            استلام أجهزة الأعطال، طباعة إيصال استلام بباركود، وربط قطع الغيار بالمخزن
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> استلام جهاز صيانة جديد
        </button>
      </div>

      {/* Status Pipeline Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
        <button
          onClick={() => setSelectedStatusTab('ALL')}
          style={{
            padding: '0.8rem', borderRadius: 12, border: '1px solid var(--border-color)',
            background: selectedStatusTab === 'ALL' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.6)',
            color: '#fff', fontWeight: 800, cursor: 'pointer', textAlign: 'right'
          }}
        >
          الكل ({maintenanceJobs.length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('INSPECTION')}
          style={{
            padding: '0.8rem', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)',
            background: selectedStatusTab === 'INSPECTION' ? 'rgba(245,158,11,0.2)' : 'rgba(15,23,42,0.6)',
            color: '#fbbf24', fontWeight: 800, cursor: 'pointer', textAlign: 'right'
          }}
        >
          🔍 قيد الفحص ({maintenanceJobs.filter(m => m.status === 'INSPECTION').length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('REPAIRING')}
          style={{
            padding: '0.8rem', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)',
            background: selectedStatusTab === 'REPAIRING' ? 'rgba(99,102,241,0.2)' : 'rgba(15,23,42,0.6)',
            color: '#818cf8', fontWeight: 800, cursor: 'pointer', textAlign: 'right'
          }}
        >
          🛠️ جارٍ الإصلاح ({maintenanceJobs.filter(m => m.status === 'REPAIRING').length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('READY')}
          style={{
            padding: '0.8rem', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)',
            background: selectedStatusTab === 'READY' ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.6)',
            color: '#34d399', fontWeight: 800, cursor: 'pointer', textAlign: 'right'
          }}
        >
          ✅ جاهز للتسليم ({maintenanceJobs.filter(m => m.status === 'READY').length})
        </button>

        <button
          onClick={() => setSelectedStatusTab('DELIVERED')}
          style={{
            padding: '0.8rem', borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)',
            background: selectedStatusTab === 'DELIVERED' ? 'rgba(148,163,184,0.1)' : 'rgba(15,23,42,0.6)',
            color: 'var(--text-muted)', fontWeight: 800, cursor: 'pointer', textAlign: 'right'
          }}
        >
          📦 تم التسليم ({maintenanceJobs.filter(m => m.status === 'DELIVERED').length})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card" style={{ padding: '0.8rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12 }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: 38 }}
            placeholder="ابحث برقم الإيصال MT-، اسم الزبون، أو موديل الجهاز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Maintenance Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredJobs.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            لا توجد تذاكر صيانة بهذه الحالة
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)' }}>#{job.ticketNumber}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{job.deviceModel}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الزبون: {job.customerName} ({job.customerPhone})</div>
                </div>

                {job.status === 'INSPECTION' && <span className="badge badge-gold">🔍 قيد الفحص</span>}
                {job.status === 'REPAIRING' && <span className="badge badge-indigo">🛠️ جارٍ الإصلاح</span>}
                {job.status === 'READY' && <span className="badge badge-emerald">✅ جاهز للتسليم</span>}
                {job.status === 'DELIVERED' && <span className="badge" style={{ background: '#334155', color: '#94a3b8' }}>📦 تم التسليم</span>}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: 8, fontSize: '0.82rem' }}>
                <div><strong style={{ color: '#fda4af' }}>العطل المسجل:</strong> {job.faultDescription}</div>
                {job.devicePasscode && <div><strong style={{ color: '#818cf8' }}>رمز القفل:</strong> {job.devicePasscode}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>العربون المدفوع: <strong style={{ color: '#34d399' }}>{job.depositPaid} ج.م</strong></span>
                <span>التكلفة التقديرية: <strong style={{ color: '#fbbf24' }}>{job.estimatedCost} ج.م</strong></span>
              </div>

              {job.technicianNotes && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ملاحظات الفني: {job.technicianNotes}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: 'auto' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActivePrintDocument({ type: 'MAINTENANCE', data: job })}>
                  <FileText size={14} /> طباعة إيصال
                </button>

                {job.customerPhone && (
                  <a
                    className="btn"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', textDecoration: 'none' }}
                    href={`https://wa.me/${job.customerPhone.startsWith('0') ? '2' + job.customerPhone : job.customerPhone}?text=${encodeURIComponent(`أهلاً بك ${job.customerName} 👋\nنحيطك علماً بأن جهازك (${job.deviceModel}) تذكرة رقم #${job.ticketNumber} حالته حالياً: ${job.status === 'READY' ? '✅ جاهز للتسليم في المحل' : job.status === 'REPAIRING' ? '🛠️ جارٍ الإصلاح' : '🔍 قيد الفحص'}.\nشكراً لتعاملك معنا - المهندس للصيانة`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💬 واتساب
                  </a>
                )}

                {job.status === 'INSPECTION' && (
                  <button className="btn btn-indigo" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                    updateMaintenanceStatus(job.id, 'REPAIRING');
                    toast.info('تحديث صيانة 🛠️', 'تمت تحويل حالة الجهاز إلى جارٍ الإصلاح');
                  }}>
                    بدء الإصلاح 🛠️
                  </button>
                )}

                {job.status === 'REPAIRING' && (
                  <button className="btn btn-emerald" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                    updateMaintenanceStatus(job.id, 'READY');
                    toast.success('تم الإصلاح بنجاح ✅', 'الجهاز جاهز لتسليم الزبون');
                  }}>
                    تم الإصلاح (جاهز) ✅
                  </button>
                )}

                {job.status === 'READY' && (
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                    setDeliverFinalPayment(Math.max(0, job.estimatedCost - job.depositPaid));
                    setShowDeliverModal(job);
                  }}>
                    تسليم وتحصيل المتبقي 📦
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* New Maintenance Check-in Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.2rem', color: 'var(--accent-gold)' }}>استلام جهاز صيانة وتسجيل عطل</h3>
            <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>اسم الزبون الكامل</label>
                  <input type="text" className="input-field" placeholder="اسم الزبون" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>رقم تليفون الزبون</label>
                  <input type="text" className="input-field" placeholder="010 / 011 / 012..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>نوع وموديل الجهاز</label>
                  <input type="text" className="input-field" placeholder="مثال: iPhone 11 أسود" value={deviceModel} onChange={e => setDeviceModel(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>رمز قفل الشاشة (الباسورد)</label>
                  <input type="text" className="input-field" placeholder="1234 أو النمط" value={devicePasscode} onChange={e => setDevicePasscode(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>وصف العطل وشكوى الزبون بالكامل</label>
                <textarea className="input-field" rows={2} placeholder="مثال: الشاشة فاصلة اضاءة ولا يشحن..." value={faultDescription} onChange={e => setFaultDescription(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>العربون المدفوع (مقدم نقدياً)</label>
                  <input type="number" className="input-field" value={depositPaid} onChange={e => setDepositPaid(e.target.value !== '' ? Number(e.target.value) : '')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>التكلفة التقديرية للصيانة (ج.م)</label>
                  <input type="number" className="input-field" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value !== '' ? Number(e.target.value) : '')} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ واستخراج الإيصال</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Deliver Maintenance Modal */}
      {showDeliverModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: '#34d399' }}>تسليم صيانة #{showDeliverModal.ticketNumber}</h3>
            <form onSubmit={handleCompleteDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  الجهاز: <strong>{showDeliverModal.deviceModel}</strong> | العميل: <strong>{showDeliverModal.customerName}</strong>
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  العربون السابق: {showDeliverModal.depositPaid} ج.م | التكلفة الكلية: {showDeliverModal.estimatedCost} ج.م
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>المبلغ المتبقي المطلوب تحصيله كاش (ج.م)</label>
                <input
                  type="number"
                  className="input-field"
                  value={deliverFinalPayment}
                  onChange={e => setDeliverFinalPayment(Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliverModal(null)}>إلغاء</button>
                <button type="submit" className="btn btn-emerald">تأكيد التسليم وتحصيل المتبقي بالدرج</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
