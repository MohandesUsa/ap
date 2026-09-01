# TruckAccounting Admin App

اپلیکیشن مدیریت مرکزی سیستم حسابداری کامیون — یک اپلیکیشن Android **مستقل** از اپ اصلی کاربران (Owner/Driver)، که به همان Backend و همان دیتابیس مرکزی وصل می‌شود.

```
                    ┌─────────────────────┐
                    │   MySQL/MariaDB      │   ← دیتابیس مرکزی (یکی، نه دوتا — Phase A §30)
                    │   Central Database   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │       Backend       │   ← همان backend/ پروژه (بدون Backend دوم)
                    │      REST API       │
                    └───────┬───────┬──────┘
                            │       │
                 HTTPS      │       │      HTTPS
              ┌─────────────▼─┐   ┌─▼──────────────┐
              │   User App    │   │   Admin App    │   ← این پوشه
              │  (android/)   │   │   (admin/)     │
              │ Owner/Driver  │   │ Super Admin    │
              │               │   │ Admin/Support  │
              │               │   │ Accountant     │
              └───────┬───────┘   └────────┬───────┘
                      │  هیچ‌کدام مستقیم به دیتابیس وصل نمی‌شود — فقط از طریق Backend بالا  │
```

هیچ‌کدام از دو اپ مستقیماً به دیتابیس وصل نمی‌شوند — هر دو فقط از طریق همین یک Backend صحبت می‌کنند.

## وضعیت این فاز — به‌صورت شفاف

| بخش | وضعیت |
|---|---|
| **Backend Admin API + RBAC** | ✅ کامل، ۹۰ تست واقعی (روی SQLite **و** روی MariaDB واقعی نصب‌شده در همین محیط) پاس شدند |
| **admin-preview.html** (Phase 37) | ✅ کامل، تست‌شده با Playwright (۲۷ سناریوی واقعی، صفر خطا) |
| **اپ اندروید Admin** | ⚠️ هر ۱۳ صفحهٔ Phase 34 نوشته شده (ورود، داشبورد، و ۱۱ بخش دیگر با Drawer ناوبری فیلترشده بر اساس Permission) — هرگز Build/Run/تست نشده (این محیط SDK اندروید ندارد) |

جزئیات کامل در پایین همین فایل، بخش «محدودیت‌های شناخته‌شده».

## معماری

- **Backend**: همان `backend/` پروژه (Node.js + TypeScript، بدون فریم‌ورک). ماژول‌های جدید زیر `backend/src/modules/admin-*` و `backend/src/modules/subscriptions` اضافه شدند — هیچ ماژول موجود (auth, trucks, trips, ...) تغییر معماری نداد.
- **Database**: همان MySQL/MariaDB مرکزی (Phase 3.1). یک Migration جدید (`backend/migrations/002_admin.sql`) جدول‌های Admin را اضافه می‌کند؛ هیچ دیتابیس دومی ساخته نشد (طبق قانون ۱۰).
- **Android Admin App**: پروژهٔ Gradle کاملاً مستقل (`admin/android/`) — نه ماژولی داخل `android/` (اپ کاربران). این تصمیم عمدی است: ریسک خراب‌کردن Build اپ کاربران را کاملاً به صفر می‌رساند (هیچ فایل مشترکی بین دو پروژه نیست)، به قیمت کمی تکرار کد (کلاینت شبکه، ذخیره‌سازی توکن) — یک Trade-off صریح، نه غفلت.

## احراز هویت Admin (Phase 3)

Admin App از Login کاربران عادی (`/auth/login`) استفاده **نمی‌کند**. یک مسیر کاملاً جدا:

- جدول `admins` (نه `users`) — شماره موبایل + رمز عبور (هش‌شده با همان الگوریتم scrypt کاربران).
- `POST /admin/auth/login` توکنی امضاشده با `ADMIN_JWT_SECRET` برمی‌گرداند — یک **Secret کاملاً متفاوت** از `JWT_SECRET`/`JWT_REFRESH_SECRET` کاربران عادی. همین تفاوت (نه فقط یک بررسی Role) تضمین می‌کند توکن یک کاربر عادی هرگز روی هیچ `/admin/*` کار نکند: امضای JWT اصلاً تأیید نمی‌شود، پیش از آن‌که هیچ بررسی Role/Permission اجرا شود. تست‌های `backend/test/admin-auth.test.ts` این را در دو جهت (توکن کاربر روی Admin API، توکن Admin روی API کاربر) تأیید می‌کنند.
- هیچ Endpoint عمومی برای «ساخت ادمین» وجود ندارد (یک آسیب‌پذیری همیشگی می‌بود). اولین Super Admin با اسکریپت زیر (اجرای سمت سرور، نه از طریق اپ) ساخته می‌شود:
  ```bash
  cd backend
  node scripts/create-admin.ts 09120000001 "RemzeAmn123" "نام مدیر" SUPER_ADMIN
  ```
  هر ادمین بعدی از طریق `POST /admin/admins` توسط یک Super Admin موجود ساخته می‌شود.

