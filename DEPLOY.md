# راهنمای نصب و بالا آوردن روی هاست شخصی

این سند دقیقاً همان کاری را توضیح می‌دهد که باید انجام دهید تا **Backend** و دو رابط وب (`admin/admin-preview.html` و `web/index.html`) را روی هاست خودتان بالا بیاورید و تست کنید. کدهای لازم همه از قبل آماده و تست‌شده‌اند (`backend/README.md`)؛ اینجا فقط مراحل عملیِ نصب روی هاست است.

## چه چیزی را کجا بالا می‌آورید؟

| بخش | چیست؟ | کجا باید اجرا شود؟ |
|---|---|---|
| `backend/` | یک برنامهٔ Node.js که API واقعی می‌دهد و به MySQL/MariaDB وصل می‌شود | جایی که Node.js پیوسته اجرا می‌شود (هاست با Node.js Selector، یا یک VPS) |
| `admin/admin-preview.html` | رابط وب پنل مدیریت — یک فایل HTML ساده که به `backend/` وصل می‌شود | هرجا (حتی یک هاست کاملاً جدا/Static) — کافی است آدرس Backend را بداند |
| `web/index.html` | پیش‌نمایش اپ کاربران (Owner/Driver) — یک فایل HTML ساده که واقعاً به `backend/` وصل می‌شود (مثل `admin-preview.html`) | هرجا (حتی یک هاست کاملاً جدا/Static) — کافی است آدرس Backend را بداند |

نکتهٔ مهم: چون CORS در Backend از قبل کاملاً باز است (`Access-Control-Allow-Origin: *`)، لازم نیست این سه بخش روی یک دامنه/هاست باشند.

## پیش‌نیازها — قبل از هر کاری این‌ها را چک کنید

1. **نسخهٔ Node.js روی هاست شما باید ۲۲.۶ یا بالاتر باشد.** این پروژه فایل‌های TypeScript را مستقیم اجرا می‌کند (بدون مرحلهٔ Build جدا)، که نیاز به این قابلیت داخلی Node 22.6+ دارد. در پنل هاست (بخش «Node.js Selector» یا «Setup Node.js App») لیست نسخه‌های موجود را ببینید.
   - **اگر هاست شما Node 22.6+ ندارد**: مسیر «B: VPS + Docker» پایین همین صفحه را انتخاب کنید (روی VPS خودتان کنترل کامل نسخهٔ Node را دارید).
2. **یک دیتابیس MySQL یا MariaDB** از پنل هاست بسازید (معمولاً بخش «MySQL Databases»/«Database Setup»). یادداشت کنید: نام دیتابیس، نام کاربری، رمز عبور، Host (معمولاً `localhost`)، Port (معمولاً `3306`).
3. دسترسی SSH یا Terminal روی هاست (برای اجرای `npm install` و `npm run migrate`). اگر پنل شما Terminal وب دارد (اکثر DirectAdmin/cPanelها دارند)، همان کافی است.

---

## مسیر A: هاست اشتراکی با DirectAdmin/cPanel (Node.js Selector)

### ۱. آپلود کد

پوشهٔ `backend/` را روی هاست آپلود کنید (با Git، یا با File Manager/آپلود ZIP). مسیر پیشنهادی مثلاً: `/home/USERNAME/truckaccounting-backend`.

اگر Git روی هاست دارید:
```bash
git clone <آدرس ریپازیتوری شما> truckaccounting
cd truckaccounting/backend
```

### ۲. ساخت اپ Node.js در پنل

در DirectAdmin: **Node.js Selector** (یا در cPanel: **Setup Node.js App**) → **Create Application**:
- **Node.js version**: بالاترین نسخهٔ موجود (باید ≥ ۲۲.۶ باشد — پیش‌نیاز بالا را ببینید)
- **Application root**: مسیر پوشهٔ `backend/` که آپلود کردید
- **Application startup file**: `src/index.ts`
- **Application mode**: Production

پنل معمولاً یک دستور مثل `source /home/USERNAME/nodevenv/.../bin/activate` می‌دهد — آن را در ترمینال اجرا کنید تا محیط Node فعال شود، بعد داخل همان پوشه بمانید.

