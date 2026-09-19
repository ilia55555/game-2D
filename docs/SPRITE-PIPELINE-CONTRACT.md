# قرارداد بازطراحی Sprite Pipeline — مرحله ۱

مبنای این قرارداد شاخه `games` در commit زیر است:

`f08c1d530e16a8fd62812dea196f9240dcb24a48`

این مرحله فقط ساختار فعلی را بررسی و قرارداد اجرای مراحل بعدی را ثبت می‌کند. هیچ منطق گیم‌پلی، فیزیک، مرحله، انیمیشن یا برخورد در این مرحله تغییر نکرده است.

## 1) وضعیت فعلی پروژه

پروژه Godot 4.5 با viewport پایه 1280×720 و physics روی 60Hz است.

### قهرمان
- منطق حرکت و شلیک در `scripts/player.gd`.
- مدل بصری فعلی در `scripts/hero_rig.gd` یک rig چندتکه از SVG است.
- قطعات فعلی شامل body/head/ear/tail/scarf/upper_arm/forearm/thigh/shin/boot/gun هستند.
- دویدن، پرش، فرود، نشستن، dash، recoil و hurt الان به‌صورت runtime transform روی همین قطعات ساخته می‌شوند.
- hitbox مستقل از گرافیک است و باید مستقل بماند.

### دشمن‌ها
انواع فعلی:
`crawler`, `hopper`, `turret`, `drone`, `sentinel`

- بدنه‌ها SVG هستند.
- crawler/hopper/sentinel پاهای SVG جدا دارند.
- drone بال‌های SVG جدا دارد.
- انیمیشن فعلی با rotation/position کدی ساخته می‌شود.
- turret/drone/sentinel امکان شلیک دارند.

### باس‌ها
پنج باس فعلی:
1. Mossback Warden
2. Admiral Manta
3. Prism Oracle
4. Furnace Titan
5. Varkon

- فقط Manta اکنون raster sprite sheet دارد.
- فایل `manta_pixel.png` در حال حاضر ۸ فریم با چینش 4×2 دارد.
- چهار باس دیگر SVG هستند.
- Warden / Titan / Varkon بازوهای SVG جدا دارند.
- سیستم باس پنج attack state منطقی دارد و telegraph / attack / recover / phase 2 را مدیریت می‌کند.

### گلوله و افکت برخورد
- گلوله‌ها asset تصویری ندارند.
- در `scripts/projectile.gd` با `draw_line` و `draw_circle` رسم می‌شوند.
- impact فعلی با burst عمومی از `scripts/effects.gd` ساخته می‌شود.
- بنابراین الان بین ظاهر اسلحه، تیر در هوا و افکت برخورد یک قرارداد گرافیکی واحد وجود ندارد.

### مراحل و ارتفاع
- داده مراحل در `scripts/campaign.gd` است.
- سطح اصلی زمین عمدتاً حوالی y=560..620 است.
- بیشتر مسیرهای بالا حوالی y=280..480 هستند.
- camera فعلی top=-160 و bottom=800 است.
- player در y>900 می‌میرد.
- JUMP فعلی -640 و GRAVITY برابر 1800 است.
- بازی double-jump دارد.

## 2) قرارداد جدید Sprite Sheet

### اصل پایه
هر تصویر animation که وارد بازی می‌شود باید:
- PNG با RGBA واقعی باشد.
- background کاملاً transparent داشته باشد.
- هیچ SVG یا draw-based fallback برای actor/projectile نهایی نداشته باشد.
- pixel-art باشد و با nearest filtering رندر شود.
- هیچ smoothing/interpolation روی texture نداشته باشد.
- فریم‌ها crop مستقل نداشته باشند؛ تمام فریم‌های یک sheet باید canvas یکسان داشته باشند.

### قالب استاندارد
هر sprite sheet جدید دقیقاً ۱۶ فریم دارد:

