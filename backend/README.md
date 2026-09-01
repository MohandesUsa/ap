# TruckAccounting Backend

REST API روی MySQL/MariaDB برای اپلیکیشن TruckAccounting. TypeScript روی Node.js — بدون هیچ فریم‌ورک HTTP (Express و مشابه)، بدون کتابخانه JWT/bcrypt جداگانه؛ همه چیز (routing، JWT، هش رمز عبور) روی قابلیت‌های داخلی Node ساخته شده تا وابستگی واقعی این پروژه فقط یک پکیج باشد: `mysql2` (درایور MySQL).

## ⚠️ Phase 3.1 — چرا از PostgreSQL به MySQL/MariaDB تغییر کرد

نسخهٔ اول این بک‌اند (Phase 3) روی PostgreSQL بود. مشکل: اکثر هاست‌های اشتراکی (مثلاً پنل‌های DirectAdmin/cPanel رایج) فقط MySQL/MariaDB می‌دهند و PostgreSQL روی آن‌ها اصلاً قابل نصب نیست. برای این‌که این بک‌اند روی چنین هاستی هم واقعاً قابل اجرا باشد، لایهٔ دیتابیس به MySQL/MariaDB تغییر کرد — **هیچ‌چیز دیگری** (API Endpointها، فرمت Request/Response، منطق تجاری، جریان Authentication، اپ Android، پروتوتایپ HTML) تغییر نکرده؛ همه از پشت همان Interface یکسان (`DbClient`) به این تغییر کور هستند.

بزرگ‌ترین ناسازگاری فنی: برخلاف Postgres و SQLite، MySQL از دستور `RETURNING` پشتیبانی نمی‌کند. به‌جای تغییر دادن کد هر Repository (که یعنی دست‌کاری منطق تجاری)، این ناسازگاری کاملاً داخل `src/db/MySqlClient.ts` مخفی و شبیه‌سازی شده — جزئیات و دلیل هر تصمیم (از جمله چرا شبیه‌سازی سادهٔ «یک SELECT بعد از UPDATE» به‌تنهایی برای حالت‌های Race-condition کافی نیست و چطور با قفل ردیف (`FOR UPDATE`) داخل یک Transaction اختصاصی درست شده) در کامنت‌های همان فایل مستند شده است.

## ⚠️ نکتهٔ صادقانه دربارهٔ نحوهٔ ساخت و تست این بک‌اند

- **کل منطق تجاری واقعاً اجرا و تست شد** — نه فقط نوشته شد. از یک انتزاع دیتابیس (`DbClient`) استفاده شده که همان SQL Migration را هم روی MySQL/MariaDB واقعی (`MySqlClient`, با `mysql2`) و هم روی SQLite داخلی Node.js (`SqliteClient`, با ماژول `node:sqlite`, فقط برای تست‌های روزمره) اجرا می‌کند — یک Schema واحد، نه دو نسخهٔ متفاوت.
- ۴۹ تست واقعی (`node --test`) نوشته و **واقعاً اجرا شدند** و همه پاس شدند — هم روی SQLite (مسیر پیش‌فرض `npm test`) **و هم روی یک نمونهٔ واقعی MariaDB 10.11 که در همین محیط نصب و اجرا شد** (`TEST_DB=mysql npm test` — پایین همین صفحه). این شامل کل فلوی Register→Login→ایجاد کامیون→دعوت راننده→پذیرش دعوت→Dashboard→Logout→Login مجدد، تست‌های امنیتی صریح: «Owner A نمی‌تواند کامیون Owner B را ببیند/ویرایش کند»، «راننده B نمی‌تواند دعوت‌نامهٔ راننده A را قبول کند»، «توکن Refresh پس از Rotation قابل استفادهٔ مجدد نیست»، «دعوت‌نامهٔ منقضی/استفاده‌شده قابل قبول نیست»، و کل موتور حسابداری (سرویس/هزینه/تسویه/حقوق راننده/پرداخت) است.
- علاوه بر ۴۹ تست، یک تست جداگانهٔ Concurrency واقعی هم روی MariaDB اجرا شد: ۲۰ درخواست «پذیرش دعوت‌نامه» برای **همان یک دعوت‌نامه**، هم‌زمان (`Promise.all`, نه پشت‌سرهم) فرستاده شد. نتیجه: دقیقاً ۱ مورد موفق (۲۰۰) و ۱۹ مورد رد شد (۴۰۹ «قبلاً استفاده شده»)، و دقیقاً یک رکورد اتصال راننده به کامیون ساخته شد — یعنی رفتار Race-safe که Postgres با یک UPDATE اتمی تضمین می‌کرد، روی MySQL هم با شبیه‌سازی `FOR UPDATE` در `MySqlClient.ts` واقعاً حفظ شده، نه فقط روی کاغذ.
- چیزی که هنوز **واقعاً اجرا نشد**: یک هاست اشتراکی واقعی (DirectAdmin/cPanel) — این محیط فقط اجازهٔ نصب و اجرای MariaDB به‌صورت محلی را داد، نه دسترسی به یک هاست اشتراکی واقعی برای تست نهایی روی زیرساخت هدف. انتظار می‌رود رفتار یکسان باشد (MariaDB با پروتکل MySQL کاملاً سازگار است و اکثر هاست‌ها دقیقاً همین را ارائه می‌دهند)، اما تأیید نهایی روی هاست خودتان با شما است.