### ۳. نصب پکیج‌ها

```bash
cd backend
npm install --omit=dev
```

### ۴. ساخت فایل `.env`

```bash
cp .env.example .env
```

سپس `.env` را با یک ویرایشگر (یا از File Manager) باز کنید و مقادیر زیر را **واقعاً** پر کنید:

```bash
# این سه خط را اجرا کنید و خروجی هرکدام را در فایل .env جایگزین مقدار نمونه کنید
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # → JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # → JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # → ADMIN_JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # → ENCRYPTION_KEY (باید دقیقاً ۶۴ کاراکتر Hex باشد)
```

و `DATABASE_URL` را با اطلاعات دیتابیسی که در پیش‌نیازها ساختید پر کنید:

```
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME
```

`PORT` را طبق چیزی که پنل Node.js Selector به شما داده (یا خودش مدیریت می‌کند) تنظیم کنید — در بیشتر پنل‌ها این را پنل خودش پشت یک Reverse Proxy می‌گذارد و نیازی به تغییر دستی نیست.

### ۵. اجرای Migration و ساخت اولین ادمین

```bash
npm run migrate
node scripts/create-admin.ts 09120000001 "یک-رمز-عبور-قوی" "نام شما" SUPER_ADMIN
```

خروجی این دستور یک `id` می‌دهد — یعنی حساب Super Admin شما ساخته شد. این شماره موبایل و رمز عبور را برای ورود به `admin-preview.html` استفاده می‌کنید.

### ۶. روشن کردن برنامه

در پنل Node.js Selector دکمهٔ **Restart** (یا **Start App**) را بزنید. اکثر این پنل‌ها برنامه را به‌صورت خودکار روی کرش دوباره بالا می‌آورند — نیازی به PM2/systemd جدا نیست.

### ۷. تست سلامت

آدرسی که پنل به این اپ اختصاص داده (یا زیردامنه‌ای که خودتان تنظیم کردید) را باز کنید:

```bash
curl https://api.your-domain.com/health
# باید برگرداند: {"status":"ok","timestamp":"..."}
```

---

## مسیر B: VPS با Docker (اگر هاست شما Node 22.6+ ندارد یا کنترل کامل می‌خواهید)

```bash
git clone <آدرس ریپازیتوری شما> truckaccounting
cd truckaccounting/backend
cp .env.example .env
```

فایل `.env` را باز کنید و (مثل مسیر A، مرحلهٔ ۴) سه Secret و `ENCRYPTION_KEY` را با دستورهای بالا بسازید. برای `docker compose` نیازی به تغییر `DATABASE_URL` نیست — `docker-compose.yml` خودش یک MySQL کنار Backend بالا می‌آورد و به هم وصل می‌کند (فقط `JWT_SECRET`/`JWT_REFRESH_SECRET`/`ADMIN_JWT_SECRET`/`ENCRYPTION_KEY` را در همان فایل `docker-compose.yml` با مقادیر واقعی جایگزین کنید — مقادیر فعلی فقط برای توسعهٔ محلی‌اند).

```bash
docker compose up -d --build
docker compose exec backend node scripts/create-admin.ts 09120000001 "یک-رمز-عبور-قوی" "نام شما" SUPER_ADMIN
curl http://localhost:3000/health
```

