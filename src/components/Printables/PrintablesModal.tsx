import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DEFAULT_BARCODE_CONFIG } from '../../lib/barcodeEngine';
import { buildMultiLabelZPL, fetchLabelaryPDF, fetchLabelPreviewDataUrl } from '../../lib/labelaryBarcodeEngine';

// ─────────────────────────────────────────────────────────────────────────────
// IFRAME PRINT ENGINE — injects an isolated document into a hidden iframe
// and calls iframe.contentWindow.print()
// This is 100% reliable: no app DOM interference, no blank pages possible.
// ─────────────────────────────────────────────────────────────────────────────
const CAIRO_FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    direction: rtl;
    color: #000000;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

function printViaIframe(htmlBody: string, pageSize: string = '80mm auto', pageMargin: string = '0mm') {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none;z-index:-9999;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    try { document.body.removeChild(iframe); } catch (_) {}
    return;
  }

  const isThermal = pageSize.includes('mm');
  const pageRule = isThermal ? `@page { size: ${pageSize}; margin: 0mm; }` : `@page { size: ${pageSize}; margin: ${pageMargin}; }`;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    ${pageRule}
    ${CAIRO_FONT}
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
    }
  </style>
</head>
<body style="height: auto; min-height: 0; background: #ffffff;">${htmlBody}</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('print trigger error', e);
    }
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (_) {}
    }, 2500);
  };

  // Immediate print trigger to prevent Chrome blocking popup due to async delays
  setTimeout(triggerPrint, 150);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
