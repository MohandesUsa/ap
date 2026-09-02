# اجرای پیش‌نمایش روی سرور

این پوشه همان پیش‌نمایش HTML تأییدشده (با تمام قابلیت‌های تازه: ویجت پلاک ایرانی، حقوق راننده، تسویهٔ تک‌به‌تک با تایید/ویرایش، دورهٔ رایگان و اشتراک، داشبورد جدید) است، آماده برای بالا آوردن روی هر سرور.

`index.html` از نظر فایل کاملاً مستقل است (تمام CSS و JavaScript داخل همان فایل، هیچ Build/npm install لازم نیست) — اما از نظر داده‌ها دیگر مستقل نیست: مثل `admin/admin-preview.html`، این صفحه هم واقعاً به `backend/` وصل می‌شود، پس برای کار کردنش یک نمونهٔ در حال اجرای `backend/` لازم دارید (طبق `../DEPLOY.md`). فقط برای فونت فارسی Vazirmatn هم به اینترنت مرورگر کاربر وصل می‌شود (از Google Fonts).

## روش ۱ — با Docker (پیشنهادی، اگر سرور شما Docker دارد)

```bash
cd web
docker compose up -d --build
```

بعد در مرورگر به آدرس `http://<آی‌پی سرور شما>` بروید. برای توقف: `docker compose down`.

اگر ترجیح می‌دهید بدون Compose:

```bash
cd web
docker build -t truckaccounting-web .
docker run -d -p 80:80 --name truckaccounting-web truckaccounting-web
```

## روش ۲ — بدون Docker، مستقیم با Nginx یا Apache

فقط کافی‌ست `index.html` را در پوشهٔ وب‌سرور کپی کنید:

```bash
# Nginx (مسیر معمول Ubuntu/Debian)
sudo cp index.html /var/www/html/index.html
sudo systemctl reload nginx

# Apache
sudo cp index.html /var/www/html/index.html
sudo systemctl reload apache2
```

## روش ۳ — سریع‌ترین راه برای تست موقت (بدون نصب چیزی خاص)

اگر فقط می‌خواهید سریع روی یک سرور Linux با Python از قبل نصب‌شده امتحان کنید:

```bash
cd web
python3 -m http.server 80
```

⚠️ این روش برای تست موقت خوب است، نه برای استفادهٔ واقعی/طولانی‌مدت (بدون HTTPS، بدون مدیریت ری‌استارت خودکار).

## روش ۴ — هاستینگ رایگان بدون داشتن سرور شخصی

اگر اصلاً سرور ندارید و فقط می‌خواهید یک لینک زنده داشته باشید، `index.html` را می‌توانید مستقیم در یکی از این‌ها بارگذاری کنید (کشیدن‌ورهاکردن فایل کافی‌ست):

- [Netlify Drop](https://app.netlify.com/drop)
- [Vercel](https://vercel.com) (New Project → Deploy → Upload)
- [GitHub Pages](https://pages.github.com) (اگر با Git/GitHub راحت هستید)
- [Cloudflare Pages](https://pages.cloudflare.com)

## اتصال به Backend

از نسخهٔ فعلی به بعد، `web/index.html` واقعاً به `backend/` وصل می‌شود — دیگر داده‌ای در `localStorage` یا دیتابیس مستقلی نگه نمی‌دارد. کافی است در مرورگر باز شود:

```
file:///.../web/index.html?api=http://localhost:3000
```

یا آن را روی هر هاست/Static File Server دیگری قرار دهید (CORS از قبل باز است). اگر `?api=...` را ندهید، پیش‌فرض `http://localhost:3000` است و در همان مرورگر برای دفعات بعد به خاطر سپرده می‌شود (`localStorage` فقط برای همین یک تنظیم و برای Access Token/Device ID استفاده می‌شود، نه برای دادهٔ کامیون/سرویس/هزینه).

## نکات مهم

- این همچنان همان **Prototype UI** است، نه اپلیکیشن Android واقعی — از نظر ظاهر همان جریان کار (Flow) قبلی را دارد، اما حالا هر عملیات (ثبت‌نام/ورود، کامیون‌ها، دعوت راننده، سرویس‌ها، هزینه‌ها، تسویه‌حساب، پرداخت، ویرایش پروفایل) واقعاً یک درخواست HTTP به `backend/` است، دقیقاً همان Endpointهایی که اپ اندروید و `backend/openapi.yaml` مستند می‌کنند.
- ثبت‌نام راننده دیگر «کد دعوت» نمی‌گیرد: صاحب کامیون فقط شمارهٔ راننده را وارد می‌کند، و بعد از ثبت‌نام/ورود راننده با همان شماره، دعوت‌نامه خودش در Dashboard راننده (به‌صورت یک بنر «پذیرفتن») ظاهر می‌شود — همان جریان دومرحله‌ای واقعی Backend (`POST /invitations` → `GET /driver/invitations` → `POST /driver/invitations/:id/accept`)، نه یک کد که مستقیم در فرم ثبت‌نام وارد شود.
- قابلیت «تأیید ورود از گوشی جدید» (Single-Trusted-Device) هم اینجا کامل قابل استفاده است: از منوی «بیشتر» گزینهٔ «ورود از دستگاه جدید» درخواست‌های در انتظار را نشان می‌دهد و امکان تأیید/رد می‌دهد.
- دورهٔ رایگان/اشتراک همچنان یک شبیه‌سازی سمت کلاینت است (دکمهٔ «شبیه‌سازی پایان دورهٔ رایگان» در تنظیمات) — چون خودِ Backend هم فعلاً همیشه `subscriptionStatus: trial` و `trialDaysLeft: 30` برمی‌گرداند (سیستم اشتراک واقعی هنوز ساخته نشده، طبق `backend/README.md`).
- برای HTTPS واقعی (که برای دامنهٔ عمومی توصیه می‌شود)، ساده‌ترین راه Certbot با Nginx یا استفاده از یک ری‌ورس‌پروکسی مثل Caddy/Cloudflare است — اگر خواستید کمک کنم تا آن را هم برایتان تنظیم کنم.
