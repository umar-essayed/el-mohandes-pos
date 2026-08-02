import JsBarcode from 'jsbarcode';

/**
 * GOLDEN STANDARD BARCODE PRESET (42.5 mm x 25.0 mm)
 * Technical Reference Specs (barcode_system_technical_reference.md)
 */
export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  widthMm: 42.5,
  heightMm: 25.0,
  gap: 1.0,
  marginTop: 0.6,
  marginBottom: 0.5,
  marginLeft: 0.4,
  marginRight: 0.5,

  storeX: 20.6,
  storeY: 1.8,
  storeFontSize: 20,

  nameX: 20.7,
  nameY: 5.2,
  nameFontSize: 16,

  barcodeX: 9.7,
  barcodeY: 9.0,
  scaleWidth: 2,
  scaleHeight: 45,
  showText: true,

  priceX: 4.8,
  priceY: 18.5,
  priceFontSize: 18,

  originX: 38.0,
  originY: 18.5,
  originFontSize: 13,

  showStoreName: true,
  showProductName: true,
  showBarcode: true,
  showPrice: true,
  showOrigin: true,

  customStoreName: 'المهندس للاتصالات',
  customOriginText: 'صنع في مصر',
  dpi: 203
};

const LOCAL_STORAGE_KEY = 'elmohandes_barcode_config_v5';

export function loadBarcodeConfig(): BarcodeConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_BARCODE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load barcode config:', e);
  }
  return DEFAULT_BARCODE_CONFIG;
}

export function saveBarcodeConfig(config: BarcodeConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save barcode config:', e);
  }
}

/**
 * Renders full barcode label to offscreen HTML5 Canvas at 203 DPI
 */
export function renderBarcodeLabelToCanvas(
  item: BarcodePrintItem,
  config: BarcodeConfig = loadBarcodeConfig(),
  storeSettings?: any
): HTMLCanvasElement {
  const dpi = config.dpi || 203;
  const dotsPerMm = dpi / 25.4;
  const widthPx = Math.round((config.widthMm || 42.5) * dotsPerMm);
  const heightPx = Math.round((config.heightMm || 25.0) * dotsPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  // 1. Store Name
  if (config.showStoreName) {
    const text = config.customStoreName || item.storeName || storeSettings?.storeName || 'المهندس للاتصالات';
    const storeX = (config.storeX ?? 20.6) * dotsPerMm;
    const storeY = (config.storeY ?? 1.8) * dotsPerMm;
    const fontSizePx = Math.round((config.storeFontSize || 20) * (dpi / 203));
    ctx.font = `bold ${fontSizePx}px 'Cairo', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, storeX, storeY);
  }

  // 2. Product Name
  if (config.showProductName) {
    const nameX = (config.nameX ?? 20.7) * dotsPerMm;
    const nameY = (config.nameY ?? 5.2) * dotsPerMm;
    const fontSizePx = Math.round((config.nameFontSize || 16) * (dpi / 203));
    ctx.font = `bold ${fontSizePx}px 'Cairo', sans-serif`;
    ctx.textAlign = 'center';
    let titleText = item.title || '';
    if (titleText.length > 26) titleText = titleText.substring(0, 25) + '...';
    ctx.fillText(titleText, nameX, nameY);
  }

  // 3. Barcode CODE128
  if (config.showBarcode && (item.barcode || item.id)) {
    try {
      const barcodeText = item.barcode || item.id;
      const helperCanvas = document.createElement('canvas');
      JsBarcode(helperCanvas, barcodeText, {
        format: 'CODE128',
        width: config.scaleWidth || 2,
        height: Math.round((config.scaleHeight || 45) * (dpi / 203)),
        displayValue: config.showText ?? true,
        fontSize: 13,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });

      const bcY = (config.barcodeY ?? 9.0) * dotsPerMm;
      const bcW = helperCanvas.width;
      const bcH = helperCanvas.height;

      let bcX = (config.barcodeX ?? 9.7) * dotsPerMm;
      if (config.barcodeX && config.barcodeX > 15) {
        bcX = (config.barcodeX * dotsPerMm) - (bcW / 2);
      } else {
        if (bcX + bcW > widthPx - 8) {
          bcX = Math.max(4, (widthPx - bcW) / 2);
        }
      }

      ctx.drawImage(helperCanvas, bcX, bcY, bcW, bcH);
    } catch (err) {
      console.warn('JsBarcode canvas render error:', err);
    }
  }

  // 4. Price
  if (config.showPrice) {
    const priceX = (config.priceX ?? 4.8) * dotsPerMm;
    const priceY = (config.priceY ?? 18.5) * dotsPerMm;
    const fontSizePx = Math.round((config.priceFontSize || 18) * (dpi / 203));
    ctx.font = `900 ${fontSizePx}px 'Cairo', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`ج.م ${Number(item.price || 0).toLocaleString('ar-EG')}`, priceX, priceY);
  }

  // 5. Origin
  if (config.showOrigin) {
    const originX = (config.originX ?? 38.0) * dotsPerMm;
    const originY = (config.originY ?? 18.5) * dotsPerMm;
    const fontSizePx = Math.round((config.originFontSize || 13) * (dpi / 203));
    ctx.font = `600 ${fontSizePx}px 'Cairo', sans-serif`;
    ctx.textAlign = 'right';
    const originText = config.customOriginText || item.origin || 'صنع في مصر';
    ctx.fillText(originText, originX, originY);
  }

  return canvas;
}

