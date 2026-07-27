import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { BarcodeConfig, BarcodePrintItem } from '../../types';
import {
  DEFAULT_BARCODE_CONFIG,
  loadBarcodeConfig,
  saveBarcodeConfig,
  mmToDots,
  generateTSPLStream,
  sendToWebUSBPrinter
} from '../../lib/barcodeEngine';
import {
  Printer,
  Sliders,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Copy,
  Zap,
  Eye,
  Check,
  Grid,
  FileText,
  Code
} from 'lucide-react';

export const BarcodeDesignerPage: React.FC = () => {
  const { inventory, phones, storeSettings } = useApp();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeHelperCanvasRef = useRef<HTMLCanvasElement>(null);

  const [config, setConfig] = useState<BarcodeConfig>(loadBarcodeConfig);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'elements' | 'paper' | 'custom' | 'batch' | 'tspl'>('elements');

  // Selected Items for Batch Label Printing
  const [printItems, setPrintItems] = useState<BarcodePrintItem[]>([
    {
      id: 'demo-1',
      title: 'جراب ايفون 13 سيلكون حراري',
      barcode: '4000123456',
      price: 150,
      origin: 'صنع في مصر',
      storeName: storeSettings.storeName,
      qty: 1
    }
  ]);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');

  // Dragging state for canvas elements
  const [draggingElem, setDraggingElem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ensure default custom store name is set
  useEffect(() => {
    if (!config.customStoreName && storeSettings.storeName) {
      setConfig(prev => ({ ...prev, customStoreName: storeSettings.storeName }));
    }
  }, [storeSettings.storeName]);

  const handleUpdateConfig = (newCfg: Partial<BarcodeConfig>) => {
    const updated = { ...config, ...newCfg };
    setConfig(updated);
    saveBarcodeConfig(updated);
  };

  const handleResetToStandard = () => {
    setConfig(DEFAULT_BARCODE_CONFIG);
    saveBarcodeConfig(DEFAULT_BARCODE_CONFIG);
    toast.success('تمت إعادة الضبط بنجاح 🎯', 'الأبعاد الذهبية القياسية 42.5×25 مم');
  };

  // Render Canvas Simulation at 5x Zoom Scale
  const renderCanvasPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpi = config.dpi || 203;
    const zoomScale = 5; // 5x zoom for crisp canvas display

    const labelWidthDots = mmToDots(config.widthMm, dpi);
    const labelHeightDots = mmToDots(config.heightMm, dpi);

    canvas.width = labelWidthDots * (zoomScale / 2);
    canvas.height = labelHeightDots * (zoomScale / 2);

    const scale = (zoomScale / 2) * (dpi / 25.4); // pixels per mm on screen canvas

    // White Thermal Label Paper Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2mm Grid Canvas Lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < config.widthMm; x += 2) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < config.heightMm; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(canvas.width, y * scale);
      ctx.stroke();
    }

    // Printable Red Dashed Margin Boundary Box
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      config.marginLeft * scale,
      config.marginTop * scale,
      (config.widthMm - config.marginLeft - config.marginRight) * scale,
      (config.heightMm - config.marginTop - config.marginBottom) * scale
    );
    ctx.setLineDash([]); // Reset line dash

    const sampleItem = printItems[0] || {
      title: 'اسم المنتج التجريبي',
      barcode: '4000123456',
      price: 150,
      origin: config.customOriginText || 'صنع في مصر',
      storeName: config.customStoreName || storeSettings.storeName
    };

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // 1. Store Name
    if (config.showStoreName) {
      const text = config.customStoreName || sampleItem.storeName || storeSettings.storeName;
      ctx.font = `bold ${config.storeFontSize * (zoomScale / 3)}px 'Cairo', sans-serif`;
      ctx.fillText(text, config.storeX * scale, config.storeY * scale);
    }

    // 2. Product Name
    if (config.showProductName) {
      ctx.font = `bold ${config.nameFontSize * (zoomScale / 3)}px 'Cairo', sans-serif`;
      ctx.fillText(sampleItem.title, config.nameX * scale, config.nameY * scale);
    }

    // 3. Barcode CODE128 (Local Offline Rendering)
    if (config.showBarcode && sampleItem.barcode) {
      try {
        const helperCanvas = barcodeHelperCanvasRef.current || document.createElement('canvas');
        JsBarcode(helperCanvas, sampleItem.barcode, {
          format: 'CODE128',
          width: config.scaleWidth || 2,
          height: config.scaleHeight || 45,
          displayValue: config.showText,
          fontSize: 14,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000'
        });
        const bcW = helperCanvas.width * (zoomScale / 3.5);
        const bcH = helperCanvas.height * (zoomScale / 3.5);
        ctx.drawImage(helperCanvas, (config.barcodeX * scale) - (bcW / 2), config.barcodeY * scale, bcW, bcH);
      } catch (err) {
        console.warn('JsBarcode preview warning:', err);
      }
    }

    // 4. Price Text
    if (config.showPrice) {
      ctx.textAlign = 'left';
      ctx.font = `900 ${config.priceFontSize * (zoomScale / 3)}px 'Cairo', sans-serif`;
      ctx.fillText(`ج.م ${sampleItem.price.toLocaleString('ar-EG')}`, config.priceX * scale, config.priceY * scale);
    }

    // 5. Origin Text
    if (config.showOrigin) {
      ctx.textAlign = 'right';
      ctx.font = `600 ${config.originFontSize * (zoomScale / 3)}px 'Cairo', sans-serif`;
      ctx.fillText(config.customOriginText || sampleItem.origin || 'صنع في مصر', config.originX * scale, config.originY * scale);
    }
  };

  useEffect(() => {
    renderCanvasPreview();
  }, [config, printItems]);

  // Add Item to Print Queue
  const handleAddInventoryToQueue = () => {
    if (!selectedInventoryId) return;
    const item = inventory.find(i => i.id === selectedInventoryId);
    if (!item) return;

    const existing = printItems.find(p => p.id === item.id);
    if (existing) {
      setPrintItems(printItems.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
    } else {
      setPrintItems([
        ...printItems,
        {
          id: item.id,
          title: item.name,
          barcode: item.barcode || item.id,
          price: item.sellPrice,
          origin: config.customOriginText || 'صنع في مصر',
          storeName: storeSettings.storeName,
          qty: 1
        }
      ]);
    }
    setSelectedInventoryId('');
    toast.success('تمت إضافة المنتج لقائمة الطباعة');
  };

  const handleAddPhoneToQueue = () => {
    if (!selectedPhoneId) return;
    const phone = phones.find(p => p.id === selectedPhoneId);
    if (!phone) return;

    setPrintItems([
      ...printItems,
      {
        id: phone.id,
        title: `${phone.brand} ${phone.model} (${phone.storage})`,
        barcode: phone.imei,
        price: phone.sellPrice,
        origin: phone.condition === 'NEW' ? 'جديد بالضمان' : 'مستعمل بحالة جيدة',
        storeName: storeSettings.storeName,
        qty: 1
      }
    ]);
    setSelectedPhoneId('');
    toast.success('تمت إضافة الهاتف لقائمة الطباعة');
  };

  // Direct Hardware Printing via TSPL & WebUSB
  const handlePrintTSPLDirect = async () => {
    if (printItems.length === 0) {
      toast.warning('أضف منتجات أولاً للطباعة');
      return;
    }
    try {
      const payload = generateTSPLStream(printItems, config);
      await sendToWebUSBPrinter(payload);
      toast.success('تم إرسال أمر الطباعة المباشر ⚡', 'تم نقل الأوامر لرأس الطابعة الحرارية');
    } catch (err: any) {
      toast.info('سيتم فتح نافذة المعاينة والطباعة 🖨️', 'WebUSB غير متاح، يتم التحويل للطباعة المباشرة');
      handlePrintBrowserThermal();
    }
  };

  // Reliable Thermal Label Browser Printing Engine (Local Data URL SVG / Canvas)
  const handlePrintBrowserThermal = () => {
    if (printItems.length === 0) {
      toast.warning('أضف منتجات أولاً للطباعة');
      return;
    }

    const printWin = window.open('', '_blank', 'width=800,height=600');
    if (!printWin) {
      toast.error('المتصفح حظر النافذة المنبثقة، اسمح بالنوافذ المنبثقة للطباعة');
      return;
    }

    // Generate local Data URLs for barcodes
    const renderItemHtml = (item: BarcodePrintItem) => {
      let barcodeImgHtml = '';
      if (config.showBarcode && item.barcode) {
        try {
          const helperCanvas = document.createElement('canvas');
          JsBarcode(helperCanvas, item.barcode, {
            format: 'CODE128',
            width: config.scaleWidth || 2,
            height: config.scaleHeight || 45,
            displayValue: config.showText,
            fontSize: 14,
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000'
          });
          const dataUrl = helperCanvas.toDataURL('image/png');
          barcodeImgHtml = `<img src="${dataUrl}" style="max-width: 95%; max-height: 14mm; object-fit: contain; margin: 1px 0;" />`;
        } catch {
          barcodeImgHtml = `<div style="font-family: monospace; font-weight: bold;">*${item.barcode}*</div>`;
        }
      }

      return `
        <div className="label-page">
          ${config.showStoreName ? `<div className="store-title">${config.customStoreName || item.storeName || storeSettings.storeName}</div>` : ''}
          ${config.showProductName ? `<div className="product-title">${item.title}</div>` : ''}
          ${barcodeImgHtml}
          <div className="label-footer">
            ${config.showPrice ? `<span className="price-tag">ج.م ${item.price.toLocaleString('ar-EG')}</span>` : ''}
            ${config.showOrigin ? `<span className="origin-tag">${config.customOriginText || item.origin || 'صنع في مصر'}</span>` : ''}
          </div>
        </div>
      `;
    };

    let allLabelsHtml = '';
    printItems.forEach(item => {
      const copies = item.qty || 1;
      for (let i = 0; i < copies; i++) {
        allLabelsHtml += renderItemHtml(item);
      }
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>طباعة ملصقات الباركود - محل المهندس</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          
          @page {
            size: ${config.widthMm}mm ${config.heightMm}mm;
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            background: #fff;
            color: #000;
            direction: rtl;
            text-align: center;
            -webkit-print-color-adjust: exact;
          }

          .label-page {
            width: ${config.widthMm}mm;
            height: ${config.heightMm}mm;
            padding: ${config.marginTop}mm ${config.marginRight}mm ${config.marginBottom}mm ${config.marginLeft}mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            overflow: hidden;
            background: #fff;
          }

          .store-title {
            font-size: ${config.storeFontSize / 2}px;
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
          }

          .product-title {
            font-size: ${config.nameFontSize / 2}px;
            font-weight: 800;
            line-height: 1.1;
            max-height: 2.2em;
            overflow: hidden;
          }

          .label-footer {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1mm;
          }

          .price-tag {
            font-size: ${config.priceFontSize / 2}px;
            font-weight: 900;
          }

          .origin-tag {
            font-size: ${config.originFontSize / 2}px;
            font-weight: 600;
            color: #333;
          }
        </style>
      </head>
      <body>
        ${allLabelsHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Generate TSPL Code Text for Preview/Copy
  const generateTSPLTextString = (): string => {
    const dpi = config.dpi || 203;
    const barcodeXDots = mmToDots(config.barcodeX, dpi);
    const barcodeYDots = mmToDots(config.barcodeY, dpi);

    let result = '';
    printItems.forEach(item => {
      result += `SIZE ${config.widthMm} mm, ${config.heightMm} mm\n`;
      result += `GAP ${config.gap} mm, 0 mm\n`;
      result += `DIRECTION 1\n`;
      result += `CLS\n`;
      if (config.showStoreName) {
        result += `TEXT 170,30,"0",0,1,1,"${config.customStoreName || item.storeName || storeSettings.storeName}"\n`;
      }
      if (config.showProductName) {
        result += `TEXT 170,60,"0",0,1,1,"${item.title}"\n`;
      }
      if (config.showBarcode && item.barcode) {
        result += `BARCODE ${barcodeXDots},${barcodeYDots},"128",${config.scaleHeight || 48},${config.showText ? 1 : 0},0,${config.scaleWidth || 2},${(config.scaleWidth || 2) * 2},"${item.barcode}"\n`;
      }
      if (config.showPrice) {
        result += `TEXT 40,160,"0",0,1.2,1.2,"EGP ${item.price}"\n`;
      }
      result += `PRINT ${item.qty || 1},1\n\n`;
    });

    return result;
  };

  const handleCopyTSPLCode = () => {
    const code = generateTSPLTextString();
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ أوامر TSPL إلى الحافظة 📋');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>
      <canvas ref={barcodeHelperCanvasRef} style={{ display: 'none' }} />

      {/* Top Main Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '1.2rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer color="#fbbf24" size={24} /> مصمم ومحرك طباعة ملصقات الباركود الحرارية (Universal TSPL Engine)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            المقاس الذهبي القياسي: <strong>42.5 × 25 مم</strong> | دقة 203 DPI | طباعة حرارية طباعة مباشرة وتفاعلية
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={isLocked ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            {isLocked ? <Lock size={16} color="#fda4af" /> : <Unlock size={16} color="#10b981" />}
            <span>{isLocked ? 'قفل الحركة 🔒' : 'تعديل حُر 🔓'}</span>
          </button>

          <button
            onClick={handleResetToStandard}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            <RotateCcw size={16} /> المقاس الذهبي (42.5×25مم)
          </button>
        </div>
      </div>

      {/* Main 2-Column Full Page Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 1.3fr', gap: '1.25rem', width: '100%' }}>
        
        {/* Left Column: Live Canvas Interactive Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', borderRadius: 16, padding: '1.2rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={18} /> المعاينة الحية البصرية للملصق (تكبير 5x)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {config.widthMm} مم × {config.heightMm} مم ({mmToDots(config.widthMm)}×{mmToDots(config.heightMm)} Dot)
            </span>
          </div>

          <div style={{ background: '#0b0f19', borderRadius: 12, padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)', minHeight: '260px' }}>
            <canvas ref={canvasRef} style={{ boxShadow: '0 12px 36px rgba(0,0,0,0.85)', borderRadius: 4, cursor: isLocked ? 'default' : 'move' }} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <button
              className="btn btn-emerald"
              onClick={handlePrintTSPLDirect}
              style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 900, borderRadius: 12 }}
            >
              <Zap size={20} /> طباعة TSPL مباشرة ⚡
            </button>

            <button
              className="btn btn-primary"
              onClick={handlePrintBrowserThermal}
              style={{ padding: '0.85rem', fontSize: '0.95rem', fontWeight: 900, borderRadius: 12 }}
            >
              <Printer size={20} /> طباعة حرارية (معاينة) 🖨️
            </button>
          </div>
        </div>

        {/* Right Column: Inspector Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', borderRadius: 16, padding: '1.2rem', border: '1px solid var(--border-color)' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { id: 'elements', label: '🎛️ تحكم العناصر' },
              { id: 'paper', label: '📏 أبعاد الورق' },
              { id: 'custom', label: '✏️ النصوص المخصصة' },
              { id: 'batch', label: `📦 طباعة مجمعة (${printItems.reduce((s,i)=>s+i.qty,0)})` },
              { id: 'tspl', label: '💻 كود TSPL' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 8,
                  border: activeTab === tab.id ? '1px solid #10b981' : '1px solid transparent',
                  background: activeTab === tab.id ? 'rgba(16,185,129,0.2)' : 'transparent',
                  color: activeTab === tab.id ? '#34d399' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: ELEMENTS CONTROL */}
          {activeTab === 'elements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', maxHeight: '480px', paddingLeft: 4 }}>
              
              {/* Store Name Controls */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    <input type="checkbox" checked={config.showStoreName} onChange={e => handleUpdateConfig({ showStoreName: e.target.checked })} style={{ marginLeft: 6 }} />
                    اسم المتجر / المحل
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.storeX}mm | Y: {config.storeY}mm</span>
                </div>
                {config.showStoreName && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X</label>
                      <input type="number" step="0.1" className="input-field" value={config.storeX} onChange={e => handleUpdateConfig({ storeX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y</label>
                      <input type="number" step="0.1" className="input-field" value={config.storeY} onChange={e => handleUpdateConfig({ storeY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط</label>
                      <input type="number" className="input-field" value={config.storeFontSize} onChange={e => handleUpdateConfig({ storeFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Product Name Controls */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    <input type="checkbox" checked={config.showProductName} onChange={e => handleUpdateConfig({ showProductName: e.target.checked })} style={{ marginLeft: 6 }} />
                    اسم الصنف / المنتج
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.nameX}mm | Y: {config.nameY}mm</span>
                </div>
                {config.showProductName && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X</label>
                      <input type="number" step="0.1" className="input-field" value={config.nameX} onChange={e => handleUpdateConfig({ nameX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y</label>
                      <input type="number" step="0.1" className="input-field" value={config.nameY} onChange={e => handleUpdateConfig({ nameY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط</label>
                      <input type="number" className="input-field" value={config.nameFontSize} onChange={e => handleUpdateConfig({ nameFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode Controls */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    <input type="checkbox" checked={config.showBarcode} onChange={e => handleUpdateConfig({ showBarcode: e.target.checked })} style={{ marginLeft: 6 }} />
                    شريط الباركود (CODE128)
                  </label>
                  <label style={{ fontSize: '0.75rem', color: '#818cf8' }}>
                    <input type="checkbox" checked={config.showText} onChange={e => handleUpdateConfig({ showText: e.target.checked })} style={{ marginLeft: 4 }} />
                    إظهار الأرقام أسفل الباركود
                  </label>
                </div>
                {config.showBarcode && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>موضع X</label>
                      <input type="number" step="0.1" className="input-field" value={config.barcodeX} onChange={e => handleUpdateConfig({ barcodeX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>موضع Y</label>
                      <input type="number" step="0.1" className="input-field" value={config.barcodeY} onChange={e => handleUpdateConfig({ barcodeY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>سمك الخط</label>
                      <input type="number" className="input-field" value={config.scaleWidth} onChange={e => handleUpdateConfig({ scaleWidth: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الارتفاع</label>
                      <input type="number" className="input-field" value={config.scaleHeight} onChange={e => handleUpdateConfig({ scaleHeight: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Price Controls */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    <input type="checkbox" checked={config.showPrice} onChange={e => handleUpdateConfig({ showPrice: e.target.checked })} style={{ marginLeft: 6 }} />
                    سعر البيع
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.priceX}mm | Y: {config.priceY}mm</span>
                </div>
                {config.showPrice && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X</label>
                      <input type="number" step="0.1" className="input-field" value={config.priceX} onChange={e => handleUpdateConfig({ priceX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y</label>
                      <input type="number" step="0.1" className="input-field" value={config.priceY} onChange={e => handleUpdateConfig({ priceY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط</label>
                      <input type="number" className="input-field" value={config.priceFontSize} onChange={e => handleUpdateConfig({ priceFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Origin Controls */}
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    <input type="checkbox" checked={config.showOrigin} onChange={e => handleUpdateConfig({ showOrigin: e.target.checked })} style={{ marginLeft: 6 }} />
                    بلد المنشأ / الملاحظة
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.originX}mm | Y: {config.originY}mm</span>
                </div>
                {config.showOrigin && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X</label>
                      <input type="number" step="0.1" className="input-field" value={config.originX} onChange={e => handleUpdateConfig({ originX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y</label>
                      <input type="number" step="0.1" className="input-field" value={config.originY} onChange={e => handleUpdateConfig({ originY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط</label>
                      <input type="number" className="input-field" value={config.originFontSize} onChange={e => handleUpdateConfig({ originFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: PAPER & MARGINS */}
          {activeTab === 'paper' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>عرض الملصق (مم)</label>
                  <input type="number" step="0.1" className="input-field" value={config.widthMm} onChange={e => handleUpdateConfig({ widthMm: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>ارتفاع الملصق (مم)</label>
                  <input type="number" step="0.1" className="input-field" value={config.heightMm} onChange={e => handleUpdateConfig({ heightMm: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>الفجوة Gap (مم)</label>
                  <input type="number" step="0.1" className="input-field" value={config.gap} onChange={e => handleUpdateConfig({ gap: Number(e.target.value) })} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.88rem', color: '#fbbf24', marginTop: '0.4rem' }}>الهوامش الإرشادية للطباعة (Print Margins):</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>علوي Top</label>
                  <input type="number" step="0.1" className="input-field" value={config.marginTop} onChange={e => handleUpdateConfig({ marginTop: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>سفلي Bottom</label>
                  <input type="number" step="0.1" className="input-field" value={config.marginBottom} onChange={e => handleUpdateConfig({ marginBottom: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>أيسر Left</label>
                  <input type="number" step="0.1" className="input-field" value={config.marginLeft} onChange={e => handleUpdateConfig({ marginLeft: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>أيمن Right</label>
                  <input type="number" step="0.1" className="input-field" value={config.marginRight} onChange={e => handleUpdateConfig({ marginRight: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700 }}>دقة الطابعة الحرارية (DPI Resolution)</label>
                <select className="input-field" value={config.dpi || 203} onChange={e => handleUpdateConfig({ dpi: Number(e.target.value) })}>
                  <option value={203}>203 DPI (8 dots/mm - الطابعات الحرارية القياسية)</option>
                  <option value={300}>300 DPI (11.8 dots/mm - عالية الدقة)</option>
                  <option value={600}>600 DPI (23.6 dots/mm - فايبر/صناعي)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM TEXT */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>اسم المتجر الافتراضي المطبوع</label>
                <input type="text" className="input-field" value={config.customStoreName || ''} onChange={e => handleUpdateConfig({ customStoreName: e.target.value })} placeholder="مثال: المهندس للاتصالات" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>نص المنشأ / الضمان</label>
                <input type="text" className="input-field" value={config.customOriginText || ''} onChange={e => handleUpdateConfig({ customOriginText: e.target.value })} placeholder="مثال: صنع في مصر / ضمان سنة" />
              </div>
            </div>
          )}

          {/* TAB 4: BATCH PRINTING QUEUE */}
          {activeTab === 'batch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                <select className="input-field" style={{ fontSize: '0.85rem' }} value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                  <option value="">-- اختر صنفاً من الإكسسوارات --</option>
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (سعر: {i.sellPrice}ج)</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleAddInventoryToQueue} style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
                  <Plus size={16} /> إضافة
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                <select className="input-field" style={{ fontSize: '0.85rem' }} value={selectedPhoneId} onChange={e => setSelectedPhoneId(e.target.value)}>
                  <option value="">-- اختر هاتفاً متوفراً برقم IMEI --</option>
                  {phones.filter(p => p.status === 'AVAILABLE').map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} - IMEI: {p.imei}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={handleAddPhoneToQueue} style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
                  <Plus size={16} /> إضافة
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '0.5rem' }}>
                {printItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>باركود: {item.barcode} | {item.price} ج.م</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>العدد:</label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '50px', padding: '3px 6px', fontSize: '0.85rem', textAlign: 'center' }}
                        className="input-field"
                        value={item.qty}
                        onChange={e => {
                          const val = Math.max(1, Number(e.target.value));
                          setPrintItems(printItems.map(p => p.id === item.id ? { ...p, qty: val } : p));
                        }}
                      />
                      <button onClick={() => setPrintItems(printItems.filter(p => p.id !== item.id))} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 2 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TSPL CODE PREVIEW */}
          {activeTab === 'tspl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 800 }}>أوامر TSPL الحرارية المتولدة:</span>
                <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={handleCopyTSPLCode}>
                  <Copy size={14} /> نسخ الأوامر
                </button>
              </div>
              <textarea
                className="input-field"
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1, minHeight: '220px', direction: 'ltr', background: '#0b0f19', color: '#34d399' }}
                value={generateTSPLTextString()}
                readOnly
              />
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
