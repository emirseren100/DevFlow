# DevFlow — Simülasyon Mülakatlar

> On mülakat. Her biri gerçek bir staj görüşmesi gibi kurgulandı.
>
> **Nasıl çalışılır:** Soruyu oku, cevabı **sesli** ver, sonra üç örnek cevaba
> bak. Kendine 1–5 arası puan ver ve "geliştirme notu"nu uygula. Aynı mülakatı
> bir hafta sonra tekrar et.
>
> Kaynak: [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) ·
> [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md)

## Ortak puanlama cetveli

| Puan | Anlamı |
|---|---|
| **1** | Konuyu tanımıyor ya da yanlış anlatıyor. |
| **2** | Terimi biliyor, ne işe yaradığını açıklayamıyor. |
| **3** | Doğru ve basit bir açıklama yapıyor. |
| **4** | DevFlow'dan somut örnek ve dosya adı veriyor. |
| **5** | Ödünleşimi anlatıyor, devam sorusunu karşılıyor ve sınırı kabul ediyor. |

**Kırmızı bayraklar (her mülakatta geçerli):** ezber cümle, "her satırını elle
yazdım", bilmediğini uydurmak, "bu güvenli çünkü buton gizli", kendi projesinde
dosya adı söyleyememek.

---

# Mülakat 1 — Proje tanıtımı

**Süre:** 20 dk · **Görüşmeci profili:** Teknik ekip lideri, projeyi ilk kez
duyuyor.

### 1.1 "Bana projeni anlat."
- **Başlangıç cevabı:** "İş takip uygulaması. React ve Node kullandım. Kullanıcı
  giriş yapıp issue açabiliyor."
- **Güçlü cevap:** "DevFlow, küçük yazılım ekipleri için bir issue ve sprint
  takip uygulaması. Ekip workspace açıyor, üye ekliyor, proje ve sprint
  oluşturuyor, issue açıyor, Kanban panosunda taşıyor, yorumluyor ve aktivite
  akışından neyin değiştiğini görüyor. Teknik olarak tek repoda iki npm
  workspace: React/TypeScript istemci ve Express/TypeScript API. Veritabanı
  PostgreSQL, erişim Prisma ile. Oturum veritabanında ve HTTP-only cookie'de,
  yetkilendirme her istekte veritabanından okunan workspace rolüne dayanıyor.
  314 test var ve tek origin üzerinden Render'a dağıtıldı."
- **Kötü cevap:** "Jira klonu yaptım." (Tek cümle, hiçbir teknik omurga yok.)
- **Görüşmeci devamı:** "Neden Jira zaten varken?"
- **Geliştirme notu:** 30 saniyeyi geçme. Ne → kim için → teknik omurga.

### 1.2 "Neden bu projeyi seçtin?"
- **Başlangıç:** "Portföyüm için bir şey lazımdı."
- **Güçlü:** "Üç şeyi öğrenmek istedim: gerçek ilişkisel veri modelleme,
  sunucuda ciddi bir yetkilendirme katmanı ve çalıştığını kanıtlayan testler.
  To-do listesi bunların hiçbirini zorlamıyor; çok kullanıcılı ve rol tabanlı bir
  ürün zorluyor."
- **Kötü:** "Yapay zekâ öneri verdi."
- **Devamı:** "Hangi kısmı beklediğinden zor çıktı?"

### 1.3 "En zor teknik problem neydi?"
- **Başlangıç:** "Kanban sürükle-bırak zordu."
- **Güçlü:** "Sürükle-bırak değil, **sıralamanın sahipliği**. İstemcinin
  gönderdiği sıraya güvenirsem elle hazırlanmış bir istek başkasının panosunu
  yeniden dizebilir. Çözüm: istemci yalnızca issue, hedef kolon ve hedef indeks
  gönderiyor; sunucu gerçek sırayı okuyup kartı yerleştiriyor, etkilenen
  kolonları yeniden numaralandırıyor ve hepsini tek `Serializable` transaction
  içinde yazıyor, çakışmada üç kez deniyor."
- **Kötü:** "@dnd-kit dokümantasyonu karışıktı."
- **Devamı:** "İki kişi aynı anda taşırsa?"

### 1.4 "Kaç kişiydiniz?"
- **Güçlü:** "Tek kişilik bir öğrenme projesi. On faza böldüm, her fazın kabul
  kriterleri ve sonunda güncellenen bir durum dosyası var."
- **Kötü:** "Biz…" diye anlatmak.

### 1.5 "Yapay zekâ kullandın mı?"
- **Başlangıç:** "Biraz."
- **Güçlü:** "Evet — iskele kurmada, gözden geçirmede ve daha önce yapmadığım
  kısımlarda. Kararları ben verdim, davranışı ben test ettim; 91 mimari karar
  reddedilen alternatifleriyle birlikte depoda yazılı ve herhangi bir dosyayı
  açıp neden öyle olduğunu anlatabilirim. Amacım okuyamadığım kod üretmek
  değildi."
- **Kötü:** "Hayır, her satırını kendim yazdım." (İlk teknik soruda çöker.)
- **Devamı:** "Peki şu dosyayı aç ve anlat."

### 1.6 "Uygulamayı canlı görebilir miyim?"
- **Güçlü:** "Evet — https://devflow-902d.onrender.com. Ücretsiz katmanda
  olduğu için ilk istek uykudan uyanmayı bekleyebilir, o yüzden görüşmeden önce
  bir kez açıyorum. Yedek olarak yerel kurulumum ve ekran görüntülerim de var."
- **Geliştirme notu:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md) yedek planını ezberle.

### 1.7 "Kaç satır kod?"
- **Güçlü:** "Tam sayı vermem ama ölçek şu: 10 Prisma modeli, 9 backend modülü,
  14 sayfa bileşeni, 314 test. Satır sayısından çok, hangi kısmın neden orada
  olduğunu anlatabilirim."
- **Kötü:** Uydurma bir sayı vermek.

### 1.8 "Bu proje production'a hazır mı?"
- **Güçlü:** "Bir staj MVP'si olarak hazır ve gerçekten dağıtıldı; ama gerçek
  bir ürün için eksikleri var ve hepsi yazılı: parola sıfırlama yok, gerçek
  zamanlı güncelleme yok, rate limiter bellekte, silme geri alınamıyor, uçtan
  uca test yok. Bunları saklamak yerine `docs/FINAL_QA.md` içinde listeledim."
