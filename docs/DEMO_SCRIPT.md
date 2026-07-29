# DevFlow — Demo Metni

> Canlı gösterim için hazır konuşma metinleri: 30 saniye, 2 dakika, 5 dakika
> canlı demo ve 10 dakika teknik sunum — artı bir yedek plan.
>
> Canlı adres: **https://devflow-902d.onrender.com**
> Depo: **https://github.com/emirseren100/DevFlow**
>
> İlgili: [PORTFOLIO_COPY.md](PORTFOLIO_COPY.md) ·
> [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md)

> **Demodan 10 dakika önce yap:** canlı adresi bir kez aç (ücretsiz katman
> uyuyor olabilir), giriş yap, sekmeleri hazırla, ekran görüntüsü klasörünü aç.

---

## 1. 30 saniyelik tanıtım

> DevFlow, küçük yazılım ekipleri için bir issue ve sprint takip uygulaması.
> Ekip bir workspace açıyor, üyelerini ekliyor, proje ve sprint oluşturuyor,
> issue açıyor, bunları Kanban panosunda taşıyor, yorumluyor ve neyin
> değiştiğini aktivite akışından izliyor.
>
> Bunu yaptım çünkü tutorial seviyesindeki bir to-do listesinden çıkıp gerçek
> bir uygulamanın zorlarını öğrenmek istedim: ilişkisel veri modelleme, sunucu
> tarafında ciddi bir yetkilendirme katmanı ve çalıştığını kanıtlayan testler.
>
> React ve TypeScript ile arayüz, Express ve TypeScript ile API, Prisma
> üzerinden PostgreSQL. Tek origin üzerinden canlıda çalışıyor.

**Süre kontrolü:** Üç paragraf, yaklaşık 30 saniye. Daha fazlasını söyleme —
sonraki soruyu karşı taraf sorsun.

---

## 2. 2 dakikalık genel bakış

**Problem.**
> Küçük bir ekip için Jira ağır, bir Trello panosu ise yetersiz. Aradaki şey
> şu: rolleri olan bir workspace, proje bazlı issue numaraları, bir Kanban akışı
> ve neyin ne zaman değiştiğini gösteren bir kayıt.

**Kullanıcılar.**
> Üç rol var: OWNER workspace'i yönetiyor, ADMIN proje ve üyeleri yönetiyor,
> MEMBER issue açıyor, yorum yazıyor ve kendi işini taşıyor.

**Teknolojiler.**
> Frontend React, TypeScript, Vite, React Router ve TanStack Query. Backend
> Node.js, Express, TypeScript ve Zod. Veritabanı PostgreSQL, erişim Prisma ile
> ve migration'lar depoda. Testler Vitest, React Testing Library ve Supertest —
> toplam 314 test ve sunucu testleri gerçek bir PostgreSQL test veritabanına
> karşı çalışıyor. Altyapıda npm workspaces, Docker, Docker Compose ve GitHub
> Actions var; production Render'da tek bir web servisi ve yönetilen bir
> PostgreSQL.

**Ana özellikler.**
> Kimlik doğrulama, workspace ve üyelik, projeler, sprint'ler, issue'lar,
> filtreleme ve sayfalama, Kanban panosu, yorumlar, aktivite akışı ve tek
> istekle çalışan bir dashboard.

**En güçlü üç teknik nokta.**
> Birincisi: Kanban sıralamasının sahibi sunucu. İstemci yalnızca issue, hedef
> kolon ve hedef indeks gönderiyor; sunucu gerçek sırayı okuyup yeniden
> numaralandırıyor ve hepsini tek bir `Serializable` transaction içinde yazıyor.
>
> İkincisi: proje bazlı issue numaraları yarış durumuna dayanıklı. Sayaç proje
> satırında ve issue'yu yaratan transaction içinde artırılıyor; `count + 1`
> gerçek bir yarış olurdu. Son güvence `(projectId, number)` composite unique
> index.
>
> Üçüncüsü: production'da tek origin. Express hem `/api/*` isteklerini
> karşılıyor hem derlenmiş React uygulamasını sunuyor, böylece oturum cookie'si
> first-party kalıyor ve `SameSite=Lax` anlamını koruyor.

