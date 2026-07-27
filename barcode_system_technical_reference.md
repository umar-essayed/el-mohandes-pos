# الدليل الفني الشامل لنظام محرك تصميم وطباعة ملصقات الباركود الحرارية
## (Universal Barcode Label Editor & TSPL Direct Printing Engine Reference)

> **ملاحظة:** هذا المستند عبارة عن مرجع فني ونظري وتنفيذي مجرد من أي أسماء تجارية أو روابط بتطبيق محدد، صُمّم ليكون مرجعاً هندسياً جامعاً عند بناء أي نظام كاشير أو إدارة مخازن أو نقطة بيع (POS) باستخدام أي بيئة برمجة (Tech Stack) سواء كانت تطبيقات مكتبية (Electron/Desktop)، أو ويب (Web POS)، أو جوال (Mobile POS)، أو سيرفر خلفي (Backend Microservices).

---

## 1. الفلسفة المعمارية للنظام (Architecture & Core Concept)

يتكون نظام طباعة ملصقات الباركود الاحترافي من طبقتين فصل تامتين بين العرض البصري والأمر الفيزيائي:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   1. WYSIWYG Designer Engine (React/Canvas)           │
│  - أبعاد الورق والمسافات البينية بالمليمتر (mm)                         │
│  - شبكة إرشادات المعاينة اللحظية 2mm Grid Canvas                     │
│  - محرر سحب وإفلات العناصر (Drag & Drop Component Layer)               │
│  - تحكم في أبعاد الخطوط ومواضع العناصر وحجم شريط الباركود            │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              2. TSPL Binary Compiler & Vector Renderer                 │
│  - تحويل النصوص والرسومات لـ 1-Bit Packed Monochrome Bitmap            │
│  - توليد أوامر TSPL 2 المباشرة بأعلى دقة نقطية (Sub-pixel vector)     │
│  - تجميع الملصقات المتعددة في Stream باينري واحد فائق السرعة          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 3. Direct Hardware Raw Spooler                         │
│  - إرسال البيانات المباشرة بدون حوار طباعة المتصفح (Silent Printing)   │
│  - دعم منفذ USB المباشر، WinSpool Raw، TCP Socket 9100، أو WebUSB     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. المكتبات والأدوات المستخدمة (Tech Stack & Libraries)

| المكون | المكتبة / الأداة | الوظيفة والهدف |
| :--- | :--- | :--- |
| **واجهة المحرر البصري** | `HTML5 Canvas API` + `React` | رسم المعاينة الحية وإظهار خطوط الهوامش والشبكة بدقة 203 DPI. |
| **توليد خطوط الباركود** | `JsBarcode` | تشفير النصوص إلى رموز CODE128 وحساب الأبعاد الخفية للخطوط. |
| **محرك الأيقونات** | `Lucide React` | إمداد الواجهة بأيقونات التحكم في الإعدادات والقفل والطباعة. |
| **التحويل الباينري** | `Uint8Array` + `TextEncoder` | تحويل نصوص الأوامر والصور إلى مصفوفات بايتس باينري لمنفذ الطابعة. |
| **محرك الطباعة المباشر** | `PowerShell WinSpool` / `Raw Socket` | إرسال البايتس مباشرة لدرك الطابعة (Spooler Subsystem) دون تعريفات وندوز المعقدة. |

---

## 3. الأبعاد القياسية الموصى بها ومعادلات التحويل (Dimensions & DPI Math)

### أ. الإعدادات الافتراضية الذهبية للتطبيق (Registered Best Practices Preset)
تعتبر أبعاد **42.5 مم × 25 مم** هي المعيار الذهبي الموصى به لملصقات الباركود في معظم قطاعات التجزئة والمخازن:

* **عرض الملصق (Width):** `42.5 mm`
* **ارتفاع الملصق (Height):** `25.0 mm`
* **الفجوة البينية بين الملصقات (Gap):** `1.0 mm`
* **الهامش العلوي (Top Margin):** `0.6 mm`
* **الهامش السفلي (Bottom Margin):** `0.5 mm`
* **الهامش الأيسر (Left Margin):** `0.4 mm`
* **الهامش الأيمن (Right Margin):** `0.5 mm`