- **Kötü:** "Evet, tamamen hazır."

### 1.9 "En çok gurur duyduğun kısım?"
- **Güçlü:** "Doğrulama disiplini. Production imajını platforma güvenmeden önce
  tek kullan-at bir veritabanına karşı çalıştırdım ve orada Prisma `P1013`
  hatasını buldum — ne tip sistemi ne test suite'i onu bulabilirdi."

### 1.10 "Bir sonraki adımın ne?"
- **Güçlü:** "Parola sıfırlama, çünkü bugün parolasını unutan kullanıcı sıkışıp
  kalıyor. Sonra Playwright ile birkaç uçtan uca test ve lint tooling'in CI'ya
  eklenmesi."

### Değerlendirme

| Alan | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Netlik ve süre kontrolü | | | | | |
| Teknik omurga | | | | | |
| Dürüstlük (AI, sınırlar) | | | | | |
| Örnek ve dosya adı verme | | | | | |

**Geliştirme notu:** Bu mülakatın tamamı `docs/PORTFOLIO_COPY.md` §9 ve §10'daki
metinlerle örtüşüyor; onları ezberleme, kendi cümlelerine çevir.

---

# Mülakat 2 — Frontend

**Süre:** 35 dk · **Profil:** Frontend geliştirici.

### 2.1 "React'te state ile prop farkı?"
- **Başlangıç:** "Prop dışarıdan gelir, state içeride tutulur."
- **Güçlü:** Aynısı + "Prop salt okunur ve yukarıdan aşağı akar; state
  bileşene ait ve değişimi render tetikler. DevFlow'da `ConfirmDialog` tamamen
  prop ile sürülüyor, form alanları `useState` ile kontrollü."
- **Kötü:** "İkisi de aynı, biri sadece isim farkı."

### 2.2 "Kontrollü form nedir, neden tercih ettin?"
- **Güçlü:** "Değerin tek doğruluk kaynağı React state'i, DOM değil. Böylece
  doğrulama, devre dışı bırakma ve sunucudan gelen alan hatalarını göstermek tek
  yerden yönetiliyor. `IssueCreatePage` böyle."
- **Devamı:** "Çok alanlı formda performans sorunu olur mu?" → Bu ölçekte hayır;
  olursa alan bazlı bileşenlere bölerim ya da bir form kütüphanesi kullanırım.

### 2.3 "`useEffect` ne zaman kullanılmalı?"
- **Başlangıç:** "Veri çekmek için."
- **Güçlü:** "Effect bir senkronizasyon aracı: React dışı bir sistemle durum
  eşitler. DevFlow'da tek gerçek effect `AuthProvider`'daki mount anındaki
  `/auth/me`. Veri çekme TanStack Query'ye taşındı, çünkü effect ile fetch
  cache, yarış koşulu ve iptali elle yönetmek demek."
- **Kötü:** "Her API çağrısında."
- **Devamı:** "Bağımlılık listesi neden önemli?"

### 2.4 "Client state ile server state farkı nedir?"
- **Güçlü:** "Client state tarayıcıya ait ve her zaman doğru — form taslağı,
  menü açık mı. Server state PostgreSQL'e ait bir **kopya**: okunduğu anda
  bayat olabilir ve başkası haber vermeden değiştirebilir. İkincisi cache,
  bayatlık kuralı ve tazeleme ister; birincisi istemez."
- **Puan 5 işareti:** Bu ayrımı kendiliğinden yapmak.

### 2.5 "Query key nasıl tasarladın?"
- **Güçlü:** "Tek factory dosyasından, URL gibi genişten dara ve `list`/`detail`
  ayrı segment. Prefix ile eşleştiği için scope key altındaki her şeyi
  kapsıyor — bu bazen tam istenen, bazen fazla; o yüzden `exact: true` ve
  `…Lists` yardımcıları var."
- **Kötü:** "Key'i bileşende yazıyorum."

### 2.6 "Bir mutation'dan sonra neyi tazelersin?"
- **Güçlü:** "Sadece etkilenenleri. Kanban taşıması her zaman panoyu, yalnızca
  gerçek statü değişiminde ayrıca issue'yu, listeleri, akışları ve dashboard'u.
  Her şeyi invalidate etmek çalışır ama bir yazmayı on isteğe çevirir."
- **Devamı:** "Bir kez bunu yanlış yaptın mı?" → Evet: proje scope key'ini
  invalidate edince pano refetch olup az önce yazılan onaylı cevabı atıyordu.

### 2.7 "İyimser güncelleme yaptın mı?"
- **Güçlü:** "Evet, Kanban taşımasında. Kart hemen hareket ediyor, önceki pano
  bir değişkende saklanıyor, sunucu reddederse geri yükleniyor. Geri alması
  olmayan iyimser güncelleme genelde doğru olan bir yalandır."

### 2.8 "Yükleme, hata ve boş durumları nasıl ele aldın?"
- **Güçlü:** "Dört sonuç var, iki değil. Paylaşılan `LoadingState`, `EmptyState`,
  `ErrorState` bileşenleri var; boş durum bir sonraki eylemi adlandırıyor ve
  `ErrorState` metnini HTTP durumundan seçiyor — 403 eksik izni açıklıyor, 404
  eksik kaynağı ve ikisi de yeniden deneme sunmuyor çünkü aynı istek aynı şekilde
  başarısız olur."

### 2.9 "Responsive yaklaşımın?"
- **Güçlü:** "Yapısal önce: 900px'te navigasyon `aria-expanded` taşıyan bir Menu
  düğmesine katlanıyor, 560px'te filtre çubuğu dikleşiyor. Kanban her genişlikte
  yatay kayıyor, çünkü beş kolonu telefona sıkıştırmak okunabilir değil.
  1440/1024/768/390'da doğrulandı — tek Chromium motorunda; Safari ve Firefox
  denenmedi."
- **Puan 5 işareti:** Sınırı kendiliğinden söylemek.

### 2.10 "Erişilebilirlik için ne yaptın?"
- **Güçlü:** "Sayfa başına tek `banner`, tek `main`, tek `h1`; görünür odak
  halkası; her alanın etiketi; durum asla yalnızca renkle anlatılmıyor;
  sürükleme tek yol değil. `ConfirmDialog` odağı Cancel'da açıyor, Tab'ı
  hapsediyor, Escape ile kapanıyor ve odağı geri veriyor. Otomatik bir
  erişilebilirlik denetimi (axe gibi) henüz çalıştırılmadı."
