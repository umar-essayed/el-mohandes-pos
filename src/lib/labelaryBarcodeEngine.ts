import JsBarcode from 'jsbarcode';

export interface LabelParams {
  shopName: string;
  productName: string;
  barcodeValue: string;
  price: string | number;
  originText?: string;
}

/**
 * Calculates dynamic X-axis offset to center a Code 128 barcode horizontally on a 406-dot canvas.
 * Formula: BarcodeWidth = (11 * numChars + 35) * moduleWidth (moduleWidth = 2 dots)
 * X_offset = Math.max(0, Math.round((406 - BarcodeWidth) / 2))
 */
export function calculateBarcodeXOffset(barcodeValue: string, moduleWidth: number = 2, totalDotsWidth: number = 406): number {
  const numChars = barcodeValue ? barcodeValue.length : 10;
  const barcodeWidthDots = (11 * numChars + 35) * moduleWidth;
  return Math.max(0, Math.round((totalDotsWidth - barcodeWidthDots) / 2));
}

/**
 * Generates standardized 2x1 inch ZPL layout code (406 x 203 dots at 8 dpmm / 203 DPI)
 */
export function generateZPLCode(params: LabelParams): string {
  const shopName = params.shopName || 'المهندس للاتصالات';
  const productName = params.productName || 'منتج عام';
  const barcodeValue = params.barcodeValue || '1234567890';
  const priceValue = typeof params.price === 'number' ? `EGP ${params.price}` : params.price || 'EGP 0';

  const barcodeX = calculateBarcodeXOffset(barcodeValue, 2, 406);

  return `^XA
^PW406
^LL203
^LS0

^FX --- Shop Name ---
^FO0,15^FB406,1,0,C^A0N,28,28^FD${shopName}^FS

^FX --- Product Name ---
^FO0,48^FB406,1,0,C^A0N,18,18^FD${productName}^FS

^FX --- Barcode (Code 128, No Internal Text, Centered at X=${barcodeX}) ---
^BY2,2,45
^FO${barcodeX},75^BCN,45,N,N,N^FD${barcodeValue}^FS

^FX --- Barcode Digits Below ---
^FO0,128^FB406,1,0,C^A0N,22,22^FD${barcodeValue}^FS

^FX --- Price ---
^FO0,160^FB406,1,0,C^A0N,32,32^FD${priceValue}^FS

^XZ`;
}

/**
 * Sends a POST request to Labelary REST API to render ZPL into a high-precision 203 DPI PNG image
 * API: POST http://api.labelary.com/v1/printers/8dpmm/labels/2x1/0/
 */
export async function fetchLabelaryPNG(zplCode: string): Promise<Blob> {
  const response = await fetch('https://api.labelary.com/v1/printers/8dpmm/labels/2x1/0/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'image/png'
    },
    body: zplCode
  });

  if (!response.ok) {
    throw new Error(`Labelary API Error: ${response.status} ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * High-Precision Offline HTML5 Canvas Label Renderer for Arabic & Offline Support
 * Canvas size: 406 Dots (Width) x 203 Dots (Height) at 203 DPI (2x1 inch)
 */
export function renderArabicCanvasLabel2x1(params: LabelParams): HTMLCanvasElement {
  const width = 406;
  const height = 203;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Crisp White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  // 2. Shop Name (Centered Y=15, 28px font)
  ctx.font = "bold 26px 'Cairo', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(params.shopName || 'المهندس للاتصالات', width / 2, 12);

  // 3. Product Name (Centered Y=48, 18px font)
  let pName = params.productName || 'منتج عام';
  if (pName.length > 28) pName = pName.substring(0, 27) + '...';
  ctx.font = "bold 17px 'Cairo', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(pName, width / 2, 46);

  // 4. Barcode CODE128 (Y=75, Height=45, Centered)
  if (params.barcodeValue) {
    try {
      const helperCanvas = document.createElement('canvas');
      JsBarcode(helperCanvas, params.barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 45,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });

      const bcW = helperCanvas.width;
      const bcH = helperCanvas.height;
      const bcX = Math.max(0, Math.round((width - bcW) / 2));
      ctx.drawImage(helperCanvas, bcX, 75, bcW, bcH);
    } catch (e) {
      console.warn('JsBarcode canvas error:', e);
    }
  }

  // 5. Barcode Digits Below (Centered Y=125, 20px font)
  ctx.font = "bold 20px 'Roboto', monospace";
  ctx.textAlign = 'center';
  ctx.fillText(params.barcodeValue || '', width / 2, 124);

  // 6. Price (Centered Y=154, 28px font)
  const priceDisplay = typeof params.price === 'number' 
    ? `ج.م ${params.price.toLocaleString('ar-EG')}` 
    : String(params.price || '');
  ctx.font = "900 28px 'Cairo', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(priceDisplay, width / 2, 154);

  return canvas;
}

/**
 * Hybrid Label Generator:
 * Auto-detects Arabic text vs Alphanumeric text.
 * - Arabic text or offline mode -> Renders 406x203 Canvas PNG Data URL immediately (100% offline & pixel-perfect).
 * - Pure Alphanumeric & Labelary enabled -> Calls Labelary API POST for ZPL PNG blob.
 */
export async function generateLabelImage(params: LabelParams, forceLabelary: boolean = false): Promise<string> {
  const hasArabic = /[\u0600-\u06FF]/.test(params.shopName + params.productName + params.price);

  if (!hasArabic && forceLabelary) {
    try {
      const zpl = generateZPLCode(params);
      const blob = await fetchLabelaryPNG(zpl);
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Labelary API failed, falling back to local canvas:', err);
    }
  }

  // Fallback / Primary for Arabic: Local Canvas at 2x1 inch (406x203 px)
  const canvas = renderArabicCanvasLabel2x1(params);
  return canvas.toDataURL('image/png');
}