#### المواضع والمقاسات الافتراضية للعناصر (عربياً ولاتينياً):
```json
{
  "widthMm": 42.5,
  "heightMm": 25.0,
  "gap": 1.0,
  "marginTop": 0.6,
  "marginBottom": 0.5,
  "marginLeft": 0.4,
  "marginRight": 0.5,

  "storeX": 20.6,
  "storeY": 5.4,
  "storeFontSize": 22,

  "nameX": 20.7,
  "nameY": 9.2,
  "nameFontSize": 20,

  "barcodeX": 9.7,
  "barcodeY": 11.1,
  "scaleWidth": 2,
  "scaleHeight": 49,
  "showText": true,

  "priceX": 4.8,
  "priceY": 20.3,
  "priceFontSize": 23,

  "originX": 30.5,
  "originY": 23.1,
  "originFontSize": 16,

  "showStoreName": true,
  "showProductName": true,
  "showBarcode": true,
  "showPrice": true,
  "showOrigin": true
}
```

---

### ب. معادلات تحويل وحدات المليمتر إلى النقاط (mm to Dots Math)

تتعامل الطابعات الحرارية بنواة النقاط (Dots). لحساب البكسل أو النقاط المناظرة بالمليمتر:

$$\text{Dots} = \text{Math.round}\left( \frac{\text{mm} \times \text{DPI}}{25.4} \right)$$

* **عند دقة 203 DPI (وهي الشائعة بنسبة 90% للطابعات الحرارية):**
  $$\text{Dots/mm} = \frac{203}{25.4} = 8 \text{ dots/mm}$$
  * مثال: ملصق بعرض $42.5\text{ mm} \times 8 = 340\text{ dots}$.
  * ارتفاع $25\text{ mm} \times 8 = 200\text{ dots}$.

* **عند دقة 300 DPI:**
  $$\text{Dots/mm} = \frac{300}{25.4} \approx 11.81 \text{ dots/mm}$$
  * ملصق بعرض $42.5\text{ mm} \times 11.81 = 502\text{ dots}$.

* **عند دقة 600 DPI:**
  $$\text{Dots/mm} = \frac{600}{25.4} \approx 23.62 \text{ dots/mm}$$

---

### ج. جدول مقاسات الباركود الشائعة عالمياً وتكييفها

| أبعاد الملصق (عرض×ارتفاع) | الاستخدام الشائع | عُرض شريط الباركود الموصى به | ارتفاع شريط الباركود (Dots) |
| :--- | :--- | :--- | :--- |
| **42.5 × 25 مم** *(الافتراضي)* | قطع الغيار، الملابس، الإكسسوارات | 2 Dots | 45 - 50 Dots |
| **40 × 25 مم** | الصيدليات والتموينات الصغرى | 2 Dots | 40 - 45 Dots |
| **50 × 25 مم** | محلات الأجهزة والمتاجر العامة | 2 Dots | 50 Dots |
| **50 × 30 مم** | المنتجات الغذائية والمصانع | 2-3 Dots | 60 - 70 Dots |
| **58 × 40 مم** | الموازين الكترونية وملصقات اللحوم | 3 Dots | 80 - 100 Dots |
| **100 × 150 مم** | بوليصات الشحن (Shipping Labels) | 4 Dots | 150 - 200 Dots |

---

## 4. شرح المحرر البصري التفاعلي بالتفصيل (WYSIWYG Barcode Editor Engine)

يتكون المحرر من 3 أجزاء متكاملة:

```
┌────────────────────────┬───────────────────────────────┬─────────────────────────────┐
│   1. قائمة المنتجات   │    2. لوحة المعاينة الحية      │   3. مفتش الأبعاد والتصميم  │
│   (Product Selector)   │   (WYSIWYG Interactive View)  │   (Design & Spec Inspector) │
└────────────────────────┴───────────────────────────────┴─────────────────────────────┘
```

### أ. لوحة المعاينة التفاعلية (WYSIWYG Canvas Box)
* **محاكاة الواقع (Physical Simulation):** يتم تكبير ورقة الملصق بمقدار $6\times$ على الشاشة لإتاحة رؤية مريحة ودقيقة للخطوط والتفاصيل الصغيرة.
* **خطوط الهوامش الإرشادية (Printable Area Boundary):** يظهر مربع أحمر متقطع يحدد حدود طباعة الرأس لتجنب اقتطاع النصوص عند حواف الورقة.
* **شبكة القياس المليمترية (2mm Grid):** رسم شبكة دقيقة بفواصل 2 مم للمساعدة في محاذاة العناصر بصرياً.
* **السحب والإفلات التفاعلي (Interactive Drag & Drop):**
  عند النقر على أي عنصر (اسم المتجر، اسم المنتج، الباركود، السعر، المنشأ) وحركه بالماوس:
  1. يتم حساب حركة الماوس بالبكسل وتحويلها إلى مليمترات بالمعادلة:
     $$\Delta\text{mm} = \frac{\Delta\text{Pixels} \times 25.4}{203 \times \text{ZoomScale}}$$
  2. تحديث قيم `X` و `Y` الخاصة بالمكون فوراً في الكائن `barcodeConfig`.