- **Kötü:** "`alt` etiketleri koydum." (Tek başına yetersiz.)

### 2.11 "TypeScript sana ne kazandırdı?"
- **Güçlü:** "İstemci ve sunucu bir şekil üzerinde anlaşıyor. Issue yükünü
  değiştirdiğimde derleyici değişmesi gereken her ekranı listeledi."

### 2.12 "Neden UI framework yok?"
- **Güçlü:** "Uygulama bir kabuk, bir form, bir liste, bir rozet, bir dialog.
  Framework beş tür blok için kendi tasarım sistemini getirir ve her
  anlaşmazlıkta onunla dövüşürüm. Bunun yerine tek CSS token dosyası ve
  'hiçbir bileşen kendi rengini uydurmaz' kuralı."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| React temelleri | |
| Server state / TanStack Query | |
| Erişilebilirlik | |
| TypeScript | |
| Ödünleşim anlatımı | |

**Geliştirme notu:** Zayıfsan `client/src/lib/queryKeys.ts` ve
`client/src/pages/BoardPage.tsx` dosyalarını satır satır oku; bu ikisi frontend
sorularının yarısını karşılıyor.

---

# Mülakat 3 — Backend

**Süre:** 35 dk · **Profil:** Backend geliştirici.

### 3.1 "İstek uygulamana girdiğinde ne oluyor?"
- **Güçlü:** Sırayı say: `x-powered-by` kapalı → helmet → CORS → 100kb JSON →
  cookie-parser → origin kontrolü → auth rate limit (yalnızca iki yol) →
  router'lar → `/api` 404 → production'da statik client → 404 → error handler.
  Ve her adımın **neden** o sırada olduğunu ekle.
- **Kötü:** "Express router'a gidiyor."

### 3.2 "`app.ts` ile `server.ts` neden ayrı?"
- **Güçlü:** "`createApp()` dinlemeden kuruyor; Supertest uygulamayı import edip
  gerçek HTTP isteği atabiliyor ama port açılmıyor. Testler hızlı ve port
  çakışması imkânsız."

### 3.3 "Doğrulamayı nerede yapıyorsun?"
- **Güçlü:** "Tam olarak iki yerde: API kenarı ve başlangıçta ortam
  değişkenleri. Servis içinde tekrar doğrulama yok. `z.infer` sayesinde şekil
  iki kez yazılmıyor."
- **Devamı:** "TypeScript zaten kontrol etmiyor mu?" → Derleme zamanında biter;
  `req.body` çalışma zamanında her şey olabilir.

### 3.4 "Hata yönetimini anlat."
- **Güçlü:** "Tek `ApiError` sınıfı ve tek `errorHandler`. Beklenen hatalar
  `status` + `code` + opsiyonel `fieldErrors` ile dönüyor; beklenmeyen her şey
  `500 INTERNAL_ERROR` tek cümle. `express.json()`'ın attığı iki hata da
  isimlendiriliyor, yoksa anonim 500 olurlardı."
- **Devamı:** "Bir hata sözleşmesi ihlali biliyor musun?" → Evet: bilinmeyen
  adres 404'ü şu an `code` taşımıyor; `docs/FINAL_QA.md` içinde **F-1** olarak
  kayıtlı ve ayrı bir görev olarak düzeltilecek. **(Bunu söylemek 5 puanlıktır.)**

### 3.5 "REST tasarımın nasıl?"
- **Güçlü:** Sahiplik zincirini yansıtan iç içe yollar; filtreleme/sayfalama
  query parametresi; anlamlı durum kodları; kararlı hata kodları. "İç içe URL'yi
  seçmemin sebebi yetkilendirme kontrolünü taşıması."

### 3.6 "401 ve 403 ne zaman?"
- **Güçlü:** "401 kimliğin yok, giriş yap. 403 kim olduğunu biliyorum ve cevap
  yine hayır. Eksik oturuma 403 dönmek istemciyi giriş formu göstermek yerine
  pes etmeye iter."

### 3.7 "Yetkilendirmeyi nasıl kurdun?"
- **Güçlü:** "Middleware zinciri: `requireAuth` → `requireWorkspaceMember`
  (workspace yoksa 404, üyelik yoksa 403) → gerekiyorsa `requireWorkspaceAdmin`
  / `Owner` → `requireProject` (projeyi URL'deki workspace ile **filtreleyerek**
  yükler) → servis içinde satır bazlı kurallar. Rol her istekte veritabanından."

### 3.8 "Bir MEMBER neden bazı issue'ları düzenleyebiliyor?"
- **Güçlü:** "Çünkü izin role **ve satıra** bağlı: kendi açtığı ya da kendisine
  atanmış issue. `canUpdateIssue` bunu tek yerde tanımlıyor ve pano da aynı
  fonksiyonu kullanıyor, yani kart taşıma izni ile düzenleme izni sapamıyor."

### 3.9 "Sağlık ucu neden veritabanına dokunmuyor?"
- **Güçlü:** "'Süreç ayakta mı' sorusunu yanıtlıyor. Veritabanına dokunsaydı,
  veritabanı çöktüğünde sağlıklı bir konteyner öldürülürdü. Veritabanı sorusunun
  ayrı cevabı var: `npm run db:check`."

### 3.10 "Dashboard'u nasıl kurdun?"
- **Güçlü:** "Tek uç nokta, tek `Promise.all`. Sayımlar `count` ve `groupBy` ile
  PostgreSQL'de; dağılımlar sıfırla tohumlanıyor; gecikme sunucu saatiyle
  ölçülüyor. Altı ayrı liste isteği altı farklı anı anlatırdı."

### 3.11 "Gövde limitini neden koydun?"
- **Güçlü:** "Limitsiz gövde, exploit gerektirmeyen bir hizmet reddi. 100kb,
  şemanın izin verdiği en uzun açıklamanın on katı."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Middleware sırası ve gerekçesi | |
| Zod ve doğrulama sınırı | |
| Hata sözleşmesi | |
| Yetkilendirme zinciri | |
| REST kararları | |

---

# Mülakat 4 — Veritabanı

**Süre:** 30 dk · **Profil:** Backend / veri odaklı geliştirici.