/**
 * Generates local base64 PNG data URL for a barcode or full label
 */
export function generateBarcodeDataUrl(itemOrText: any, config?: BarcodeConfig, storeSettings?: any): string {
  try {
    if (typeof itemOrText === 'string') {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, itemOrText, {
        format: 'CODE128',
        width: config?.scaleWidth || 2,
        height: config?.scaleHeight || 40,
        displayValue: config?.showText ?? true,
        fontSize: 13,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });
      return canvas.toDataURL('image/png');
    }

    const canvas = renderBarcodeLabelToCanvas(itemOrText, config || loadBarcodeConfig(), storeSettings);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('generateBarcodeDataUrl error:', err);
    return '';
  }
}

export function mmToDots(mm: number, dpi: number = 203): number {
  return Math.round((mm * dpi) / 25.4);
}

export function dotsToMm(dots: number, dpi: number = 203): number {
  return Math.round(((dots * 25.4) / dpi) * 10) / 10;
}

/**
 * Converts HTML5 Canvas to 1-Bit Packed Monochrome Bitmap for TSPL BITMAP command
 */
export function canvasToMonochromeBitmap(canvas: HTMLCanvasElement): { widthBytes: number; height: number; data: Uint8Array } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const rgba = imgData.data;

  const widthBytes = Math.ceil(w / 8);
  const packed = new Uint8Array(widthBytes * h);
  packed.fill(255); // Initialize with white (0xFF)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];

      const isBlack = (a < 128) ? false : ((0.299 * r + 0.587 * g + 0.114 * b) < 180);

      if (isBlack) {
        const byteIdx = y * widthBytes + Math.floor(x / 8);
        const bitIdx = x % 8;
        packed[byteIdx] &= ~(1 << (7 - bitIdx)); // Clear bit for thermal black burn
      }
    }
  }

  return { widthBytes, height: h, data: packed };
}

/**
 * Compiles barcode items & TSPL config into raw binary TSPL2 commands payload using 1-Bit Packed Monochrome Bitmap
 */
export function generateTSPLStream(
  items: BarcodePrintItem[],
  config: BarcodeConfig = loadBarcodeConfig(),
  storeSettings?: any
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  items.forEach(item => {
    const qty = item.qty || 1;
    const canvas = renderBarcodeLabelToCanvas(item, config, storeSettings);
    const { widthBytes, height, data } = canvasToMonochromeBitmap(canvas);

    const headerStr = 
      `SIZE ${config.widthMm} mm, ${config.heightMm} mm\n` +
      `GAP ${config.gap || 1} mm, 0 mm\n` +
      `DIRECTION 1\n` +
      `CLS\n` +
      `BITMAP 0,0,${widthBytes},${height},0,`;
    
    chunks.push(encoder.encode(headerStr));
    chunks.push(data);
    chunks.push(encoder.encode(`\nPRINT ${qty},1\n`));
  });

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Direct WebUSB Hardware Printer Sender
 */
export async function sendToWebUSBPrinter(payload: Uint8Array): Promise<boolean> {
  if (!('usb' in navigator)) {
    throw new Error('WebUSB API غير مدعوم في هذا المتصفح');
  }
  try {
    const navUsb = (navigator as any).usb;
    const device = await navUsb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    const endpoint = device.configuration.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out');
    const endpointNum = endpoint ? endpoint.endpointNumber : 1;

    await device.transferOut(endpointNum, payload);
    await device.close();
    return true;
  } catch (err: any) {
    console.error('WebUSB Direct Print Failed:', err);
    throw err;
  }
}
