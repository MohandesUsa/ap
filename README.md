# TruckAccounting

اپلیکیشن اندروید واحد برای مدیریت مشترک بین «صاحب کامیون» و «راننده» — Kotlin، Jetpack Compose، Clean Architecture.

```
TruckAccounting/
├── android/     ← پروژه واقعی Android — اپ کاربران (Owner/Driver), Phase 2 + اتصال به Backend در Phase 3
├── backend/     ← Backend واقعی روی MySQL/MariaDB (Phase 3، دیتابیس در Phase 3.1 عوض شد) — همان Backend به admin/ هم سرویس می‌دهد
├── admin/       ← Admin App مستقل (Super Admin/Admin/Support/Accountant) — README مخصوص خودش را ببینید
├── web/         ← نسخهٔ وب پیش‌نمایش (برای دیدن سریع UI روی سرور، جدا از اپ اندروید)
└── docs/
    ├── ARCHITECTURE.md      ← سند معماری تأییدشدهٔ Phase 1
    └── prototype/index.html ← HTML Prototype تأییدشدهٔ Phase 1 (حذف نشده، طبق قانون ۲۹)
```

---

## ⚠️ یک نکتهٔ مهم دربارهٔ نحوهٔ ساخت این پروژه

**Phase 2 (اپلیکیشن Android):** در محیطی بدون Android SDK نوشته شد — کد کامل است اما هرگز با `./gradlew assembleDebug` واقعاً Build نشد؛ بررسی‌های ایستا (تعادل آکولاد، Importهای تکراری، تطابق Package با مسیر پوشه، تطابق هر `R.string.x` با تعریف واقعی‌اش) روی تمام فایل‌ها انجام شد و بدون خطا بود، اما تأیید نهایی با Android Studio روی دستگاه خودتان است.

**Phase 3 (Backend):** برخلاف Phase 2، این بخش واقعاً **اجرا و تست شد** — این محیط Node.js 22 داشت که می‌تواند فایل‌های TypeScript را مستقیم اجرا کند، و به کمک ماژول داخلی `node:sqlite`، همان کد و همان Migration SQL که برای دیتابیس تولید نوشته شده، اینجا هم واقعاً اجرا شد. نتیجه: **۴۹ تست واقعی نوشته و اجرا شدند و هرکدام پاس شدند** — شامل کل سناریوی Owner→Truck→Invite→Driver→Accept→Dashboard→Logout→Login مجدد، تست‌های امنیتی صریح («Owner A نمی‌تواند کامیون Owner B را ببیند»، «راننده B نمی‌تواند دعوت راننده A را بدزدد»، و غیره)، و کل موتور حسابداری (Phase 4). جزئیات کامل در `backend/README.md`.

**Phase 3.1 (تغییر دیتابیس به MySQL/MariaDB):** دیتابیس تولید از PostgreSQL به MySQL/MariaDB تغییر کرد (دلیل: هاست هدف فقط MySQL/MariaDB می‌دهد). برخلاف Phase 3، این‌بار حتی خودِ دیتابیس واقعی هم در دسترس بود: **MariaDB 10.11 در همین محیط نصب و اجرا شد** و همان ۴۹ تست، این‌بار روی یک دیتابیس MariaDB واقعی (نه فقط SQLite)، دوباره اجرا شدند و پاس شدند — به‌همراه یک تست Concurrency واقعی (۲۰ درخواست هم‌زمان برای پذیرش یک دعوت‌نامه، که دقیقاً یکی موفق شد). جزئیات کامل، از جمله این‌که چرا `RETURNING` (که MySQL ندارد) نیاز به شبیه‌سازی داشت و چطور Race-condition حفظ شد، در `backend/README.md` و `docs/ARCHITECTURE.md` (بخش Addendum).