---

## 3. 5 dakikalık canlı demo

> **Kural:** Her adımda **bir cümle** söyle ve devam et. Demoda kod açma; kod
> sorusu gelirse "isterseniz sonra depoda gösterebilirim" de.

### Adım 1 — Canlı uygulamayı aç (0:00)
Ekran: https://devflow-902d.onrender.com
> "Bu canlı sürüm — Render'da tek bir servis hem API'yi hem React uygulamasını
> aynı origin üzerinden sunuyor."

### Adım 2 — Giriş yap (0:20)
> "Kimlik doğrulama e-posta ve parola. Parolalar Argon2id ile hash'leniyor ve
> oturum veritabanında bir satır; tarayıcıya giden şey HTTP-only bir cookie,
> yani sayfadaki JavaScript onu okuyamıyor."

*(İstersen DevTools → Application → Cookies açıp `HttpOnly` ve `Secure`
işaretlerini göster — beş saniye sürer ve çok etkilidir.)*

### Adım 3 — Workspace'i göster (0:50)
> "Her şey bir workspace'in içinde. Üstteki seçici yalnızca üyesi olduğum
> workspace'leri listeliyor; başka birinin workspace'ine ait bir id'yi adres
> çubuğuna yazsam sunucu veri değil 404 döner."

### Adım 4 — Rolleri anlat (1:10)
Ekran: Members sayfası
> "Üç rol var. Buradaki kontroller rolüme göre görünüyor ya da görünmüyor — ama
> bu yalnızca kullanıcı deneyimi. Rol her istekte veritabanından okunuyor ve
> elle hazırlanmış bir istek de aynı 403'ü alıyor."

### Adım 5 — Bir projeyi aç (1:35)
> "Projeler bir workspace'e ait ve her projenin değiştirilemez bir anahtarı var.
> Anahtar workspace içinde benzersiz, yani iki farklı ekip ikisi de `API`
> kullanabiliyor."

### Adım 6 — Bir issue oluştur veya incele (1:55)
> "Issue'nun tipi, önceliği, statüsü, atanan kişisi, sprint'i ve bitiş tarihi
> var. Raporlayan kişi her zaman oturumdaki kullanıcı — istek gövdesinden asla
> okunmuyor. Atanan kişi bu workspace'in üyesi olmak zorunda, aksi hâlde sunucu
> reddediyor."

### Adım 7 — Issue anahtarını göster (2:20)
> "Şu anahtar — örneğin `API-14` — projeye özel. Sayaç proje satırında ve
> issue'yu yaratan transaction içinde artırılıyor, yani iki kişi aynı anda issue
> açsa bile aynı numarayı alamıyorlar. Veritabanındaki composite unique index de
> son güvence."

**Bu, demonun en güçlü 20 saniyesi. Yavaş söyle.**

### Adım 8 — Filtreleri göster (2:45)
> "Filtreler URL'de yaşıyor. Yani geri tuşu, sayfa yenileme ve paylaşılan bir
> bağlantı aynı görünümü veriyor. Filtreleme ve sayfalama veritabanında yapılıyor,
> tarayıcıda değil."

*(Bir filtre uygula, sayfayı yenile, aynı görünümün geldiğini göster.)*

### Adım 9 — Kanban'da bir kart taşı (3:10)
> "Kartı taşıdığımda istemci sadece üç şey gönderiyor: issue, hedef kolon ve
> hedef indeks. Sıralamayı sunucu yazıyor ve etkilenen kolonları yeniden
> numaralandırıp hepsini tek transaction içinde kaydediyor. Ekranda gördüğüm
> pano sunucunun onayladığı pano; sunucu reddederse istemci eski panoya geri
> dönüyor."