## پیش‌نیازها

- Node.js نسخهٔ ۲۲ یا بالاتر (برای اجرای مستقیم فایل‌های `.ts` بدون نیاز به Build جداگانه)
- MySQL 8.0.16+ یا MariaDB 10.2.1+ (حداقل نسخه‌ای که `CHECK` را واقعاً اعمال می‌کند، نه فقط می‌پذیرد و نادیده می‌گیرد) — یا Docker + Docker Compose برای بالا آوردن همه‌چیز با یک دستور

## اجرا با Docker (پیشنهادی)

```bash
cd backend
cp .env.example .env   # و JWT_SECRET / JWT_REFRESH_SECRET را با مقادیر واقعی جایگزین کنید
docker compose up --build
```

این کار MySQL و Backend را بالا می‌آورد، Migration را خودکار اجرا می‌کند (`npm run migrate` در فرمان `command` سرویس backend)، و API روی `http://localhost:3000` در دسترس است.

بررسی سلامت:

```bash
curl http://localhost:3000/health
```

## اجرا بدون Docker (محلی، یا روی هاست اشتراکی)

```bash
cd backend
npm install
cp .env.example .env
# DATABASE_URL را به اطلاعات دیتابیس MySQL/MariaDB خودتان (پنل هاست یا محلی) اشاره دهید
npm run migrate
npm start
```

برای توسعه با Auto-reload:

```bash
npm run dev
```

## اجرای تست‌ها

```bash
npm test
```

پیش‌فرض SQLite است — به هیچ سروری نیاز ندارد؛ هر فایل تست یک نمونهٔ کامل از اپلیکیشن با یک دیتابیس SQLite در حافظه بالا می‌آورد (`test/helpers/testApp.ts`)، دقیقاً همان مسیر کدی که در Production (با MySQL) اجرا می‌شود را صدا می‌زند.

برای اجرای همین ۴۹ تست روی یک MySQL/MariaDB واقعی (همان‌طور که برای تأیید Phase 3.1 انجام شد؛ هر جدول موجود در دیتابیس هدف در ابتدای هر بار اجرا پاک می‌شود، پس فقط از یک دیتابیس یک‌بارمصرف/تستی استفاده کنید):

```bash
TEST_DB=mysql DATABASE_URL="mysql://user:pass@host:3306/db_name" node --test --test-concurrency=1 test/*.test.ts
```

(`--test-concurrency=1` لازم است چون فایل‌های تست به‌صورت پیش‌فرض هم‌زمان اجرا می‌شوند؛ روی SQLite هرکدام دیتابیس In-memory جداگانهٔ خودشان را دارند، ولی روی یک MySQL واقعی و مشترک، اجرای هم‌زمان چند فایل که همه Migration/پاک‌سازی روی همان Schema انجام می‌دهند باعث تداخل می‌شود.)