**قابلیت «تأیید ورود از گوشی جدید» (Single-Trusted-Device):** طبق تصمیم صریح شما، اولین گوشی که با یک شماره ثبت‌نام/ورود می‌کند، گوشی «مورد اعتماد» آن حساب می‌شود. اگر همان شماره از گوشی دیگری وارد شود، بلافاصله Token نمی‌گیرد — یک درخواست در انتظار تأیید ساخته می‌شود که فقط همان گوشیِ فعلاً معتمد می‌تواند تأیید یا رد کند؛ با تأیید، اعتماد به گوشی جدید منتقل می‌شود (پس گوشی قبلی هم برای ورود بعدی نیاز به تأیید پیدا می‌کند). این‌بار هم واقعاً تست شد: **۹۰ تست (۸۴ قبلی + ۶ تست جدید مخصوص همین قابلیت) روی SQLite و روی MariaDB واقعی، هر دو، پاس شدند** — شامل تست تلاش برای تأیید درخواستِ حساب یک نفر دیگر (که باید رد شود). جزئیات در `backend/migrations/003_device_approval.sql` و `backend/src/modules/auth/auth.service.ts`.

**اپ اندروید کاربران (Owner/Driver) هم برای این قابلیت به‌روز شد** — `deviceId` اکنون بخشی الزامی از هر درخواست ثبت‌نام/ورود است (یک UUID که یک‌بار در `DeviceIdentity` ساخته و در EncryptedSharedPreferences نگه داشته می‌شود، مستقل از Logout). حالت «نیاز به تأیید از گوشی دیگر» به‌صورت یک پیام خطای واضح نمایش داده می‌شود؛ رابط کاربری برای «تأیید/رد از گوشی معتمد» هنوز در اپ اندروید ساخته نشده — فعلاً فقط در دو اپ وب (`web/` و `admin/admin-preview.html` از طریق Backend) قابل انجام است. مثل همیشه، این تغییر کد اندروید هم Build/Run واقعی نشده (بدون SDK).

**`admin/admin-preview.html` اکنون واقعاً به همین Backend وصل است** (دیگر Mock/UI-Only نیست) — با Playwright روی یک نمونهٔ واقعی از Backend + MariaDB تست شد (۲۲ سناریوی واقعی: ورود با رمز غلط/درست، دیدن کاربران/صاحبان/کامیون‌های واقعی، ساخت پلن، ارسال اعلان، تست اتصال SMS/Payment که صادقانه «تنظیم‌نشده» برمی‌گرداند، و غیره). `web/` (پیش‌نمایش اپ کاربران) هنوز مثل قبل، مستقل و بر پایهٔ localStorage مرورگر است — به `backend/` وصل نیست.

آنچه در این محیط واقعاً اجرا **نشد**: یک هاست اشتراکی واقعی (DirectAdmin/cPanel) برای تأیید نهایی روی زیرساخت هدف، Docker (برای Backend)، و کل زنجیرهٔ Android (چون SDK وجود نداشت). این مراحل قدم بعدی شماست — راهنمای گام‌به‌گام نصب روی هاست خودتان (هم مسیر DirectAdmin/cPanel، هم مسیر VPS+Docker) در **[`DEPLOY.md`](./DEPLOY.md)** آماده است.

---

## اجرای پروژه در Android Studio

