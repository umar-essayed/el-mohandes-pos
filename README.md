# 📱 نظام المهندس لإدارة المحلات ونقطة البيع (El-Mohandes POS)

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?style=for-the-badge&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)
![Dexie](https://img.shields.io/badge/Offline_First-Dexie.js-FF6B6B?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)

**نظام متكامل وعصري لإدارة محلات الهواتف المحمولة، الإكسسوارات، الصيانة، والمحافظ الرقمية**

🌐 **رابط المعاينة المباشر على Vercel:** [https://el-mohandes-pos.vercel.app](https://el-mohandes-pos.vercel.app)

</div>

---

## 🌟 أبرز مميزات النظام (Features)

### 🛒 1. نقطة البيع والسحب السريع (POS)
- **بيع الهواتف برقم الـ IMEI**: تتبع كامل لكل هاتف (جديد / مستعمل) مع تسجيل بيانات البائع والرقم القومي للهواتف المستعملة.
- **بيع الإكسسوارات بقارئ الباربود**: إضافة فورية وتحديث تلقائي لقطع المخزون.
- **حاسبة المدفوع كاش والباقي للزبون**: إظهار المبلغ المتبقي للزبون تلقائياً لتفادي الأخطاء.
- **اختصارات الكيبورد لكاشير محترف**:
  - `F2`: التركيز على حقل البحث/الباربود.
  - `F4`: إتمام البيع وطباعة الفاتورة.
  - `F8`: تفريغ السلة.
  - `Enter`: إضافة المنتج فوراً بمجرد مطابقة الباربود أو الـ IMEI.
- **أنواع دفع متعددة**: كاش، محفظة إلكترونية، أو تسجيل بالآجل.
- **دعم التبديل (Trade-In)**: خصم قيمة جهاز قديم مبدل من إجمالي الفاتورة.
- **طباعة الفواتير الحرارية**: توافق تام مع طابعات الفواتير الحرارية (80mm و 58mm) A4/A5.

### 🔧 2. قسم إدارة الصيانة (Maintenance Management)
- استلام أجهزة الأعطال مع تسجيل رقم التذكرة، العطل، ورمز قفل الشاشة (Passcode)، والعربون المدفوع.
- **إرسال رسائل واتساب مباشرة (💬 WhatsApp Integration)**: إبلاغ الزبون بنقرة واحدة بحالة جهازه (`جاهز للتسليم` / `جارٍ الإصلاح` / `قيد الفحص`).
- طباعة إيصال استلام صيانة مخصص للزبون ولصقة الجهاز.

### 📲 3. إدارة المحافظ الرقمية (Vodafone Cash, InstaPay, etc.)
- دعم كافة الشبكات: فودافون كاش، إنستا باي، أورنج كاش، اتصالات كاش، وي باي، والحسابات البنكية.
- **شريط تقدم بصري للحدود (Visual Limit Progress Bar)**: تتبع استهلاك الحد اليومي والشهري لكل خط.
- حساب تلقائي لعمولة المحل والأرباح الصافية لكل عملية تحويل أو سحب.

### 📋 4. حسابات عملاء الآجل (Credit Customers)
- فتح حسابات آجل لكل عميل وتحديد حد ائتماني أقصى (Credit Limit).
- تتبع الديون والسدادات السابقة وإجمالي المتبقي.
- ربط الفواتير الصادرة بالآجل بحساب العميل مباشرة.

### ⏰ 5. إدارة الورديات والجرد (Shift Reconciliation)
- نظام ورديات صارم يضمن عدم تنفيذ مبيعات إلا بعد افتتاح الشيفت.
- **حاسبة فئات النقدية (🧮 Denomination Breakdown Calculator)**: إدخال عدد الورقيات (200ج، 100ج، 50ج، 20ج...) لحساب الكاش الفعلي بالدرج تلقائياً ومطابقته مع الكاش المتوقع وإظهار أي عجز أو زيادة.

### 📊 6. لوحة التحكم والتقارير المالية (Dashboard & Finance)
- عرض صافي الأرباح اليومية، مبيعات التلفونات مقابل الإكسسوارات، وعمولات المحافظ.
- تسجيل المصروفات اليومية (إيجار، كهرباء، رواتب، إلخ).
- إدارة حسابات الموردين والشركات وتتبع المستحقات والديون.

### ⚡ 7. دعم العمل بدون إنترنت والمزامنة السحابية (Offline-First Sync Engine)
- يعتمد النظام على **IndexedDB (عبر Dexie.js)** للحفظ المحلي السريع، مما يعني استمرار المحل في البيع دون انقطاع حتى لو انقطع الإنترنت.
- مزامنة تلقائية خلفية مع قاعدة بيانات **Supabase** فور عودة الاتصال.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Frontend Framework**: React 19 + TypeScript + Vite 8
- **Local Database**: Dexie.js (IndexedDB)
- **Cloud Backend**: Supabase (PostgreSQL & Realtime Sync)
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Custom Design System with CSS Variables, Dark Mode & Glassmorphism)
- **Deployment**: Vercel

---

## 📂 هيكل المشروع (Project Structure)

```text
المهندس/
├── public/                 # الأيقونات والملفات العامة
├── src/
│   ├── components/         # المكونات الرئيسية للتطبيق
│   │   ├── Auth/           # تسجيل الدخول وتحديد الصلاحيات
│   │   ├── CreditCustomers/# إدارة عملاء الآجل
│   │   ├── Dashboard/      # لوحة التحكم والإحصائيات
│   │   ├── Finance/        # المصروفات وحسابات الموردين
│   │   ├── Header.tsx      # الشريط العلوي وحالة الشيفت والمزامنة
│   │   ├── Inventory/      # إدارة المخزون والإكسسوارات
│   │   ├── Invoices/       # الفواتير المطبوعة والمرتجعات
│   │   ├── Maintenance/    # تذاكر الصيانة والواتساب
│   │   ├── Navigation/     # الملاحة الجانبية والسفلية للموبايل
│   │   ├── POS/            # شاشة البيع السريع والكاشير
│   │   ├── Phones/         # مخزون الهواتف و IMEI
│   │   ├── Printables/     # الفواتير الحرارية القابلة للطباعة
│   │   ├── Settings/       # إعدادات المحل والبين كود
│   │   ├── Shift/          # افتتاح وإغلاق الورديات وحاسبة النقدية
│   │   ├── Sync/           # معالجة تعارض المزامنة
│   │   └── Wallets/        # المحافظ الرقمية وحدود السحب
│   ├── context/            # إدارة الحالة (AppContext & ToastContext)
│   ├── lib/                # إعدادات Dexie و Supabase
│   ├── styles/             # الثيم الرئيسي والتنسيقات (theme.css)
│   ├── types.ts            # جميع أنواع وبنيات البيانات (TypeScript Types)
│   ├── App.tsx             # التخطيط الرئيسي والراوتينج الداخلي
│   └── main.jsx            # نقطة البداية
├── supabase_schema.sql     # مخطط قاعدة البيانات في Supabase
├── vite.config.js          # إعدادات Vite و PWA
└── package.json            # الاعتمادات والمكتبات
```

---

## 💻 التشغيل المحلي (Local Setup)

1. **استคลون المشروع (Clone Repository)**:
```bash
git clone https://github.com/umar-essayed/el-mohandes-pos.git
cd el-mohandes-pos
```

2. **تثبيت الاعتمادات (Install Dependencies)**:
```bash
npm install
```

3. **تشغيل الخادم المحلي (Run Development Server)**:
```bash
npm run dev
```

4. **بناء النسخة الإنتاجية (Build Production Version)**:
```bash
npm run build
```

---

## 🔒 ترخيص وشروط الاستخدام (License)

هذا المشروع مخصص لإدارة المحلات التجارية والشركات بشكل احترافي. جميع الحقوق محفوظة © 2026.
