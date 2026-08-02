/**
 * Labelary ZPL Label Engine - Full Arabic + Config-Connected
 *
 * Architecture:
 * - Arabic text (shop name, product name, price) → Canvas → 1-bit bitmap → ^GF in ZPL
 * - Barcode → ^BC ZPL command (native, crisp)
 * - Config editor values (mm) → 8dpmm dots for ZPL positioning
 * - Labelary API renders the final combined ZPL → PNG preview / PDF print
 */

export interface LabelParams {
  shopName: string;
  productName: string;
  barcodeValue: string;
  price: string | number;
  originText?: string;
}

const LABELARY_BASE = 'https://api.labelary.com/v1/printers/8dpmm/labels/2x1';
const DPMM = 8; // dots per mm

/** Convert mm → dots at 8dpmm */
const mm2d = (mm: number) => Math.round(mm * DPMM);

// ─────────────────────────────────────────────────────────────────────────────
// Arabic text → ZPL ^GF hex bitmap
// ─────────────────────────────────────────────────────────────────────────────
function renderTextToGFHex(
  text: string,
  fontSizePx: number,
  bold: boolean,
  canvasWidthDots: number,
  align: 'left' | 'center' | 'right' = 'center'
): { hex: string; heightDots: number; widthBytes: number; totalBytes: number } {
  const heightDots = Math.ceil(fontSizePx * 1.5);
  const canvas     = document.createElement('canvas');
  canvas.width     = canvasWidthDots;
  canvas.height    = heightDots;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidthDots, heightDots);

  ctx.fillStyle   = '#000000';
  ctx.textBaseline = 'top';
  ctx.font = `${bold ? '900 ' : '600 '}${fontSizePx}px 'Cairo', sans-serif`;
  ctx.direction   = 'rtl';
  ctx.textAlign   = align;

  const x = align === 'center'
    ? canvasWidthDots / 2
    : align === 'right'
    ? canvasWidthDots - 2
    : 2;

  ctx.fillText(text, x, 2);

  // Convert to 1-bit packed monochrome bitmap (MSB first, ZPL standard)
  const imgData    = ctx.getImageData(0, 0, canvasWidthDots, heightDots);
  const widthBytes = Math.ceil(canvasWidthDots / 8);
  let hex          = '';

  for (let row = 0; row < heightDots; row++) {
    for (let byteIdx = 0; byteIdx < widthBytes; byteIdx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const px = byteIdx * 8 + bit;
        if (px < canvasWidthDots) {
          const i     = (row * canvasWidthDots + px) * 4;
          const luma  = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
          if (luma < 140) byte |= (1 << (7 - bit)); // dark pixel = 1 in ZPL ^GF
        }
      }
      hex += byte.toString(16).padStart(2, '0').toUpperCase();
    }
  }

  const totalBytes = widthBytes * heightDots;
  return { hex, heightDots, widthBytes, totalBytes };
}

