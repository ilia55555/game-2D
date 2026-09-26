> این سند مربوط به مهاجرت اولیهٔ پنج‌مرحله‌ای VELOCITY است. برای نسخهٔ فعلی شش‌مرحله‌ای AERO، شناسهٔ مدل‌ها و ابزارهای جدید، [راهنمای جاری](AERO-UNITY-START.md) را بخوان.

# راهنمای مهاجرت Unity 2.5D

## معماری و مختصات

پروژهٔ قابل باز کردن با Unity Hub در `Unity/` است. صحنهٔ Main دارای GameApp است؛ پس از انتخاب مرحله WorldSession هندسه، دشمن‌ها، آیتم‌ها، نور و دوربین را از دادهٔ مرحله می‌سازد. اشیای مرحله هنگام Play در Hierarchy قابل بررسی‌اند. چیدمان فعلی داده‌محور است؛ پنج صحنهٔ دست‌چین‌شدهٔ جداگانه برای ویرایش هنری آفلاین تولید نشده است.

- هر ۱۰۰ پیکسل نسخهٔ قبلی برابر ۱ متر در Unity است.
- `xUnity = xGodot / 100`، `yUnity = (620 - yGodot) / 100`.
- پاهای شخصیت روی زمین y=0 و عمق گیم‌پلی Z=0 قرار می‌گیرند.
- دوربین Perspective در Z منفی به سمت +Z نگاه می‌کند و چرخش جانبی آن ثابت است.
- درخت، ساختمان و اجسام پس‌زمینه در Z مثبت قرار می‌گیرند؛ این‌ها Mesh واقعی‌اند.
- برخورد اصلی با CharacterController و Collider سه‌بعدی انجام می‌شود؛ وابستگی به Physics2D وجود ندارد.
- دادهٔ مسیرها در `Assets/Velocity/Resources/Velocity/campaign.json` است. ابزار `tools/export_unity_campaign.py` آن را از نسخهٔ تاریخی `scripts/campaign.gd` تولید می‌کند. اجرای دوبارهٔ ابزار، تغییر دستی JSON را بازنویسی می‌کند.

## وارد کردن مدل‌ها

1. در Blender مقیاس و چرخش را Apply و مدل را همراه Armature و انیمیشن‌ها به FBX خروجی بگیر. تکسچرهای استفاده‌شده را هم تحویل بده.
2. FBX و تکسچرها را در `Unity/Assets/Velocity/Models/` کپی کن؛ استفاده از FBX باعث می‌شود اجرای پروژه به نصب Blender وابسته نباشد.
3. پس از Import، مدل را در یک GameObject با ریشهٔ خالی قرار بده و Prefab بساز. Rigidbody و اسکریپت حرکت روی Prefab بصری نگذار.
4. ریشهٔ Prefab روی کف پا باشد. در حالت نهایی کاراکتر باید به +X نگاه کند. جهت مدل واردشده را با rotation در کاتالوگ اصلاح کن؛ مقیاس منفی لازم نیست.
5. از **Velocity → Select 3D Model Catalog** جایگاه مناسب را پیدا کن و Prefab را به فیلد `prefab` بده. `position`، `rotation` و `scale` برای اصلاح مبدا و اندازه هستند.
6. صحنه را Play کن و هر دو جهت حرکت، زمین‌خوردن، پرش و شلیک را بررسی کن.

| شناسه در کاتالوگ | کاربرد |
|---|---|
| hero | قهرمان |
| crawler / hopper / turret / drone / sentinel | پنج دشمن |
| warden / manta / oracle / titan / varkon | باس مراحل ۱ تا ۵ |
| player_pulse / player_scatter / player_nova | مدل تیر سه سلاح |
| enemy_bolt / boss_bolt | مدل تیر دشمن و باس |
| environment_0 تا environment_4 | تزئینات سه‌بعدی محیط هر مرحله |

کاتالوگ یک دارایی موجود است؛ برای اتصال مدل‌ها نیازی به تغییر کد نیست. جایگاه خالی با حجم موقت سه‌بعدی نمایش داده می‌شود. شیدر پروژه Built-in/Standard است؛ متریال‌های مخصوص URP/HDRP باید به شیدر سازگار تبدیل شوند.

### اندازه و برخورد

ارتفاع کپسول فیزیکی قهرمان ۰٫۶۴ متر و ارتفاع حجم بصری موقت حدود ۰٫۸ متر است. باس‌ها کپسول برخورد ۱٫۵ متری و حجم بصری حدود ۲٫۶ متر دارند. تغییر مقیاس بصری، Collider گیم‌پلی را تغییر نمی‌دهد. اگر مدل نهایی نیاز به Hitbox متفاوت دارد، باید ابعاد در PlayerMotor / EnemyActor / BossActor تنظیم و دوباره آزمایش شوند.

