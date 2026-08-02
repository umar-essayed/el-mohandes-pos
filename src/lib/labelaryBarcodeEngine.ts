/**
 * Labelary ZPL Label Engine
 * POST ZPL → Labelary API → PNG / PDF
 * Label size: 2x1 inch (406 x 203 dots @ 8dpmm / 203 DPI)
 */

export interface LabelParams {
  shopName: string;
  productName: string;
  barcodeValue: string;
  price: string | number;
  originText?: string;
}

const LABELARY_BASE = 'https://api.labelary.com/v1/printers/8dpmm/labels/2x1';

/**
 * Calculates dynamic X-axis offset to center a Code 128 barcode on 406-dot canvas.
 */
export function calculateBarcodeXOffset(
  barcodeValue: string,
  moduleWidth = 2,
  totalDotsWidth = 406
): number {
  const numChars = barcodeValue ? barcodeValue.length : 10;
  const barcodeWidthDots = (11 * numChars + 35) * moduleWidth;
  return Math.max(0, Math.round((totalDotsWidth - barcodeWidthDots) / 2));
}

/**
 * Generates standardized 2×1 inch ZPL code.
 * Uses ^CI28 for UTF-8 Arabic support.
 * Barcode has no internal text (^BCN,45,N,N,N), digits printed separately.
 */
export function generateZPLCode(params: LabelParams): string {
  const shopName    = (params.shopName    || 'المهندس للاتصالات').trim();
  const productName = (params.productName || 'منتج').trim();
  const barcodeVal  = String(params.barcodeValue || '0000000000').trim();
  const priceLabel  = typeof params.price === 'number'
    ? `EGP ${params.price}`
    : String(params.price || 'EGP 0');

  const bcX = calculateBarcodeXOffset(barcodeVal, 2, 406);

  return (
`^XA
^CI28
^PW406
^LL203
^LS0

^FX --- Shop Name (centered) ---
^FO0,15^FB406,1,0,C^A0N,28,28^FD${shopName}^FS

^FX --- Product Name (centered) ---
^FO0,50^FB406,1,0,C^A0N,18,18^FD${productName}^FS

^FX --- Barcode Code128 centered at X=${bcX} ---
^BY2,2,45
^FO${bcX},75^BCN,45,N,N,N^FD${barcodeVal}^FS

^FX --- Barcode digits below ---
^FO0,128^FB406,1,0,C^A0N,22,22^FD${barcodeVal}^FS

^FX --- Price ---
^FO0,162^FB406,1,0,C^A0N,30,30^FD${priceLabel}^FS

^XZ`
  );
}

/**
 * Concatenates multiple ZPL blocks into one multi-label ZPL document.
 * Labelary will render each ^XA...^XZ as a separate page in the PDF.
 */
export function buildMultiLabelZPL(
  items: Array<{ item: any; qty: number }>,
  config: any,
  storeSettings: any
): string {
  const blocks: string[] = [];

  for (const { item, qty } of items) {
    const shopName    = config?.customStoreName || storeSettings?.storeName || 'المهندس للاتصالات';
    const productName = item.title || item.name || 'منتج';
    const barcodeVal  = String(item.barcode || item.id || '0000000000');
    const price       = item.salePrice ?? item.price ?? 0;
    const priceLabel  = `EGP ${price}`;

    const zpl = generateZPLCode({ shopName, productName, barcodeValue: barcodeVal, price: priceLabel });

    for (let i = 0; i < qty; i++) {
      blocks.push(zpl);
    }
  }

  return blocks.join('\n');
}

/**
 * Fetches a single label PNG from Labelary API.
 * POST /v1/printers/8dpmm/labels/2x1/0/
 */
export async function fetchLabelaryPNG(zplCode: string): Promise<Blob> {
  const res = await fetch(`${LABELARY_BASE}/0/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'image/png',
    },
    body: zplCode,
  });
  if (!res.ok) throw new Error(`Labelary PNG error: ${res.status}`);
  return res.blob();
}

/**
 * Fetches ALL labels as a single PDF from Labelary API.
 * POST /v1/printers/8dpmm/labels/2x1/   (no index = all labels)
 * Each ^XA...^XZ in the ZPL becomes one page in the PDF.
 */
export async function fetchLabelaryPDF(multiZpl: string): Promise<Blob> {
  const res = await fetch(`${LABELARY_BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/pdf',
    },
    body: multiZpl,
  });
  if (!res.ok) throw new Error(`Labelary PDF error: ${res.status} ${res.statusText}`);
  return res.blob();
}

/**
 * Fetches a single label PNG as a data URL (for screen preview).
 */
export async function fetchLabelPreviewDataUrl(
  item: any,
  config: any,
  storeSettings: any
): Promise<string> {
  const shopName    = config?.customStoreName || storeSettings?.storeName || 'المهندس للاتصالات';
  const productName = item.title || item.name || 'منتج';
  const barcodeVal  = String(item.barcode || item.id || '0000000000');
  const price       = item.salePrice ?? item.price ?? 0;

  const zpl = generateZPLCode({ shopName, productName, barcodeValue: barcodeVal, price: `EGP ${price}` });
  const blob = await fetchLabelaryPNG(zpl);
  return URL.createObjectURL(blob);
}
