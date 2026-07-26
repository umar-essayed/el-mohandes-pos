import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Invoice } from '../../types';
import { FileText, Search, Printer, RotateCcw, Send, Eye } from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const { invoices, processInvoiceReturn, setActivePrintDocument, storeSettings } = useApp();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'RETURNED'>('ALL');
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<Invoice | null>(null);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [returnType, setReturnType] = useState<'FULL' | 'PARTIAL'>('FULL');

  const filteredInvoices = invoices.filter(inv => {
    if (!inv) return false;
    const matchSearch = (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (inv.customerPhone && inv.customerPhone.includes(searchTerm)) ||
                        (inv.date && inv.date.includes(searchTerm));
    
    const matchStatus = filterStatus === 'ALL' ||
                        (filterStatus === 'RETURNED' && inv.isReturned) ||
                        (filterStatus === 'ACTIVE' && !inv.isReturned);
    return !!(matchSearch && matchStatus);
  });

  const handleOpenReturn = (inv: Invoice) => {
    setShowReturnModal(inv);
    setRefundAmount(inv.totalAmount);
    setReturnType('FULL');
  };

  const handleExecuteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal || !refundAmount) return;

    const numRefund = Number(refundAmount);
    if (numRefund > showReturnModal.totalAmount) {
      toast.warning('خطأ بالمبلغ', 'مبلغ المرتجع لا يمكن أن يتجاوز إجمالي الفاتورة!');
      return;
    }

    processInvoiceReturn(showReturnModal.id, numRefund, returnType === 'FULL');
    setShowReturnModal(null);
    toast.success('تم المرتجع بنجاح 🔄', 'تمت استعادة الأصناف للمخزن وخصم المبلغ من الدرج');
  };

  const generateWhatsAppLink = (inv: Invoice) => {
    if (!inv.customerPhone) {
      toast.info('رقم غير مسجل', 'لا يوجد رقم تليفون مسجل لهذا الزبون!');
      return;
    }
    const cleanPhone = inv.customerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    
    const itemsText = inv.items.map(i => `• ${i.name} (${i.quantity}×${i.unitPrice}ج.م)`).join('%0A');
    const msg = `أهلاً بك أستاذ ${inv.customerName} ❤️%0Aفاتورة مشترياتك من ${storeSettings.storeName}:%0Aرقم الفاتورة: #${inv.invoiceNumber}%0A${itemsText}%0Aالصافي المدفوع: ${inv.totalAmount} ج.م%0Aشكراً لزيارتكم! 📱⚡`;

    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText color="#fbbf24" /> سجل الفواتير المكتملة والمرتجعات
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            عرض، طباعة، إرسال الفاتورة على الواتساب، وعمل ارتجاع واستعادة المخزون
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12 }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: 38 }}
            placeholder="ابحث برقم الفاتورة INV-، اسم الزبون، أو رقم التليفون..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>حالة الفاتورة:</span>
          <select className="input-field" style={{ width: 'auto' }} value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)}>
            <option value="ALL">جميع الفواتير</option>
            <option value="ACTIVE">الفواتير النشطة فقط</option>
            <option value="RETURNED">المرتجعات فقط 🔄</option>
          </select>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة والتاريخ</th>
              <th>بيانات الزبون</th>
              <th>عدد الأصناف</th>
              <th>إجمالي الفاتورة</th>
              <th>طريقة السداد</th>
              <th>الكاشير المسئول</th>
              <th>حالة الفاتورة</th>
              <th>إجراءات الفاتورة</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  لا توجد فواتير مسجلة مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} style={{ background: inv.isReturned ? 'rgba(244, 63, 94, 0.05)' : 'transparent' }}>
                  <td>
                    <div style={{ fontWeight: 800, color: '#fbbf24' }}>#{inv.invoiceNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.date}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{inv.customerName}</div>
                    {inv.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customerPhone}</div>}
                  </td>
                  <td>{inv.items?.length || 0} أصناف</td>
                  <td style={{ fontWeight: 900, color: '#34d399', fontSize: '1.05rem' }}>
                    {(inv.totalAmount || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {inv.paymentSplit?.cashAmount > 0 && <span style={{ color: '#34d399', marginLeft: 4 }}>كاش ({inv.paymentSplit.cashAmount})</span>}
                    {inv.paymentSplit?.walletAmount > 0 && <span style={{ color: '#818cf8', marginLeft: 4 }}>محفظة ({inv.paymentSplit.walletAmount})</span>}
                    {inv.paymentSplit?.creditAmount > 0 && <span style={{ color: '#fbbf24', marginLeft: 4 }}>آجل ({inv.paymentSplit.creditAmount})</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.cashierName || ''}</td>
                  <td>
                    {inv.isReturned ? (
                      <span className="badge badge-rose">
                        <RotateCcw size={12} /> {inv.returnStatus === 'FULL_RETURN' ? 'مرتجع كامل' : 'مرتجع جزئي'}
                      </span>
                    ) : (
                      <span className="badge badge-emerald">مباع مكتمل</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={() => setSelectedInvoice(inv)}
                        title="عرض تفاصيل المنتجات"
                      >
                        <Eye size={14} /> تفاصيل
                      </button>

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={() => setActivePrintDocument({ type: 'INVOICE', data: inv })}
                        title="طباعة حرارية 80mm"
                      >
                        <Printer size={14} /> طباعة
                      </button>

                      {inv.customerPhone && (
                        <button
                          className="btn btn-emerald"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          onClick={() => generateWhatsAppLink(inv)}
                          title="إرسال الفاتورة على الواتساب"
                        >
                          <Send size={14} /> واتساب
                        </button>
                      )}

                      {!inv.isReturned && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleOpenReturn(inv)}
                          title="استعادة المنتجات للمخزن وخصم المبلغ"
                        >
                          <RotateCcw size={14} /> مرتجع
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem', color: '#fbbf24' }}>تفاصيل الفاتورة #{selectedInvoice.invoiceNumber}</h3>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              الزبون: <strong>{selectedInvoice.customerName}</strong> | التاريخ: <strong>{selectedInvoice.date}</strong>
            </div>

            <div className="table-wrapper" style={{ marginBottom: '1rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>
                        {it.name}
                        {it.imei && <div style={{ fontSize: '0.75rem', color: '#818cf8', fontFamily: 'monospace' }}>IMEI: {it.imei}</div>}
                      </td>
                      <td>{it.quantity}</td>
                      <td>{it.unitPrice} ج.م</td>
                      <td style={{ fontWeight: 800, color: '#fbbf24' }}>{it.totalPrice} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Process Return / Refund Modal */}
      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.2rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw /> عمل مرتجع واستعادة المخزون الفاتورة #{showReturnModal.invoiceNumber}
            </h3>

            <form onSubmit={handleExecuteReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  إجمالي قيمة الفاتورة الأصلية: <strong>{showReturnModal.totalAmount.toLocaleString('ar-EG')} ج.م</strong>
                </p>
                <p style={{ fontSize: '0.8rem', color: '#34d399', marginTop: 4 }}>
                  📌 سيتم إعادة جميع التلفونات المباعة بـ IMEI وجميع الإكسسوارات إلى مخزون المحل تلقائياً!
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>نوع المرتجع</label>
                <select className="input-field" value={returnType} onChange={(e: any) => setReturnType(e.target.value)}>
                  <option value="FULL">مرتجع كامل (إرجاع جميع الأصناف بالكامل)</option>
                  <option value="PARTIAL">مرتجع جزئي (إرجاع جزء من المبلغ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>المبلغ المرتجع والمخصوم من كاش الدرج (ج.م)</label>
                <input
                  type="number"
                  className="input-field"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReturnModal(null)}>إلغاء</button>
                <button type="submit" className="btn btn-danger">تأكيد المرتجع واستعادة الأصناف</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