## نقش‌ها و Permissionها (Phase 21/22)

چهار نقش: `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `ACCOUNTANT`. Permissionهای دقیق (لیست کامل Phase 22 + دوتای اضافه‌شده برای اعلان‌ها که در لیست اصلی نبود) در `backend/src/modules/admin-auth/permissions.ts` تعریف شده‌اند.

Permission مؤثر هر ادمین = پیش‌فرض‌های نقش او **∪** هر گرنت اضافه‌ای که یک Super Admin به‌صورت جداگانه به او داده (`admin_permissions` جدول، Phase 21: «Assign Role» + «Assign Permissions» دو چیز جدا). این یعنی یک SUPPORT می‌تواند بدون تغییر نقش، فقط یک Permission اضافه بگیرد.

**نکتهٔ حیاتی امنیتی (Phase 24)**: هر Permission در خودِ Backend، داخل `requirePermission()` (در `admin.middleware.ts`) بررسی می‌شود — نه فقط با مخفی‌کردن یک دکمه در Android. تست‌های `admin-auth.test.ts` دقیقاً همان سناریوهای منفی Phase 29 را پوشش می‌دهند:

```
Normal User → Admin API                     ❌ (تست شد — 401، نه فقط 403)
Admin token → User App API                  ❌ (تست شد — 401)
SUPPORT → Payment Settings                  ❌ (تست شد — 403)
SUPPORT → Admin Management                  ❌ (تست شد — 403)
ACCOUNTANT → SMS Secret Modification        ❌ (تست شد — 403)
ADMIN → Super Admin Actions                 ❌ (تست شد — 403)
SUPER_ADMIN → همه چیز                        ✅ (تست شد — 200)
```

## Secretهای حساس (Phase 25)

API Key ملی‌پیامک و زرین‌پال هرگز به‌صورت متن ساده در دیتابیس ذخیره نمی‌شوند — با AES-256-GCM (`backend/src/security/secretCrypto.ts`) رمزنگاری می‌شوند، با یک کلید جدا (`ENCRYPTION_KEY`) که نه برای JWT و نه برای هش رمز عبور استفاده می‌شود. در پاسخ API هم هرگز مقدار واقعی برنمی‌گردد — فقط Mask شده (`••••••••1234`). تست `admin-settings.test.ts` مستقیماً ردیف خام دیتابیس را می‌خواند و تأیید می‌کند مقدار رمزنگاری‌شده است، نه متن اصلی.

این Secretها هرگز به Android App (نه User App، نه Admin App) ارسال نمی‌شوند — فقط برای Backend، برای صدا زدن واقعی ملی‌پیامک/زرین‌پال به کار می‌روند (`backend/src/modules/admin-settings/providers/`).

## API (Phase 23)

فهرست کامل در `backend/openapi.yaml` نیست (این فایل هنوز فقط Endpointهای User App را مستند می‌کند) — لیست Endpointهای Admin:

```
POST   /admin/auth/login
GET    /admin/auth/me
POST   /admin/auth/logout

GET    /admin/dashboard
GET    /admin/dashboard/growth

GET    /admin/users                          GET    /admin/users/:id
PUT    /admin/users/:id/status
GET    /admin/owners                         GET    /admin/owners/:id
GET    /admin/drivers                        GET    /admin/drivers/:id
GET    /admin/trucks                         GET    /admin/trucks/:id

GET    /admin/subscriptions
GET    /admin/subscription-plans             POST   /admin/subscription-plans
PUT    /admin/subscription-plans/:id
GET    /admin/orders
GET    /admin/payments
GET    /admin/revenue

GET    /admin/settings/sms                   PUT    /admin/settings/sms
POST   /admin/settings/sms/test-connection   POST   /admin/settings/sms/send-test
GET    /admin/settings/payment               PUT    /admin/settings/payment
POST   /admin/settings/payment/test-connection
GET    /admin/settings/system                PUT    /admin/settings/system
GET    /admin/settings/feature-flags         PUT    /admin/settings/feature-flags/:key

GET    /admin/notifications                  POST   /admin/notifications
GET    /admin/audit-logs

GET    /admin/admins                         POST   /admin/admins
PUT    /admin/admins/:id
POST   /admin/admins/:id/permissions         DELETE /admin/admins/:id/permissions/:permission

