import { BarcodeConfig, BarcodePrintItem } from '../types';

export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  widthMm: 42.5,
  heightMm: 25.0,
  gap: 1.0,
  marginTop: 0.6,
  marginBottom: 0.5,
  marginLeft: 0.4,
  marginRight: 0.5,

  storeX: 20.6,
  storeY: 4.8,
  storeFontSize: 20,

  nameX: 20.7,
  nameY: 8.5,
  nameFontSize: 18,

  barcodeX: 9.7,
  barcodeY: 10.5,
  scaleWidth: 2,
  scaleHeight: 48,
  showText: true,

  priceX: 4.8,
  priceY: 20.5,
  priceFontSize: 22,

  originX: 30.5,
  originY: 23.1,
  originFontSize: 14,

  showStoreName: true,
  showProductName: true,
  showBarcode: true,
  showPrice: true,
  showOrigin: true,

  customStoreName: 'المهندس للاتصالات',
  customOriginText: 'صنع في مصر',
  dpi: 203
};

const LOCAL_STORAGE_KEY = 'elmohandes_barcode_config_v2';

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

      // Luminance & Alpha Threshold
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
 * Compiles barcode items & TSPL config into raw binary commands payload
 */
export function generateTSPLStream(
  items: BarcodePrintItem[],
  config: BarcodeConfig = loadBarcodeConfig()
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const dpi = config.dpi || 203;
  const barcodeXDots = mmToDots(config.barcodeX, dpi);
  const barcodeYDots = mmToDots(config.barcodeY, dpi);

  items.forEach(item => {
    const qty = item.qty || 1;
    const headerStr = 
      `SIZE ${config.widthMm} mm, ${config.heightMm} mm\n` +
      `GAP ${config.gap} mm, 0 mm\n` +
      `DIRECTION 1\n` +
      `CLS\n`;
    chunks.push(encoder.encode(headerStr));

    // If native TSPL Barcode command is enabled
    if (config.showBarcode && item.barcode) {
      const showTextVal = config.showText ? 1 : 0;
      const scaleW = config.scaleWidth || 2;
      const scaleH = config.scaleHeight || 48;

      const barcodeCmd = `BARCODE ${barcodeXDots},${barcodeYDots},"128",${scaleH},${showTextVal},0,${scaleW},${scaleW * 2},"${item.barcode}"\n`;
      chunks.push(encoder.encode(barcodeCmd));
    }

    const printCmd = `PRINT ${qty},1\n`;
    chunks.push(encoder.encode(printCmd));
  });

  // Calculate total length and merge Uint8Arrays
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
 * Direct printing via WebUSB API if browser & thermal USB printer support it
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

    // Find OUT endpoint
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
