import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Printer, X } from 'lucide-react';
import { DEFAULT_BARCODE_CONFIG, renderBarcodeLabelToCanvas } from '../../lib/barcodeEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Single Label Canvas Item - draws directly onto a <canvas> ref synchronously
// ─────────────────────────────────────────────────────────────────────────────
interface LabelCanvasProps {
  item: any;
  config: any;
  storeSettings: any;
  widthMm: number;
  heightMm: number;
  onDrawn?: () => void;
}

const LabelCanvas: React.FC<LabelCanvasProps> = ({ item, config, storeSettings, widthMm, heightMm, onDrawn }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (drawn.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Render label to an offscreen canvas
      const offscreen = renderBarcodeLabelToCanvas(item, config, storeSettings);
      // Copy to our displayed canvas
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(offscreen, 0, 0);
        drawn.current = true;
        onDrawn?.();
      }
    } catch (err) {
      console.error('LabelCanvas draw error:', err);
      onDrawn?.();
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRINT PORTAL - mounted directly on document.body
// Uses canvas refs so rendering is 100% synchronous with no async race conditions
// ─────────────────────────────────────────────────────────────────────────────
interface PortalProps {
  flatLabels: { item: any; key: string }[];
  config: any;
  storeSettings: any;
  widthMm: number;
  heightMm: number;
  onAllReady: () => void;
}

const BarcodePrintPortal: React.FC<PortalProps> = ({
  flatLabels,
  config,
  storeSettings,
  widthMm,
  heightMm,
  onAllReady,
}) => {
  const drawnCount = useRef(0);
  const total = flatLabels.length;

  const handleDrawn = () => {
    drawnCount.current += 1;
    if (drawnCount.current >= total) {
      // All canvases drawn - give browser one animation frame to paint then signal ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onAllReady();
        });
      });
    }
  };

  useEffect(() => {
    // If no items, signal immediately
    if (total === 0) onAllReady();
  }, []);

  return ReactDOM.createPortal(
    <div id="barcode-standalone-print-portal">
      <style>{`
        @media screen {
          #barcode-standalone-print-portal {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm !important;
          }
          html {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body > *:not(#barcode-standalone-print-portal) {
            display: none !important;
          }
          #barcode-standalone-print-portal {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: ${widthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .bp-page {
            display: block !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: always !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: white !important;
          }
          .bp-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .bp-page canvas {
            display: block !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
          }
        }
      `}</style>
      {flatLabels.map(({ item, key }) => (
        <div key={key} className="bp-page">
          <LabelCanvas
            item={item}
            config={config}
            storeSettings={storeSettings}
            widthMm={widthMm}
            heightMm={heightMm}
            onDrawn={handleDrawn}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN PREVIEW (inside modal, not printed)
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeScreenPreview: React.FC<{
  flatLabels: { item: any; key: string }[];
  config: any;
  storeSettings: any;
  widthMm: number;
  heightMm: number;
}> = ({ flatLabels, config, storeSettings, widthMm, heightMm }) => (
  <div style={{ padding: 0 }}>
    {flatLabels.map(({ item, key }) => (
      <div
        key={key}
        style={{
          width: `${widthMm}mm`,
          height: `${heightMm}mm`,
          margin: '0 auto 12px auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          borderRadius: 3,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <LabelCanvas
          item={item}
          config={config}
          storeSettings={storeSettings}
          widthMm={widthMm}
          heightMm={heightMm}
        />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PRINTABLES MODAL
// ─────────────────────────────────────────────────────────────────────────────
export const PrintablesModal: React.FC = () => {
  const { activePrintDocument, setActivePrintDocument, storeSettings } = useApp();
  const [printReady, setPrintReady] = useState(false);
  const [waitingToPrint, setWaitingToPrint] = useState(false);

  // Reset state when document changes
  useEffect(() => {
    setPrintReady(false);
    setWaitingToPrint(false);
  }, [activePrintDocument]);

  // Auto print for invoices
  useEffect(() => {
    if (activePrintDocument?.type === 'INVOICE' && storeSettings.autoPrintInvoice) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
  }, [activePrintDocument, storeSettings.autoPrintInvoice]);

  if (!activePrintDocument) return null;

  const { type, data } = activePrintDocument;
  const config = data?.config || DEFAULT_BARCODE_CONFIG;
  const widthMm: number = config.widthMm || 42.5;
  const heightMm: number = config.heightMm || 25.0;

  const flatLabels: { item: any; key: string }[] =
    type === 'BARCODE_LABELS'
      ? (data.items || []).flatMap((item: any, idx: number) =>
          Array.from({ length: item.qty || 1 }, (_, q) => ({
            item,
            key: `${idx}-${q}`,
          }))
        )
      : [];

  const handlePortalAllReady = () => {
    setPrintReady(true);
    if (waitingToPrint) {
      setWaitingToPrint(false);
      setTimeout(() => window.print(), 60);
    }
  };

  const handlePrint = () => {
    if (type !== 'BARCODE_LABELS') {
      window.print();
      return;
    }
    if (printReady) {
      window.print();
    } else {
      setWaitingToPrint(true);
    }
  };

  return (
    <>
      {/* ── SCREEN MODAL ── */}
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
          {/* Header */}
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
              {type === 'BARCODE_LABELS' && `معاينة ملصقات الباركود (${flatLabels.length} ملصق)`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 800 }}
                onClick={handlePrint}
              >
                {type === 'BARCODE_LABELS'
                  ? waitingToPrint
                    ? '⏳ جاري التحضير...'
                    : printReady
                    ? 'طباعة الملصقات 🖨️'
                    : 'طباعة الملصقات 🖨️'
                  : type === 'CONTRACT'
                  ? 'طباعة العقد 🖨️'
                  : type === 'MAINTENANCE'
                  ? 'طباعة الإيصال 🖨️'
                  : 'طباعة الفاتورة 🖨️'}
              </button>
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
              padding: type === 'BARCODE_LABELS' ? '1.5rem 1rem' : '1.2rem',
              maxHeight: '75vh',
              overflowY: 'auto',
              background: type === 'BARCODE_LABELS' ? '#475569' : '#e2e8f0',
              color: '#000',
            }}
          >
            <div className="print-area">

              {/* INVOICE */}
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

              {/* CONTRACT */}
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

              {/* BARCODE LABELS SCREEN PREVIEW */}
              {type === 'BARCODE_LABELS' && (
                <BarcodeScreenPreview
                  flatLabels={flatLabels}
                  config={config}
                  storeSettings={storeSettings}
                  widthMm={widthMm}
                  heightMm={heightMm}
                />
              )}

              {/* MAINTENANCE */}
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

      {/* ── PRINT PORTAL (barcode only - direct body mount) ── */}
      {type === 'BARCODE_LABELS' && flatLabels.length > 0 && (
        <BarcodePrintPortal
          flatLabels={flatLabels}
          config={config}
          storeSettings={storeSettings}
          widthMm={widthMm}
          heightMm={heightMm}
          onAllReady={handlePortalAllReady}
        />
      )}
    </>
  );
};
