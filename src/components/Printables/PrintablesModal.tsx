import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Printer, X, Loader2 } from 'lucide-react';
import { DEFAULT_BARCODE_CONFIG } from '../../lib/barcodeEngine';
import { generateZPLCode, fetchLabelaryPNG, renderArabicCanvasLabel2x1 } from '../../lib/labelaryBarcodeEngine';

// ─────────────────────────────────────────────────────────────────────────────
// ASYNC LABEL IMAGE GENERATOR (Labelary API first, Canvas fallback for Arabic)
// ─────────────────────────────────────────────────────────────────────────────
async function buildLabelDataUrl(item: any, config: any, storeSettings: any): Promise<string> {
  const shopName = config.customStoreName || storeSettings?.storeName || 'المهندس للاتصالات';
  const productName = item.title || item.name || 'منتج';
  const barcodeValue = item.barcode || item.id || '0000000000';
  const price = item.price || item.salePrice || 0;
  const originText = config.customOriginText || item.origin || 'صنع في مصر';

  const hasArabic = /[\u0600-\u06FF]/.test(shopName + productName);

  if (!hasArabic) {
    // Try Labelary API (pure alphanumeric content works perfectly)
    try {
      const zpl = generateZPLCode({ shopName, productName, barcodeValue: String(barcodeValue), price, originText });
      const blob = await fetchLabelaryPNG(zpl);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Labelary API failed, falling back to canvas:', err);
    }
  }

  // Arabic / fallback: render via local HTML5 Canvas (406x203 px @ 203 DPI)
  const canvas = renderArabicCanvasLabel2x1({
    shopName,
    productName,
    barcodeValue: String(barcodeValue),
    price,
    originText
  });
  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────────────
// BARCODE LABELS PRINT PORTAL COMPONENT
// Renders directly into document.body so @media print hides nothing else
// ─────────────────────────────────────────────────────────────────────────────
interface PortalProps {
  items: any[];
  config: any;
  storeSettings: any;
  onReady: () => void;
}

const BarcodePrintPortal: React.FC<PortalProps> = ({ items, config, storeSettings, onReady }) => {
  const widthMm = config.widthMm || 42.5;
  const heightMm = config.heightMm || 25.0;
  // Expand items by qty into flat array: [{item, key}]
  const flatLabels = items.flatMap((item: any, idx: number) =>
    Array.from({ length: item.qty || 1 }, (_, q) => ({ item, key: `${idx}-${q}` }))
  );

  const [dataUrls, setDataUrls] = useState<Record<string, string>>({});
  const readyCount = useRef(0);
  const total = flatLabels.length;

  const loadImage = useCallback(async (item: any, key: string) => {
    try {
      const url = await buildLabelDataUrl(item, config, storeSettings);
      setDataUrls(prev => ({ ...prev, [key]: url }));
      readyCount.current += 1;
      if (readyCount.current >= total) {
        // Small extra delay to let browser paint the images
        setTimeout(onReady, 120);
      }
    } catch (err) {
      console.error('Label generation failed for key', key, err);
      readyCount.current += 1;
      if (readyCount.current >= total) {
        setTimeout(onReady, 120);
      }
    }
  }, [config, storeSettings, total, onReady]);

  useEffect(() => {
    if (total === 0) {
      onReady();
      return;
    }
    readyCount.current = 0;
    flatLabels.forEach(({ item, key }) => loadImage(item, key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ReactDOM.createPortal(
    <div id="barcode-standalone-print-portal">
      <style>{`
        @media screen {
          #barcode-standalone-print-portal { display: none !important; }
        }
        @media print {
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: ${widthMm}mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          body > *:not(#barcode-standalone-print-portal) {
            display: none !important;
            visibility: hidden !important;
          }
          #barcode-standalone-print-portal {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${widthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .bp-label {
            display: block !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .bp-label:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .bp-label img {
            display: block !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            object-fit: fill !important;
            image-rendering: pixelated !important;
          }
        }
      `}</style>
      {flatLabels.map(({ item, key }) => {
        const src = dataUrls[key];
        return (
          <div key={key} className="bp-label">
            {src && <img src={src} alt={item.title || 'label'} />}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PRINTABLES MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const PrintablesModal: React.FC = () => {
  const { activePrintDocument, setActivePrintDocument, storeSettings } = useApp();
  const [portalReady, setPortalReady] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Auto print for invoices
  useEffect(() => {
    if (activePrintDocument?.type === 'INVOICE' && storeSettings.autoPrintInvoice) {
      const timer = setTimeout(() => window.print(), 350);
      return () => clearTimeout(timer);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice]);

  // Reset state when document changes
  useEffect(() => {
    setPortalReady(false);
    setPrinting(false);
  }, [activePrintDocument]);

  if (!activePrintDocument) return null;

  const { type, data } = activePrintDocument;
  const config = data?.config || DEFAULT_BARCODE_CONFIG;

  const handlePrintTrigger = async () => {
    if (type === 'BARCODE_LABELS') {
      if (!portalReady) {
        // Wait for labels to load then print
        setPrinting(true);
        return;
      }
    }
    window.print();
  };

  // When portal signals ready AND we were waiting to print
  const handlePortalReady = useCallback(() => {
    setPortalReady(true);
    if (printing) {
      setPrinting(false);
      setTimeout(() => window.print(), 80);
    }
  }, [printing]);

  return (
    <>
      {/* ── SCREEN PREVIEW MODAL ── */}
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: type === 'CONTRACT' ? 750 : type === 'BARCODE_LABELS' ? 520 : 420,
            padding: 0,
            overflow: 'hidden',
            borderRadius: 16,
          }}
        >
          {/* Header (hidden during print via .no-print) */}
          <div
            className="no-print"
            style={{
              background: '#0f172a',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
              <Printer size={18} />
              {type === 'INVOICE' && 'معاينة فاتورة البيع الحرارية (80mm)'}
              {type === 'CONTRACT' && 'معاينة عقد شراء / مبايعة هاتف مستعمل'}
              {type === 'MAINTENANCE' && 'معاينة إيصال استلام صيانة الزبون'}
              {type === 'BARCODE_LABELS' && 'معاينة ودقة طباعة ملصقات الباركود'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handlePrintTrigger}
                disabled={type === 'BARCODE_LABELS' && printing}
              >
                {printing && <Loader2 size={14} className="spin" />}
                {type === 'BARCODE_LABELS' ? (printing ? 'جاري التحضير...' : 'طباعة الملصقات 🖨️') :
                  type === 'CONTRACT' ? 'طباعة العقد 🖨️' :
                  type === 'MAINTENANCE' ? 'طباعة الإيصال 🖨️' : 'طباعة الفاتورة 🖨️'}
              </button>
              <button
                onClick={() => setActivePrintDocument(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Document body */}
          <div
            style={{
              padding: type === 'BARCODE_LABELS' ? '1.5rem 1rem' : '1.2rem',
              maxHeight: '75vh',
              overflowY: 'auto',
              background: type === 'BARCODE_LABELS' ? '#475569' : '#e2e8f0',
              color: '#000',
            }}
          >
            <div className={`print-area ${type === 'BARCODE_LABELS' ? 'barcode-print-mode' : type === 'CONTRACT' ? 'contract-print-mode' : ''}`}>

              {/* ── INVOICE ── */}
              {type === 'INVOICE' && (
                <div className="thermal-receipt">
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

                  <div style={{ fontSize: 10.5, borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>الزبون: <strong>{data.customerName || 'زبون عام'}</strong></span>
                      {data.customerPhone && <span>تليفون: {data.customerPhone}</span>}
                    </div>
                    <div style={{ color: '#444', marginTop: 2 }}>الكاشير: {data.cashierName || 'المهندس'}</div>
                  </div>

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

                  {data.tradeIn && (
                    <div style={{ fontSize: 10, background: '#f1f5f9', padding: '4px 6px', borderRadius: 4, margin: '6px 0', border: '1px solid #cbd5e1' }}>
                      🔄 استبدال جهاز: {data.tradeIn.model} (-{data.tradeIn.agreedPrice.toLocaleString('ar-EG')} ج.م)
                    </div>
                  )}

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

                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9.5, borderTop: '1px dotted #000', paddingTop: 6, color: '#333', lineHeight: 1.4 }}>
                    {storeSettings.receiptFooterText || 'شكراً لزيارتكم محل المهندس - البضاعة المباعة ترد وتستبدل خلال 14 يوماً'}
                  </div>
                </div>
              )}

              {/* ── CONTRACT ── */}
              {type === 'CONTRACT' && (
                <div style={{ background: '#fff', color: '#000', padding: '2rem', fontFamily: 'Cairo, sans-serif', border: '2px solid #000', borderRadius: 8 }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 15 }}>
                    <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900 }}>عقد بيع ومبايعة هاتف محمول مستعمل</h2>
                    <p style={{ margin: '4px 0', fontSize: 13 }}>{storeSettings.storeName} - لحفظ حقوق المحل والزبون</p>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 15 }}>
                    أقر أنا السيد/ <strong>{data.sellerName || '...................................................'}</strong>
                    <br />يحمل رقم قومي: <strong style={{ letterSpacing: 2, fontFamily: 'monospace' }}>{data.sellerNationalId || '............................'}</strong>
                    <br />ورقم تليفون: <strong>{data.sellerPhone || '............................'}</strong>
                    <br />بأنني قمت ببيع الهاتف المحمول المبينة مواصفاته أدناه إلى محل المهندس للاتصالات:
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15, fontSize: 13 }} border={1}>
                    <tbody>
                      <tr><td style={{ padding: 6, width: '30%', background: '#f1f5f9', fontWeight: 'bold' }}>الماركة والموديل:</td><td style={{ padding: 6 }}><strong>{data.brand} {data.model}</strong></td></tr>
                      <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>رقم السيريال / الـ IMEI:</td><td style={{ padding: 6, fontFamily: 'monospace', fontSize: 14 }}><strong>{data.imei}</strong></td></tr>
                      <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>المساحة واللون والنسبة:</td><td style={{ padding: 6 }}>{data.storage} - {data.color} {data.batteryHealth ? `(بطارية ${data.batteryHealth}%)` : ''}</td></tr>
                      <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>سعر الشراء المتفق عليه:</td><td style={{ padding: 6, fontSize: 15, fontWeight: 'bold' }}>{data.costPrice} جنيه مصري فقط لا غير</td></tr>
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
                    <strong>إقرار وتعهد البائع:</strong> أقر بأنني الملك الاصلي لهذا الجهاز وأنه غير مسروق وليس عليه أي بلاغات أو التزامات مالية أو قضايا، وأتحمل كامل المسؤولية الجنائية والمدنية أمام الجهات المختصة في حالة ثبوت خلاف ذلك.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'center', marginTop: 30, fontSize: 13 }}>
                    <div><strong>توقيع البائع (الزبون):</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{data.sellerName || 'توقيع الزبون'}</div></div>
                    <div><strong>توقيع واختام المستلم ({storeSettings.storeName}):</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{storeSettings.storeName}</div></div>
                  </div>
                </div>
              )}

              {/* ── BARCODE LABELS SCREEN PREVIEW (no-print, just visual) ── */}
              {type === 'BARCODE_LABELS' && (
                <BarcodeScreenPreview items={data.items} config={config} storeSettings={storeSettings} />
              )}

              {/* ── MAINTENANCE ── */}
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
                    <div style={{ marginTop: 4, background: '#eee', padding: 4, borderRadius: 4 }}>العطل: {data.faultDescription}</div>
                  </div>
                  <div className="thermal-total" style={{ borderTop: '1px dashed #000', paddingTop: 6, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>العربون المدفوع:</span><span><strong>{data.depositPaid} ج.م</strong></span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>التكلفة التقديرية:</span><span>{data.estimatedCost} ج.م</span></div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9.5, borderTop: '1px dotted #000', paddingTop: 6, color: '#333' }}>
                    ⚠️ رجاء الاحتفاظ بهذا الإيصال لتسليم الجهاز<br />
                    المحل غير مسؤول عن الأجهزة المتروكة بعد 30 يوماً
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT PORTAL (barcode labels only - renders directly into document.body) ── */}
      {type === 'BARCODE_LABELS' && (
        <BarcodePrintPortal
          items={data.items}
          config={config}
          storeSettings={storeSettings}
          onReady={handlePortalReady}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN PREVIEW (inside modal, not printed)
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeScreenPreview: React.FC<{ items: any[]; config: any; storeSettings: any }> = ({ items, config, storeSettings }) => {
  const widthMm = config.widthMm || 42.5;
  const heightMm = config.heightMm || 25.0;
  const flatLabels = items.flatMap((item: any, idx: number) =>
    Array.from({ length: item.qty || 1 }, (_, q) => ({ item, key: `prev-${idx}-${q}` }))
  );
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    flatLabels.forEach(({ item, key }) => {
      buildLabelDataUrl(item, config, storeSettings).then(url => {
        if (!cancelled) setDataUrls(prev => ({ ...prev, [key]: url }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: 'transparent', color: '#000', padding: 0 }}>
      {flatLabels.map(({ item, key }) => (
        <div
          key={key}
          style={{
            width: `${widthMm}mm`,
            height: `${heightMm}mm`,
            position: 'relative',
            overflow: 'hidden',
            background: '#ffffff',
            boxSizing: 'border-box',
            margin: '0 auto 12px auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {dataUrls[key] ? (
            <img
              src={dataUrls[key]}
              alt={item.title || 'label'}
              style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, display: 'block', objectFit: 'fill' }}
            />
          ) : (
            <div style={{ fontSize: 10, color: '#64748b' }}>جاري التحميل...</div>
          )}
        </div>
      ))}
    </div>
  );
};
