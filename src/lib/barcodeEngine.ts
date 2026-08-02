/**
 * GOLDEN STANDARD BARCODE PRESET (42.5 mm x 25.0 mm)
 * Technical Reference Specs
 */
export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  widthMm: 42.5,
  heightMm: 25.0,
  gap: 1.0,
  marginTop: 0.5,
  marginBottom: 0.5,
  marginLeft: 0.5,
  marginRight: 0.5,

  storeX: 21.25,
  storeY: 1.8,
  storeFontSize: 16,

  nameX: 21.25,
  nameY: 5.5,
  nameFontSize: 14,

  barcodeX: 21.25,
  barcodeY: 9.2,
  scaleWidth: 2,
  scaleHeight: 40,
  showText: true,

  priceX: 3.0,
  priceY: 19.2,
  priceFontSize: 18,

  originX: 39.5,
  originY: 19.2,
  originFontSize: 12,

  showStoreName: true,
  showProductName: true,
  showBarcode: true,
  showPrice: true,
  showOrigin: true,

  customStoreName: 'المهندس للاتصالات',
  customOriginText: 'صنع في مصر',
  dpi: 203
};

const LOCAL_STORAGE_KEY = 'elmohandes_barcode_config_v4';

export function loadBarcodeConfig(): BarcodeConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-sanitize bad coordinates if barcodeX was corrupt/off-screen
      if (parsed.barcodeX < 15) parsed.barcodeX = 21.25;
      if (parsed.storeX < 15) parsed.storeX = 21.25;
      if (parsed.nameX < 15) parsed.nameX = 21.25;
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
    const storeX = (config.storeX ?? (config.widthMm / 2)) * dotsPerMm;
    const storeY = (config.storeY ?? 1.8) * dotsPerMm;
    const fontSize = Math.round((config.storeFontSize || 16) * (dpi / 203));
    ctx.font = `bold ${fontSize}px 'Cairo', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, storeX, storeY);
  }

  // 2. Product Name
  if (config.showProductName) {
    const nameX = (config.nameX ?? (config.widthMm / 2)) * dotsPerMm;
    const nameY = (config.nameY ?? 5.5) * dotsPerMm;
    const fontSize = Math.round((config.nameFontSize || 14) * (dpi / 203));
    ctx.font = `bold ${fontSize}px 'Cairo', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(item.title, nameX, nameY);
  }

  // 3. Barcode CODE128
  if (config.showBarcode && (item.barcode || item.id)) {
    try {
      const barcodeText = item.barcode || item.id;
      const helperCanvas = document.createElement('canvas');
      JsBarcode(helperCanvas, barcodeText, {
        format: 'CODE128',
        width: config.scaleWidth || 2,
        height: config.scaleHeight || 40,
        displayValue: config.showText ?? true,
        fontSize: 14,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });

      const bcX = (config.barcodeX ?? (config.widthMm / 2)) * dotsPerMm;
      const bcY = (config.barcodeY ?? 9.2) * dotsPerMm;
      const bcW = helperCanvas.width;
      const bcH = helperCanvas.height;

      // Draw centered horizontally at bcX
      ctx.drawImage(helperCanvas, bcX - (bcW / 2), bcY, bcW, bcH);
    } catch (err) {
      console.warn('JsBarcode canvas render error:', err);
    }
  }

  // 4. Price
  if (config.showPrice) {
    const priceX = (config.priceX ?? 3.0) * dotsPerMm;
    const priceY = (config.priceY ?? 19.2) * dotsPerMm;
    const fontSize = Math.round((config.priceFontSize || 18) * (dpi / 203));
    ctx.font = `900 ${fontSize}px 'Cairo', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`ج.م ${Number(item.price || 0).toLocaleString('ar-EG')}`, priceX, priceY);
  }

  // 5. Origin
  if (config.showOrigin) {
    const originX = (config.originX ?? (config.widthMm - 3.0)) * dotsPerMm;
    const originY = (config.originY ?? 19.2) * dotsPerMm;
    const fontSize = Math.round((config.originFontSize || 12) * (dpi / 203));
    ctx.font = `600 ${fontSize}px 'Cairo', sans-serif`;
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
        fontSize: 14,
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
 * Compiles barcode items & TSPL config into raw binary TSPL2 commands payload
 */
export function generateTSPLStream(
  items: BarcodePrintItem[],
  config: BarcodeConfig = loadBarcodeConfig()
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const dpi = config.dpi || 203;

  items.forEach(item => {
    const qty = item.qty || 1;
    const headerStr = 
      `SIZE ${config.widthMm} mm, ${config.heightMm} mm\n` +
      `GAP ${config.gap} mm, 0 mm\n` +
      `DIRECTION 1\n` +
      `CLS\n`;
    chunks.push(encoder.encode(headerStr));

    // 1. Store Name
    if (config.showStoreName) {
      const storeText = config.customStoreName || item.storeName || 'المهندس للاتصالات';
      const x = mmToDots(config.storeX, dpi);
      const y = mmToDots(config.storeY, dpi);
      chunks.push(encoder.encode(`TEXT ${x},${y},"0",0,1,1,"${storeText}"\n`));
    }

    // 2. Product Name
    if (config.showProductName) {
      const x = mmToDots(config.nameX, dpi);
      const y = mmToDots(config.nameY, dpi);
      chunks.push(encoder.encode(`TEXT ${x},${y},"0",0,1,1,"${item.title}"\n`));
    }

    // 3. Barcode
    if (config.showBarcode && item.barcode) {
      const x = mmToDots(config.barcodeX, dpi);
      const y = mmToDots(config.barcodeY, dpi);
      const showTextVal = config.showText ? 1 : 0;
      const scaleW = config.scaleWidth || 2;
      const scaleH = config.scaleHeight || 49;

      const barcodeCmd = `BARCODE ${x},${y},"128",${scaleH},${showTextVal},0,${scaleW},${scaleW * 2},"${item.barcode}"\n`;
      chunks.push(encoder.encode(barcodeCmd));
    }

    // 4. Price
    if (config.showPrice) {
      const x = mmToDots(config.priceX, dpi);
      const y = mmToDots(config.priceY, dpi);
      chunks.push(encoder.encode(`TEXT ${x},${y},"0",0,1,1,"EGP ${item.price}"\n`));
    }

    // 5. Origin
    if (config.showOrigin) {
      const x = mmToDots(config.originX, dpi);
      const y = mmToDots(config.originY, dpi);
      const originText = config.customOriginText || item.origin || 'صنع في مصر';
      chunks.push(encoder.encode(`TEXT ${x},${y},"0",0,1,1,"${originText}"\n`));
    }

    const printCmd = `PRINT ${qty},1\n`;
    chunks.push(encoder.encode(printCmd));
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