* **مفتاح قفل/فتح التعديل (Editor Lock Security Toggle):** يمنع تحريك العناصر بالخطأ أثناء الاستخدام اليومي لعمليات الكاشير.
* **إعادة الضبط الموصى بها (Reset to Standard Preset):** زر يرجع جميع القيم بنقرة واحدة إلى المقاسات الذهبية 42.5×25 مم.

---

### ب. لوحة التحكم والإعدادات (Inspector Controls)
1. **قسم الهوامش والأبعاد:** تحكم مباشر بالمليمتر في عرض الورقة، ارتفاعها، الفجوة (Gap)، والهوامش الأربعة.
2. **قسم مفاتيح الظهور (Visibility Toggles):** تفعيل أو إلغاء ظهور أي عنصر بنقر المربع (Checkboxes).
3. **قسم تخصيص الباركود (Barcode Command Inspector):**
   * تحديد سمك خط الباركود (Scale Width: 1 Dot, 2 Dots, 3 Dots, 4 Dots).
   * ارتفاع شريط الباركود (Scale Height in dots).
   * خيار إظهار الأرقام/النص الأسفل الباركود (`showText`).
4. **قسم الخطوط والنصوص (Typography & Coordinates):**
   * إمكانية تغيير حجم خط كل عنصر بالـ Pixels (Store, Product, Price, Origin).
   * إدخال موضع X و Y يدوياً بالمليمتر بدقة $0.1\text{ mm}$.

---

## 5. محرك توليد كود الطباعة TSPL وتحويل الصور (TSPL Compiler & Rasterization)

تعتمد معظم طابعات الباركود الحرارية (TSC, Xprinter, Zebra, Gprinter, Datamax, Honeywell) على لغة **TSPL2**.

### أ. الهيكل الأساسي لأمر TSPL المتولد:

```tspl
SIZE 42.5 mm, 25 mm
GAP 1 mm, 0 mm
DIRECTION 1
CLS
BITMAP 0,0,43,200,0,[MONOCHROME_BITMAP_BYTES]
BARCODE 78,89,"128",49,1,0,2,6,"4000123456"
PRINT 1,1
```

### ب. تحليل خوارزمية التحويل أحادي اللون (Canvas to Monochrome 1-Bit Packed Bitmap)

لتجميع النصوص واللغة العربية على الملصق بأعلى جودة دون الاعتماد على خطوط الطابعة المدمجة التي لا تدعم اللغة العربية في الغالب:

```typescript
function canvasToMonochromeBitmap(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const rgba = imgData.data;

  const widthBytes = Math.ceil(w / 8);
  const packed = new Uint8Array(widthBytes * h);
  packed.fill(255); // تهيئة جميع البايتات باللون الأبيض (0xFF)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];

      // حساب عتبة الإضاءة والشفافية (Luminance Threshold)
      const isBlack = (a < 128) ? false : ((0.299 * r + 0.587 * g + 0.114 * b) < 180);

      if (isBlack) {
        const byteIdx = y * widthBytes + Math.floor(x / 8);
        const bitIdx = x % 8;
        packed[byteIdx] &= ~(1 << (7 - bitIdx)); // تصفير البت (0 يعبر عن حرق حراري أسود)
      }
    }
  }
  return packed;
}
```

### ج. توليد الباركود البرمجي النقطي (Sub-Pixel Native Vector Barcode)
يتم توليد شريط الباركود عبر أمر `BARCODE` المباشر للطابعة وليس كصورة Bitmap، وذلك لضمان سرعة طباعة فائقة وقراءة فورية بأي جهاز قارئ باركود:

```
BARCODE X, Y, "CodeType", Height, HumanReadable, Rotation, Narrow, Wide, "Data"
```
* **X, Y:** موضع الباركود بالنقاط.
* **"128":** نظام التشفير (CODE128 Auto).
* **Height:** ارتفاع الشريط بالنقاط.
* **HumanReadable:** `1` لإظهار الأرقام تحت الباركود، `0` للإخفاء.
* **Narrow:** عرض أقصر خط (1 أو 2 أو 3 Dots).
* **Wide:** عرض أوسع خط (عادة $2\times$ أو $3\times$ من Narrow).

---

## 6. تكييف النظام وبنائه على أي استاك برمجي (Cross-Stack Implementation Guide)

### أ. تطبيقات الويب البحتة (Pure Web Applications / Web POS)