### 4.1 "Veri modelini anlat."
- **Güçlü:** 10 model: `User`, `PasswordCredential`, `Session`, `Workspace`,
  `WorkspaceMember`, `Project`, `Sprint`, `Issue`, `Comment`, `ActivityLog`.
  İlişkileri sesli çiz: workspace → proje → sprint/issue, issue → yorum,
  kullanıcı ↔ workspace `WorkspaceMember` üzerinden.

### 4.2 "Neden açık bir join tablosu?"
- **Güçlü:** "Üyelik veri taşıyor: `role` ve `joinedAt`. Rol **çifte** ait —
  aynı kişi bir workspace'te OWNER, başkasında MEMBER olabiliyor. Implicit
  many-to-many tablosunda bu kolon için yer yok."

### 4.3 "Composite unique constraint nerede var?"
- **Güçlü:** Üçünü de say: `(projectId, number)`, `(workspaceId, userId)`,
  `(workspaceId, key)` — ve her birinin hangi hatayı imkânsız kıldığını söyle.
- **Devamı:** "Uygulamada kontrol etsen?" → Aynı milisaniyede gelen iki istek
  ikisi de "yok" görür.

### 4.4 "Hangi index'leri ekledin, neden?"
- **Güçlü:** "Sadece gerçekten filtrelediğim yerlere:
  `(projectId, status, position)` pano ve yeniden sıralama okumaları için,
  `assigneeId`, `sprintId`, aktivite için üç `(…, createdAt)` çifti,
  `Session.userId` ve `Session.expiresAt`. Index yazmayı yavaşlatır ve yer
  kaplar; 'her kolona index' bir strateji değil."

### 4.5 "Silme davranışlarını anlat."
- **Güçlü:** "Cascade: issue silinince yorumları gider. SetNull: sprint silinince
  issue'nun `sprintId`'si null olur — iş kaybolmamalı. Restrict: workspace
  sahibi, issue reporter'ı ve yorum yazarı; gerçek iş dururken kullanıcı satırı
  silinemez."

### 4.6 "Transaction nerede kullandın?"
- **Güçlü:** Dördünü say: kayıt, workspace oluşturma, issue oluşturma, Kanban
  taşıma. Her biri için "ya hepsi ya hiçbiri" gerekçesini ver.

### 4.7 "Issue numaralandırmasındaki yarış nedir?" *(Bu mülakatın anahtar sorusu)*
- **Başlangıç:** "İki kullanıcı aynı numarayı alabilir."
- **Güçlü:** "`count + 1` yaklaşımında iki istek aynı sayımı okur ve ikisi de 8
  yazar — okuma kilit almaz. Sayacı proje satırında tutup issue'yu yaratan
  transaction içinde `increment` ile artırıyorum. `UPDATE` o satırı kilitliyor,
  ikinci istek bekliyor ve 9'u alıyor. Son güvence `(projectId, number)`
  composite unique index — gelecekte biri transaction'ı unutursa veritabanı
  sessiz bozuk veri yerine gürültülü hata veriyor."
- **Kötü:** "Prisma hallediyor."
- **Devamı:** "Neden `increment`, neden önce oku sonra yaz değil?" → Okuma
  kilitlemez; `UPDATE … SET x = x + 1` atomik.

### 4.8 "`Serializable` izolasyon neden?"
- **Güçlü:** "Aynı kolonu iki kişi sıralarsa okumaları iç içe geçip yinelenen
  pozisyon üretebilir. `Serializable` bunu imkânsız kılıyor; bedeli ara sıra bir
  `P2034` ve onu **sınırlı** bir retry karşılıyor. Sınırsız retry kilitlenmedir."

### 4.9 "Migration stratejin?"
- **Güçlü:** "Üç işlenmiş migration. `migrate dev` yerelde yazar; container, CI
  ve production yalnızca `migrate deploy` çalıştırır — yazmaz, sormaz,
  sıfırlamaz. `db push` kullanmadım çünkü geçmiş bırakmaz."
- **Devamı:** "Var olan satırlara zorunlu kolon nasıl eklenir?" → Numaralandırma
  migration'ında yaptım: kolonu geçici varsayılanla ekle, `ROW_NUMBER()` ile
  proje bazında doldur, her projenin sayacını en yüksek numaranın ötesine taşı,
  varsayılanı düşür, unique index ekle.

### 4.10 "N+1'i nerede önledin?"
- **Güçlü:** "Issue listesinde reporter/assignee/sprint tek `select` ile join
  ediliyor; dashboard'da on proje için tek `groupBy`; pano tek `findMany` ve
  bellekte gruplama."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| İlişkiler ve kısıtlar | |
| Index gerekçelendirmesi | |
| Transaction ve izolasyon | |
| Yarış durumu anlatımı | |
| Migration disiplini | |

---

# Mülakat 5 — Güvenlik

**Süre:** 30 dk · **Profil:** Kıdemli geliştirici / güvenliğe meraklı.

### 5.1 "Parolaları nasıl sakladın?"
- **Güçlü:** "Argon2id ile hash'lenmiş, kendi tablosunda (`PasswordCredential`),
  böylece rutin bir kullanıcı sorgusu hash'i yanlışlıkla seçemiyor. Argon2id
  bilerek yavaş ve bellek-yoğun, yani GPU ile paralel tahmin pahalı."
- **Kötü:** "SHA-256 ile hash'ledim."

### 5.2 "Parolada Argon2id ama token'da SHA-256 — neden?"
- **Güçlü:** "Parola düşük entropili ve insan seçimi; hash yavaş olmalı. Oturum
  token'ı zaten 256 bit rastgelelik — tahmin edilecek bir şey yok. Yavaş hash
  her istekte gecikme ekler, hiçbir şey kazandırmaz."
- **Puan 5 işareti:** Bu ayrımı kendiliğinden yapmak.

### 5.3 "Oturumu neden veritabanında tutuyorsun?"
- **Güçlü:** "İptal. JWT süresi dolana kadar geçerli; 'her yerden çıkış' için
  denylist gerekir, ki bu fazladan adımlarla bir oturum tablosudur. Oturum satırı
  tek indexed lookup ve çıkış bir `DELETE`."

### 5.4 "Token neden hash'lenerek saklanıyor?"
- **Güçlü:** "`sessions` tablosunu okuyan biri aksi hâlde her kullanıcı için
  çalışan token elde ederdi. Hash ile giriş yapılamıyor; istek, gelen cookie
  hash'lenip aranarak doğrulanıyor."