function generateInvoiceHTML(data: any, store: any): string {
  // To avoid right-side physical thermal head clipping (where thermal printer margin cuts right edge):
  // Set printable width to 92% and use explicit 6mm right-padding for right-aligned Arabic text.
  const is58 = store.thermalPaperWidth === '58mm';
  const containerWidth = is58 ? '52mm' : '72mm';

  const itemRows = data.items.map((it: any) => `
    <tr style="border-bottom:1px dotted #000;">
      <td style="padding:4px 2px;text-align:right;font-weight:800;font-size:11px;word-break:break-word;color:#000;">
        ${it.name}
        ${it.imei ? `<div style="font-size:9px;font-family:monospace;color:#000;font-weight:bold;">IMEI: ${it.imei}</div>` : ''}
      </td>
      <td style="padding:4px 2px;text-align:center;font-weight:900;font-size:11px;color:#000;">${it.quantity}</td>
      <td style="padding:4px 2px;text-align:left;font-weight:900;font-size:11px;color:#000;">${Number(it.totalPrice).toLocaleString('ar-EG')} ج.م</td>
    </tr>`).join('');

  return `
<div style="width:${containerWidth};max-width:94%;margin:0 auto;padding:2mm 6mm 4mm 4mm;font-size:11px;line-height:1.45;direction:rtl;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;box-sizing:border-box;color:#000;background:#fff;overflow:hidden;">
  <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:6px;margin-bottom:6px;">
    <h2 style="font-size:17px;font-weight:900;margin:0 0 2px 0;color:#000;letter-spacing:-0.5px;">${store.storeName || 'المهندس للاتصالات'}</h2>
    <p style="font-size:10px;margin:0;color:#000;font-weight:700;">تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
    ${store.storePhone ? `<p style="font-size:10.5px;margin:2px 0 0 0;font-weight:900;color:#000;">📞 تليفون: ${store.storePhone}</p>` : ''}
    ${store.storeAddress ? `<p style="font-size:9.5px;margin:1px 0 0 0;color:#000;font-weight:700;">📍 العنوان: ${store.storeAddress}</p>` : ''}
    <div style="font-size:11.5px;margin:5px 0 0 0;font-weight:900;border-top:1.5px dashed #000;padding-top:5px;color:#000;">
      فاتورة بيع رقم: #${data.invoiceNumber}
    </div>
    <div style="font-size:9.5px;color:#000;font-weight:700;margin-top:2px;">التاريخ: ${data.date}</div>
  </div>

  <div style="font-size:10.5px;border-bottom:1.5px dashed #000;padding-bottom:5px;margin-bottom:5px;color:#000;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span>الزبون: <strong>${data.customerName || 'زبون عام'}</strong></span>
      ${data.customerPhone ? `<span style="font-weight:800;">📞 ${data.customerPhone}</span>` : ''}
    </div>
    <div style="color:#000;margin-top:2px;font-weight:700;">الكاشير: ${data.cashierName || 'المهندس'}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin:5px 0;font-size:10.5px;">
    <thead>
      <tr style="border-bottom:2px solid #000;">
        <th style="text-align:right;padding:3px 2px;font-size:11px;font-weight:900;color:#000;">الصنف</th>
        <th style="text-align:center;padding:3px 2px;width:26px;font-size:11px;font-weight:900;color:#000;">ك</th>
        <th style="text-align:left;padding:3px 2px;width:60px;font-size:11px;font-weight:900;color:#000;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${data.tradeIn ? `<div style="font-size:9.5px;background:#f8fafc;padding:3px 5px;margin:5px 0;border:1px solid #000;border-radius:3px;font-weight:800;color:#000;">🔄 استبدال: ${data.tradeIn.model} (-${Number(data.tradeIn.agreedPrice).toLocaleString('ar-EG')} ج.م)</div>` : ''}

  <div style="border-top:2px dashed #000;padding-top:5px;margin-top:5px;font-size:11px;color:#000;">
    <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-weight:800;">
      <span>المجموع:</span><span>${Number(data.subtotal).toLocaleString('ar-EG')} ج.م</span>
    </div>
    ${data.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:2px;color:#000;font-weight:800;"><span>الخصم:</span><span>-${Number(data.discount).toLocaleString('ar-EG')} ج.م</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:900;border-top:2px solid #000;padding-top:4px;margin-top:3px;color:#000;">
      <span>الصافي المطلوب:</span><span>${Number(data.totalAmount).toLocaleString('ar-EG')} ج.م</span>
    </div>
  </div>

  <div style="text-align:center;margin-top:10px;font-size:10px;border-top:1.5px dotted #000;padding-top:5px;color:#000;font-weight:800;line-height:1.4;">
    ${store.receiptFooterText || 'شكراً لزيارتكم — البضاعة المباعة ترد وتستبدل خلال 14 يوماً'}
  </div>

  <!-- Physical Cutter Feed Clearance (Ensures footer & totals are 100% past the printer auto-cutter) -->
  <div style="height:25mm;min-height:90px;clear:both;display:block;"></div>
</div>`;
}

function generateMaintenanceHTML(data: any, store: any): string {
  return `
<div style="width:74mm;font-size:11px;line-height:1.4;direction:rtl;font-family:'Cairo',Arial,sans-serif;">
  <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:5px;">
    <h2 style="font-size:14px;font-weight:900;margin:0 0 2px 0;">إيصال استلام صيانة</h2>
    <p style="font-size:11px;font-weight:bold;margin:0;">${store.storeName}</p>
    <p style="font-size:9.5px;margin:2px 0 0 0;">تذكرة رقم: #${data.ticketNumber}</p>
    <p style="font-size:9.5px;color:#555;margin:0;">التاريخ: ${data.receivedDate}</p>
  </div>
  <div style="font-size:10.5px;line-height:1.6;margin-bottom:6px;">
    <div>الزبون: <strong>${data.customerName}</strong></div>
    <div>التليفون: ${data.customerPhone}</div>
    <div>الجهاز: <strong>${data.deviceModel}</strong></div>
    ${data.devicePasscode ? `<div>رمز القفل: ${data.devicePasscode}</div>` : ''}
    <div style="margin-top:4px;background:#f5f5f5;padding:3px 5px;border-radius:3px;border:1px solid #ddd;">
      العطل: ${data.faultDescription}
    </div>
  </div>
  <div style="border-top:1px dashed #000;padding-top:5px;font-size:11px;">
    <div style="display:flex;justify-content:space-between;"><span>العربون:</span><span><strong>${data.depositPaid} ج.م</strong></span></div>
    <div style="display:flex;justify-content:space-between;"><span>التكلفة التقديرية:</span><span>${data.estimatedCost} ج.م</span></div>
  </div>
  <div style="text-align:center;margin-top:10px;font-size:9px;border-top:1px dotted #000;padding-top:5px;color:#444;">
    ⚠️ رجاء الاحتفاظ بهذا الإيصال — المحل غير مسؤول عن الأجهزة بعد 30 يوماً
  </div>
</div>`;
}