## متغیرهای محیطی

فهرست کامل در `.env.example`. مهم‌ترین‌ها: `DATABASE_URL` (فرمت `mysql://USER:PASSWORD@HOST:PORT/DATABASE`)، `JWT_SECRET`، `JWT_REFRESH_SECRET` — این سه مورد **باید** قبل از اجرای واقعی (حتی توسعه) با مقادیر واقعی/تصادفی جایگزین شوند؛ مقادیر نمونهٔ داخل `docker-compose.yml` فقط برای راه‌اندازی سریع توسعه‌ای هستند و هرگز نباید در Production استفاده شوند.

## مستندات API

مشخصات کامل OpenAPI در `openapi.yaml`. برای مشاهدهٔ گرافیکی، فایل را در [Swagger Editor](https://editor.swagger.io) باز کنید یا با یک ابزار محلی مثل `npx @redocly/cli preview-docs openapi.yaml` اجرا کنید.

## حساب‌های تست پیشنهادی

برای تست دستی پس از بالا آمدن سرور:

```bash
# ثبت‌نام صاحب کامیون
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"09120000001","password":"test1234","fullName":"صاحب کامیون تست","role":"owner"}'

# ثبت‌نام راننده
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"09120000002","password":"test1234","fullName":"راننده تست","role":"driver"}'
```

پاسخ شامل `accessToken` است؛ آن را در هدر `Authorization: Bearer <token>` برای درخواست‌های بعدی استفاده کنید.

## معماری پوشه‌ها

```
backend/
├── migrations/          فایل‌های SQL، به ترتیب شماره اجرا می‌شوند (MySQL/MariaDB و SQLite هر دو)
├── src/
│   ├── config/           خواندن متغیرهای محیطی
│   ├── db/                DbClient (Interface) + MySqlClient (تولید، شبیه‌سازی RETURNING) + SqliteClient (تست) + migrate runner
│   ├── security/           JWT، هش رمز عبور (scrypt)، توکن‌های تصادفی — همه روی node:crypto
│   ├── errors/             AppError با فرمت استاندارد خطا
│   ├── http/                Router/Server دستی روی node:http + Middleware احراز هویت
│   └── modules/
│       ├── auth/           ثبت‌نام، ورود، Refresh (با Rotation)، خروج
│       ├── profile/        پروفایل Owner/Driver
│       ├── trucks/         CRUD کامیون + بررسی Ownership (Phase 3 §20)
│       ├── invitations/    دعوت راننده، پذیرش (Race-safe)، اتصال Driver-Truck، تنظیم حقوق راننده
│       ├── trips/          ثبت سرویس توسط راننده + تنظیم کمیسیون/تسویه توسط صاحب کامیون
│       ├── expenses/       ثبت هزینه توسط راننده
│       ├── settlement/     محاسبهٔ سهم راننده و مانده بدهی + ثبت پرداخت دستی (موتور حسابداری)
│       ├── dashboard/       خلاصهٔ Owner/Driver
│       └── audit/           ثبت رویدادهای حساس
└── test/                 ۴۹ تست واقعی — همگی با `npm test` اجرا و پاس می‌شوند
```

## چرا این‌قدر کم‌وابستگی؟

بک‌اند فقط به `mysql2` وابسته است. این یک انتخاب عمدی است، نه محدودیت محیط: JWT، هش رمز عبور، Routing، Rate Limiting — همه چیزهایی هستند که Node به‌صورت داخلی (`node:crypto`, `node:http`) به‌خوبی پشتیبانی می‌کند، و کم‌کردن سطح وابستگی یعنی سطح حملهٔ امنیتی کوچک‌تر و بروزرسانی‌های کمتر برای نگهداری. اگر تیم توسعه ترجیح می‌دهد از Express یا `jsonwebtoken` استفاده کند، تغییر آسان است چون هر بخش پشت یک Interface ساده (`DbClient`, `Router`) قرار دارد.