### 5.5 "Cookie ayarlarını say."
- **Güçlü:** "`httpOnly`, `sameSite: 'lax'`, `secure` yalnızca production,
  `path: '/'`, `maxAge` oturum ömrüyle aynı, `Domain` yok. `secure` yerelde
  kapalı çünkü `http://localhost` üzerinden geliştirme yapıyorum."

### 5.6 "CSRF'e karşı ne yaptın?"
- **Güçlü:** "İki katman: `SameSite=Lax` çapraz siteden gelen POST'lara cookie
  eklemiyor, ve mutasyonlarda `Origin` başlığı tam olarak `CLIENT_ORIGIN`'e eşit
  olmalı. Sayfa JavaScript'i `Origin`'i uyduramadığı için kontrol anlamlı. Bu
  tam bir CSRF-token akışı değil ve bunu biliyorum: farklı alt alan adı ya da
  proxy eklenirse yeniden gözden geçirilmeli."
- **Kötü:** "CORS zaten CSRF'i engelliyor." (Yanlış.)
- **Devamı:** "`GET`'i neden engellemiyorsun?" → Preflight bozulur ve güvenli
  metotlar durum değiştirmiyor.

### 5.7 "CORS güvenlik midir?"
- **Güçlü:** "Bir **tarayıcı** kuralı ve kullanıcıyı korur, sunucuyu değil.
  İstek yine ulaşır; tarayıcı yalnızca cevabı sayfaya vermeyi reddeder. Cookie
  kullandığım için origin tek ve tam bir değer; `*` ile credentials birlikte
  yasak."
- **Puan 5 işareti:** "Sunucuyu korumaz" cümlesini kurmak.

### 5.8 "Rate limiting nerede ve neden orada?"
- **Güçlü:** "Yalnızca login ve register. Tüm API'ye limit koymak normal
  kullanımı bozardı. Reddediş bilinen ve bilinmeyen e-posta için aynı, yoksa
  limiter hesap bulma aracına dönerdi. Sınırı biliyorum: sayaç süreç içi ve
  bellekte; çok örnekli dağıtım paylaşılan bir depo ister."

### 5.9 "Bilinmeyen e-posta ile yanlış parolayı nasıl ayırt edilemez yaptın?"
- **Güçlü:** "Mesaj ve süre. İkisi de aynı `401` ve kullanıcı bulunamadığında
  bile bir sahte hash'e karşı doğrulama yapılıyor, yani zamanlama da bilgi
  sızdırmıyor."

### 5.10 "Production'da hata mesajları?"
- **Güçlü:** "Beklenmeyen her hata tek cümle ve `INTERNAL_ERROR`. Stack trace
  saldırgana framework'ü, dosya düzenini ve çoğu zaman başarısız sorguyu söyler."

### 5.11 "Bundle'a sır sızabilir mi?"
- **Güçlü:** "Vite yalnızca `VITE_` önekli değişkenleri paketliyor ve paket
  herkese açık JavaScript. Oradaki tek değer `VITE_API_URL` ve production'da o da
  `/api`. Ayrıca izlenen dosyalarda ve derlenmiş bundle'da sır taraması yaptım."

### 5.12 "En büyük güvenlik açığın ne olabilir?"
- **Güçlü (dürüst):** "Bir XSS açığı olsaydı oturum cookie'sini çalamazdı ama
  giriş yapmış kullanıcı adına istek atabilirdi — origin kontrolü aynı origin'den
  geldiği için durduramaz. Bu yüzden yorumlar düz metin olarak render ediliyor ve
  CSP `script-src 'self'`. Yine de bir CSRF-token akışı ve içerik sanitizasyonu
  bir sonraki adım olurdu."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Parola ve token ayrımı | |
| Cookie ayarları | |
| CSRF / CORS doğru anlatım | |
| Sınırları kabul etme | |

---

# Mülakat 6 — Test

**Süre:** 25 dk

### 6.1 "Neyi test ettin?"
- **Güçlü:** "Üç katman: birim (saf fonksiyonlar), API entegrasyon (Supertest +
  gerçek PostgreSQL), bileşen (React Testing Library). Toplam 314 test:
  istemci 96, sunucu 218."

### 6.2 "Neden gerçek veritabanı, neden mock değil?"
- **Güçlü:** "Mock'larsam mock'u test etmiş olurum. Önemsediğim hatalar — issue
  numarasındaki yarış, fazla silen bir cascade, bayat değer okuyan bir rol
  kontrolü — yalnızca gerçek veritabanında var."

### 6.3 "Testler birbirini nasıl etkilemiyor?"
- **Güçlü:** "Üç şey: `DATABASE_URL` içinde `devflow_test` geçmezse hiçbir şey
  başlamıyor ve bu kontrol Prisma import edilmeden önce çalışıyor; her suite
  kendi e-posta alan adına sahip ve yalnızca kendi satırlarını temizliyor;
  sunucu projesinde dosya paralelliği kapalı çünkü tek veritabanı paylaşılıyor."

### 6.4 "React Testing Library ile neyi sorguluyorsun?"
- **Güçlü:** "Kullanıcının gördüğünü: rol, etiket, metin. Sınıf adı ya da iç
  state değil. Böylece bir refactor testi kırmıyor ama davranış değişikliği
  kırıyor — Phase 9A'da on altı test bu yüzden kırıldı ve hepsini güncelledim,
  hiçbirini silmedim."

### 6.5 "Coverage kaç?"
- **Güçlü:** "İstemci %92.91, sunucu %94.88 satır. Ama coverage hangi satırların
  **çalıştığını** söyler, davranışın doğru olduğunu değil. Bilerek eşik koymadım;
  kovalanan bir sayı test yazma sebebine dönüşüyor."
- **Kötü:** "%95, yani kod güvenli."

### 6.6 "Test edilmesi zor bir şey oldu mu?"
- **Güçlü:** "Rate limiter. Suite tek adresten onlarca hesap açıyor ve on
  birincide düşerdi. `NODE_ENV=test` altında kapatıp davranışı maksimumu iki
  olan amaca özel bir limiter ile test ettim."

### 6.7 "Uçtan uca testin var mı?"
- **Güçlü (dürüst):** "Hayır. Tarayıcı doğrulaması manuel ve neyin manuel
  beklediği `docs/FINAL_QA.md` içinde listelenmiş. Playwright bir sonraki adım."
- **Kötü:** "Gerek yok."