function generateContractHTML(data: any, store: any): string {
  return `
<div style="font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#000;padding:0;">
  <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;">
    <h2 style="font-size:20px;margin:0;font-weight:900;">عقد بيع ومبايعة هاتف محمول مستعمل</h2>
    <p style="margin:4px 0;font-size:13px;">${store.storeName}</p>
  </div>
  <div style="font-size:13px;line-height:1.9;margin-bottom:15px;">
    أقر أنا السيد/ <strong>${data.sellerName || '..........................................'}</strong><br>
    يحمل رقم قومي: <strong style="letter-spacing:2px;font-family:monospace;">${data.sellerNationalId || '............................'}</strong><br>
    ورقم تليفون: <strong>${data.sellerPhone || '............................'}</strong><br>
    بأنني قمت ببيع الهاتف المحمول أدناه إلى محل المهندس للاتصالات:
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:13px;border:1px solid #000;">
    <tr><td style="padding:7px;width:30%;background:#f1f5f9;font-weight:bold;border:1px solid #000;">الماركة والموديل:</td><td style="padding:7px;border:1px solid #000;"><strong>${data.brand} ${data.model}</strong></td></tr>
    <tr><td style="padding:7px;background:#f1f5f9;font-weight:bold;border:1px solid #000;">رقم السيريال / الـ IMEI:</td><td style="padding:7px;font-family:monospace;border:1px solid #000;"><strong>${data.imei}</strong></td></tr>
    <tr><td style="padding:7px;background:#f1f5f9;font-weight:bold;border:1px solid #000;">المساحة واللون:</td><td style="padding:7px;border:1px solid #000;">${data.storage} - ${data.color}</td></tr>
    <tr><td style="padding:7px;background:#f1f5f9;font-weight:bold;border:1px solid #000;">سعر الشراء:</td><td style="padding:7px;font-size:15px;font-weight:bold;border:1px solid #000;">${data.costPrice} جنيه مصري فقط</td></tr>
  </table>
  <div style="font-size:12px;line-height:1.6;margin-bottom:20px;background:#f8fafc;padding:10px;border-radius:6px;border:1px solid #ccc;">
    <strong>إقرار البائع:</strong> أقر بأنني الملك الاصلي لهذا الجهاز وأنه غير مسروق وليس عليه أي بلاغات، وأتحمل كامل المسؤولية في حالة ثبوت خلاف ذلك.
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center;margin-top:30px;font-size:13px;">
    <div><strong>توقيع البائع:</strong><div style="margin-top:40px;border-top:1px dashed #000;padding-top:4px;">${data.sellerName || ''}</div></div>
    <div><strong>توقيع المستلم:</strong><div style="margin-top:40px;border-top:1px dashed #000;padding-top:4px;">${store.storeName}</div></div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE CONTENT PREVIEW (screen only)
// ─────────────────────────────────────────────────────────────────────────────
const InvoicePreview: React.FC<{ data: any; storeSettings: any }> = ({ data, storeSettings: store }) => (
  <div style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', background: '#fff', color: '#000', fontSize: 11, lineHeight: 1.4, padding: '8px', borderRadius: 6 }}>
    <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
      <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 2px 0' }}>{store.storeName}</h2>
      <p style={{ fontSize: 9.5, margin: 0, color: '#333' }}>تليفونات - إكسسوارات - صيانة - خدمات كاش</p>
      {store.storePhone && <p style={{ fontSize: 9.5, margin: '2px 0 0 0' }}>📞 {store.storePhone}</p>}
      <div style={{ fontSize: 11, margin: '5px 0 0 0', fontWeight: 800, borderTop: '1px dashed #000', paddingTop: 4 }}>فاتورة بيع رقم: #{data.invoiceNumber}</div>
      <div style={{ fontSize: 9.5, color: '#555' }}>{data.date}</div>
    </div>
    <div style={{ fontSize: 10, borderBottom: '1px dashed #000', paddingBottom: 5, marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>الزبون: <strong>{data.customerName || 'زبون عام'}</strong></span>
        {data.customerPhone && <span>{data.customerPhone}</span>}
      </div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead><tr style={{ borderBottom: '1.5px solid #000' }}>
        <th style={{ textAlign: 'right', padding: '2px 0' }}>الصنف</th>
        <th style={{ textAlign: 'center', padding: '2px 0', width: 28 }}>ك</th>
        <th style={{ textAlign: 'left', padding: '2px 0', width: 60 }}>الإجمالي</th>
      </tr></thead>
      <tbody>
        {data.items.map((it: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
            <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 700, fontSize: 9.5 }}>{it.name}</td>
            <td style={{ padding: '2px 0', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '2px 0', textAlign: 'left', fontWeight: 800 }}>{Number(it.totalPrice).toLocaleString('ar-EG')} ج.م</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ borderTop: '1.5px dashed #000', paddingTop: 5, marginTop: 5, fontSize: 11 }}>
      {data.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}><span>الخصم:</span><span>-{Number(data.discount).toLocaleString('ar-EG')} ج.م</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 900, borderTop: '1px solid #000', paddingTop: 3, marginTop: 2 }}>
        <span>الصافي:</span><span>{Number(data.totalAmount).toLocaleString('ar-EG')} ج.م</span>
      </div>
    </div>
    <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, borderTop: '1px dotted #000', paddingTop: 5, color: '#333' }}>
      {store.receiptFooterText || 'شكراً لزيارتكم — البضاعة المباعة ترد وتستبدل خلال 14 يوماً'}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BARCODE LABELS PRINTER
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeLabelsPrinter: React.FC<{ data: any; storeSettings: any }> = ({ data, storeSettings }) => {
  const config = data.config || DEFAULT_BARCODE_CONFIG;
  const items  = data.items || [];
  type Status = 'loading' | 'ready' | 'printing' | 'error';
  const [status,   setStatus]   = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [pdfUrl,   setPdfUrl]   = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const prevUrlRef  = useRef<string | null>(null);
  const prevPngRefs = useRef<string[]>([]);
  const totalLabels = items.reduce((s: number, it: any) => s + (it.qty || 1), 0);
  const configKey   = JSON.stringify(config);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    setStatus('loading'); setPreviews({});
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    prevPngRefs.current.forEach(u => URL.revokeObjectURL(u));
    prevPngRefs.current = [];

    const multiZpl = buildMultiLabelZPL(
      items.map((item: any) => ({ item, qty: item.qty || 1 })), config, storeSettings
    );

    fetchLabelaryPDF(multiZpl, config.widthMm ?? 50.8, config.heightMm ?? 25.4)
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setPdfUrl(url); setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMsg(`فشل: ${err.message}`); setStatus('error');
      });

    items.forEach((item: any, idx: number) => {
      fetchLabelPreviewDataUrl(item, config, storeSettings)
        .then(url => {
          if (cancelled) { URL.revokeObjectURL(url); return; }
          prevPngRefs.current.push(url);
          setPreviews(prev => ({ ...prev, [idx]: url }));
        }).catch(() => {});
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  const handlePrint = useCallback(() => {
    if (!pdfUrl) return;
    setStatus('printing');
    const win = window.open(pdfUrl, '_blank', 'width=900,height=700,toolbar=0,menubar=0');
    if (win) {
      win.addEventListener('load', () => setTimeout(() => { try { win.print(); } catch (_) {} setStatus('ready'); }, 400));
      setTimeout(() => { try { win.print(); } catch (_) {} setStatus('ready'); }, 1800);
    } else {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.onload = () => setTimeout(() => { iframe.contentWindow?.print(); setStatus('ready'); }, 300);
        iframe.src = pdfUrl;
      }
    }
  }, [pdfUrl]);

  return (
    <div style={{ color: '#000' }}>
      <div style={{
        background: status === 'error' ? '#fef2f2' : status === 'ready' ? '#f0fdf4' : '#eff6ff',
        border: `1px solid ${status === 'error' ? '#fca5a5' : status === 'ready' ? '#86efac' : '#93c5fd'}`,
        borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '0.75rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600,
      }}>
        {status === 'loading'  && <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /><span>جاري توليد {totalLabels} ملصق…</span></>}
        {status === 'ready'    && <><CheckCircle size={15} color="#16a34a" /><span>✅ جاهز — {totalLabels} ملصق PDF</span></>}
        {status === 'printing' && <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /><span>جاري الطباعة…</span></>}
        {status === 'error'    && <><AlertCircle size={15} color="#dc2626" /><span>{errorMsg}</span></>}
      </div>
      {(status === 'ready' || status === 'printing') && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button className="btn btn-primary" onClick={handlePrint} disabled={status === 'printing'}
            style={{ padding: '0.5rem 1.8rem', fontSize: '0.92rem', fontWeight: 800, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Printer size={16} />
            {status === 'printing' ? 'جاري الطباعة…' : `طباعة ${totalLabels} ملصق 🖨️`}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {items.map((item: any, idx: number) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div style={{ width: `${Math.min(config.widthMm * 5, 340)}px`, height: `${Math.min(config.heightMm * 5, 200)}px`, background: '#fff', boxShadow: '0 3px 12px rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previews[idx] ? <img src={previews[idx]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                : <span style={{ fontSize: 9, color: '#94a3b8' }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /></span>}
            </div>
            {(item.qty || 1) > 1 && <div style={{ fontSize: 10, color: '#e2e8f0', marginTop: 3, background: '#6366f1', borderRadius: 4, padding: '1px 6px', display: 'inline-block' }}>× {item.qty} نسخة</div>}
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

  const doPrint = useCallback(() => {
    if (!activePrintDocument) return;
    const { type, data } = activePrintDocument;
    const pageSize = storeSettings.thermalPaperWidth === '58mm' ? '58mm auto' : '80mm auto';
    if (type === 'INVOICE') {
      printViaIframe(generateInvoiceHTML(data, storeSettings), pageSize, '0mm');
    } else if (type === 'MAINTENANCE') {
      printViaIframe(generateMaintenanceHTML(data, storeSettings), pageSize, '0mm');
    } else if (type === 'CONTRACT') {
      printViaIframe(generateContractHTML(data, storeSettings), 'A4', '15mm');
    }
  }, [activePrintDocument, storeSettings]);

  useEffect(() => {
    if (activePrintDocument?.type === 'INVOICE' && storeSettings.autoPrintInvoice) {
      const t = setTimeout(doPrint, 600);
      return () => clearTimeout(t);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice, doPrint]);

  if (!activePrintDocument) return null;
  const { type, data } = activePrintDocument;

  const isInvoice     = type === 'INVOICE';
  const isMaintenance = type === 'MAINTENANCE';
  const isContract    = type === 'CONTRACT';
  const isBarcode     = type === 'BARCODE_LABELS';

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{
        maxWidth: isContract ? 750 : isBarcode ? 520 : 430,
        padding: 0, overflow: 'hidden', borderRadius: 16,
      }}>
        {/* Header */}
        <div style={{ background: '#0f172a', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
            <Printer size={17} />
            {isInvoice     && 'معاينة فاتورة البيع الحرارية (80mm)'}
            {isContract    && 'معاينة عقد شراء هاتف مستعمل (A4)'}
            {isMaintenance && 'معاينة إيصال استلام صيانة'}
            {isBarcode     && 'طباعة ملصقات الباركود — Labelary API'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!isBarcode && (
              <button className="btn btn-primary"
                style={{ padding: '0.38rem 0.9rem', fontSize: '0.82rem', fontWeight: 800 }}
                onClick={doPrint}>
                {isContract ? '🖨️ طباعة العقد' : isMaintenance ? '🖨️ طباعة الإيصال' : '🖨️ طباعة الفاتورة'}
              </button>
            )}
            <button onClick={() => setActivePrintDocument(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: isBarcode ? '1.1rem' : '1.2rem', maxHeight: '80vh', overflowY: 'auto', background: isBarcode ? '#1e293b' : '#e2e8f0' }}>
          {isInvoice && (
            <div style={{ maxWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <InvoicePreview data={data} storeSettings={storeSettings} />
            </div>
          )}

          {isMaintenance && (
            <div style={{ maxWidth: 320, background: '#fff', borderRadius: 8, padding: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: 'Cairo, sans-serif', direction: 'rtl', fontSize: 11, color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 5, marginBottom: 5 }}>
                <h2 style={{ fontSize: 13, fontWeight: 900, margin: '0 0 2px 0' }}>إيصال استلام صيانة</h2>
                <p style={{ fontSize: 10, fontWeight: 'bold', margin: 0 }}>{storeSettings.storeName}</p>
                <p style={{ fontSize: 9.5, margin: '2px 0 0 0' }}>تذكرة: #{data.ticketNumber} | {data.receivedDate}</p>
              </div>
              <div style={{ fontSize: 10, lineHeight: 1.5 }}>
                <div>الزبون: <strong>{data.customerName}</strong></div>
                <div>الجهاز: <strong>{data.deviceModel}</strong></div>
                <div style={{ marginTop: 4, background: '#f5f5f5', padding: '2px 4px', borderRadius: 3 }}>العطل: {data.faultDescription}</div>
              </div>
              <div style={{ borderTop: '1px dashed #000', marginTop: 5, paddingTop: 5, fontSize: 10.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>العربون:</span><span><strong>{data.depositPaid} ج.م</strong></span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>التكلفة التقديرية:</span><span>{data.estimatedCost} ج.م</span></div>
              </div>
            </div>
          )}

          {isContract && (
            <div style={{ background: '#fff', color: '#000', padding: '1.5rem', fontFamily: 'Cairo, sans-serif', border: '2px solid #000', borderRadius: 8, fontSize: 13 }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, margin: 0, fontWeight: 900 }}>عقد بيع ومبايعة هاتف مستعمل</h2>
                <p style={{ margin: '3px 0', fontSize: 12 }}>{storeSettings.storeName}</p>
              </div>
              <div style={{ lineHeight: 1.7, marginBottom: 12, fontSize: 12 }}>
                البائع: <strong>{data.sellerName}</strong> | رقم قومي: <strong style={{ fontFamily: 'monospace' }}>{data.sellerNationalId}</strong><br />
                IMEI: <strong style={{ fontFamily: 'monospace' }}>{data.imei}</strong> | السعر: <strong>{data.costPrice} ج.م</strong>
              </div>
            </div>
          )}

          {isBarcode && <BarcodeLabelsPrinter data={data} storeSettings={storeSettings} />}
        </div>
      </div>
    </div>
  );
};