Colliderهای داخل Prefab بصری عمداً غیرفعال می‌شوند تا با کنترلر اصلی تداخل نکنند. برای مدل محیط نیز برخوردها فعلاً توسط سکوهای چیدمان مرحله تأمین می‌شود. وارد کردن FBX محیط به‌تنهایی مسیر قابل بازی را تغییر نمی‌دهد.

### محل خروج تیر

در Prefab شخصیت، یک Transform با نام دقیق **Muzzle** روی نوک لولهٔ اسلحه بساز. می‌تواند فرزند استخوان دست یا اسلحه باشد. تیر از همان نقطه خارج می‌شود و با تغییر جهت کاراکتر همراه آن می‌چرخد. مختصات Z تیر روی صفحهٔ گیم‌پلی صفر می‌شود. اگر Muzzle نباشد از نقطهٔ پیش‌فرض استفاده می‌شود؛ این نقطه برای مدل نهایی باید تنظیم شود.

اگر جلوی لوله دیوار باشد، مبدا تیر به نزدیک‌ترین سطح جلوی سینه محدود می‌شود تا از دیوار عبور نکند. ظاهر فعلی Impact و Trail افکت هندسی است؛ برای افکت نهایی متناسب با مدل و اسلحه باید آرت موردنظر اضافه شود.

### انیمیشن

برای موجودات غیرانسانی از Rig نوع Generic استفاده کن؛ Humanoid فقط وقتی مناسب است که ساختار استخوان‌بندی واقعاً انسانی باشد. Animator Controller را به Prefab بده. Root Motion در زمان اجرا خاموش است و حرکت را کنترلر بازی تعیین می‌کند.

| پارامتر اختیاری Animator | نوع | کاربرد |
|---|---|---|
| Speed | Float | سرعت افقی |
| VerticalSpeed | Float | سرعت عمودی |
| Grounded | Bool | روی زمین |
| Crouching | Bool | نشستن |
| Dashing | Bool | دش |
| Shielded | Bool | دفاع باس |
| Jump / Dash / Fire / Hurt / Death | Trigger | حالات قهرمان |
| Telegraph / Attack / Slam / Special | Trigger | حمله و هشدار دشمن و باس |

نبود پارامتر باعث خطای Animator نمی‌شود؛ فقط انیمیشن مربوط اجرا نمی‌شود. کلیپ‌های واقعی و Controller نهایی هنوز ارائه نشده‌اند. منطق آسیب مستقل از انیمیشن اجرا می‌شود؛ هنگام اتصال کلیپ‌ها طول آماده‌سازی/ضربه را با پنجره‌های زمانی کد تطبیق بده.

## سیستم‌ها و تغییرات عمدی

| نسخهٔ Godot | Unity |
|---|---|
| main.gd / hud.gd | GameApp |
| game_state.gd | SaveStore |
| campaign.gd | CampaignData + campaign.json |
| level.gd | WorldSession |
| player.gd | PlayerMotor |
| hero_rig.gd / sprite sheets | ActorVisual + ModelCatalog + Animator |
| enemy.gd / boss.gd | EnemyActor / BossActor |
| terrain.gd | PlatformMotion + سه‌بعدی شدن هندسه |
| mechanism.gd / pickup.gd | WorldItem |
| projectile.gd | Projectile با SphereCast و بررسی هم‌پوشانی مبدا |
| backdrop.gd | Meshهای عمقی و SideCamera |
| audio.gd | GameAudio |

باس در حالت Recover همیشه دفاع دارد و رنگ آبی/پارامتر Shielded آن را نشان می‌دهد؛ دیگر به وجود Sprite Sheet وابسته نیست. حملهٔ کوبیدن زمین تا رسیدن به زمین فعال می‌ماند. موسیقی فعلاً مستقیم تعویض می‌شود و کراس‌فید نسخهٔ Godot منتقل نشده است. منوی فعلی برای عملکرد و تست است؛ بازسازی هنری نهایی UI انجام نشده است.

## ذخیره

`velocity_unity_save.json` در `Application.persistentDataPath` ذخیره می‌شود. نوشتهٔ موقت، بازخوانی، جایگزینی فایل و نسخهٔ `.bak` دارد. خطا در UI نشان داده می‌شود و دکمهٔ Retry save موجود است. رکورد و مرحله‌های بازشده ذخیره می‌شوند؛ چک‌پوینت مثل نسخهٔ قبلی فقط در نوبت جاری بازی است. ذخیرهٔ قبلی Godot خودکار مهاجرت نمی‌کند.

## منابع فنی

- [نسخهٔ هدف Unity 6000.6.2f1](https://unity.com/releases/editor/whats-new/6000.6.2f1)
- [CharacterController.Move](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/CharacterController.Move.html)
- [Input System 1.17](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.17/manual/Installation.html)