*(Sayfayı yenile ve kartın yeni yerinde kaldığını göster.)*

> "Sürüklemek tek yol değil — her kartın bir 'Move to' seçicisi var, çünkü
> klavye kullanan biri dışarıda kalmamalı."

### Adım 10 — Yorum ekle (3:40)
> "Yorumlar düz metin. Düzenlemeyi yalnızca yazarı yapabiliyor; silmeyi yazar,
> OWNER ve ADMIN yapabiliyor — moderasyon yazarlık değil."

### Adım 11 — Aktiviteyi göster (3:55)
> "Bu akış append-only bir kayıt. Veritabanında cümle değil, yapılandırılmış
> alanlar duruyor — önceki statü, sonraki statü gibi. Okunabilir cümle istemcide
> kuruluyor, yani kelimeleri değiştirmek migration gerektirmiyor."

### Adım 12 — Dashboard'u göster (4:10)
> "Bu ekranın tamamı tek bir istek. Sayımlar PostgreSQL'de `count` ve `groupBy`
> ile yapılıyor; issue'ları indirip tarayıcıda saymıyorum. 'Geciken' hesabı
> sunucu saatine göre — tarayıcıdan gelen bir tarihe güvenmiyorum."

### Adım 13 — GitHub deposunu göster (4:25)
Ekran: https://github.com/emirseren100/DevFlow
> "Commit geçmişi fazlara bölünmüş ve squash edilmedi — projenin nasıl
> büyüdüğünü okuyabiliyorsunuz. `docs` klasöründe mimari, 91 teknik karar
> reddedilen alternatifleriyle, dağıtım rehberi ve QA matrisi var."

### Adım 14 — CI'yı göster (4:40)
Ekran: Actions sekmesi
> "Her push'ta aynı iş çalışıyor: kurulum, şema doğrulama, Prisma Client,
> migration'ları tek kullan-at bir PostgreSQL'e uygulama, typecheck, testler ve
> production build. Hiçbir adım yumuşak geçmiyor."

### Adım 15 — Docker ve Render'ı özetle (4:50)
> "Dağıtım imajı çok aşamalı: build aşamasında TypeScript ve Prisma CLI var,
> çalışan imajda yalnızca derlenmiş sunucu, derlenmiş client, şema ve
> migration'lar. Konteyner önce `prisma migrate deploy` çalıştırıyor; başarısız
> olursa `&&` sayesinde sunucu hiç başlamıyor ve platform önceki sürümü
> çalıştırmaya devam ediyor."

**Bitiş (5:00):**
> "Eksikleri de biliyorum: gerçek zamanlı güncelleme yok, e-posta akışları yok,
> rate limiter bellekte ve uçtan uca test yok. Hepsi depoda bilinen sınırlar
> olarak yazılı."

---

## 4. 10 dakikalık teknik sunum

**Yapı:** 1 dk giriş · 2 dk mimari · 3 dk üç derin konu · 2 dk test ve altyapı ·
1 dk sınırlar · 1 dk soru.

### 0:00–1:00 — Giriş
30 saniyelik tanıtımı kullan, sonra ekle:
> "Bugün üç şeye odaklanacağım: mimari, eşzamanlılık gerektiren iki yer ve
> production kararları."

### 1:00–3:00 — Mimari
Beyaz tahtaya ya da ekrana şunu çiz:

```
Tarayıcı → React → apiClient (credentials: include)
  → Express: helmet → CORS → json(100kb) → cookie → origin kontrolü → rate limit
  → Zod doğrulama → requireAuth → requireWorkspaceMember → requireProject
  → service (transaction) → Prisma → PostgreSQL
  ← { success, data } ← TanStack Query ← React
```

> "Dikkat çekmek istediğim şey sıra. Her istek önce doğrulanıyor, sonra
> 'kimsin', sonra 'burada bunu yapabilir misin'. Yetkilendirme URL'deki
> workspace id'siyle yapılan bir veritabanı filtresi — iç içe URL bir iddia,
> `where` filtresi kanıt."