1. **نصب Android Studio** (نسخهٔ Koala یا جدیدتر پیشنهاد می‌شود) از [developer.android.com/studio](https://developer.android.com/studio).
2. پوشهٔ `android/` (نه پوشهٔ ریشهٔ `TruckAccounting/`) را با گزینهٔ **Open** در Android Studio باز کنید.
3. Android Studio به‌طور خودکار Gradle Wrapper را می‌سازد (چون `gradle-wrapper.properties` وجود دارد ولی jar آن نیست) و شروع به Sync می‌کند. اگر خودکار انجام نشد: `File → Sync Project with Gradle Files`.
4. صبر کنید تا دانلود Dependencyها (AndroidX، Compose، Hilt، Room، Retrofit، ...) تمام شود — به اینترنت نیاز دارد.
5. اگر پرامپت SDK/License ظاهر شد، `Accept` را بزنید (نیاز به `compileSdk 34` / `Build-Tools` متناظر).

### اجرا روی Emulator

1. `Tools → Device Manager → Create Device` یک دستگاه مجازی (مثلاً Pixel 8، API 34) بسازید.
2. دکمهٔ ▶ Run را با انتخاب همان Emulator بزنید.

### اجرا روی گوشی واقعی

1. در گوشی: `Settings → About phone` روی «Build number» چند بار بزنید تا Developer Options فعال شود.
2. `Settings → Developer options → USB debugging` را روشن کنید.
3. گوشی را با کابل USB وصل کنید و در دیالوگ گوشی «Allow USB debugging» را تأیید کنید.
4. گوشی در لیست دستگاه‌های بالای Android Studio ظاهر می‌شود؛ ▶ Run را بزنید.

### ساخت Debug APK

- از داخل Android Studio: `Build → Build APK(s)`.
- یا از ترمینال (بعد از این‌که Android Studio یک‌بار Sync را انجام داد و `gradlew` واقعی ساخته شد):
  ```bash
  cd android
  ./gradlew assembleDebug
  ```
  خروجی در `android/app/build/outputs/apk/debug/app-debug.apk` قرار می‌گیرد.

### اجرای تست‌ها

```bash
cd android
./gradlew test              # Unit test های همهٔ ماژول‌ها (JVM، بدون نیاز به Emulator)
./gradlew connectedAndroidTest   # UI/Instrumented test ها (نیاز به Emulator یا گوشی متصل)
```

---

## نسخه‌های استفاده‌شده

| ابزار | نسخه |
|---|---|
| Kotlin | 1.9.24 |
| Android Gradle Plugin | 8.5.2 |
| Gradle | 8.7 (`gradle/wrapper/gradle-wrapper.properties`) |
| Compose BOM | 2024.06.00 |
| Hilt | 2.51.1 |
| Room | 2.6.1 |
| Retrofit | 2.11.0 |
| compileSdk / targetSdk | 34 |
| minSdk | 26 (Android 8.0+) |

همهٔ نسخه‌ها در `android/gradle/libs.versions.toml` متمرکز شده‌اند (Version Catalog) — برای ارتقا فقط همان‌جا را ویرایش کنید.

---

## ساختار ماژول‌ها

```
android/
├── app/                  اپلیکیشن اصلی: Application، MainActivity، Splash، NavHost ریشه
├── core/
│   ├── common/           AppResult/AppError، UiState/UiEvent — بدون وابستگی به Android
│   ├── designsystem/     رنگ‌ها/تایپوگرافی/کامپوننت‌های مشترک — دقیقاً برگرفته از Prototype
│   ├── database/         Room: Entityها، DAOها، AppDatabase + الگوی Migration
│   ├── datastore/        DataStore معمولی (تنظیمات) + EncryptedSharedPreferences (توکن‌ها)
│   └── network/          Retrofit/OkHttp، AuthInterceptor، AuthApi
└── feature/
    ├── auth/             انتخاب نقش، ورود/ثبت‌نام Owner و Driver، FakeAuthRepository
    ├── owner/             Dashboard، کامیون‌ها (با ویجت پلاک ایرانی)، رانندگان
    └── driver/            Dashboard، کامیون من
```

هر Repository پشت یک Interface دامنه‌ای مخفی شده (Clean Architecture)، مطابق Phase 1 §9:
`UI → ViewModel → Repository interface → (Fake یا Room-backed) implementation`.
`FakeAuthRepository` را می‌توان با یک خط تغییر در `AuthModule.kt` با پیاده‌سازی واقعی Retrofit جایگزین کرد، بدون تغییر هیچ Composable یا ViewModel.

---

## چه چیزی در این فاز ساخته نشد (عمداً)

- ❌ سیستم پرداخت واقعی (درگاه بانکی) — ثبت پرداخت در Phase 4 فقط یک رکورد دستی داخلی است، نه اتصال به یک درگاه واقعی.
- ❌ اتصال اپ Android به Endpointهای حسابداری/تسویه/حقوق راننده که در Phase 4 به Backend اضافه شدند — این Endpointها الان واقعاً وجود دارند و تست شده‌اند (پایین همین بخش)، اما Retrofit API + Repository + ViewModel سمت Android هنوز به آن‌ها وصل نشده‌اند؛ `feature/owner/data/DriverRepositoryImpl.kt` هنوز فقط Room محلی است.
- ❌ Sync پیشرفتهٔ Offline کامل (WorkManager) — فقط الگوی Cache-با-تازه‌سازی ساده در TruckRepositoryImpl پیاده شده.

---

## Phase A — Admin App (اپلیکیشن مدیریت مرکزی)

یک اپلیکیشن Android **دوم و مستقل** (`admin/`) برای Super Admin/Admin/Support/Accountant، متصل به همان Backend و همان دیتابیس مرکزی — نه یک اپ یا دیتابیس جدا. جزئیات کامل (معماری، RBAC، Endpointها، محدودیت‌های شناخته‌شده) در `admin/README.md`؛ خلاصه:

- **Backend + RBAC**: کامل و واقعاً تست‌شده — ۹۰ تست (۴۹ اصلی + ۳۵ Admin + ۶ تأیید ورود از گوشی جدید) روی SQLite **و** روی MariaDB واقعی، شامل هر سناریوی منفی امنیتی مشخص‌شده (توکن کاربر روی API ادمین، SUPPORT روی تنظیمات پرداخت، ACCOUNTANT روی Secret پیامک، و غیره) — همه رد شدند، دقیقاً همان‌طور که باید.
- **`admin/admin-preview.html`**: پیش‌نمایش کامل UI (Dashboard، کاربران، اشتراک‌ها، تنظیمات SMS/Payment، Audit Log، مدیریت ادمین‌ها)، تست‌شده با ۲۷ سناریوی Playwright، بدون هیچ Secret واقعی.
- **اپ اندروید Admin**: هر ۱۳ صفحهٔ Phase 34 نوشته شده (ورود، داشبورد، Users, Owners, Drivers, Trucks, Subscriptions, Orders, Payments, Revenue, Notifications, Settings, Audit Logs, Admins) با Drawer ناوبری فیلترشده بر اساس Permission — یک پروژهٔ Gradle کاملاً جدا از `android/` تا هیچ ریسکی برای اپ کاربران نداشته باشد. هرگز Build/Run نشده (بدون Android SDK در این محیط) — جزئیات در `admin/README.md`.

---

## Phase 4 — موتور حسابداری واقعی در Backend

آنچه Phase 3 عمداً Placeholder/صفر گذاشته بود (Phase 3 §27) حالا در `backend/` واقعاً ساخته و تست شده:

- **ثبت سرویس** (`POST /trips`) و **ثبت هزینه** (`POST /expenses`) توسط راننده، همیشه روی کامیونی که راننده الان واقعاً به آن متصل است (نه یک `truckId` دلخواه از کلاینت).
- **تنظیم کمیسیون/تسویه هر سرویس** (`PUT /trips/:id/settlement`) توسط صاحب کامیون — دقیقاً همان کاری که صفحهٔ «تسویه حساب» پروتوتایپ انجام می‌دهد.
- **تعیین نحوهٔ محاسبهٔ حقوق راننده** (`PUT /drivers/:driverId/pay`, درصدی یا حقوق ثابت) — چیزی که در بند بالا به‌عنوان کار نشده در Phase 3 مستند شده بود.
- **خلاصهٔ تسویه** (`GET /owner/settlement/summary`, `GET /driver/settlement/summary`) که سهم راننده، مبلغ قبلاً پرداخت‌شدهٔ مستقیم، و مانده را محاسبه می‌کند؛ و **ثبت پرداخت دستی** (`POST /owner/settlement/payments`) که این مانده را کم می‌کند و اگر مبلغ از مانده بیشتر باشد رد می‌شود.
- همه با ۱۶ تست جدید (جمعاً ۴۹ تست) پوشش داده شده‌اند، شامل ایزوله‌بودن کامل بین صاحب‌کامیون‌های مختلف (Owner B نه می‌تواند حقوق راننده‌ای که مال Owner A است را تغییر دهد، نه خلاصهٔ تسویه‌اش را بخواند).
- نسخهٔ پیش‌نمایش وب (`web/index.html`) هم برای ثبت‌نام/ورود، کامیون‌ها، دعوت راننده، سرویس‌ها، هزینه‌ها و تسویه‌حساب به یک دیتابیس واقعی (مستقل از `backend/`) وصل شده (جزئیات در `web/README.md`).

---

## Phase 3 — اتصال واقعی به Backend

از این فاز به بعد، اپلیکیشن Android به‌جای `FakeAuthRepository`/داده‌های فقط-محلی، واقعاً با `backend/` صحبت می‌کند:

- **Auth**: ثبت‌نام، ورود، خروج، و تازه‌سازی خودکار توکن (با `TokenAuthenticator` — وقتی یک درخواست ۴۰۱ بگیرد، خودش یک‌بار Refresh Token را امتحان می‌کند و درخواست را دوباره می‌فرستد؛ اگر آن هم شکست بخورد، یعنی نشست واقعاً تمام شده).
- **کامیون‌ها**: Room همچنان هست ولی فقط به‌عنوان Cache؛ منبع حقیقت واقعی حالا Backend است.
- **رانندگان و دعوت‌نامه**: دعوت واقعی از Backend کد می‌گیرد؛ راننده حالا یک صفحهٔ واقعی «دعوت‌نامه‌های من» دارد (در Dashboard راننده، بنر بالای صفحه) که می‌تواند دعوت را ببیند و بپذیرد — دقیقاً همان جریانی که در بخش ۴۳ خواسته شده.

برای اتصال Android به یک نمونهٔ در حال اجرای Backend، در `android/core/network/build.gradle.kts` و `android/app/build.gradle.kts` مقدار `API_BASE_URL` را به آدرس واقعی سرورتان (یا `http://10.0.2.2:3000/` برای Emulator که به Backend روی همان کامپیوتر وصل می‌شود) تغییر دهید.

---

## ارتباط با HTML Prototype

`docs/prototype/index.html` طبق قانون ۲۹ حذف نشده و هنوز مرجع رسمی UI/UX است. تفاوت‌های عمدی UI اندروید نسبت به Prototype:

- **Splash**: در Prototype یک صفحهٔ HTML متحرک است؛ در اندروید از SplashScreen بومی سیستم‌عامل (`androidx.core.splashscreen`) استفاده شده که استاندارد و عملکرد بهتری دارد، و همان مدت "Check Session" را پوشش می‌دهد — یک صفحهٔ Compose جداگانه برای Splash ساخته نشد تا Splash دوتایی (native + Compose) ایجاد نشود.
- **فونت Vazirmatn**: در HTML از Google Fonts بارگذاری می‌شد؛ در اندروید فایل فونت باید دستی اضافه شود (توضیح در `Type.kt`) — فعلاً از فونت پیش‌فرض سیستم استفاده می‌شود که فارسی را درست نمایش می‌دهد ولی ظاهر یکسانی با Prototype ندارد.

باقی صفحات (انتخاب نقش، ورود/ثبت‌نام، Dashboard، کامیون‌ها با ویجت پلاک، رانندگان) مستقیماً از روی Prototype پیاده‌سازی شده‌اند.