برای دسترسی از اینترنت، یک Reverse Proxy (Nginx یا Caddy) جلوی پورت ۳۰۰۰ بگذارید و روی دامنهٔ خودتان HTTPS (مثلاً با Let's Encrypt/Certbot) فعال کنید — این بخش به تنظیمات دقیق VPS شما بستگی دارد؛ اگر بگویید کدام (Nginx/Caddy) و کدام توزیع لینوکس دارید، دستورهای دقیقش را هم می‌نویسم.

---

## بالا آوردن دو رابط وب

هر دو فایل، فایل‌های ساکن (Static) هستند — کافی است یک‌جا در دسترس مرورگر باشند. ساده‌ترین راه: همان File Manager هاست، در پوشهٔ `public_html` (یا زیرپوشه‌ای مثل `public_html/admin`).

### `admin/admin-preview.html`

بعد از آپلود، آدرسش را با `?api=` به آدرس واقعی Backend خودتان باز کنید (یک‌بار کافی است — در همان مرورگر به خاطر سپرده می‌شود):

```
https://your-domain.com/admin/admin-preview.html?api=https://api.your-domain.com
```

با شماره/رمزی که در مرحلهٔ «ساخت اولین ادمین» ساختید وارد شوید.

اگر می‌خواهید همیشه بدون `?api=` هم درست کار کند، می‌توانید مقدار `DEFAULT_API_BASE` نزدیک بالای تگ `<script>` در همان فایل را مستقیم به آدرس Backend خودتان تغییر دهید، قبل از آپلود.

### `web/index.html`

دقیقاً مثل `admin-preview.html` — بعد از آپلود، آدرسش را با `?api=` به آدرس واقعی Backend باز کنید:

```
https://your-domain.com/web/index.html?api=https://api.your-domain.com
```

یا `DEFAULT_API_BASE` نزدیک بالای تگ `<script>` را قبل از آپلود مستقیم تغییر دهید. ثبت‌نام/ورود، کامیون‌ها، دعوت راننده، سرویس‌ها، هزینه‌ها و تسویه‌حساب همه واقعاً روی همین Backend کار می‌کنند (جزئیات در `web/README.md`).

---

## چک‌لیست تست نهایی

1. `curl https://api.your-domain.com/health` → `{"status":"ok",...}`
2. ثبت‌نام یک کاربر واقعی از طریق API (برای مطمئن شدن از اتصال دیتابیس):
   ```bash
   curl -X POST https://api.your-domain.com/auth/register \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber":"09121110099","password":"test1234","fullName":"تست","role":"owner","deviceId":"smoke-test-1"}'
   ```
   باید یک `accessToken` برگرداند.
3. `admin-preview.html` را باز کنید، با حساب Super Admin وارد شوید، به «کاربران» بروید — باید همان کاربر تستیِ بالا را ببینید.
4. یک پلن اشتراک از داخل همان پنل بسازید (بخش «اشتراک‌ها») — تأیید می‌کند که نوشتن (Write) هم درست کار می‌کند، نه فقط خواندن.
5. `web/index.html` را باز کنید، به‌عنوان صاحب کامیون ثبت‌نام کنید، یک کامیون اضافه کنید و یک راننده دعوت کنید؛ سپس با شماره‌ای که دعوت کردید در همان صفحه (روی مرورگر/دستگاه دیگر) به‌عنوان راننده ثبت‌نام کنید — باید بلافاصله بنر «دعوت‌نامهٔ جدید» را ببینید و بعد از پذیرفتن، به همان کامیون متصل شوید.

## عیب‌یابی رایج

- **`Missing required environment variable: ...`** هنگام بالا آمدن: یکی از مقادیر `.env` (یا در Docker، `docker-compose.yml`) پر نشده — لیست کامل در `backend/.env.example`.
- **خطای اتصال به دیتابیس** (`ECONNREFUSED` یا مشابه): `DATABASE_URL` را دوباره چک کنید — بیشتر هاست‌ها `Host` را `localhost` می‌خواهند، نه IP خارجی.
- **`ER_PARSE_ERROR` یا خطای مشابه هنگام `npm run migrate`**: نسخهٔ MySQL/MariaDB شما خیلی قدیمی است (به `CHECK` نیاز است — حداقل MySQL 8.0.16 یا MariaDB 10.2.1).
- **صفحهٔ `admin-preview.html` می‌گوید «اتصال به Backend برقرار نشد»**: آدرس `?api=` را چک کنید (باید دقیقاً همان آدرسی باشد که `curl .../health` رویش جواب داد، بدون `/` اضافه در انتها).
- **اپ اندروید کاربران/ادمین**: این دو هنوز هیچ‌کدام واقعاً Build/Run نشده‌اند (این محیط توسعه Android SDK نداشت) — نصب/تست آن‌ها با Android Studio روی سیستم خودتان است؛ جزئیات در `README.md` و `admin/README.md`.
