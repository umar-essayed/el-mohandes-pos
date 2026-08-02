import { BarcodeConfig, BarcodePrintItem } from '../types';

/**
 * GOLDEN STANDARD BARCODE PRESET (42.5 mm x 25.0 mm)
 * Technical Reference Specs
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
  storeY: 5.4,
  storeFontSize: 22,

  nameX: 20.7,
  nameY: 9.2,
  nameFontSize: 20,

  barcodeX: 9.7,
  barcodeY: 11.1,
  scaleWidth: 2,
  scaleHeight: 49,
  showText: true,

  priceX: 4.8,
  priceY: 20.3,
  priceFontSize: 23,

  originX: 30.5,
  originY: 23.1,
  originFontSize: 16,

  showStoreName: true,
  showProductName: true,
  showBarcode: true,
  showPrice: true,
  showOrigin: true,

  customStoreName: 'المهندس للاتصالات',
  customOriginText: 'صنع في مصر',
  dpi: 203
};

const LOCAL_STORAGE_KEY = 'elmohandes_barcode_config_v3';

export function loadBarcodeConfig(): BarcodeConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_BARCODE_CONFIG, ...JSON.parse(saved) };
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