### 6.8 "Bir hata bulsan nasıl test yazarsın?"
- **Güçlü:** "Önce hatayı yakalayan, **düzeltmeden önce başarısız olan** dar bir
  test; sonra düzeltme; sonra testin geçtiğini ve çevresindeki suite'in hâlâ
  geçtiğini görmek."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Test katmanları | |
| İzolasyon stratejisi | |
| Coverage'ın anlamı | |
| Dürüstlük (E2E yok) | |

---

# Mülakat 7 — Docker, CI ve dağıtım

**Süre:** 30 dk · **Profil:** DevOps'a yakın geliştirici.

### 7.1 "Image ile container farkı?"
- **Güçlü:** "Image salt-okunur bir tarif; container onun çalışan bir örneği.
  Container silinince yazdığı her şey gider — veritabanlarının volume istemesinin
  sebebi bu."

### 7.2 "Multi-stage build neden?"
- **Güçlü:** "Build TypeScript'e, Prisma CLI'ya ve devDependency'lere ihtiyaç
  duyuyor; çalışan sunucu hiçbirine. Runtime aşamasında yalnızca production
  bağımlılıkları, derlenmiş sunucu, `client/dist`, şema ve migration'lar var ve
  süreç `node` kullanıcısıyla çalışıyor."
- **Devamı:** "Prisma CLI neden production bağımlılığı?" → Konteyner başlarken
  `migrate deploy` çalıştırıyor; gerçekten çalışma zamanında gerekli.

### 7.3 "Compose'da healthcheck neden var?"
- **Güçlü:** "Başlamış bir PostgreSQL, bağlantı kabul eden bir PostgreSQL demek
  değil. Server `pg_isready` sağlığını bekliyor; olmasa ilk migration
  veritabanıyla yarışırdı."

### 7.4 "`docker compose down -v` ne yapar?"
- **Güçlü:** "Volume'ü ve içindeki her satırı siler. `down` tek başına veriyi
  korur. Ayrı ve bilinçli bir komut olmasının sebebi tam olarak bu."

### 7.5 "CI ne yapıyor?"
- **Güçlü:** "`npm ci` → `db:validate` → `db:generate` → `db:deploy` →
  `typecheck` → `test` → `build`, tek kullan-at `devflow_test` PostgreSQL
  servisine karşı. Hiçbir adım `continue-on-error` değil ve iş akışı dağıtım
  yapmıyor."

### 7.6 "CI'da migration'ı neden çalıştırıyorsun?"
- **Güçlü:** "İşlenmiş migration'ların boş bir veritabanına gerçekten
  uygulandığını kanıtlıyor. `db push` bu kontrolü tamamen atlardı."

### 7.7 "Production'da migration nasıl çalışıyor?"
- **Güçlü:** "Konteynerin başlangıç komutu
  `prisma migrate deploy && node dist/server.js`. `&&` sayesinde başarısız bir
  migration sunucuyu hiç başlatmıyor ve platform önceki sürümü çalıştırmaya
  devam ediyor. O tek `&&` işaretinin kendisi bir güvenlik özelliği."

### 7.8 "Health check ne işe yarıyor?"
- **Güçlü:** "`GET /api/health` public, oturumsuz ve tabloya dokunmuyor. Render
  yeni bir dağıtıma trafik yönlendirmeden önce onu çağırıyor, yani cevap
  veremeyen bir konteyner çalışanın yerini asla almıyor. Bu, kötü bir deploy'u
  kesinti yerine olay olmayan bir şeye çeviriyor."

### 7.9 "Neden Render, neden Vercel değil?"
- **Güçlü:** "Uzun ömürlü bir Express süreci ve kalıcı bir PostgreSQL bağlantı
  havuzu istiyorum. Vercel'in modeli serverless fonksiyon — soğuk başlangıç ve
  bağlantı havuzu ayrı bir problem hâline gelir. Ayrıca tek origin kurulumumu
  bölerdi ve cookie çapraz-site olurdu."

### 7.10 "Tek origin ne kazandırıyor?"
- **Güçlü:** "Oturum cookie'si first-party kalıyor: `SameSite=Lax` anlamını
  koruyor, origin kontrolü tek bir tam dize karşılaştırması ve gerçek istemci
  için CORS istisnası gerekmiyor. Bedeli yaklaşık doksan satır middleware ve tek
  bir sıralama kuralı: API'nin JSON 404'ü SPA fallback'inden önce olmalı."

### 7.11 "Bir dağıtım başarısız olursa?"
- **Güçlü:** "Log'a bakarım: migration çıktısı, ortam doğrulama mesajı, health
  check. Kod geri alma Render'ın Deploys sekmesinden. Veri geri alması ayrı bir
  konu: kod rollback'i migration'ı geri almaz, bu yüzden migration'larım
  eklemeli — bir gün bir şey düşürülürse geri almak yerine ileri yönlü bir
  migration yazarım. Production asla sıfırlanmaz."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Docker kavramları | |
| Compose ve healthcheck | |
| CI hattı ve gerekçesi | |
| Production migration güvenliği | |
| Platform seçimi | |

---

# Mülakat 8 — Hata ayıklama (canlı senaryolar)

**Format:** Görüşmeci bir belirti veriyor, sen **sesli düşünerek** araştırıyorsun.
Doğru cevap tek bir sebep değil; **doğru sıra**.

> Tam çözümler: [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md)

### 8.1 "Kullanıcı giriş yapıyor ama sayfayı yenileyince çıkmış oluyor."
- **Zayıf cevap:** "Cookie ayarlarını değiştiririm."
- **Güçlü akış:** Network sekmesinde `POST /auth/login` yanıtında `Set-Cookie`
  var mı → Application sekmesinde cookie gerçekten saklanmış mı → `GET /auth/me`
  isteğinde `Cookie` başlığı gidiyor mu → gitmiyorsa `credentials: 'include'`
  ve origin/port eşleşmesi → gidiyorsa sunucuda oturum satırı var mı ve
  `expiresAt` doğru mu.
- **Puan 5 işareti:** "Önce isteğin gerçekten cookie taşıyıp taşımadığına
  bakarım" demek.

### 8.2 "Frontend'den her istek CORS hatası veriyor."
- **Güçlü akış:** Tarayıcı konsolundaki tam mesajı oku (hangi origin
  reddedildi) → sunucudaki `CLIENT_ORIGIN` değeriyle karşılaştır → port ve
  protokol farkı var mı (`5174` vs `5175`, `http` vs `https`) → preflight
  `OPTIONS` cevabı ne dönüyor → `credentials: true` ve tek origin ayarı yerinde
  mi.