/** Builds a ^GF A (graphic field) ZPL command for text at given dot position */
function textToGFCommand(
  text: string,
  xDots: number,
  yDots: number,
  fontSizePx: number,
  bold: boolean,
  widthDots = 406,
  align: 'left' | 'center' | 'right' = 'center'
): string {
  if (!text) return '';
  const { hex, heightDots, widthBytes, totalBytes } = renderTextToGFHex(
    text, fontSizePx, bold, widthDots, align
  );
  // ^GF A,total,total,bytesPerRow,data
  return `^FO${xDots},${yDots}^GFA,${totalBytes},${totalBytes},${widthBytes},${hex}^FS`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Barcode X centering (Code 128)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateBarcodeXOffset(
  barcodeValue: string,
  moduleWidth  = 2,
  totalDots    = 406
): number {
  const n   = barcodeValue ? barcodeValue.length : 10;
  const bcW = (11 * n + 35) * moduleWidth;
  return Math.max(0, Math.round((totalDots - bcW) / 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// ZPL generator: uses Canvas ^GF for Arabic text + ^BC for barcode
// Config values are in mm → converted to 8dpmm dots
// ─────────────────────────────────────────────────────────────────────────────
export function generateZPLCode(params: LabelParams, config?: any): string {
  const shopName    = (params.shopName    || 'المهندس للاتصالات').trim();
  const productName = (params.productName || 'منتج').trim().substring(0, 30);
  const barcodeVal  = String(params.barcodeValue || '0000000000').trim();
  const priceText   = typeof params.price === 'number'
    ? `EGP ${params.price}`
    : String(params.price || 'EGP 0');

  // Canvas size in dots: 2×1 inch @ 8dpmm = 406×203
  const W = 406;

  // Map config (mm) to dots, with sensible defaults
  const storeY    = config ? mm2d(config.storeY    ?? 1.8)  : 15;
  const storeFsz  = config ? Math.round((config.storeFontSize  ?? 20) * 0.8) : 22;
  const nameY     = config ? mm2d(config.nameY     ?? 5.2)  : 50;
  const nameFsz   = config ? Math.round((config.nameFontSize   ?? 16) * 0.8) : 16;
  const barcodeX  = config
    ? mm2d(config.barcodeX ?? 9.7)
    : calculateBarcodeXOffset(barcodeVal, 2, W);
  const barcodeY  = config ? mm2d(config.barcodeY  ?? 9.0)  : 75;
  const bcHeight  = config ? mm2d(config.scaleHeight ?? 45 / DPMM) : 45;
  const bcModW    = config?.scaleWidth ?? 2;
  const priceY    = config ? mm2d(config.priceY    ?? 18.5) : 155;
  const priceFsz  = config ? Math.round((config.priceFontSize  ?? 18) * 0.8) : 18;

  // Build ^GF commands for Arabic text elements
  const storeGF   = textToGFCommand(shopName,    0, storeY,  storeFsz,  true,  W, 'center');
  const nameGF    = textToGFCommand(productName, 0, nameY,   nameFsz,   true,  W, 'center');
  const priceGF   = textToGFCommand(priceText,   0, priceY,  priceFsz,  true,  W, 'center');

  // Barcode digits Y (just below barcode)
  const digitsY   = barcodeY + bcHeight + 4;

  return (
`^XA
^PW406
^LL203
^LS0

^FX --- Shop Name (Arabic ^GF bitmap) ---
${storeGF}

^FX --- Product Name (Arabic ^GF bitmap) ---
${nameGF}

^FX --- Barcode Code128 ---
^BY${bcModW},2,${bcHeight}
^FO${barcodeX},${barcodeY}^BCN,${bcHeight},N,N,N^FD${barcodeVal}^FS

^FX --- Barcode digits below ---
^FO0,${digitsY}^FB406,1,0,C^A0N,18,18^FD${barcodeVal}^FS

^FX --- Price (Arabic ^GF bitmap) ---
${priceGF}

^XZ`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-label ZPL builder (one ^XA...^XZ per copy)
// ─────────────────────────────────────────────────────────────────────────────
export function buildMultiLabelZPL(
  items: Array<{ item: any; qty: number }>,
  config: any,
  storeSettings: any
): string {
  const blocks: string[] = [];

  for (const { item, qty } of items) {
    const shopName    = config?.customStoreName  || storeSettings?.storeName || 'المهندس للاتصالات';
    const productName = (item.title || item.name || 'منتج').substring(0, 30);
    const barcodeVal  = String(item.barcode || item.id || '0000000000');
    const price       = item.salePrice ?? item.price ?? 0;
    const priceText   = `EGP ${price}`;

    const zpl = generateZPLCode(
      { shopName, productName, barcodeValue: barcodeVal, price: priceText },
      config
    );

    for (let i = 0; i < Math.max(1, qty); i++) {
      blocks.push(zpl);
    }
  }

  return blocks.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Labelary API: single label PNG
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchLabelaryPNG(zplCode: string): Promise<Blob> {
  const res = await fetch(`${LABELARY_BASE}/0/`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'image/png' },
    body   : zplCode,
  });
  if (!res.ok) throw new Error(`Labelary PNG ${res.status}: ${res.statusText}`);
  return res.blob();
}

// ─────────────────────────────────────────────────────────────────────────────
// Labelary API: ALL labels as one PDF (no index = all pages)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchLabelaryPDF(multiZpl: string): Promise<Blob> {
  const res = await fetch(`${LABELARY_BASE}/`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/pdf' },
    body   : multiZpl,
  });
  if (!res.ok) throw new Error(`Labelary PDF ${res.status}: ${res.statusText}`);
  return res.blob();
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview: generate ZPL for one item → fetch PNG from Labelary
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchLabelPreviewDataUrl(
  item        : any,
  config      : any,
  storeSettings: any
): Promise<string> {
  const shopName    = config?.customStoreName  || storeSettings?.storeName || 'المهندس للاتصالات';
  const productName = (item.title || item.name || 'منتج').substring(0, 30);
  const barcodeVal  = String(item.barcode || item.id || '0000000000');
  const price       = item.salePrice ?? item.price ?? 0;

  const zpl  = generateZPLCode(
    { shopName, productName, barcodeValue: barcodeVal, price: `EGP ${price}` },
    config
  );
  const blob = await fetchLabelaryPNG(zpl);
  return URL.createObjectURL(blob);
}