```
4 columns × 4 rows
frame order: row-major
0  1  2  3
4  5  6  7
8  9 10 11
12 13 14 15
```

عرض و ارتفاع فایل باید هر دو بر 4 بخش‌پذیر باشند.

پیشنهاد اندازه مرجع:
- Hero: هر cell برابر 256×256
- Enemy: هر cell برابر 192×192 یا 256×256
- Boss: هر cell برابر 512×512
- Projectile: هر cell برابر 64×64
- Impact / explosion: هر cell برابر 128×128

این ابعاد قرارداد سخت نیستند؛ loader باید اندازه cell را از خود تصویر محاسبه کند. اما تمام ۱۶ فریم یک فایل باید cell یکسان داشته باشند.

## 3) قرارداد state برای Actorها

### Hero master-16
| Frame | State |
|---:|---|
| 0 | idle A |
| 1 | idle B |
| 2 | run 1 |
| 3 | run 2 |
| 4 | run 3 |
| 5 | run 4 |
| 6 | jump / rise |
| 7 | fall |
| 8 | land |
| 9 | crouch |
| 10 | dash |
| 11 | fire grounded |
| 12 | fire airborne |
| 13 | fire crouched |
| 14 | hurt |
| 15 | death |

در صورت وجود sheet اختصاصی ۱۶فریمی برای یک حرکت، sheet اختصاصی جای master frame را می‌گیرد. بنابراین سیستم باید هم master sheet و هم clip sheet را پشتیبانی کند.

### Enemy master-16
| Frame | State |
|---:|---|
| 0 | idle A |
| 1 | idle B |
| 2..5 | move loop |
| 6..7 | jump / hover loop |
| 8..9 | attack telegraph |
| 10..12 | attack |
| 13 | recover |
| 14 | hurt |
| 15 | death |

برای turret فریم‌های move می‌توانند به idle extension تبدیل شوند. برای drone فریم‌های 6..7 hover هستند.

### Boss master-16
| Frame | State |
|---:|---|
| 0..3 | idle loop |
| 4..5 | telegraph |
| 6 | attack 0 / volley |
| 7 | attack 1 / charge |
| 8 | attack 2 / slam |
| 9 | attack 3 / rain |
| 10 | attack 4 / ring |
| 11..12 | recover |
| 13 | phase-2 pose |
| 14 | hurt |
| 15 | death |

اگر برای attack خاص sheet ۱۶فریمی جدا وجود داشته باشد، همان clip به‌جای master frame استفاده می‌شود.

## 4) قرارداد جهت، anchor و hitbox

- تمام artworkها در source به سمت راست طراحی می‌شوند.
- جهت چپ در runtime فقط با flip افقی انجام می‌شود.
- hitbox هر actor از artwork مستقل می‌ماند.
- تغییر artwork اجازه ندارد اندازه hitbox را ناخواسته تغییر دهد.
- تمام فریم‌های یک actor باید body anchor ثابت داشته باشند.
- برای actorهای زمینی، خط تماس پا با زمین بین همه فریم‌ها ثابت می‌ماند.
- برای actorهای شناور، center/core anchor بین همه فریم‌ها ثابت می‌ماند.
- muzzle point نباید بین فریم‌های fire جابه‌جایی نامنظم داشته باشد.

## 5) قرارداد اسلحه، تیر و برخورد

هدف این است که یک projectile از لحظه خروج از اسلحه تا برخورد، یک هویت تصویری واحد داشته باشد.

هر projectile family باید یک sheet ۱۶فریمی داشته باشد:

| Frames | Meaning |
|---:|---|
| 0..3 | muzzle flash |
| 4..7 | travel loop |
| 8..11 | actor hit |
| 12..15 | wall hit / explosion |

هر شلیک یک `shot_id` دارد. همان `shot_id` تعیین می‌کند:
- muzzle flash
- travel sprite
- actor impact
- wall impact
- رنگ نور و burst مکمل
- اندازه impact

