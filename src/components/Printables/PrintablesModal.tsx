import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X } from 'lucide-react';

export const PrintablesModal: React.FC = () => {
  const { activePrintDocument, setActivePrintDocument, storeSettings } = useApp();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!activePrintDocument) return null;

  const { type, data } = activePrintDocument;

  // RULE 1: On mobile devices, NEVER popup sales invoice preview at all!
  if (type === 'INVOICE' && isMobile) {
    return null;
  }

  // RULE 2: If manual print is configured (autoPrintInvoice = false), NEVER popup sales invoice preview on desktop or mobile!
  if (type === 'INVOICE' && !storeSettings.autoPrintInvoice) {
    return null;
  }

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="modal-overlay no-print" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: type === 'CONTRACT' ? 750 : 450, padding: 0, overflow: 'hidden' }}>
        
        {/* Action Header bar */}
        <div style={{ background: '#0f172a', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Printer size={18} />
            {type === 'INVOICE' && 'معاينة فاتورة البيع الحرارية (80mm)'}
            {type === 'CONTRACT' && 'معاينة عقد شراء / مبايعة جهاز مستعمل بالرقم القومي'}
            {type === 'MAINTENANCE' && 'معاينة إيصال استلام صيانة الزبون'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.85rem' }} onClick={handlePrintTrigger}>
              طباعة الآن 🖨️
            </button>
            <button
              onClick={() => setActivePrintDocument(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Canvas Body */}
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto', background: '#e2e8f0', color: '#000' }}>
          <div className="print-area">

            {/* TYPE 1: THERMAL SALES INVOICE (80mm) */}
            {type === 'INVOICE' && (
              <div className="thermal-receipt">
                <div className="thermal-header">
                  <h2>محل المهندس للاتصالات</h2>
                  <p style={{ fontSize: 11 }}>تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
                  <p style={{ fontSize: 10, marginTop: 2 }}>تليفون المحل: {storeSettings.storePhone}</p>
                  <div style={{ fontSize: 10, margin: '6px 0 0 0', fontWeight: 'bold' }}>
                    فاتورة رقم: #{data.invoiceNumber}
                  </div>
                  <div style={{ fontSize: 10 }}>التاريخ: {data.date}</div>
                </div>

                <div style={{ fontSize: 11, marginBottom: 6 }}>
                  <div>الزبون: <strong>{data.customerName}</strong></div>
                  {data.customerPhone && <div>التليفون: {data.customerPhone}</div>}
                  <div>الكاشير: {data.cashierName}</div>
                </div>

                <table className="thermal-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'right' }}>الصنف</th>
                      <th style={{ textAlign: 'center' }}>الكمية</th>
                      <th style={{ textAlign: 'left' }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          {it.name}
                          {it.imei && <div style={{ fontSize: 9, fontFamily: 'monospace' }}>IMEI: {it.imei}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'left' }}>{it.totalPrice} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.tradeIn && (
                  <div style={{ fontSize: 10, background: '#eee', padding: 4, borderRadius: 4, margin: '4px 0' }}>
                    🔄 استبدال جهاز: {data.tradeIn.model} (-{data.tradeIn.agreedPrice} ج.م)
                  </div>
                )}

                <div className="thermal-total">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>المجموع:</span>
                    <span>{data.subtotal} ج.م</span>
                  </div>
                  {data.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                      <span>الخصم:</span>
                      <span>-{data.discount} ج.م</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
                    <span>الصافي المطلوب:</span>
                    <span>{data.totalAmount} ج.م</span>
                  </div>
                </div>

                <div style={{ textTransform: 'uppercase', textAlign: 'center', marginTop: 12, fontSize: 10, borderTop: '1px dotted #000', paddingTop: 6 }}>
                  {storeSettings.receiptFooterText}
                </div>
              </div>
            )}

            {/* TYPE 2: USED PHONE PURCHASE CONTRACT */}
            {type === 'CONTRACT' && (
              <div style={{ background: '#fff', color: '#000', padding: '2rem', fontFamily: 'Cairo, sans-serif', border: '2px solid #000', borderRadius: 8 }}>
                
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 15 }}>
                  <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900 }}>عقد بيع ومبايعة هاتف محمول مستعمل</h2>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>{storeSettings.storeName} - لحفظ حقوق المحل والزبون</p>
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 15 }}>
                  أقر أنا السيد/ <strong>{data.sellerName || '...................................................'}</strong>
                  <br />
                  يحمل رقم قومي: <strong style={{ letterSpacing: 2, fontFamily: 'monospace' }}>{data.sellerNationalId || '............................'}</strong>
                  <br />
                  ورقم تليفون: <strong>{data.sellerPhone || '............................'}</strong>
                  <br />
                  بأنني قمت ببيع الهاتف المحمول المبينة مواصفاته أدناه إلى محل المهندس للاتصالات:
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15, fontSize: 13 }} border={1}>
                  <tbody>
                    <tr>
                      <td style={{ padding: 6, width: '30%', background: '#f1f5f9', fontWeight: 'bold' }}>الماركة والموديل:</td>
                      <td style={{ padding: 6 }}><strong>{data.brand} {data.model}</strong></td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>رقم السيريال / الـ IMEI:</td>
                      <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 14 }}><strong>{data.imei}</strong></td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>المساحة واللون والنسبة:</td>
                      <td style={{ padding: 6 }}>{data.storage} - {data.color} {data.batteryHealth ? `(بطارية ${data.batteryHealth}%)` : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>سعر الشراء المتفق عليه:</td>
                      <td style={{ padding: 6, fontSize: 15, fontWeight: 'bold' }}>{data.costPrice} جنيه مصري فقط لا غير</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
                  <strong>إقرار وتعهد البائع:</strong> أقر بأنني الملك الاصلي لهذا الجهاز وأنه غير مسروق وليس عليه أي بلاغات أو التزامات مالية أو قضايا، وأتحمل كامل المسؤولية الجنائية والمدنية أمام الجهات المختصة في حالة ثبوت خلاف ذلك.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'center', marginTop: 30, fontSize: 13 }}>
                  <div>
                    <strong>توقيع البائع (الزبون):</strong>
                    <div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>
                      {data.sellerName || 'توقيع الزبون'}
                    </div>
                  </div>
                  <div>
                    <strong>توقيع واختام المستلم ({storeSettings.storeName}):</strong>
                    <div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>
                      {storeSettings.storeName}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TYPE 3: MAINTENANCE RECEIPT */}
            {type === 'MAINTENANCE' && (
              <div className="thermal-receipt" style={{ width: '80mm' }}>
                <div className="thermal-header">
                  <h2>إيصال استلام صيانة</h2>
                  <p style={{ fontSize: 12, fontWeight: 'bold' }}>{storeSettings.storeName}</p>
                  <p style={{ fontSize: 11 }}>تذكرة رقم: #{data.ticketNumber}</p>
                  <p style={{ fontSize: 10 }}>التاريخ: {data.receivedDate}</p>
                </div>

                <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
                  <div>الزبون: <strong>{data.customerName}</strong></div>
                  <div>التليفون: {data.customerPhone}</div>
                  <div>الجهاز: <strong>{data.deviceModel}</strong></div>
                  {data.devicePasscode && <div>رمز القفل: {data.devicePasscode}</div>}
                  <div style={{ marginTop: 4, background: '#eee', padding: 4, borderRadius: 4 }}>
                    العطل: {data.faultDescription}
                  </div>
                </div>

                <div className="thermal-total" style={{ fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>العربون المدفوع:</span>
                    <span><strong>{data.depositPaid} ج.م</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>التكلفة التقديرية:</span>
                    <span>{data.estimatedCost} ج.م</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, borderTop: '1px dotted #000', paddingTop: 6 }}>
                  ⚠️ رجاء الاحتفاظ بهذا الإيصال لتسليم الجهاز
                  <br />
                  المحل غير مسؤول عن الأجهزة المتروكة بعد 30 يوماً
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
