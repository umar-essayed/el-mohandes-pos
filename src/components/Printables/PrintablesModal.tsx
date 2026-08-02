import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Printer, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DEFAULT_BARCODE_CONFIG } from '../../lib/barcodeEngine';
import { buildMultiLabelZPL, fetchLabelaryPDF, fetchLabelPreviewDataUrl } from '../../lib/labelaryBarcodeEngine';

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE CONTENT (shared between modal preview + print portal)
// ─────────────────────────────────────────────────────────────────────────────
const InvoiceContent: React.FC<{ data: any; storeSettings: any }> = ({ data, storeSettings }) => (
  <div className="thermal-receipt" style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', background: '#fff', color: '#000', width: '100%' }}>
    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 2px 0' }}>{storeSettings.storeName}</h2>
      <p style={{ fontSize: 10, margin: 0, color: '#333' }}>تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
      {storeSettings.storePhone && <p style={{ fontSize: 10, margin: '2px 0 0 0' }}>تليفون: {storeSettings.storePhone}</p>}
      {storeSettings.storeAddress && <p style={{ fontSize: 9.5, margin: '2px 0 0 0', color: '#555' }}>{storeSettings.storeAddress}</p>}
      <div style={{ fontSize: 11, margin: '6px 0 0 0', fontWeight: 800, borderTop: '1px dashed #000', paddingTop: 4 }}>
        فاتورة بيع رقم: #{data.invoiceNumber}
      </div>
      <div style={{ fontSize: 10, color: '#555' }}>التاريخ: {data.date}</div>
    </div>

    <div style={{ fontSize: 10.5, borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>الزبون: <strong>{data.customerName || 'زبون عام'}</strong></span>
        {data.customerPhone && <span>📞 {data.customerPhone}</span>}
      </div>
      <div style={{ color: '#444', marginTop: 2 }}>الكاشير: {data.cashierName || 'المهندس'}</div>
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0', fontSize: 10.5 }}>
      <thead>
        <tr style={{ borderBottom: '1.5px solid #000' }}>
          <th style={{ textAlign: 'right', padding: '3px 0' }}>الصنف</th>
          <th style={{ textAlign: 'center', padding: '3px 0', width: 30 }}>ك</th>
          <th style={{ textAlign: 'left', padding: '3px 0', width: 60 }}>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((it: any, idx: number) => (
          <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
            <td style={{ padding: '3px 0', textAlign: 'right', wordBreak: 'break-word', fontWeight: 700, fontSize: 10 }}>
              {it.name}
              {it.imei && <div style={{ fontSize: 8.5, fontFamily: 'monospace', color: '#444' }}>IMEI: {it.imei}</div>}
            </td>
            <td style={{ padding: '3px 0', textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
            <td style={{ padding: '3px 0', textAlign: 'left', fontWeight: 800 }}>{it.totalPrice.toLocaleString('ar-EG')} ج.م</td>
          </tr>
        ))}
      </tbody>
    </table>

    {data.tradeIn && (
      <div style={{ fontSize: 9.5, background: '#f1f5f9', padding: '3px 5px', margin: '4px 0', border: '1px solid #cbd5e1', borderRadius: 3 }}>
        🔄 استبدال: {data.tradeIn.model} (-{data.tradeIn.agreedPrice.toLocaleString('ar-EG')} ج.م)
      </div>
    )}

    <div style={{ borderTop: '1.5px dashed #000', paddingTop: 5, marginTop: 5, fontSize: 10.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span>المجموع:</span><span>{data.subtotal.toLocaleString('ar-EG')} ج.م</span>
      </div>
      {data.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: '#555' }}>
          <span>الخصم:</span><span>-{data.discount.toLocaleString('ar-EG')} ج.م</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, borderTop: '1px solid #000', paddingTop: 4, marginTop: 3 }}>
        <span>الصافي المطلوب:</span><span>{data.totalAmount.toLocaleString('ar-EG')} ج.م</span>
      </div>
    </div>

    <div style={{ textAlign: 'center', marginTop: 10, fontSize: 9, borderTop: '1px dotted #000', paddingTop: 5, color: '#333', lineHeight: 1.5 }}>
      {storeSettings.receiptFooterText || 'شكراً لزيارتكم — البضاعة المباعة ترد وتستبدل خلال 14 يوماً'}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE CONTENT
// ─────────────────────────────────────────────────────────────────────────────
const MaintenanceContent: React.FC<{ data: any; storeSettings: any }> = ({ data, storeSettings }) => (
  <div className="thermal-receipt" style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', background: '#fff', color: '#000', width: '100%' }}>
    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 5, marginBottom: 5 }}>
      <h2 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 2px 0' }}>إيصال استلام صيانة</h2>
      <p style={{ fontSize: 11, fontWeight: 'bold', margin: 0 }}>{storeSettings.storeName}</p>
      <p style={{ fontSize: 9.5, margin: '2px 0 0 0' }}>تذكرة رقم: #{data.ticketNumber}</p>
      <p style={{ fontSize: 9.5, color: '#555' }}>التاريخ: {data.receivedDate}</p>
    </div>
    <div style={{ fontSize: 10.5, lineHeight: 1.5, marginBottom: 6 }}>
      <div>الزبون: <strong>{data.customerName}</strong></div>
      <div>التليفون: {data.customerPhone}</div>
      <div>الجهاز: <strong>{data.deviceModel}</strong></div>
      {data.devicePasscode && <div>رمز القفل: {data.devicePasscode}</div>}
      <div style={{ marginTop: 4, background: '#f5f5f5', padding: '3px 5px', borderRadius: 3 }}>العطل: {data.faultDescription}</div>
    </div>
    <div style={{ borderTop: '1px dashed #000', paddingTop: 5, fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>العربون:</span><span><strong>{data.depositPaid} ج.م</strong></span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>التكلفة التقديرية:</span><span>{data.estimatedCost} ج.م</span></div>
    </div>
    <div style={{ textAlign: 'center', marginTop: 10, fontSize: 9, borderTop: '1px dotted #000', paddingTop: 5, color: '#444' }}>
      ⚠️ رجاء الاحتفاظ بهذا الإيصال — المحل غير مسؤول عن الأجهزة بعد 30 يوماً
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// THERMAL PRINT PORTAL — mounts to document.body
// Handles INVOICE and MAINTENANCE (80mm thermal) and CONTRACT (A4)
// Hidden on screen, only visible during window.print()
// ─────────────────────────────────────────────────────────────────────────────
const ThermalPrintPortal: React.FC<{
  children: React.ReactNode;
  type: 'invoice' | 'maintenance' | 'contract';
}> = ({ children, type }) => {
  const isContract = type === 'contract';
  const pageSize   = isContract ? 'A4' : '80mm auto';
  const pageWidth  = isContract ? '190mm' : '76mm';

  return ReactDOM.createPortal(
    <div id="thermal-print-portal">
      <style>{`
        @media screen {
          #thermal-print-portal { display: none !important; }
        }
        @media print {
          @page {
            size: ${pageSize};
            margin: ${isContract ? '15mm' : '0mm'};
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body > *:not(#thermal-print-portal) {
            display: none !important;
          }
          #thermal-print-portal {
            display: block !important;
            width: ${pageWidth} !important;
            margin: 0 !important;
            padding: ${isContract ? '0' : '3mm'} !important;
            background: white !important;
            font-family: 'Cairo', sans-serif !important;
            direction: rtl !important;
            font-size: ${isContract ? '13px' : '11px'} !important;
            line-height: 1.4 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #thermal-print-portal * {
            color: #000 !important;
            background-color: transparent !important;
            border-color: #000 !important;
            box-shadow: none !important;
          }
          #thermal-print-portal table, #thermal-print-portal th, #thermal-print-portal td {
            border-color: #000 !important;
          }
        }
      `}</style>
      {children}
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BARCODE LABELS PRINTER
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeLabelsPrinter: React.FC<{ data: any; storeSettings: any }> = ({ data, storeSettings }) => {
  const config = data.config || DEFAULT_BARCODE_CONFIG;
  const items  = data.items || [];

  type Status = 'loading' | 'ready' | 'printing' | 'error';
  const [status,    setStatus]    = useState<Status>('loading');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [pdfUrl,    setPdfUrl]    = useState<string | null>(null);
  const [previews,  setPreviews]  = useState<Record<string, string>>({});
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const prevUrlRef   = useRef<string | null>(null);
  const prevPngRefs  = useRef<string[]>([]);

  const totalLabels = items.reduce((s: number, it: any) => s + (it.qty || 1), 0);
  const configKey   = JSON.stringify(config);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;

    setStatus('loading');
    setPreviews({});
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    prevPngRefs.current.forEach(u => URL.revokeObjectURL(u));
    prevPngRefs.current = [];

    const multiZpl = buildMultiLabelZPL(
      items.map((item: any) => ({ item, qty: item.qty || 1 })),
      config, storeSettings
    );

    fetchLabelaryPDF(multiZpl, config.widthMm ?? 50.8, config.heightMm ?? 25.4)
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setPdfUrl(url);
        setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg(`فشل الاتصال بـ Labelary API: ${err.message}`);
        setStatus('error');
      });

    items.forEach((item: any, idx: number) => {
      fetchLabelPreviewDataUrl(item, config, storeSettings)
        .then(url => {
          if (cancelled) { URL.revokeObjectURL(url); return; }
          prevPngRefs.current.push(url);
          setPreviews(prev => ({ ...prev, [idx]: url }));
        })
        .catch(() => {});
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const handlePrint = useCallback(() => {
    if (!pdfUrl) return;
    setStatus('printing');
    const win = window.open(pdfUrl, '_blank', 'width=900,height=700,toolbar=0,menubar=0');
    if (win) {
      win.addEventListener('load', () => { setTimeout(() => { try { win.print(); } catch (_) {} setStatus('ready'); }, 400); });
      setTimeout(() => { try { win.print(); } catch (_) {} setStatus('ready'); }, 1800);
    } else {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.onload = () => setTimeout(() => { iframe.contentWindow?.print(); setStatus('ready'); }, 300);
        iframe.src = pdfUrl;
      }
    }
  }, [status, pdfUrl]);

  return (
    <div style={{ color: '#000' }}>
      <div style={{
        background: status === 'error' ? '#fef2f2' : status === 'ready' ? '#f0fdf4' : '#eff6ff',
        border: `1px solid ${status === 'error' ? '#fca5a5' : status === 'ready' ? '#86efac' : '#93c5fd'}`,
        borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '0.85rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600,
      }}>
        {status === 'loading'  && <><Loader2 size={15} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} /><span>جاري توليد {totalLabels} ملصق عبر Labelary API…</span></>}
        {status === 'ready'    && <><CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} /><span>✅ جاهز — {totalLabels} ملصق PDF</span></>}
        {status === 'printing' && <><Loader2 size={15} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} /><span>جاري الطباعة…</span></>}
        {status === 'error'    && <><AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} /><span>{errorMsg}</span></>}
      </div>

      {(status === 'ready' || status === 'printing') && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button className="btn btn-primary" onClick={handlePrint} disabled={status === 'printing'}
            style={{ padding: '0.55rem 1.8rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Printer size={16} />
            {status === 'printing' ? 'جاري الطباعة…' : `طباعة ${totalLabels} ملصق 🖨️`}
          </button>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
            حجم الورق: {(config.widthMm/25.4).toFixed(2)}×{(config.heightMm/25.4).toFixed(2)} inch
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {items.map((item: any, idx: number) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div style={{
              width: `${Math.min(config.widthMm * 5, 340)}px`,
              height: `${Math.min(config.heightMm * 5, 200)}px`,
              background: '#fff', boxShadow: '0 3px 12px rgba(0,0,0,0.3)', borderRadius: 3,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
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

      <iframe ref={iframeRef} style={{ display: 'none', width: 0, height: 0, border: 'none' }} title="barcode-pdf-print" />
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
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice]);

  if (!activePrintDocument) return null;
  const { type, data } = activePrintDocument;

  const isInvoice     = type === 'INVOICE';
  const isMaintenance = type === 'MAINTENANCE';
  const isContract    = type === 'CONTRACT';
  const isBarcode     = type === 'BARCODE_LABELS';

  return (
    <>
      {/* ── Thermal Print Portal (Invoice / Maintenance / Contract) ── */}
      {(isInvoice || isMaintenance || isContract) && (
        <ThermalPrintPortal type={isContract ? 'contract' : isMaintenance ? 'maintenance' : 'invoice'}>
          {isInvoice     && <InvoiceContent data={data} storeSettings={storeSettings} />}
          {isMaintenance && <MaintenanceContent data={data} storeSettings={storeSettings} />}
          {isContract && (
            <div style={{ background: '#fff', color: '#000', fontFamily: 'Cairo, sans-serif' }}>
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
              <div style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 20, background: '#f8fafc', padding: 10, border: '1px solid #ccc', borderRadius: 4 }}>
                <strong>إقرار البائع:</strong> أقر بأنني الملك الاصلي لهذا الجهاز وأنه غير مسروق وليس عليه أي بلاغات، وأتحمل كامل المسؤولية في حالة ثبوت خلاف ذلك.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'center', marginTop: 30, fontSize: 13 }}>
                <div><strong>توقيع البائع:</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{data.sellerName}</div></div>
                <div><strong>توقيع المستلم:</strong><div style={{ marginTop: 40, borderTop: '1px dashed #000', paddingTop: 4 }}>{storeSettings.storeName}</div></div>
              </div>
            </div>
          )}
        </ThermalPrintPortal>
      )}

      {/* ── Modal (screen preview) ── */}
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="modal-content" style={{
          maxWidth: isContract ? 750 : isBarcode ? 520 : 430,
          padding: 0, overflow: 'hidden', borderRadius: 16,
        }}>
          {/* Header */}
          <div style={{
            background: '#0f172a', padding: '0.9rem 1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <Printer size={17} />
              {isInvoice     && 'معاينة فاتورة البيع الحرارية (80mm)'}
              {isContract    && 'معاينة عقد شراء / مبايعة هاتف مستعمل'}
              {isMaintenance && 'معاينة إيصال استلام صيانة الزبون'}
              {isBarcode     && 'طباعة ملصقات الباركود — Labelary ZPL API'}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!isBarcode && (
                <button className="btn btn-primary"
                  style={{ padding: '0.38rem 0.9rem', fontSize: '0.82rem', fontWeight: 800 }}
                  onClick={() => window.print()}>
                  {isContract ? 'طباعة العقد 🖨️' : isMaintenance ? 'طباعة الإيصال 🖨️' : 'طباعة الفاتورة 🖨️'}
                </button>
              )}
              <button onClick={() => setActivePrintDocument(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body (preview) */}
          <div style={{
            padding: isBarcode ? '1.1rem' : '1.2rem',
            maxHeight: '80vh', overflowY: 'auto',
            background: isBarcode ? '#1e293b' : '#e2e8f0',
          }}>
            {/* Invoice preview */}
            {isInvoice && (
              <div style={{ background: '#fff', borderRadius: 8, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxWidth: 320 }}>
                <InvoiceContent data={data} storeSettings={storeSettings} />
              </div>
            )}

            {/* Maintenance preview */}
            {isMaintenance && (
              <div style={{ background: '#fff', borderRadius: 8, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxWidth: 320 }}>
                <MaintenanceContent data={data} storeSettings={storeSettings} />
              </div>
            )}

            {/* Contract preview */}
            {isContract && (
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

            {/* Barcode Labels */}
            {isBarcode && <BarcodeLabelsPrinter data={data} storeSettings={storeSettings} />}
          </div>
        </div>
      </div>
    </>
  );
};
