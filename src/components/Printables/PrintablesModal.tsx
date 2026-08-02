import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X } from 'lucide-react';
import { generateBarcodeDataUrl, DEFAULT_BARCODE_CONFIG } from '../../lib/barcodeEngine';

export const PrintablesModal: React.FC = () => {
  const { activePrintDocument, setActivePrintDocument, storeSettings } = useApp();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automatic Print Trigger if autoPrintInvoice setting is ENABLED
  useEffect(() => {
    if (activePrintDocument && activePrintDocument.type === 'INVOICE' && storeSettings.autoPrintInvoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice]);

  if (!activePrintDocument) return null;

  const { type, data } = activePrintDocument;

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="modal-overlay no-print" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: type === 'CONTRACT' ? 750 : type === 'BARCODE_LABELS' ? 520 : 420, padding: 0, overflow: 'hidden', borderRadius: 16 }}>
        
        {/* Action Header bar */}
        <div style={{ background: '#0f172a', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
            <Printer size={18} />
            {type === 'INVOICE' && 'معاينة فاتورة البيع الحرارية (80mm)'}
            {type === 'CONTRACT' && 'معاينة عقد شراء / مبايعة هاتف مستعمل'}
            {type === 'MAINTENANCE' && 'معاينة إيصال استلام صيانة الزبون'}
            {type === 'BARCODE_LABELS' && 'معاينة ودقة طباعة ملصقات الباركود'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 800 }} onClick={handlePrintTrigger}>
              {type === 'BARCODE_LABELS' ? 'طباعة الملصقات 🖨️' : type === 'CONTRACT' ? 'طباعة العقد 🖨️' : type === 'MAINTENANCE' ? 'طباعة الإيصال 🖨️' : 'طباعة الفاتورة 🖨️'}
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
        <div style={{ padding: type === 'BARCODE_LABELS' ? '1.5rem 1rem' : '1.2rem', maxHeight: '75vh', overflowY: 'auto', background: type === 'BARCODE_LABELS' ? '#475569' : '#e2e8f0', color: '#000' }}>
          <div className={`print-area ${type === 'BARCODE_LABELS' ? 'barcode-print-mode' : type === 'CONTRACT' ? 'contract-print-mode' : ''}`}>

            {/* TYPE 1: THERMAL SALES INVOICE (80mm) */}
            {type === 'INVOICE' && (
              <div className="thermal-receipt">
                
                {/* Header info */}
                <div className="thermal-header" style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 2px 0' }}>{storeSettings.storeName}</h2>
                  <p style={{ fontSize: 10, margin: 0, color: '#333' }}>تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
                  {storeSettings.storePhone && (
                    <p style={{ fontSize: 10, margin: '2px 0 0 0', color: '#333' }}>تليفون المحل: {storeSettings.storePhone}</p>
                  )}
                  <div style={{ fontSize: 11, margin: '6px 0 0 0', fontWeight: 800, borderTop: '1px dashed #000', paddingTop: 4 }}>
                    فاتورة بيع رقم: #{data.invoiceNumber}
                  </div>
                  <div style={{ fontSize: 10, color: '#555' }}>التاريخ: {data.date}</div>
                </div>

                {/* Customer & Cashier Info */}
                <div style={{ fontSize: 10.5, borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>الزبون: <strong>{data.customerName || 'زبون عام'}</strong></span>
                    {data.customerPhone && <span>تليفون: {data.customerPhone}</span>}
                  </div>
                  <div style={{ color: '#444', marginTop: 2 }}>الكاشير: {data.cashierName || 'المهندس'}</div>
                </div>

                {/* Items Table */}
                <table className="thermal-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0', fontSize: 10.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000' }}>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>الصنف</th>
                      <th style={{ textAlign: 'center', padding: '3px 0', width: 35 }}>العدد</th>
                      <th style={{ textAlign: 'left', padding: '3px 0', width: 65 }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                        <td style={{ padding: '4px 0', textAlign: 'right', wordBreak: 'break-word', fontWeight: 700 }}>
                          {it.name}
                          {it.imei && <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#333' }}>IMEI: {it.imei}</div>}
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                        <td style={{ padding: '4px 0', textAlign: 'left', fontWeight: 800 }}>{it.totalPrice.toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Trade-In Info if present */}
                {data.tradeIn && (
                  <div style={{ fontSize: 10, background: '#f1f5f9', padding: '4px 6px', borderRadius: 4, margin: '6px 0', border: '1px solid #cbd5e1' }}>
                    🔄 استبدال جهاز: {data.tradeIn.model} (-{data.tradeIn.agreedPrice.toLocaleString('ar-EG')} ج.م)
                  </div>
                )}

                {/* Totals Breakdown */}
                <div className="thermal-total" style={{ borderTop: '1.5px dashed #000', paddingTop: 6, marginTop: 6, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>المجموع:</span>
                    <span>{data.subtotal.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                  {data.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: '#555' }}>
                      <span>الخصم:</span>
                      <span>-{data.discount.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}>
                    <span>الصافي المطلوب:</span>
                    <span>{data.totalAmount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                </div>

                {/* Receipt Footer Text */}
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9.5, borderTop: '1px dotted #000', paddingTop: 6, color: '#333', lineHeight: 1.4 }}>
                  {storeSettings.receiptFooterText || 'شكراً لزيارتكم محل المهندس - البضاعة المباعة ترد وتستبدل خلال 14 يوماً'}
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

            {/* TYPE 3: THERMAL BARCODE LABELS (42.5mm x 25.0mm) */}
            {type === 'BARCODE_LABELS' && (() => {
              const config = data.config || DEFAULT_BARCODE_CONFIG;
              return (
                <div style={{ background: 'transparent', color: '#000', padding: 0 }}>
                  <style>{`
                    @media print {
                      @page {
                        size: ${config.widthMm}mm ${config.heightMm}mm;
                        margin: 0;
                      }
                      html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                      }
                      .print-area.barcode-print-mode {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: ${config.widthMm}mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                      }
                      .barcode-print-label-item {
                        width: ${config.widthMm}mm !important;
                        height: ${config.heightMm}mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        page-break-after: always !important;
                        break-after: page !important;
                      }
                      .barcode-print-label-item:last-child {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                      }
                    }
                  `}</style>
                  {data.items.map((item: any, itemIdx: number) => {
                    const copies = item.qty || 1;
                    const barcodeText = item.barcode || item.id || '4000123456';
                    const barcodeDataUrl = generateBarcodeDataUrl(barcodeText, config);

                    return Array.from({ length: copies }).map((_, qIdx) => (
                      <div
                        key={`${item.id}-${itemIdx}-${qIdx}`}
                        className="barcode-print-label-item"
                        style={{
                          width: `${config.widthMm}mm`,
                          height: `${config.heightMm}mm`,
                          position: 'relative',
                          overflow: 'hidden',
                          background: '#ffffff',
                          color: '#000000',
                          boxSizing: 'border-box',
                          margin: '0 auto 12px auto',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          borderRadius: 2,
                          fontFamily: 'Cairo, sans-serif'
                        }}
                      >
                        {/* 1. Store Name */}
                        {config.showStoreName && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${config.storeX}mm`,
                              top: `${config.storeY}mm`,
                              transform: 'translateX(-50%)',
                              fontSize: `${config.storeFontSize * 0.35}pt`,
                              fontWeight: 'bold',
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              color: '#000'
                            }}
                          >
                            {config.customStoreName || item.storeName || storeSettings.storeName}
                          </div>
                        )}

                        {/* 2. Product Name */}
                        {config.showProductName && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${config.nameX}mm`,
                              top: `${config.nameY}mm`,
                              transform: 'translateX(-50%)',
                              fontSize: `${config.nameFontSize * 0.35}pt`,
                              fontWeight: 'bold',
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                              color: '#000',
                              maxWidth: `${config.widthMm - 2}mm`,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.title}
                          </div>
                        )}

                        {/* 3. Barcode CODE128 */}
                        {config.showBarcode && barcodeDataUrl && (
                          <img
                            src={barcodeDataUrl}
                            alt={barcodeText}
                            style={{
                              position: 'absolute',
                              left: `${config.barcodeX}mm`,
                              top: `${config.barcodeY}mm`,
                              transform: 'translateX(-50%)',
                              height: `${(config.scaleHeight || 45) * 0.22}mm`,
                              maxWidth: `${config.widthMm - 2}mm`,
                              objectFit: 'contain',
                              imageRendering: 'pixelated'
                            }}
                          />
                        )}

                        {/* 4. Price */}
                        {config.showPrice && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${config.priceX}mm`,
                              top: `${config.priceY}mm`,
                              fontSize: `${config.priceFontSize * 0.35}pt`,
                              fontWeight: 900,
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              color: '#000'
                            }}
                          >
                            ج.م {Number(item.price || 0).toLocaleString('ar-EG')}
                          </div>
                        )}

                        {/* 5. Origin */}
                        {config.showOrigin && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${config.originX}mm`,
                              top: `${config.originY}mm`,
                              transform: 'translateX(-100%)',
                              fontSize: `${config.originFontSize * 0.35}pt`,
                              fontWeight: 600,
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              color: '#333'
                            }}
                          >
                            {config.customOriginText || item.origin || 'صنع في مصر'}
                          </div>
                        )}
                      </div>
                    ));
                  })}
                </div>
              );
            })()}

            {/* TYPE 4: MAINTENANCE RECEIPT */}
            {type === 'MAINTENANCE' && (
              <div className="thermal-receipt">
                <div className="thermal-header" style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 2px 0' }}>إيصال استلام صيانة</h2>
                  <p style={{ fontSize: 11, fontWeight: 'bold', margin: 0 }}>{storeSettings.storeName}</p>
                  <p style={{ fontSize: 10, margin: '2px 0 0 0' }}>تذكرة رقم: #{data.ticketNumber}</p>
                  <p style={{ fontSize: 10, color: '#555' }}>التاريخ: {data.receivedDate}</p>
                </div>

                <div style={{ fontSize: 10.5, lineHeight: 1.5, marginBottom: 8 }}>
                  <div>الزبون: <strong>{data.customerName}</strong></div>
                  <div>التليفون: {data.customerPhone}</div>
                  <div>الجهاز: <strong>{data.deviceModel}</strong></div>
                  {data.devicePasscode && <div>رمز القفل: {data.devicePasscode}</div>}
                  <div style={{ marginTop: 4, background: '#eee', padding: 4, borderRadius: 4 }}>
                    العطل: {data.faultDescription}
                  </div>
                </div>

                <div className="thermal-total" style={{ borderTop: '1px dashed #000', paddingTop: 6, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>العربون المدفوع:</span>
                    <span><strong>{data.depositPaid} ج.م</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>التكلفة التقديرية:</span>
                    <span>{data.estimatedCost} ج.م</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9.5, borderTop: '1px dotted #000', paddingTop: 6, color: '#333' }}>
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