هیچ projectile نباید بعد از برخورد با یک burst عمومیِ نامرتبط جایگزین شود.

خانواده‌های اولیه:
- player_pulse
- player_scatter
- player_nova
- enemy_bolt
- boss_bolt

در صورت نیاز هر باس می‌تواند projectile family مخصوص خودش داشته باشد.

## 6) قرارداد loader و animation runtime

در مرحله ۲ باید یک مسیر واحد برای animation ایجاد شود:
- texture load
- تشخیص cell width/height از 4×4
- frame selection
- fps
- loop / one-shot
- horizontal flip
- state transition
- optional master-sheet fallback
- optional dedicated clip override

هیچ actor نباید برای animation اصلی مستقیماً rotation قطعات SVG یا draw primitive را استفاده کند.

Animation state باید از gameplay state خوانده شود، نه برعکس. یعنی animation حق ندارد فیزیک، hitbox، damage window یا attack timing را تعیین کند.

## 7) قرارداد پرش و طراحی عمودی برای مرحله ۳

هدف stage 3:
- افزایش محسوس ارتفاع پرش.
- ایجاد lower / ground / upper route.
- حرکت واقعی بالا و پایین دوربین.
- حفظ خوانایی میدان نبرد.
- اضافه‌کردن challenge windowهای سخت‌تر بدون ایجاد damage اجتناب‌ناپذیر.

Target اولیه برای tuning:
- first-jump apex حدود 150..170px
- double-jump combined climb حدود 270..320px
- vertical stage range حداقل حدود 900px
- camera limits باید per-stage باشند، نه ثابت برای همه مراحل
- kill floor باید پایین‌تر از پایین‌ترین route مجاز قرار بگیرد
- gap / platform spacing باید با تست فیزیکی واقعی قابل عبور باشد

## 8) قواعد سختی

سختی باید از ترکیب positioning، projectile density، timing و vertical movement ساخته شود؛ نه از hitbox مخفی یا projectile بدون هشدار.

قواعد:
- attack خطرناک telegraph قابل تشخیص داشته باشد.
- بازیکن همیشه حداقل یک مسیر dodge معتبر داشته باشد.
- challengeهای سخت کوتاه و کنترل‌شده باشند.
- checkpoint بعد از چند challenge سنگین فاصله غیرمنطقی نداشته باشد.
- هیچ پرش اجباری خارج از توان واقعی player نباشد.
- dropهای عمودی کور نباشند.

## 9) تست‌های لازم برای مرحله ۴

علاوه بر تست‌های فعلی باید اضافه شود:
- تمام sprite sheetها دقیقاً ۱۶ frame معتبر داشته باشند.
- width و height بر 4 بخش‌پذیر باشند.
- alpha واقعی داشته باشند.
- dynamic actorها از SVG runtime استفاده نکنند.
- animation state هیچ frame خارج از بازه نخواند.
- flip left/right درست باشد.
- projectile family از muzzle تا impact یک `shot_id` واحد حفظ کند.
- point-blank و high-speed collision همچنان سالم بماند.
- jump apex داخل بازه تعیین‌شده باشد.
- تمام mandatory routeها بعد از redesign قابل عبور بمانند.
- camera player را در بالاترین و پایین‌ترین route قطع نکند.
- boss retry همه projectile/animation stateهای قبلی را پاک کند.
- تمام پنج باس و پنج نوع enemy death/hurt/attack animation داشته باشند.

## 10) مرز مرحله ۱

مرحله ۱ فقط قرارداد و audit است.

در این مرحله عمداً تغییر نکرده‌اند:
- `player.gd`
- `hero_rig.gd`
- `enemy.gd`
- `boss.gd`
- `projectile.gd`
- `campaign.gd`
- `level.gd`
- assetهای فعلی

پیاده‌سازی واقعی از مرحله ۲ شروع می‌شود.