### 3:00–6:00 — Üç derin konu

**(a) Issue numaralandırma ve yarış durumu (1 dk)**
> "İki kullanıcı aynı anda issue açarsa aynı numarayı almamalı. `count + 1`
> yaklaşımında ikisi de aynı sayımı okur, çünkü okuma kilit almaz. Sayacı proje
> satırında tutup issue'yu yaratan transaction içinde `increment` ediyorum —
> `UPDATE` o satırı kilitliyor ve ikinci istek bir sonraki numarayı alıyor. Son
> güvence `(projectId, number)` composite unique index; gelecekte biri
> transaction'ı unutursa veritabanı sessiz bozuk veri yerine gürültülü hata
> veriyor."

**(b) Kanban sıralaması ve `Serializable` (1 dk)**
> "Kolon `status`, kolon içi yer `position` — kolona özel bir tamsayı. İstemci
> üç değer gönderiyor; sunucu hedef kolonu gerçek sırayla okuyup indeksi
> kırpıyor, kartı yerleştiriyor, hedefi ve gerekiyorsa kaynağı yeniden
> numaralandırıyor ve bir aktivite satırı yazıyor. Hepsi tek `Serializable`
> transaction; PostgreSQL bir yazma çakışması bildirirse (`P2034`) en fazla üç
> kez deneniyor. Sınırsız retry düzeltme değil, kilitlenmedir."

**(c) Kimlik doğrulama ve tek origin (1 dk)**
> "Oturum veritabanında bir satır; cookie 32 rastgele bayt taşıyor ve
> veritabanında yalnızca SHA-256 hash'i duruyor, yani sızan bir yedek kullanılır
> oturum içermiyor. Çıkış satırı sildiği için iptal anında. Parolada Argon2id
> ama token'da SHA-256 kullanıyorum, çünkü token zaten 256 bit rastgelelik —
> yavaş bir hash her istekte gecikme ekler, hiçbir şey kazandırmaz.
> Production'da tek origin seçtim: cookie first-party kalıyor, `SameSite=Lax`
> anlamını koruyor ve origin kontrolü tek bir tam dize karşılaştırması."

### 6:00–8:00 — Test ve altyapı
> "314 test var. Sunucu tarafı Supertest ile gerçek Express uygulamasına gerçek
> HTTP isteği atıyor ve **gerçek** bir PostgreSQL test veritabanına karşı
> çalışıyor, çünkü önemsediğim hatalar — unique constraint, cascade,
> transaction, rol kontrolü — bir mock'ta zaten yok. Test kurulumu, veritabanı
> URL'sinde `devflow_test` geçmiyorsa hiçbir şeyi başlatmıyor ve bu kontrol
> Prisma import edilmeden önce çalışıyor.
>
> CI her push'ta migration'ları boş bir veritabanına uyguluyor — bu, işlenmiş
> geçmişin gerçekten çalıştığını kanıtlıyor; `db push` bu kontrolü tamamen
> atlardı. Dağıtım imajı çok aşamalı ve konteyner `migrate deploy && node
> dist/server.js` ile başlıyor; o `&&` işaretinin kendisi bir güvenlik
> özelliği."

### 8:00–9:00 — Sınırlar
> "Gerçek zamanlı güncelleme yok — başkasının değişikliği yeniden yüklemede
> görünüyor. E-posta akışı yok: doğrulama, parola sıfırlama, davet yok. Rate
> limiter süreç içi ve bellekte, yani çok örnekli bir dağıtım paylaşılan bir
> depo ister. Origin kontrolü tam bir CSRF-token akışı değil. Silme kalıcı.
> Uçtan uca test yok. Hepsi README ve QA dosyasında yazılı — ilk düzelteceğim
> şey parola sıfırlama, çünkü bugün parolasını unutan kullanıcı sıkışıp
> kalıyor."