# --- User App هم این سه‌تا را می‌خواند (بدون نیاز به توکن Admin) ---
GET    /subscription-plans     (Phase 10: قیمت هرگز Hard-Code نمی‌شود)
GET    /system-settings
GET    /feature-flags
```

## متغیرهای محیطی جدید

علاوه بر متغیرهای موجود `backend/.env.example`، این‌ها اضافه شدند:

```bash
ADMIN_JWT_SECRET=...                # باید با JWT_SECRET/JWT_REFRESH_SECRET فرق داشته باشد
ADMIN_ACCESS_TOKEN_TTL_SECONDS=28800   # ۸ ساعت، پیش‌فرض
ENCRYPTION_KEY=...                  # ۶۴ کاراکتر Hex — برای رمزنگاری Secretهای SMS/Payment
```

جزئیات تولید مقدار امن هرکدام در `backend/.env.example` نوشته شده.

## اجرا

```bash
cd backend
npm install
cp .env.example .env    # مقادیر بالا را هم پر کنید
npm run migrate          # هم 001_init.sql هم 002_admin.sql را اجرا می‌کند
node scripts/create-admin.ts 09120000001 "RemzeAmn123" "نام شما" SUPER_ADMIN
npm start
```

### تست‌ها

```bash
npm test                 # همهٔ ۹۰ تست (User App + Admin App + تأیید ورود از گوشی جدید) روی SQLite
TEST_DB=mysql DATABASE_URL="mysql://..." node --test --test-concurrency=1 test/*.test.ts   # روی MySQL/MariaDB واقعی
```

### `admin-preview.html` — رابط وب واقعی (نه دیگر Mock)

از نسخهٔ فعلی به بعد، `admin/admin-preview.html` واقعاً به همین Backend وصل می‌شود (فایل‌های Mock/Phase 37 حذف شدند). کافی است در مرورگر باز شود:

```
file:///.../admin/admin-preview.html?api=http://localhost:3000
```

یا آن را روی هر هاست/Static File Server دیگری قرار دهید (CORS از قبل باز است). اگر `?api=...` را ندهید، پیش‌فرض `http://localhost:3000` است و در همان مرورگر برای دفعات بعد به خاطر سپرده می‌شود (`localStorage`). برای بالا آوردن روی هاست شخصی، `../DEPLOY.md` (ریشهٔ مخزن) را ببینید.

### اپ اندروید

```bash
cd admin/android
# در Android Studio: Open → همین پوشه (نه android/ اپ کاربران)
# API_BASE_URL در app/build.gradle.kts برای Emulator: http://10.0.2.2:3000/
```

## محدودیت‌های شناخته‌شده (صادقانه، طبق قانون ۱۱/۱۲)

- **اپ اندروید Admin هرگز Build/Run نشده**: هر ۱۳ صفحهٔ ناوبری Phase 34 (ورود، داشبورد، Users, Owners, Drivers, Trucks, Subscriptions+Plans, Orders, Payments, Revenue, Notifications, Settings, Audit Logs, Admins) اکنون به‌صورت ViewModel+Screen واقعی نوشته شده‌اند — `AdminApi.kt` تمام Endpointهای Backend را پوشش می‌دهد و نام دقیق فیلدهای JSON (snake_case برای ردیف‌های خام SQL، camelCase برای پاسخ‌های auth/dashboard/plan/revenue) از روی کد واقعی Backend تطبیق داده شده. یک Drawer ناوبری (`AdminDrawerShell`) بر اساس Permissionهای واقعی `/admin/auth/me` صفحات را فیلتر می‌کند. با این‌همه، **هیچ‌کدام کامپایل یا روی دستگاه/شبیه‌ساز اجرا نشده‌اند** — این محیط SDK اندروید ندارد، پس احتمال خطای کامپایل (Import اشتباه، Type Mismatch، وابستگی جاافتاده) در این کد رد نمی‌شود؛ فقط با مرور دستی سازگاری آن با Backend بررسی شده.
- **هیچ Build واقعی (Debug/Release APK) انجام نشد** — نه برای Admin App، نه بررسی مجدد User App. این محیط Android SDK ندارد (همان محدودیت Phase 2 اپ کاربران).
- **اتصال واقعی به ملی‌پیامک/زرین‌پال تأیید نشد** — کد کلاینت (`MeliPayamakProvider`, `ZarinpalProvider`) طبق مستندات عمومی این دو سرویس نوشته شده، اما بدون Credential واقعی قابل تست نبود. Test-connection صادقانه «تنظیم‌نشده» برمی‌گرداند وقتی چیزی ذخیره نشده — هرگز موفقیت ساختگی (طبق قانون ۱۲).
- **بدون Refresh Token برای Admin** — نشست Admin فقط با Access Token ۸ساعته کار می‌کند؛ منقضی که شد، باید دوباره وارد شود. تصمیمی آگاهانه برای کاهش دامنهٔ کار این نشست، نه محدودیت فنی.
- **بدون Push Notification واقعی** — Phase 19 «اعلان‌ها» فقط گیرندگان را Resolve و در دیتابیس ثبت می‌کند؛ ارسال واقعی (FCM یا مشابه) طبق Phase 27 آگاهانه به فاز بعد موکول شده.
- **بدون WebSocket/SSE** — طبق Phase 27، فقط Pull/Refresh پیاده‌سازی شده.
- **هیچ داده یا سفارش/پرداخت واقعی وجود ندارد** — چون هیچ کاربر واقعی اشتراکی نخریده (پروژه هنوز به مرحلهٔ استفادهٔ واقعی نرسیده)، لیست‌های Admin برای Orders/Payments/Revenue به‌درستی خالی/صفر نمایش داده می‌شوند — طبق قانون ۱۱ («هیچ اطلاعات واقعی را Mock یا Fake نکن») عمداً پر نشدند.