- **Tuzak:** `Origin` reddi CORS gibi görünen `403 INVALID_ORIGIN` da olabilir;
  ikisini yanıt gövdesinden ayır.

### 8.3 "Bir OWNER 403 alıyor."
- **Güçlü akış:** Hangi uç nokta ve tam hata kodu ne → `FORBIDDEN` mı
  `INVALID_ORIGIN` mı → `FORBIDDEN` ise `workspace_members` tablosunda o
  kullanıcının o workspace'teki rolü gerçekten `OWNER` mı → yoksa URL'deki
  workspace id başka bir workspace'e mi ait → `requireProject` mı düşürüyor.
- **Puan 5 işareti:** "OWNER olmak workspace'e özgüdür, kullanıcıya değil"
  demek.

### 8.4 "İki issue aynı numarayı almış."
- **Güçlü akış:** Bu veritabanı kısıtı yüzünden **olmamalı** → önce
  `(projectId, number)` unique index gerçekten var mı diye kontrol et →
  varsa satırlar farklı projelerde olabilir (bu normal) → aynı projedeyse
  numaralandırmayı atlayan bir kod yolu var demektir; `createIssue` dışında
  `issue.create` çağıran yeri ara.

### 8.5 "Kanban'da bir kart iki kez görünüyor."
- **Güçlü akış:** Yenile — sunucu panosunda da var mı → varsa `position`
  değerleri çakışıyor mu → yoksa istemcideki iyimser güncelleme geri alınmamış
  demektir; hata dalında önceki panonun geri yüklendiğini doğrula.

### 8.6 "Değişiklik yaptım ama ekran eski veriyi gösteriyor."
- **Güçlü akış:** Mutation'ın `onSuccess`'inde hangi key'ler invalidate ediliyor
  → ekranın kullandığı key ile aynı mı → `staleTime` (30 sn) etkisi mi →
  scope key invalidate edilip onaylı cevap mı atılmış.

### 8.7 "Testler yerelde geçiyor, CI'da düşüyor."
- **Güçlü akış:** CI log'unda hangi adım düştü → `npm ci` ise lockfile
  uyumsuzluğu → `db:deploy` ise migration boş veritabanına uygulanmıyor →
  test ise ortam değişkeni farkı ya da yerelde kalmış test verisine bağımlılık.
- **Puan 5 işareti:** "Yerelde geçmesi, temiz bir checkout'ta geçtiği anlamına
  gelmez" demek.

