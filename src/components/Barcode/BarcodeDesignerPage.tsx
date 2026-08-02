import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { generateZPLCode, fetchLabelaryPNG } from '../../lib/labelaryBarcodeEngine';
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
  Code,
  Move
} from 'lucide-react';

export const BarcodeDesignerPage: React.FC = () => {
  const { inventory, phones, storeSettings, setActivePrintDocument } = useApp();
  const toast = useToast();

  const [previewUrl, setPreviewUrl]     = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPreviewUrl = useRef<string>('');

  const [config, setConfig] = useState<BarcodeConfig>(loadBarcodeConfig);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'elements' | 'paper' | 'custom' | 'batch' | 'tspl'>('batch');
  const [selectedElem, setSelectedElem] = useState<'store' | 'name' | 'barcode' | 'price' | 'origin' | null>('barcode');
  const [paperUnit, setPaperUnit] = useState<'mm' | 'cm' | 'inch'>('mm');

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

  // Drag state for canvas interactive movement
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedTarget, setDraggedTarget] = useState<'store' | 'name' | 'barcode' | 'price' | 'origin' | null>(null);

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
    toast.success('تمت إعادة الضبط بنجاح 🎯', 'الأبعاد الذهبية القياسية 42.5×25.0 مم');
  };

  // ── Labelary live preview (debounced 600ms) ──
  // Conversion helpers
  const toUnit = (mm: number) =>
    paperUnit === 'inch' ? +(mm / 25.4).toFixed(3)
    : paperUnit === 'cm'   ? +(mm / 10).toFixed(2)
    : +mm.toFixed(1);
  const toMm = (val: number) =>
    paperUnit === 'inch' ? val * 25.4
    : paperUnit === 'cm'   ? val * 10
    : val;
  const unitStep = paperUnit === 'inch' ? 0.01 : paperUnit === 'cm' ? 0.1 : 0.5;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const unitLabel = paperUnit === 'inch' ? 'بوصة (inch)' : paperUnit === 'cm' ? 'سنتيمتر (cm)' : 'ملليمتر (mm)';
  const mm2dots = (mm: number) => Math.round(mm * 8);

  const fetchPreview = useCallback(() => {
    const sampleItem = printItems[0] || {
      title: 'جراب ايفون 13 سيلكون حراري',
      barcode: '4000123456',
      price: 150,
      origin: config.customOriginText || 'صنع في مصر',
      storeName: config.customStoreName || storeSettings.storeName
    };

    const shopName    = config.customStoreName || storeSettings.storeName || 'المهندس للاتصالات';
    const productName = config.showProductName ? (sampleItem.title || 'منتج') : '';
    const barcodeVal  = config.showBarcode ? String(sampleItem.barcode || '4000123456') : '4000123456';
    const price       = config.showPrice ? `EGP ${sampleItem.price || 0}` : '';

    const zpl = generateZPLCode(
      {
        shopName: config.showStoreName ? shopName : '',
        productName,
        barcodeValue: barcodeVal,
        price,
        originText: config.showOrigin ? (config.customOriginText || 'صنع في مصر') : ''
      },
      config
    );

    setPreviewLoading(true);
    fetchLabelaryPNG(zpl, config.widthMm ?? 50.8, config.heightMm ?? 25.4)
      .then(blob => {
        const url = URL.createObjectURL(blob);
        if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
        prevPreviewUrl.current = url;
        setPreviewUrl(url);
        setPreviewLoading(false);
      })
      .catch(() => setPreviewLoading(false));
  }, [config, printItems, storeSettings.storeName]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchPreview, 600);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [fetchPreview]);

  // Handle Mouse Click / Drag on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX_px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY_px = (e.clientY - rect.top) * (canvas.height / rect.height);
    const clickX_mm = clickX_px / CANVAS_SCALE;
    const clickY_mm = clickY_px / CANVAS_SCALE;

    // Determine clicked element based on proximity
    const targets: { name: 'store' | 'name' | 'barcode' | 'price' | 'origin'; x: number; y: number }[] = [
      { name: 'store', x: config.storeX, y: config.storeY },
      { name: 'name', x: config.nameX, y: config.nameY },
      { name: 'barcode', x: config.barcodeX + 10, y: config.barcodeY + 4 },
      { name: 'price', x: config.priceX + 5, y: config.priceY + 2 },
      { name: 'origin', x: config.originX - 5, y: config.originY + 2 }
    ];

    let closest = targets[0];
    let minDistance = Math.hypot(clickX_mm - targets[0].x, clickY_mm - targets[0].y);

    for (let i = 1; i < targets.length; i++) {
      const dist = Math.hypot(clickX_mm - targets[i].x, clickY_mm - targets[i].y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = targets[i];
      }
    }

    if (minDistance < 15) {
      setSelectedElem(closest.name);
      setDraggedTarget(closest.name);
      setIsDragging(true);
      setActiveTab('elements');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !draggedTarget || isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX_px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const currentY_px = (e.clientY - rect.top) * (canvas.height / rect.height);

    const newX_mm = Math.max(0, Math.min(config.widthMm, Math.round((currentX_px / CANVAS_SCALE) * 10) / 10));
    const newY_mm = Math.max(0, Math.min(config.heightMm, Math.round((currentY_px / CANVAS_SCALE) * 10) / 10));

    if (draggedTarget === 'store') handleUpdateConfig({ storeX: newX_mm, storeY: newY_mm });
    if (draggedTarget === 'name') handleUpdateConfig({ nameX: newX_mm, nameY: newY_mm });
    if (draggedTarget === 'barcode') handleUpdateConfig({ barcodeX: newX_mm, barcodeY: newY_mm });
    if (draggedTarget === 'price') handleUpdateConfig({ priceX: newX_mm, priceY: newY_mm });
    if (draggedTarget === 'origin') handleUpdateConfig({ originX: newX_mm, originY: newY_mm });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedTarget(null);
  };

  // Add Item to Batch Queue
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
      toast.info('سيتم فتح نافذة الطباعة الحرارية السلسة 🖨️', 'يتم التحويل للطباعة المباشرة');
      handlePrintBrowserThermal();
    }
  };

  // Seamless 1-to-1 Browser Thermal Printing Engine
  const handlePrintBrowserThermal = () => {
    if (printItems.length === 0) {
      toast.warning('أضف منتجات أولاً للطباعة');
      return;
    }
    setActivePrintDocument({
      type: 'BARCODE_LABELS',
      data: { items: printItems, config }
    });
  };

  // Generate TSPL Code String
  const generateTSPLTextString = (): string => {
    const dpi = config.dpi || 203;

    let result = '';
    printItems.forEach(item => {
      result += `SIZE ${config.widthMm} mm, ${config.heightMm} mm\n`;
      result += `GAP ${config.gap} mm, 0 mm\n`;
      result += `DIRECTION 1\n`;
      result += `CLS\n`;
      if (config.showStoreName) {
        result += `TEXT ${mmToDots(config.storeX, dpi)},${mmToDots(config.storeY, dpi)},"0",0,1,1,"${config.customStoreName || item.storeName || storeSettings.storeName}"\n`;
      }
      if (config.showProductName) {
        result += `TEXT ${mmToDots(config.nameX, dpi)},${mmToDots(config.nameY, dpi)},"0",0,1,1,"${item.title}"\n`;
      }
      if (config.showBarcode && item.barcode) {
        result += `BARCODE ${mmToDots(config.barcodeX, dpi)},${mmToDots(config.barcodeY, dpi)},"128",${config.scaleHeight || 49},${config.showText ? 1 : 0},0,${config.scaleWidth || 2},${(config.scaleWidth || 2) * 2},"${item.barcode}"\n`;
      }
      if (config.showPrice) {
        result += `TEXT ${mmToDots(config.priceX, dpi)},${mmToDots(config.priceY, dpi)},"0",0,1.2,1.2,"EGP ${item.price}"\n`;
      }
      if (config.showOrigin) {
        result += `TEXT ${mmToDots(config.originX, dpi)},${mmToDots(config.originY, dpi)},"0",0,1,1,"${config.customOriginText || item.origin || 'صنع في مصر'}"\n`;
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

  const handleDownloadTSPLFile = () => {
    const payload = generateTSPLStream(printItems, config);
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elmohandes-barcodes-${Date.now()}.tspl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل ملف الأوامر الخام (.tspl) 📥');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>

      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '1.2rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer color="#fbbf24" size={24} /> مصمم ومحرك طباعة ملصقات الباركود الحرارية (TSPL 2.0 Engine)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            الأبعاد الافتراضية الذهبية: <strong>42.5 × 25.0 مم</strong> | دقة 203 DPI | تحريك تفاعلي بالسحب والإفلات
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={isLocked ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            {isLocked ? <Lock size={16} color="#fda4af" /> : <Unlock size={16} color="#10b981" />}
            <span>{isLocked ? 'قفل الحركة 🔒' : 'تعديل وسحب حُر 🔓'}</span>
          </button>

          <button
            onClick={handleResetToStandard}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            title="إعادة جميع مواضع وإحداثيات العناصر وأبعاد الورقة إلى الوضع القياسي الأصلي"
          >
            <RotateCcw size={16} /> إعادة ضبط مواضع وأبعاد العناصر 🎯
          </button>
        </div>
      </div>

      {/* Main 2-Column Full Page Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 1.3fr', gap: '1.25rem', width: '100%' }}>
        
        {/* Left Column: Live Canvas Interactive Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', borderRadius: 16, padding: '1.2rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={18} /> المعاينة البصرية للملصق (42.5 × 25.0 مم)
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isLocked ? '🔒 وضع القفل' : '🖐️ اضغط واسحب أي عنصر للتحريك'}
            </span>
          </div>

          <div style={{ background: '#0b0f19', borderRadius: 12, padding: '1.5rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)', minHeight: '280px', position: 'relative' }}>
            {previewLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b', fontSize: '0.82rem' }}>
                <div style={{ width: 28, height: 28, border: '3px solid #334155', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                جاري تحميل المعاينة من Labelary API...
              </div>
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="label preview"
                style={{
                  boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
                  borderRadius: 4,
                  display: previewLoading ? 'none' : 'block',
                  maxWidth: '100%',
                  width: `${Math.min(config.widthMm * 12, 560)}px`,
                  height: 'auto',
                  objectFit: 'fill',
                  imageRendering: 'crisp-edges',
                }}
                onLoad={() => setPreviewLoading(false)}
              />
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

          <button
            className="btn btn-secondary"
            onClick={handleDownloadTSPLFile}
            style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%' }}
          >
            <Download size={14} /> تحميل ملف الأوامر الخام (.tspl)
          </button>
        </div>

        {/* Right Column: Inspector Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', borderRadius: 16, padding: '1.2rem', border: '1px solid var(--border-color)' }}>
          
          {/* Tabs Navigation */}
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
              
              {/* Quick Reset All Elements Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.65rem 0.85rem', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 800 }}>
                  تغيرت مواضع أو إحداثيات العناصر بالخطأ؟
                </span>
                <button
                  onClick={handleResetToStandard}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 900, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={14} /> إعادة ضبط مواضع العناصر 🎯
                </button>
              </div>
              
              {/* Store Name Controls */}
              <div style={{ background: selectedElem === 'store' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: selectedElem === 'store' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedElem('store')}>
                    <input type="checkbox" checked={config.showStoreName} onChange={e => handleUpdateConfig({ showStoreName: e.target.checked })} style={{ marginLeft: 6 }} />
                    اسم المتجر / المحل
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.storeX}mm | Y: {config.storeY}mm</span>
                </div>
                {config.showStoreName && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.storeX} onChange={e => handleUpdateConfig({ storeX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.storeY} onChange={e => handleUpdateConfig({ storeY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط (pt)</label>
                      <input type="number" className="input-field" value={config.storeFontSize} onChange={e => handleUpdateConfig({ storeFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Product Name Controls */}
              <div style={{ background: selectedElem === 'name' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: selectedElem === 'name' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedElem('name')}>
                    <input type="checkbox" checked={config.showProductName} onChange={e => handleUpdateConfig({ showProductName: e.target.checked })} style={{ marginLeft: 6 }} />
                    اسم الصنف / المنتج
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.nameX}mm | Y: {config.nameY}mm</span>
                </div>
                {config.showProductName && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.nameX} onChange={e => handleUpdateConfig({ nameX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.nameY} onChange={e => handleUpdateConfig({ nameY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط (pt)</label>
                      <input type="number" className="input-field" value={config.nameFontSize} onChange={e => handleUpdateConfig({ nameFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode Controls */}
              <div style={{ background: selectedElem === 'barcode' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: selectedElem === 'barcode' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedElem('barcode')}>
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
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>موضع X (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.barcodeX} onChange={e => handleUpdateConfig({ barcodeX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>موضع Y (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.barcodeY} onChange={e => handleUpdateConfig({ barcodeY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>سمك الخط (Dot)</label>
                      <input type="number" className="input-field" value={config.scaleWidth} onChange={e => handleUpdateConfig({ scaleWidth: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>الارتفاع (Dot)</label>
                      <input type="number" className="input-field" value={config.scaleHeight} onChange={e => handleUpdateConfig({ scaleHeight: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Price Controls */}
              <div style={{ background: selectedElem === 'price' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: selectedElem === 'price' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedElem('price')}>
                    <input type="checkbox" checked={config.showPrice} onChange={e => handleUpdateConfig({ showPrice: e.target.checked })} style={{ marginLeft: 6 }} />
                    سعر البيع
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.priceX}mm | Y: {config.priceY}mm</span>
                </div>
                {config.showPrice && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.priceX} onChange={e => handleUpdateConfig({ priceX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.priceY} onChange={e => handleUpdateConfig({ priceY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط (pt)</label>
                      <input type="number" className="input-field" value={config.priceFontSize} onChange={e => handleUpdateConfig({ priceFontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Origin Controls */}
              <div style={{ background: selectedElem === 'origin' ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: 12, border: selectedElem === 'origin' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedElem('origin')}>
                    <input type="checkbox" checked={config.showOrigin} onChange={e => handleUpdateConfig({ showOrigin: e.target.checked })} style={{ marginLeft: 6 }} />
                    بلد المنشأ / الملاحظة
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>X: {config.originX}mm | Y: {config.originY}mm</span>
                </div>
                {config.showOrigin && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع افقي X (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.originX} onChange={e => handleUpdateConfig({ originX: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>موضع رأسي Y (mm)</label>
                      <input type="number" step="0.1" className="input-field" value={config.originY} onChange={e => handleUpdateConfig({ originY: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>حجم الخط (pt)</label>
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

              {/* Unit Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.7)', padding: '0.6rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>وحدة القياس:</span>
                {(['mm', 'cm', 'inch'] as const).map(u => (
                  <button key={u} onClick={() => setPaperUnit(u)} style={{
                    padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800,
                    background: paperUnit === u ? '#6366f1' : 'rgba(255,255,255,0.07)',
                    color: paperUnit === u ? '#fff' : '#94a3b8'
                  }}>{u === 'mm' ? 'مم' : u === 'cm' ? 'سم' : 'بوصة'}</button>
                ))}
                <span style={{ fontSize: '0.72rem', color: '#4b5563', marginRight: 'auto' }}>
                  {toUnit(config.widthMm).toFixed(2)} × {toUnit(config.heightMm).toFixed(2)} {paperUnit}
                </span>
              </div>

              {/* Common Presets */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { label: '2×1"', w: 50.8,  h: 25.4 },
                  { label: '3×2"', w: 76.2,  h: 50.8 },
                  { label: '4×2"', w: 101.6, h: 50.8 },
                  { label: '4×6"', w: 101.6, h: 152.4 },
                  { label: '38×25mm', w: 38, h: 25 },
                  { label: '50×30mm', w: 50, h: 30 },
                ].map(preset => (
                  <button key={preset.label} onClick={() => handleUpdateConfig({ widthMm: preset.w, heightMm: preset.h })} style={{
                    padding: '0.28rem 0.7rem', borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)',
                    background: (Math.abs(config.widthMm - preset.w) < 0.5 && Math.abs(config.heightMm - preset.h) < 0.5) ? 'rgba(251,191,36,0.2)' : 'rgba(15,23,42,0.8)',
                    color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                  }}>{preset.label}</button>
                ))}
              </div>

              {/* Width / Height inputs in selected unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>عرض الملصق ({paperUnit})</label>
                  <input type="number" step={unitStep} className="input-field"
                    value={toUnit(config.widthMm)}
                    onChange={e => handleUpdateConfig({ widthMm: toMm(Number(e.target.value)) })} />
                  <span style={{ fontSize: '0.68rem', color: '#4b5563' }}>{config.widthMm.toFixed(1)} mm</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>ارتفاع الملصق ({paperUnit})</label>
                  <input type="number" step={unitStep} className="input-field"
                    value={toUnit(config.heightMm)}
                    onChange={e => handleUpdateConfig({ heightMm: toMm(Number(e.target.value)) })} />
                  <span style={{ fontSize: '0.68rem', color: '#4b5563' }}>{config.heightMm.toFixed(1)} mm</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>الفجوة Gap (mm)</label>
                  <input type="number" step="0.1" className="input-field" value={config.gap} onChange={e => handleUpdateConfig({ gap: Number(e.target.value) })} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.88rem', color: '#fbbf24', marginTop: '0.4rem' }}>الهوامش الإرشادية للطباعة (Print Margins):</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>علوي Top</label><input type="number" step="0.1" className="input-field" value={config.marginTop} onChange={e => handleUpdateConfig({ marginTop: Number(e.target.value) })} /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>سفلي Bottom</label><input type="number" step="0.1" className="input-field" value={config.marginBottom} onChange={e => handleUpdateConfig({ marginBottom: Number(e.target.value) })} /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>أيسر Left</label><input type="number" step="0.1" className="input-field" value={config.marginLeft} onChange={e => handleUpdateConfig({ marginLeft: Number(e.target.value) })} /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>أيمن Right</label><input type="number" step="0.1" className="input-field" value={config.marginRight} onChange={e => handleUpdateConfig({ marginRight: Number(e.target.value) })} /></div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700 }}>دقة الطابعة الحرارية (DPI Resolution)</label>
                <select className="input-field" value={config.dpi || 203} onChange={e => handleUpdateConfig({ dpi: Number(e.target.value) })}>
                  <option value={203}>203 DPI (8 dots/mm - الطابعات الحرارية القياسية)</option>
                  <option value={300}>300 DPI (11.8 dots/mm - عالية الدقة)</option>
                  <option value={600}>600 DPI (23.6 dots/mm - فايبر/صناعي)</option>
                </select>
              </div>

              {/* Live dimensions summary */}
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '0.6rem', fontSize: '0.75rem', color: '#34d399', lineHeight: 1.8 }}>
                📐 <strong>أبعاد ZPL:</strong> ^PW{mm2dots(config.widthMm)} ^LL{mm2dots(config.heightMm)} (dots)<br />
                🌐 <strong>Labelary URL:</strong> …/labels/{(config.widthMm/25.4).toFixed(3)}x{(config.heightMm/25.4).toFixed(3)}/
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
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1, minHeight: '260px', direction: 'ltr', background: '#0b0f19', color: '#34d399' }}
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