عند بناء نظام الكاشير كـ Web POS يعمل على المتصفح مباشرة، يمكن استغلال الخيارات التالية للطباعة المباشرة دون فتح نافذة المعاينة:

1. **تقنية WebUSB API (طابعات USB مباشرة):**
   ```javascript
   // الاتصال بطابعة الباركود عبر WebUSB
   const device = await navigator.usb.requestDevice({ filters: [] });
   await device.open();
   await device.selectConfiguration(1);
   await device.claimInterface(0);
   
   // إرسال باينري TSPL المجمع مباشرة لنقطة النهاية (Endpoint)
   const tsplBinaryPayload = compileMultipleLabelsToTSPL(labels, config);
   await device.transferOut(endpointNumber, tsplBinaryPayload);
   ```

2. **تقنية Web Serial API (منفذ COM / Serial / USB-to-Serial):**
   ```javascript
   const port = await navigator.serial.requestPort();
   await port.open({ baudRate: 9600 });
   const writer = port.writable.getWriter();
   await writer.write(tsplBinaryPayload);
   writer.releaseLock();
   ```

3. **خادم طباعة محلي خفيف (Local Print Service Agent):**
   تطبيق خلفي صغير بـ Python أو Node.js أو Go يعمل على جهاز الكاشير ويستقبل طلبات الطباعة عبر `WebSocket` أو `HTTP POST http://localhost:9100/print`.

---

### ب. بيئة Node.js / Electron / Desktop

* يتم إرسال البايتات الناتجة عن محرك `TSPLBuilder` مباشرة إلى طابعة الويندوز عبر مكتبة `winspool` أو موديول PowerShell المباشر دون الاعتماد على تعريفات خيار الطباعة الرسومية:
  ```powershell
  # PowerShell Direct WinSpool Raw Byte Transfer Script
  param([string]$PrinterName, [string]$FilePath)
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  # إرسال البايتات لنظام Windows Spooler مباشرة كـ RAW data
  ```

---

### ج. بيئة Python (FastAPI / Flask / Django / PyQt)

```python
import socket

def send_tspl_to_printer(printer_ip: str, port: int, tspl_payload: bytes):
    """إرسال أوامر TSPL مباشرة لطابعة الباركود عبر الشبكة (TCP Port 9100)"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((printer_ip, port))
        s.sendall(tspl_payload)
```

---

### د. بيئة PHP / Laravel

```php
<?php
function printBarcodeTSPL($printerIp, $tsplData) {
    $fp = fsockopen($printerIp, 9100, $errno, $errstr, 10);
    if ($fp) {
        fwrite($fp, $tsplData);
        fclose($fp);
        return true;
    }
    return false;
}
?>
```

---

### هـ. بيئة C# / .NET Framework & .NET Core

```csharp
using System.IO;
using System.Net.Sockets;

public class RawPrinterHelper {
    public static void SendTsplToNetworkPrinter(string ipAddress, int port, byte[] tsplBuffer) {
        using (TcpClient client = new TcpClient(ipAddress, port))
        using (NetworkStream stream = client.GetStream()) {
            stream.Write(tsplBuffer, 0, tsplBuffer.Length);
        }
    }
}
```

---

## 7. ملخص خطوات تكوين وإطلاق محرك الباركود في أي مشروع جديد

1. **الخطوة الأولى:** ثبت مكتبة `jsbarcode` في مشروعك لتشفير أرقام الباركود.
2. **الخطوة الثانية:** اعتمد الأبعاد القياسية الافتراضية ($42.5\text{ mm} \times 25.0\text{ mm}$) كنموذج ابتدائي للملصق.
3. **الخطوة الثالثة:** أنشئ مكون HTML5 Canvas لعرض المعاينة اللحظية مع معادلة التحويل النقطية عند 203 DPI.
4. **الخطوة الرابعة:** اعتمد كلاس `TSPLBuilder` المرفق في هذا المرجع لتوليد مصفوفة `Uint8Array` تحتوي على أوامر `SIZE`, `GAP`, `BITMAP`, `BARCODE`, `PRINT`.
5. **الخطوة الخامسة:** اختر قناة التوصيل المناسبة للاستاك الخاص بك (WebUSB, Raw Socket TCP 9100, WinSpool Raw) لتفريغ البيانات مباشرة برأس الطباعة الحرارية بلمسة زر واحدة وبسرعة فائقة.

---
*تم إعداد هذا المرجع الفني بواسطة الهندسة المعمارية لأنظمة الكاشير والطباعة الحرارية المباشرة.*
