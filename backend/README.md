# TruckAccounting Backend (Phase 3)

REST API روی PostgreSQL برای اپلیکیشن TruckAccounting. TypeScript روی Node.js — بدون هیچ فریم‌ورک HTTP (Express و مشابه)، بدون کتابخانه JWT/bcrypt جداگانه؛ همه چیز (routing، JWT، هش رمز عبور) روی قابلیت‌های داخلی Node ساخته شده تا وابستگی واقعی این پروژه فقط یک پکیج باشد: `pg` (درایور PostgreSQL).

## ⚠️ نکتهٔ صادقانه دربارهٔ نحوهٔ ساخت و تست این بک‌اند

این بک‌اند در محیطی نوشته شد که نه PostgreSQL واقعی داشت، نه Docker، نه دسترسی اینترنت برای `npm install`. برای همین:

- **کل منطق تجاری واقعاً اجرا و تست شد** — نه فقط نوشته شد. از یک انتزاع دیتابیس (`DbClient`) استفاده شده که همان SQL Migration را هم روی PostgreSQL واقعی (`PgClient`, با `pg`) و هم روی SQLite داخلی Node.js (`SqliteClient`, با ماژول `node:sqlite`, فقط برای تست) اجرا می‌کند — یک Schema واحد، نه دو نسخهٔ متفاوت.
- با همین روش، ۴۹ تست واقعی (`node --test`) نوشته و **واقعاً اجرا شدند** و همه پاس شدند — شامل کل فلوی Register→Login→ایجاد کامیون→دعوت راننده→پذیرش دعوت→Dashboard→Logout→Login مجدد (طبق سناریوی §۳۶ شما)، تست‌های امنیتی صریح §۳۵/§۳۷: «Owner A نمی‌تواند کامیون Owner B را ببیند/ویرایش کند»، «راننده B نمی‌تواند دعوت‌نامهٔ راننده A را قبول کند»، «توکن Refresh پس از Rotation قابل استفادهٔ مجدد نیست»، «دعوت‌نامهٔ منقضی/استفاده‌شده قابل قبول نیست»، و — تازه اضافه‌شده — کل موتور حسابداری: ثبت سرویس/هزینه توسط راننده، تنظیم کمیسیون/تسویه توسط صاحب کامیون، محاسبهٔ سهم راننده (درصدی یا حقوق ثابت)، ثبت پرداخت دستی و کاهش مانده، و ایزوله‌بودن این همه بین صاحب‌کامیون‌های مختلف. در حین همین تست‌ها چند باگ واقعی هم پیدا و رفع شد (مثلاً یک Query که یک Placeholder را دوبار استفاده می‌کرد).
- چیزی که **واقعاً اجرا نشد**: خودِ PostgreSQL و Docker، چون در آن محیط وجود نداشتند. یعنی `docker compose up` را من اجرا نکردم — این قدم اول شماست، پایین همین صفحه.

## پیش‌نیازها

- Node.js نسخهٔ ۲۲ یا بالاتر (برای اجرای مستقیم فایل‌های `.ts` بدون نیاز به Build جداگانه)
- Docker + Docker Compose (برای بالا آوردن PostgreSQL + Backend با یک دستور)

## اجرا با Docker (پیشنهادی)

```bash
cd backend
cp .env.example .env   # و JWT_SECRET / JWT_REFRESH_SECRET را با مقادیر واقعی جایگزین کنید
docker compose up --build
```

این کار PostgreSQL و Backend را بالا می‌آورد، Migration را خودکار اجرا می‌کند (`npm run migrate` در فرمان `command` سرویس backend)، و API روی `http://localhost:3000` در دسترس است.

بررسی سلامت:

```bash
curl http://localhost:3000/health
```

## اجرا بدون Docker (محلی)

```bash
cd backend
npm install
cp .env.example .env
# DATABASE_URL را به یک PostgreSQL محلی یا از راه دور اشاره دهید
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

تست‌ها به PostgreSQL یا `.env` نیازی ندارند — هر فایل تست یک نمونهٔ کامل از اپلیکیشن با یک دیتابیس SQLite در حافظه بالا می‌آورد (`test/helpers/testApp.ts`)، دقیقاً همان مسیر کدی که در Production (با PostgreSQL) اجرا می‌شود را صدا می‌زند.

## متغیرهای محیطی

فهرست کامل در `.env.example`. مهم‌ترین‌ها: `DATABASE_URL`، `JWT_SECRET`، `JWT_REFRESH_SECRET` — این سه مورد **باید** قبل از اجرای واقعی (حتی توسعه) با مقادیر واقعی/تصادفی جایگزین شوند؛ مقادیر نمونهٔ داخل `docker-compose.yml` فقط برای راه‌اندازی سریع توسعه‌ای هستند و هرگز نباید در Production استفاده شوند.

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
├── migrations/          فایل‌های SQL، به ترتیب شماره اجرا می‌شوند (Postgres و SQLite هر دو)
├── src/
│   ├── config/           خواندن متغیرهای محیطی
│   ├── db/                DbClient (Interface) + PgClient (تولید) + SqliteClient (تست) + migrate runner
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

بک‌اند فقط به `pg` وابسته است. این یک انتخاب عمدی است، نه محدودیت محیط: JWT، هش رمز عبور، Routing، Rate Limiting — همه چیزهایی هستند که Node به‌صورت داخلی (`node:crypto`, `node:http`) به‌خوبی پشتیبانی می‌کند، و کم‌کردن سطح وابستگی یعنی سطح حملهٔ امنیتی کوچک‌تر و بروزرسانی‌های کمتر برای نگهداری. اگر تیم توسعه ترجیح می‌دهد از Express یا `jsonwebtoken` استفاده کند، تغییر آسان است چون هر بخش پشت یک Interface ساده (`DbClient`, `Router`) قرار دارد.