### 9:00–10:00 — Soru
> "Hangi kısma daha derin inmemi istersiniz?"

---

## 5. Yedek plan

> **Altın kural:** Demo bozulduğunda paniklemeyeceksin. Hazırlıklı olduğunu
> göstermek, demonun kendisi kadar iyi bir sinyal.

### Render uykudan uyanıyorsa (ücretsiz katman)
- **Belirti:** İlk istek 30–60 saniye sürüyor.
- **Ne yap:** Görüşmeden **10 dakika önce** adresi bir kez aç. Yine de olursa:
  > "Ücretsiz katmanda servis boştayken uyuyor; ilk istek onu uyandırıyor. Bu
  > arada mimariyi anlatayım."
  ve beklerken 2 dakikalık genel bakışa geç.

### Giriş başarısız olursa
- Önce **kendi hesabınla** dene (demo hesabı değil).
- Konsol/Network'e bak: `403 INVALID_ORIGIN` ise adres çubuğundaki alan adı
  beklenen origin değildir; `401` ise parola.
- Ne yap: kayıt sayfasından yeni bir hesap aç ve boş durumları göster —
  > "Aslında bu iyi bir fırsat: boş durumlar da tasarlanmış, her biri bir
  > sonraki eylemi adlandırıyor."

### Veritabanı erişilemiyorsa
- **Belirti:** Sayfa açılıyor ama her istek hata veriyor; `/api/health` yine de
  `200`.
- Ne söyle:
  > "Sağlık ucu bilerek veritabanına dokunmuyor — 'süreç ayakta mı' ile
  > 'veritabanı ayakta mı' iki ayrı soru. Şu an ikincisi hayır."
- Yerel yedeğe ya da ekran görüntülerine geç.

### Demo yavaşsa
- Adım 8 (filtreler) ve adım 11 (aktivite) atlanabilir; adım 7 (issue anahtarı)
  ve adım 9 (Kanban) atlanamaz — en güçlü iki nokta orada.

### Tarayıcı eski build'i cache'lemişse
- **Belirti:** Yeni dağıtımdan sonra eski arayüz.
- Ne yap: sert yenileme (`Ctrl+Shift+R`) ya da gizli sekme.
- Ne söyle:
  > "`index.html` cache'lenmiyor, `/assets` altındaki dosyalar ise Vite
  > tarafından hash'lendiği için uzun süre cache'lenebiliyor — bu yüzden yeni
  > dağıtım normalde anında görünüyor."

### İnternet giderse
- **Yerel yedek:**
  ```bash
  npx prisma dev --name devflow
  ```
  ```bash
  npm run dev
  ```
  ve http://localhost:5174 üzerinden seed verisiyle devam et.
- **Ekran görüntüsü yedeği:** Beş görüntü hazır bulundur — dashboard, filtreli
  issue listesi, issue detayı + yorumlar, Kanban panosu, mobil düzen. Bunlar
  zaten README için de gerekiyor (bkz. [FINAL_QA.md](FINAL_QA.md) bulgu F-4).
- Ne söyle:
  > "Bağlantı gitti; ekran görüntüleri üzerinden aynı akışı anlatayım, sonra
  > isterseniz bağlantı gelince canlıda gösteririm."

### Demo öncesi kontrol listesi

- [ ] Canlı adres 10 dakika önce açıldı ve uyandı
- [ ] Kendi hesabınla giriş yapılabiliyor
- [ ] Demo workspace'inde gerçek veri var (2 proje, 6–10 issue, birkaç yorum,
      birkaç aktivite, bir geciken issue)
- [ ] GitHub deposu ve Actions sekmesi ayrı sekmelerde açık
- [ ] Ekran görüntüleri klasörü açık
- [ ] Yerel kurulum çalışır durumda (veritabanı sunucusu ayakta)
- [ ] Bildirimler kapalı, ekran paylaşımı denendi
