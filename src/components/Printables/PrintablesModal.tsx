import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Printer, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DEFAULT_BARCODE_CONFIG } from '../../lib/barcodeEngine';
import { generateZPLCode, fetchLabelaryPNG } from '../../lib/labelaryBarcodeEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface FlatLabel {
  key: string;
  item: any;
  zpl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT PORTAL — mounted directly on document.body
// Uses @page CSS so the browser knows the exact paper size (50.8mm × 25.4mm)
// No PDF, no new window, no wrong paper size issues.
// ─────────────────────────────────────────────────────────────────────────────
const BarcodePrintPortal: React.FC<{
  labelUrls: string[];     // object URLs of PNG images, one per label copy
  onPrint: () => void;     // called after window.print()
}> = ({ labelUrls, onPrint }) => {
  // 2×1 inch = 50.8mm × 25.4mm at 8dpmm (exact Labelary output size)
  const W = '50.8mm';
  const H = '25.4mm';

  return ReactDOM.createPortal(
    <div id="barcode-print-portal">
      <style>{`
        @media screen {
          #barcode-print-portal { display: none !important; }
        }
        @media print {
          @page {
            size: ${W} ${H};
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${W} !important;
            background: white !important;
          }
          body > *:not(#barcode-print-portal) {
            display: none !important;
          }
          #barcode-print-portal {
            display: block !important;
            width: ${W} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .bpp-label {
            display: block !important;
            width: ${W} !important;
            height: ${H} !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .bpp-label:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .bpp-label img {
            display: block !important;
            width: ${W} !important;
            height: ${H} !important;
            object-fit: fill !important;
            image-rendering: crisp-edges !important;
          }
        }
      `}</style>
      {labelUrls.map((url, i) => (
        <div key={i} className="bpp-label">
          <img src={url} alt={`label-${i}`} />
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BARCODE LABELS PRINTER (inside modal)
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeLabelsPrinter: React.FC<{
  data: any;
  storeSettings: any;
}> = ({ data, storeSettings }) => {
  const config = data.config || DEFAULT_BARCODE_CONFIG;
  const items  = data.items  || [];

  type Status = 'loading' | 'ready' | 'printing' | 'error';
  const [status,    setStatus]    = useState<Status>('loading');
  const [errorMsg,  setErrorMsg]  = useState('');
  // One URL per label COPY (e.g. 3 copies = 3 entries)
  const [labelUrls, setLabelUrls] = useState<string[]>([]);
  // For screen preview: one URL per unique item
  const [previews,  setPreviews]  = useState<Record<number, string>>({});
  const urlsRef = useRef<string[]>([]);

  // Build flat list: one entry per copy
  const flatLabels: FlatLabel[] = items.flatMap((item: any, idx: number) => {
    const shopName    = config?.customStoreName || storeSettings?.storeName || 'المهندس للاتصالات';
    const productName = (item.title || item.name || 'منتج').substring(0, 30);
    const barcodeVal  = String(item.barcode || item.id || '0000000000');
    const price       = item.salePrice ?? item.price ?? 0;
    const zpl = generateZPLCode(
      { shopName, productName, barcodeValue: barcodeVal, price: `EGP ${price}` },
      config
    );
    return Array.from({ length: item.qty || 1 }, (_, q) => ({
      key: `${idx}-${q}`,
      item,
      zpl,
    }));
  });

  const totalLabels = flatLabels.length;

  // Stringify config to detect changes
  const configKey = JSON.stringify(config);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;

    setStatus('loading');
    setLabelUrls([]);
    setPreviews({});

    // Revoke old URLs
    urlsRef.current.forEach(u => URL.revokeObjectURL(u));
    urlsRef.current = [];

    const allUrls: string[] = new Array(flatLabels.length).fill('');
    let loadedCount = 0;

    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= flatLabels.length && !cancelled) {
        urlsRef.current = allUrls.filter(Boolean);
        setLabelUrls([...allUrls]);
        setStatus('ready');
      }
    };

    // Fetch PNG for every copy
    flatLabels.forEach(({ zpl }, i) => {
      fetchLabelaryPNG(zpl)
        .then(blob => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          allUrls[i] = url;
          checkDone();
        })
        .catch(err => {
          if (cancelled) return;
          console.error(`Label ${i} fetch failed:`, err);
          allUrls[i] = '';
          checkDone();
        });
    });

    // Fetch one preview PNG per unique item (not per copy)
    items.forEach((item: any, idx: number) => {
      const shopName    = config?.customStoreName || storeSettings?.storeName || 'المهندس للاتصالات';
      const productName = (item.title || item.name || 'منتج').substring(0, 30);
      const barcodeVal  = String(item.barcode || item.id || '0000000000');
      const price       = item.salePrice ?? item.price ?? 0;
      const zpl = generateZPLCode(
        { shopName, productName, barcodeValue: barcodeVal, price: `EGP ${price}` },
        config
      );
      fetchLabelaryPNG(zpl)
        .then(blob => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setPreviews(prev => ({ ...prev, [idx]: url }));
        })
        .catch(() => {});
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const handlePrint = useCallback(() => {
    if (status !== 'ready' || labelUrls.length === 0) return;
    setStatus('printing');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setTimeout(() => setStatus('ready'), 500);
      });
    });
  }, [status, labelUrls]);

  const readyCount = labelUrls.filter(Boolean).length;

  return (
    <div style={{ color: '#000' }}>
      {/* Status banner */}
      <div style={{
        background: status === 'error' ? '#fef2f2' : status === 'ready' || status === 'printing' ? '#f0fdf4' : '#eff6ff',
        border: `1px solid ${status === 'error' ? '#fca5a5' : status === 'ready' || status === 'printing' ? '#86efac' : '#93c5fd'}`,
        borderRadius: 8,
        padding: '0.65rem 1rem',
        marginBottom: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.82rem',
        fontWeight: 600,
      }}>
        {status === 'loading'  && <><Loader2 size={15} className="spin" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} /><span>جاري توليد {totalLabels} ملصق عبر Labelary API… ({readyCount}/{totalLabels})</span></>}
        {status === 'ready'    && <><CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} /><span>✅ جاهز — {totalLabels} ملصق (50.8mm × 25.4mm) بالظبط على ورق الليبل</span></>}
        {status === 'printing' && <><Loader2 size={15} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} /><span>جاري الطباعة…</span></>}
        {status === 'error'    && <><AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} /><span>{errorMsg}</span></>}
      </div>

      {/* Print button */}
      {(status === 'ready' || status === 'printing') && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={status === 'printing'}
            style={{ padding: '0.55rem 1.8rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={16} />
            {status === 'printing' ? 'جاري الطباعة…' : `طباعة ${totalLabels} ملصق 🖨️`}
          </button>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
            حجم الورق: 50.8mm × 25.4mm (2×1 inch) — يُطبع بدون تدخل
          </div>
        </div>
      )}

      {/* Screen preview grid (one card per unique item) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {items.map((item: any, idx: number) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div style={{
              width: '50.8mm',
              height: '25.4mm',
              background: '#fff',
              boxShadow: '0 3px 12px rgba(0,0,0,0.3)',
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}>
              {previews[idx] ? (
                <img src={previews[idx]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
              ) : (
                <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> تحميل…
                </span>
              )}
            </div>
            {(item.qty || 1) > 1 && (
              <div style={{ fontSize: 10, color: '#e2e8f0', marginTop: 3, background: '#6366f1', borderRadius: 4, padding: '1px 6px', display: 'inline-block' }}>
                × {item.qty} نسخة
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print portal — hidden on screen, shown only during window.print() */}
      {labelUrls.length > 0 && (
        <BarcodePrintPortal labelUrls={labelUrls} onPrint={() => {}} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PRINTABLES MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const PrintablesModal: React.FC = () => {
  const { activePrintDocument, setActivePrintDocument, storeSettings } = useApp();

  useEffect(() => {
    if (activePrintDocument?.type === 'INVOICE' && storeSettings.autoPrintInvoice) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice]);

  if (!activePrintDocument) return null;
  const { type, data } = activePrintDocument;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: type === 'CONTRACT' ? 750 : type === 'BARCODE_LABELS' ? 540 : 420,
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div
          className="no-print"
          style={{
            background: '#0f172a',
            padding: '0.9rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
            <Printer size={17} />
            {type === 'INVOICE'        && 'معاينة فاتورة البيع الحرارية (80mm)'}
            {type === 'CONTRACT'       && 'معاينة عقد شراء / مبايعة هاتف مستعمل'}
            {type === 'MAINTENANCE'    && 'معاينة إيصال استلام صيانة الزبون'}
            {type === 'BARCODE_LABELS' && 'طباعة ملصقات الباركود — Labelary ZPL API'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {type !== 'BARCODE_LABELS' && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.38rem 0.9rem', fontSize: '0.82rem', fontWeight: 800 }}
                onClick={() => window.print()}
              >
                {type === 'CONTRACT' ? 'طباعة العقد 🖨️' : type === 'MAINTENANCE' ? 'طباعة الإيصال 🖨️' : 'طباعة الفاتورة 🖨️'}
              </button>
            )}
            <button
              onClick={() => setActivePrintDocument(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: type === 'BARCODE_LABELS' ? '1.1rem' : '1.2rem',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: type === 'BARCODE_LABELS' ? '#1e293b' : '#e2e8f0',
            color: '#000',
          }}
        >
          <div className={`print-area ${type === 'CONTRACT' ? 'contract-print-mode' : ''}`}>

            {/* ── INVOICE ── */}
            {type === 'INVOICE' && (
              <div className="thermal-receipt">
                <div className="thermal-header" style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 2px 0' }}>{storeSettings.storeName}</h2>
                  <p style={{ fontSize: 10, margin: 0, color: '#333' }}>تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
                  {storeSettings.storePhone && <p style={{ fontSize: 10, margin: '2px 0 0 0', color: '#333' }}>تليفون المحل: {storeSettings.storePhone}</p>}
                  <div style={{ fontSize: 11, margin: '6px 0 0 0', fontWeight: 800, borderTop: '1px dashed #000', paddingTop: 4 }}>فاتورة بيع رقم: #{data.invoiceNumber}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>التاريخ: {data.date}</div>
                </div>
                <div style={{ fontSize: 10.5, borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>الزبون: <strong>{data.customerName || 'زبون عام'}</strong></span>
                    {data.customerPhone && <span>تليفون: {data.customerPhone}</span>}
                  </div>
                  <div style={{ color: '#444', marginTop: 2 }}>الكاشير: {data.cashierName || 'المهندس'}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0', fontSize: 10.5 }}>
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
                    🔄 استبدال: {data.tradeIn.model} (-{data.tradeIn.agreedPrice.toLocaleString('ar-EG')} ج.م)
                  </div>
                )}
                <div style={{ borderTop: '1.5px dashed #000', paddingTop: 6, marginTop: 6, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>المجموع:</span><span>{data.subtotal.toLocaleString('ar-EG')} ج.م</span></div>
                  {data.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: '#555' }}><span>الخصم:</span><span>-{data.discount.toLocaleString('ar-EG')} ج.م</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}><span>الصافي المطلوب:</span><span>{data.totalAmount.toLocaleString('ar-EG')} ج.م</span></div>
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
                  <p style={{ margin: '4px 0', fontSize: 13 }}>{storeSettings.storeName}</p>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 15 }}>
                  أقر أنا السيد/ <strong>{data.sellerName || '..........................................'}</strong><br />
                  يحمل رقم قومي: <strong style={{ letterSpacing: 2, fontFamily: 'monospace' }}>{data.sellerNationalId || '............................'}</strong><br />
                  ورقم تليفون: <strong>{data.sellerPhone || '............................'}</strong><br />
                  بأنني قمت ببيع الهاتف المحمول أدناه إلى محل المهندس للاتصالات:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15, fontSize: 13 }} border={1}>
                  <tbody>
                    <tr><td style={{ padding: 6, width: '30%', background: '#f1f5f9', fontWeight: 'bold' }}>الماركة والموديل:</td><td style={{ padding: 6 }}><strong>{data.brand} {data.model}</strong></td></tr>
                    <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>رقم السيريال / الـ IMEI:</td><td style={{ padding: 6, fontFamily: 'monospace' }}><strong>{data.imei}</strong></td></tr>
                    <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>المساحة واللون:</td><td style={{ padding: 6 }}>{data.storage} - {data.color}</td></tr>
                    <tr><td style={{ padding: 6, background: '#f1f5f9', fontWeight: 'bold' }}>سعر الشراء:</td><td style={{ padding: 6, fontSize: 15, fontWeight: 'bold' }}>{data.costPrice} جنيه مصري فقط</td></tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20, background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
                  <strong>إقرار البائع:</strong> أقر بأنني الملك الاصلي لهذا الجهاز وأنه غير مسروق وليس عليه أي بلاغات، وأتحمل كامل المسؤولية في حالة ثبوت خلاف ذلك.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'center', marginTop: 30, fontSize: 13 }}>
                  <div><strong>توقيع البائع:</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{data.sellerName}</div></div>
                  <div><strong>توقيع المستلم:</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{storeSettings.storeName}</div></div>
                </div>
              </div>
            )}

            {/* ── BARCODE LABELS ── */}
            {type === 'BARCODE_LABELS' && (
              <BarcodeLabelsPrinter data={data} storeSettings={storeSettings} />
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
                <div style={{ borderTop: '1px dashed #000', paddingTop: 6, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>العربون:</span><span><strong>{data.depositPaid} ج.م</strong></span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>التكلفة التقديرية:</span><span>{data.estimatedCost} ج.م</span></div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9.5, borderTop: '1px dotted #000', paddingTop: 6, color: '#333' }}>
                  ⚠️ رجاء الاحتفاظ بهذا الإيصال - المحل غير مسؤول عن الأجهزة بعد 30 يوماً
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