### 8.8 "Production'da bir React rotasını yenileyince 404 geliyor."
- **Güçlü akış:** SPA fallback çalışıyor mu → `/` çalışıyor ama iç rota
  çalışmıyorsa fallback hiç takılmamış ya da sıralama yanlış → `client/dist`
  imajda var mı (`hasClientBuild` uyarısı log'da görünür) → `/api/...` HTML mi
  dönüyor (o zaman sıralama ters).

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Doğru sırayla daraltma | |
| Doğru aracı seçme (Network / log / DB) | |
| Kök nedene inme | |
| Tahmin yerine ölçme | |

---

# Mülakat 9 — Mimari meydan okuması

**Format:** "Ya şöyle olsaydı?" soruları. Doğru cevap tek değil; **ödünleşimi
adlandırmak** puan getiriyor.

### 9.1 "Birden fazla backend instance çalıştırsan ne değişir?"
- **Güçlü:** "Kimlik doğrulama değişmez, çünkü oturumlar veritabanında — bu
  tasarımın hediyesi. Değişecek üç şey: bellek içi rate limiter paylaşılan bir
  depoya taşınmalı (Redis); bağlantı havuzu toplamda veritabanı limitini aşmamalı
  (PgBouncer); migration deploy'da bir kez çalışmalı, her instance'ta değil."

### 9.2 "Gerçek zamanlı güncellemeler nasıl eklenir?"
- **Güçlü:** "En basit hâli sunucu tarafı olayları (SSE) — tek yönlü ve HTTP
  üstünde. Kanal workspace başına olur ve her mesaj yetki kontrolünden geçer.
  Çok instance olursa pub/sub gerekir. WebSocket'e ancak istemciden sunucuya
  sürekli mesaj gerekirse geçerdim. Maliyet: bağlantı durumu, yeniden bağlanma
  ve çok daha zor bir test hikâyesi."

### 9.3 "Dosya ekleri?"
- **Güçlü:** "Baytlar nesne depolamaya, veritabanına yalnızca metadata satırı.
  Yükleme presigned URL ile doğrudan depoya, böylece sunucu baytları taşımıyor.
  Kontrol edilecekler: tip ve boyut, indirme yetkisi (yine workspace üyeliği) ve
  issue silinince temizlik."

### 9.4 "E-posta davetleri?"
- **Güçlü:** "Ayrı `Invitation` modeli: workspace, e-posta, rol, tek kullanımlık
  token'ın **hash**'i, son kullanma, durum. Token'ı oturum token'ıyla aynı
  sebeple hash'lerim. Kabul akışı token'ı hash'leyip satırı bulur, süresi ve
  kullanımını kontrol eder, üyelik yaratır ve davetiyeyi tüketilmiş işaretler."

### 9.5 "Oturum temizliği nasıl otomatikleşir?"
- **Güçlü:** "Süresi dolan satır okunduğunda zaten siliniyor ama hiç okunmayanlar
  birikiyor. Günlük bir job `expiresAt < now` satırlarını siler; index zaten var.
  Tek instance'ta uygulama içi zamanlayıcı, çok instance'ta platform cron."

### 9.6 "Denetim geçmişi gerçekten değiştirilemez olsa?"
- **Güçlü:** "Şu an append-only ama immutable değil — veritabanına yazma
  erişimi olan biri satırı düzenleyebilir. Gerçek immutability için hash zinciri
  (her satır bir öncekinin hash'ini taşır), `UPDATE`/`DELETE` yetkisi olmayan
  ayrı bir veritabanı rolü ve harici bir log kopyası."
- **Puan 5 işareti:** "Append-only ≠ immutable" ayrımını yapmak.

### 9.7 "Veritabanı performansını nasıl ölçersin?"
- **Güçlü:** "Önce ölç, sonra optimize et: `EXPLAIN ANALYZE` ile gerçek plan,
  `pg_stat_statements` ile en pahalı sorgular, Prisma query log'u ile N+1 avı,
  uygulama tarafında istek süresi metrikleri. Ancak ondan sonra index."
- **Kötü:** "Index eklerdim."

### 9.8 "100.000 kullanıcı olsa?"
- **Güçlü:** Öncelik sırasıyla say (bkz. INTERVIEW_GUIDE S113) ve "önce hangi
  metriğin bozulduğunu ölçerdim" diye başla.

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Ödünleşim adlandırma | |
| "Önce ölç" refleksi | |
| Mevcut tasarımın sınırlarını bilme | |
| Aşırı mühendislikten kaçınma | |

---

# Mülakat 10 — İK ve davranışsal

**Süre:** 25 dk · **Profil:** İK / ekip lideri.

### 10.1 "Kendinden bahset."
- **Başlangıç:** CV'yi kronolojik okumak.
- **Güçlü:** "Üç cümle: kim olduğum, neye ilgi duyduğum, en somut kanıtım.
  Full-stack tarafa yöneldim çünkü bir özelliğin veritabanından ekrana kadar
  tamamını görmek hoşuma gidiyor. Son projem DevFlow — çok kullanıcılı bir issue
  takip uygulaması; rol tabanlı yetkilendirme, transaction gerektiren sıralama ve
  gerçek bir PostgreSQL'e karşı çalışan 314 test var."
- **Kötü:** Beş dakika konuşmak.

### 10.2 "Neden full-stack?"
- **Güçlü:** "Bir özelliğin nerede biteceğine karar verebilmek istiyorum. Kanban
  sıralamasında asıl karar 'bu iş istemcide mi sunucuda mı olmalı' idi; iki
  tarafı da bilmesem bu soruyu soramazdım."

### 10.3 "Neden bu staj?"
- **Güçlü:** Şirkete özel bir sebep + kendi projenle bağlantı. Araştırma yaptığın
  belli olmalı.
- **Kötü:** Her şirkete söylenebilecek genel cümleler.

### 10.4 "Bu projede ne öğrendin?"
- **Güçlü:** "Üç şey: yetkilendirme arayüzde değil her istekte sunucuda olur;
  transaction ve izolasyon soyut değil, gerçek bir yarışı çözüyor; production
  kendi başına bir konu — build çıktısı, platform değişkenleri, deploy sırasında
  migration, health check ve imajı gerçekten çalıştırarak doğrulamak."

### 10.5 "Yapay zekâyı sorumlu şekilde nasıl kullanıyorsun?"
- **Güçlü:** "Üretilen kodu anlamadan kabul etmiyorum ve kararları ben
  veriyorum. Doğrulamayı ayrı tutuyorum: testler, gerçek bir veritabanına karşı
  çalışan entegrasyon suite'i ve manuel QA. Neyin doğrulanmış neyin manuel
  beklediğini `docs/FINAL_QA.md` içinde dürüstçe listeledim — bir şeyi
  'çalışıyor' diye işaretlemek için gerçekten denemiş olmam gerekiyor."
- **Kötü:** "Kullanmıyorum."

### 10.6 "Bir zorluğu anlat." *(STAR)*
- **Güçlü:** *Durum:* Kanban'da eşzamanlı taşımalarda pozisyonlar bozulabiliyordu.
  *Görev:* Sıralamanın her koşulda tutarlı olması. *Eylem:* Sahipliği sunucuya
  aldım, istemciyi üç değere indirdim, yeniden numaralamayı tek `Serializable`
  transaction'a koydum, `P2034` için sınırlı retry ekledim. *Sonuç:* Eşzamanlı
  taşımalar güvenli, başarısız taşıma tam bir no-op, istemci onaylanmış panoyu
  çiziyor.

### 10.7 "Bir hatandan bahset."
- **Güçlü:** "Query key'lerini o kadar doğal iç içe kurdum ki proje detayı
  key'i panonun prefix'i oldu; Kanban taşımasından sonra projeyi invalidate
  edince pano refetch olup az önce yazılan onaylı cevap çöpe gidiyordu. Düzeltme
  açık olmak: `exact: true` ve ayrı `…Lists` key'leri. Ders: kolay bir soyutlama
  sessizce yanlış davranabilir."
- **Kötü:** "Fazla mükemmeliyetçiyim."

### 10.8 "Bilmediğin bir teknolojiyi nasıl öğrenirsin?"
- **Güçlü:** "Resmî dokümantasyondan en küçük çalışan örneği kurar, sonra onu
  gerçek bir probleme uygular ve öğrendiğimi yazarım. Prisma 7'nin driver
  adapter zorunluluğunu böyle öğrendim; her fazın öğrenme notu
  `docs/LEARNING_LOG.md` içinde."

### 10.9 "Geri bildirimle nasıl çalışırsın?"
- **Güçlü:** "Önce anladığımdan emin olurum — geri bildirimi kendi cümlemle
  tekrar ederim. Katılmıyorsam gerekçemi söylerim ama tartışmayı uzatmam;
  deneyip sonucu gösteririm."

### 10.10 "Bilmediğin bir soru gelirse?"
- **Güçlü:** "Bilmiyorum derim ve nasıl bulacağımı söylerim: 'bunu denemedim
  ama beklentim şu, doğrulamak için şuraya bakardım'."

### 10.11 "Sormak istediğin bir şey var mı?"
- **Güçlü örnekler:** Stajyerin ilk ayı nasıl geçiyor? Kod incelemesi nasıl
  yapılıyor? Test ve dağıtım süreciniz nasıl işliyor? Bir stajyerin bu ekipte
  başarılı sayılması ne demek?
- **Kötü:** "Yok."

### Değerlendirme

| Alan | 1–5 |
|---|---|
| Öz ve yapılandırılmış anlatım (STAR) | |
| Dürüstlük | |
| Öğrenme yaklaşımı | |
| Merak ve hazırlık (soru sorma) | |

---

## Çalışma programı önerisi

| Gün | Mülakat |
|---|---|
| 1 | 1 — Proje tanıtımı |
| 2 | 2 — Frontend |
| 3 | 3 — Backend |
| 4 | 4 — Veritabanı |
| 5 | 5 — Güvenlik |
| 6 | 6 — Test · 7 — Docker/CI/dağıtım |
| 7 | 8 — Hata ayıklama · 9 — Mimari · 10 — İK |

Sonra 14 günlük plana geç: [STUDY_PLAN.md](STUDY_PLAN.md).
