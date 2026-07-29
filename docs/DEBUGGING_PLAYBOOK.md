# DevFlow — Hata Ayıklama El Kitabı

> Tekrarlanabilir bir yöntem ve DevFlow'a özgü 24 gerçekçi senaryo.
>
> İlgili: [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) ·
> [PROJECT_FILE_MAP.md](PROJECT_FILE_MAP.md) · [FINAL_QA.md](FINAL_QA.md)

> **Güvenlik kuralı.** Hiçbir senaryonun varsayılan çözümü production verisini
> sıfırlamak değildir. `prisma migrate reset`, `prisma db push` ve seed
> production'da **asla** çalıştırılmaz — bu yüzden hiçbiri bu depoda bir npm
> script'ine bağlı değil.

---

## Yöntem — 11 adım

1. **Yeniden üret.** Tam adımları yaz. Yeniden üretemediğin şeyi
   düzeltemezsin, düzelttiğini de kanıtlayamazsın.
2. **Kapsamı daralt.** İstemci mi, sunucu mu, veritabanı mı, ortam mı?
   Tek soru: "hata hangi sınırı geçince ortaya çıkıyor?"
3. **Hatayı gerçekten oku.** Tam mesajı, hata kodunu ve satır numarasını.
   Prisma `P1001` ile `P2034` tamamen farklı hikâyeler.
4. **Network isteğine bak.** Tarayıcı DevTools → Network: durum kodu, istek
   başlıkları (`Cookie`, `Origin`), yanıt gövdesindeki `code`.
5. **Sunucu log'una bak.** Yerelde terminal, Docker'da `docker compose logs`,
   production'da Render Logs sekmesi.
6. **Ortamı kontrol et.** `CLIENT_ORIGIN`, `DATABASE_URL`, `VITE_API_URL`,
   `NODE_ENV`. Değerleri ekrana basma; adlarını ve şekillerini kontrol et.
7. **Veritabanına bak.** `npm run db:status`, `npm run db:check`, gerekirse
   `npm run db:studio` (yalnızca yerel).
8. **Dar bir test yaz.** Düzeltmeden **önce başarısız olan** bir test. Bu, hem
   hatayı sabitler hem tekrar etmesini engeller.
9. **Kök nedeni düzelt.** Belirtiyi bastırmak (retry ekleme, `try/catch` ile
   yutma, bağımlılığı listeden çıkarma) düzeltme değildir.
10. **Regresyonu doğrula.** İlgili suite'i, sonra tüm suite'i ve typecheck'i
    çalıştır.
11. **Sonucu yaz.** Bir cümle: belirti — kök neden — düzeltme. Gerekiyorsa
    `docs/LEARNING_LOG.md` veya `docs/FINAL_QA.md` içine.

### Hızlı komut kutusu

```bash
npm run db:status
```
```bash
npm run db:check
```
```bash
npm run test:server
```
```bash
npm run typecheck
```

---

## Senaryolar

---

### 1. Vite portu 5174 dolu

- **Belirti:** `npm run dev` başlarken `Port 5174 is already in use` ve süreç
  çıkıyor (Vite `strictPort: true`).
- **Olası sebepler:** Önceki bir dev sunucu hâlâ çalışıyor; başka bir proje aynı
  portu kullanıyor; Docker Compose client'ı yanlışlıkla 5174'e eşlenmiş.
- **İlk kontrol:** Portu kim tutuyor?
  ```bash
  netstat -ano | grep 5174
  ```
- **Yararlı araç:** Terminal; Windows'ta `taskkill /PID <pid> /F`.
- **İlgili dosyalar:** `client/vite.config.ts`, `docker-compose.yml`
- **Güvenli çözüm:** Eski süreci kapat. **Portu değiştirme** — `strictPort`
  bilerek açık: Vite sessizce başka bir porta kaysaydı sunucunun
  `CLIENT_ORIGIN`'i artık eşleşmez ve her mutasyon `403 INVALID_ORIGIN` alırdı.
- **Regresyon testi:** Yok (ortam sorunu). Ama davranış `config.ts` origin
  testleriyle korunuyor.
- **Mülakat açıklaması:** "Portu sabitledim çünkü kayan bir port sessizce CORS
  ve origin kontrolünü bozardı; gürültülü hata sessiz hatadan iyidir."

---

### 2. Frontend backend'e ulaşamıyor

- **Belirti:** Her istek "The server could not be reached." mesajıyla düşüyor.
- **Olası sebepler:** API süreci çalışmıyor; `VITE_API_URL` yanlış; yanlış port;
  sunucu ortam doğrulamasında çökmüş.
- **İlk kontrol:**
  ```bash
  curl -i http://localhost:4000/api/health
  ```
- **Yararlı araç:** Network sekmesi — istek gerçekten nereye gidiyor?
- **İlgili dosyalar:** `client/src/lib/env.ts`, `client/.env`,
  `server/src/server.ts`, `server/src/config.ts`
- **Güvenli çözüm:** Sunucu terminalini oku; `Invalid server environment` mesajı
  varsa eksik değişkeni doldur. `VITE_API_URL` değişikliği **rebuild/restart**
  ister, çünkü Vite değeri derleme zamanında gömüyor.
- **Regresyon testi:** `client/src/test/deployment.test.ts` API base parser'ı
  doğruluyor.
- **Mülakat açıklaması:** "İstemci ağ hatasını da tipli `ApiError`'a çeviriyor,
  böylece ekran çökmüyor ve kullanıcıya anlaşılır bir mesaj gidiyor."

---

### 3. CORS hatası

- **Belirti:** Konsolda `has been blocked by CORS policy`.
- **Olası sebepler:** Sunucudaki `CLIENT_ORIGIN`, tarayıcının gerçekten
  gösterdiği adresle birebir aynı değil (port, protokol veya sondaki eğik çizgi);
  Docker'da client 5175'te ama sunucu 5174 bekliyor.
- **İlk kontrol:** Konsol mesajındaki reddedilen origin'i, sunucunun başlangıçta
  yazdığı `Allowed client origin: …` satırıyla karşılaştır.
- **Yararlı araç:** Network → başarısız isteğin **Request Headers → Origin**.
- **İlgili dosyalar:** `server/src/config.ts`, `server/src/app.ts`,
  `docker-compose.yml`
- **Güvenli çözüm:** `CLIENT_ORIGIN`'i tam adresle eşitle. Wildcard yapma:
  `*` ile `credentials` birlikte zaten yasak ve cookie çalışmaz.
- **Ayırt et:** Gerçek CORS hatası tarayıcı tarafından üretilir ve yanıt gövdesi
  yoktur. `403 INVALID_ORIGIN` ise **sunucudan** gelir ve gövdesinde kod vardır.
- **Regresyon testi:** `server/src/test/security.test.ts` origin kabul/red
  senaryoları.

---

### 4. Cookie tarayıcıda saklanmıyor

- **Belirti:** Giriş `200` dönüyor ama sonraki istekler `401`.
- **Olası sebepler:** İstek `credentials: 'include'` göndermiyor; cookie
  `Secure` ve sayfa `http://` üzerinde; origin ile API farklı site ve
  `SameSite=Lax` engelliyor.
- **İlk kontrol:** Application → Cookies: `devflow_session` var mı?
- **Yararlı araç:** Network → login yanıtında `Set-Cookie` başlığı.
- **İlgili dosyalar:** `server/src/modules/auth/auth.service.ts`
  (`setSessionCookie`), `client/src/lib/apiClient.ts`
- **Güvenli çözüm:** Yerelde `NODE_ENV` production olmamalı, aksi hâlde
  `secure: true` olur ve `http://localhost` cookie'yi saklamaz. Bu, production
  provasında `http://localhost:10000` üzerinden giriş yapılamamasının da doğru
  sebebidir.
- **Regresyon testi:** `auth.test.ts` `Set-Cookie` niteliklerini doğruluyor.
- **Mülakat açıklaması:** "`Secure` yalnızca production'da; yerel geliştirme
  HTTP üzerinden çalışıyor. Provada giriş yapılamaması bir hata değil, kuralın
  çalıştığının kanıtı."

---

### 5. Giriş çalışıyor ama yenileyince çıkış oluyor

- **Belirti:** Giriş sonrası uygulama açılıyor, F5'te `/login`.
- **Olası sebepler:** Cookie oturum (session) cookie'si olarak yazılmış
  (`maxAge` yok); `GET /auth/me` cookie göndermiyor; oturum satırı hemen
  siliniyor; `SESSION_TTL_DAYS` çok küçük.
- **İlk kontrol:** Application → cookie'nin **Expires** değeri; sonra Network'te
  `/auth/me` isteğinde `Cookie` başlığı gidiyor mu.
- **İlgili dosyalar:** `auth.service.ts`, `client/src/auth/AuthProvider.tsx`
- **Güvenli çözüm:** `maxAge` `SESSION_TTL_MS` ile eşit; `apiRequest` her
  istekte `credentials: 'include'` gönderiyor.
- **Regresyon testi:** "yenilemeden sonra oturum geri yükleniyor" entegrasyon
  testi.

---

### 6. Girişten sonra 401

- **Belirti:** Giriş başarılı, ama korumalı bir uç nokta `401 UNAUTHENTICATED`.
- **Olası sebepler:** Cookie gitmiyor (bkz. 4); oturum süresi dolmuş; `.env`
  değişince `SESSION_COOKIE_NAME` farklı ve sunucu başka bir cookie arıyor.
- **İlk kontrol:** İstekte giden cookie **adı** sunucunun aradığı adla aynı mı?
- **İlgili dosyalar:** `server/src/config.ts` (`SESSION_COOKIE_NAME`),
  `auth.middleware.ts`
- **Güvenli çözüm:** Cookie adını hizala; eski cookie'yi tarayıcıdan sil.
- **Mülakat açıklaması:** "401 kimliğin yok demektir; 403 ile karıştırılırsa
  istemci giriş formu yerine pes eder — bu yüzden ayrımı sıkı tutuyorum."

---

### 7. Bir OWNER 403 alıyor

- **Belirti:** Workspace sahibi olduğunu bildiğin kullanıcı `403` görüyor.
- **Olası sebepler:** (a) Hata aslında `INVALID_ORIGIN`; (b) kullanıcı **o**
  workspace'te OWNER değil — rol workspace'e özgüdür; (c) `Workspace.ownerId`
  var ama `WorkspaceMember` satırı yok; (d) URL'deki workspace id başka bir
  workspace'e ait.
- **İlk kontrol:** Yanıt gövdesindeki `code` alanı: `FORBIDDEN` mı
  `INVALID_ORIGIN` mı?
- **Yararlı araç:** `npm run db:studio` (yalnızca yerel) → `workspace_members`
  satırı.
- **İlgili dosyalar:** `workspace.authorization.ts`, `requireAllowedOrigin.ts`
- **Güvenli çözüm:** Erişimi veren şey **üyelik satırı**, sahiplik değil. Bu
  yüzden workspace oluşturma transaction'ı ikisini birlikte yazıyor.
- **Regresyon testi:** `workspace.test.ts` "sahip ama üyeliği yok" senaryosu.

---

### 8. Yinelenen proje anahtarı

- **Belirti:** Proje oluşturma `409 PROJECT_KEY_IN_USE`.
- **Olası sebepler:** Aynı workspace'te aynı anahtar zaten var (arşivlenmiş bir
  proje de sayılır).
- **İlk kontrol:** Arşivlenmiş projeleri de içeren listeyi kontrol et.
- **İlgili dosyalar:** `project.service.ts`, `schema.prisma`
  (`@@unique([workspaceId, key])`)
- **Güvenli çözüm:** Farklı bir anahtar seç. Anahtar bilerek **değiştirilemez**,
  çünkü `API-14` sohbetlere ve commit'lere yazılıyor.
- **Mülakat açıklaması:** "Benzersizlik workspace kapsamlı; iki farklı ekip
  ikisi de `API` kullanabiliyor."

---

### 9. Geçersiz workspace erişimi (404 mü 403 mü?)

- **Belirti:** Başka bir workspace'in proje id'siyle istek `404 PROJECT_NOT_FOUND`
  dönüyor, `403` değil.
- **Sebep:** Bu **kasıtlı**. `requireProject` projeyi URL'deki workspace ile
  filtreleyerek arıyor; "yok" ile "senin değil" aynı cevabı veriyor, böylece
  yanıt yabancı bir id'nin gerçek olduğunu doğrulamıyor.
- **İlk kontrol:** URL'deki workspace id ile projenin gerçek workspace'i aynı mı?
- **İlgili dosyalar:** `project.authorization.ts`
- **Regresyon testi:** `project.test.ts` "başka workspace'in projesi" senaryosu.

---

### 10. Prisma Client üretilmemiş

- **Belirti:** `Cannot find module '../generated/prisma'` ya da `@prisma/client
  did not initialize yet`.
- **Sebep:** `src/generated/prisma` git-ignore'lu; taze bir klon ya da temiz bir
  kurulum sonrası üretilmesi gerekiyor.
- **Çözüm:**
  ```bash
  npm run db:generate
  ```
- **İlgili dosyalar:** `server/prisma/schema.prisma`, `server/prisma.config.ts`
- **Not:** CI bunu ayrı bir adım olarak çalıştırıyor, tam da bu yüzden.

---

### 11. `DATABASE_URL` eksik

- **Belirti:** Süreç başlamıyor:
  `Invalid server environment:\n  - DATABASE_URL: DATABASE_URL is required.`
- **Sebep:** `server/.env` yok ya da anahtar boş.
- **Çözüm:** `server/.env.example`'ı kopyala ve doldur.
- **İlgili dosyalar:** `server/src/config.ts`
- **Mülakat açıklaması:** "Varsayılan koymadım bilerek — yanlış bir veritabanına
  sessizce bağlanmaktansa başlangıçta gürültülü başarısız olmak iyi. Hata mesajı
  değişken adını ve kuralı yazıyor, değeri asla, çünkü o değer bir parola
  taşıyor."

---

### 12. Test veritabanı erişilemiyor *(bu makinede en sık görülen)*

- **Belirti:** `npm test` sırasında sunucu test dosyaları
  `PrismaClientKnownRequestError` ile düşüyor; istemci testleri geçiyor.
- **Sebep:** Test veritabanı, tek kullan-at yerel `prisma dev` sunucusundaki
  `devflow_test` şeması ve o sunucu çalışmıyor.
- **İlk kontrol:**
  ```bash
  npm run db:status
  ```
- **Çözüm:** Sunucuyu başlat, sonra testleri çalıştır:
  ```bash
  npx prisma dev --name devflow
  ```
- **İlgili dosyalar:** `server/.env.test`, `server/prisma/testDbUrl.ts`
- **Not:** `prisma dev` sunucusu yeniden yaratılırsa portlar değişebilir; o
  durumda `server/.env` ve `server/.env.test` içindeki URL'ler güncellenmeli.
- **Kayıt:** [FINAL_QA.md](FINAL_QA.md) bulgu **F-7**.

---

### 13. Test veritabanı güvenlik kontrolü hata veriyor

- **Belirti:** `Refusing to run against "postgresql://***@…": the test database
  URL must contain "devflow_test".`
- **Sebep:** `DATABASE_URL` geliştirme veritabanını gösteriyor.
- **İlk kontrol:** `server/.env.test` var mı ve adında `devflow_test` geçiyor mu?
- **İlgili dosyalar:** `server/prisma/testDbUrl.ts`
- **Güvenli çözüm:** Doğru URL'yi ayarla. **Kontrolü kaldırma** — testler satır
  siliyor ve bu kilit tam olarak geliştirme verisini korumak için var.
- **Mülakat açıklaması:** "Kontrol, uygulama — dolayısıyla Prisma — import
  edilmeden önce çalışıyor; yanlış yazılmış bir URL hiçbir şeye bağlanamadan
  reddediliyor."

---

### 14. PostgreSQL erişilemiyor

- **Belirti:** `P1001: Can't reach database server at …`
- **Olası sebepler:** Veritabanı süreci kapalı; yanlış host/port; Docker'da
  konteyner henüz hazır değil; production'da bölge/IP kısıtı.
- **İlk kontrol:** Port dinleniyor mu?
  ```bash
  netstat -ano | grep 51214
  ```
- **Yararlı araç:** Docker'da `docker compose logs postgres`.
- **Güvenli çözüm:** Veritabanını başlat ve hazır olmasını bekle. Compose'da
  `pg_isready` healthcheck'i zaten bunu yapıyor; yeni bir servis eklerken de
  aynısını yap.

---

### 15. Migration başarısız oldu

- **Belirti:** `migrate deploy` hata veriyor; production'da `P3009` — "önceki
  bir migration yarım kaldı".
- **İlk kontrol:**
  ```bash
  npm run db:status
  ```
- **İlgili dosyalar:** `server/prisma/migrations/`
- **Güvenli çözüm:** Yerelde: neyin uygulandığını incele, migration'ı düzelt ve
  tekrar dene. **Production'da: asla sıfırlama.** Durumu incele ve **ileri
  yönlü** bir migration yaz. Kod rollback'i migration'ı geri almaz; DevFlow'un
  migration'ları eklemeli olduğu için eski bir uygulama sürümü yeni şemaya karşı
  çalışabiliyor.
- **Mülakat açıklaması:** "`prisma migrate deploy && node dist/server.js`
  içindeki `&&` bir güvenlik özelliği: başarısız migration sunucuyu hiç
  başlatmıyor, platform önceki sürümü çalıştırmaya devam ediyor."

---

### 16. Seed veriyi kopyalıyor

- **Belirti:** `npm run db:seed` iki kez çalıştırıldığında satırlar
  çoğalıyor — ya da çoğalmıyor ve bunun neden olduğu soruluyor.
- **Sebep/çözüm:** Seed **idempotent**: sabit `seed_*` id'leri ve `upsert`
  kullanıyor, yani ikinci çalıştırma aynı satırları günceller.
- **İlgili dosyalar:** `server/prisma/seed.ts`
- **Kritik kural:** Seed production'da **asla** çalıştırılmaz; hesapları
  paylaşılan, dokümante edilmiş bir parola kullanıyor.

---

### 17. Issue numarası yinelenmiş

- **Belirti:** Aynı projede iki issue aynı numarayı gösteriyor.
- **İlk kontrol:** Gerçekten aynı projede mi? Farklı projelerde `API-1` ve
  `WEB-1` normaldir.
- **Sonra:** Unique index gerçekten yerinde mi?
  ```bash
  npm run db:status
  ```
- **Olası sebep:** `createIssue` dışında, transaction kullanmayan bir kod yolu
  `issue.create` çağırıyor.
- **İlgili dosyalar:** `server/src/modules/issues/issue.service.ts`,
  `schema.prisma` (`@@unique([projectId, number])`)
- **Güvenli çözüm:** Numara tahsisini tek bir yerde tut. Veritabanı kısıtı zaten
  yazmayı reddedeceği için belirti "yinelenen numara" değil, "beklenmedik
  `P2002` hatası" olarak görünür — bu iyi bir şey.
- **Regresyon testi:** `issue.test.ts` eşzamanlı oluşturma senaryosu.

---

### 18. Kanban pozisyonları bozulmuş

- **Belirti:** Bir kolonda pozisyonlar bitişik değil (0, 1, 3) ya da iki kart
  aynı pozisyonda.
- **Olası sebepler:** Taşıma endpoint'i dışında bir yol `status` değiştirip
  `position` bırakmış; bir transaction yarım kalmış.
- **İlk kontrol:** Panoyu yeniden yükle — sunucunun döndüğü sırada da bozuk mu?
  Bozuk değilse sorun istemcinin iyimser güncellemesinde.
- **İlgili dosyalar:** `kanban.service.ts` (`runMove`), `issue.service.ts`
  (`updateIssue` içindeki statü değişimi de pozisyonu yeniden hesaplıyor)
- **Güvenli çözüm:** Kolonu bir taşıma isteğiyle yeniden numaralandır; `runMove`
  hedef kolonu her seferinde 0..n olarak yeniden yazıyor. Elle `UPDATE`
  yazmadan önce hangi kod yolunun `status`'u pozisyonsuz değiştirdiğini bul.
- **Mülakat açıklaması:** "Statüyü değiştiren her yolun pozisyonu da yeniden
  hesaplaması gerekiyor; bunu Phase 6'da `PATCH .../issues/:id` yolunda
  kaçırmıştım ve issue eski kolonundaki pozisyonunu taşıyordu."

---

### 19. TanStack Query bayat veri gösteriyor

- **Belirti:** Bir kayıt oluşturuldu ama liste eski hâlini gösteriyor.
- **Olası sebepler:** Mutation yanlış key'i invalidate ediyor; ekran farklı bir
  key kullanıyor; `staleTime` (30 sn) henüz geçmedi ve invalidation hiç
  yapılmadı.
- **İlk kontrol:** Mutation'ın `onSuccess`'inde hangi key'ler geçiyor ve ekranın
  `useQuery`'si hangi key'i kullanıyor?
- **İlgili dosyalar:** `client/src/lib/queryKeys.ts`, ilgili sayfa
- **Güvenli çözüm:** Key'i factory'den al ve etkilenen kapsamları invalidate et.
  **Aşırı** invalidate etmek de bir hata: proje scope key'ini invalidate etmek
  panoyu refetch edip az önce yazılan onaylı cevabı atar — o yüzden
  `exact: true` ve `…Lists` yardımcıları var.
- **Regresyon testi:** `client/src/test/phase7.test.tsx` durum bazlı mock'larla
  listenin sunucudan yeniden okunduğunu doğruluyor.

---

### 20. React rotası doğrudan açılınca 404

- **Belirti:** `/app/workspaces/…/board` adresi yenilenince 404.
- **Olası sebepler:** SPA fallback yok; imajda `client/dist` yok; fallback API
  404'ünden **önce** takılı (bu durumda tersi olur: `/api/...` HTML döner).
- **İlk kontrol:**
  ```bash
  curl -i https://devflow-902d.onrender.com/app/workspaces/x/projects/y/board
  ```
  Beklenen: `200 text/html`.
- **Sonra:** Sunucu log'unda
  `No client build found at …; serving the API only.` uyarısı var mı?
- **İlgili dosyalar:** `server/src/middleware/serveClient.ts`,
  `server/src/app.ts`, `Dockerfile.production`
- **Regresyon testi:** `server/src/test/deployment.test.ts` — SPA fallback ve
  API 404 sıralaması.

---

### 21. Render health check başarısız

- **Belirti:** Dağıtım "Live" olmuyor; health check zaman aşımına uğruyor.
- **Olası sebepler:** Sunucu `PORT`'u dinlemiyor; ortam doğrulaması başlangıçta
  düşürüyor; migration başarısız olduğu için süreç hiç başlamıyor.
- **İlk kontrol:** Render Logs — `DevFlow API listening on …` satırı var mı?
- **Sonra:** `Invalid server environment: - CLIENT_ORIGIN: …` var mı? Özel alan
  adı kullanılıyorsa `CLIENT_ORIGIN` panelde ayarlanmalı.
- **İlgili dosyalar:** `server/src/server.ts`, `server/src/config.ts`,
  `render.yaml`
- **Güvenli çözüm:** Log'daki ilk hatayı düzelt ve yeniden dağıt. Health check
  düşerken eski sürüm çalışmaya devam ediyor — bu tasarım gereği.

---

### 22. Prisma / OpenSSL uyarısı

- **Belirti:** Konteyner log'unda OpenSSL sürümü hakkında bir Prisma uyarısı.
- **Değerlendirme:** Bu bir **uyarı**, hata değil; genellikle taban imajın
  OpenSSL sürümüyle Prisma'nın beklediği motor ikilisi arasındaki farktan gelir.
- **İlk kontrol:** Uygulama gerçekten çalışıyor mu — `GET /api/health` `200` mü,
  migration'lar uygulandı mı?
- **İlgili dosyalar:** `Dockerfile.production` (Debian slim taban bilerek
  seçildi, çünkü `@node-rs/argon2` hazır glibc ikilileri gönderiyor)
- **Güvenli çözüm:** Uygulama çalışıyorsa acil bir iş yok. Kalıcı çözüm taban
  imajı ile Prisma sürümünü hizalamak.
- **Dürüstlük notu:** Bu uyarının **şu an** production log'unda olup olmadığı
  doğrulanmadı — Render loglarına erişim yok. İddia etme, bak.

---

### 23. Docker daemon çalışmıyor

- **Belirti:**
  `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`
- **Sebep:** Docker CLI kurulu ama Docker Desktop motoru kapalı.
- **İlk kontrol:**
  ```bash
  docker version
  ```
- **Güvenli çözüm:** Docker Desktop'ı başlat ve "Engine running" olmasını bekle.
- **Not:** `docker compose config` daemon olmadan da çalışır (yalnızca YAML
  ayrıştırır); `build` ve `up` çalışmaz. Bu ayrımı bilmek, "Docker doğrulandı"
  demenin ne kadarını kapsadığını dürüstçe söylemeni sağlar —
  [FINAL_QA.md](FINAL_QA.md) tam olarak bu ayrımı yapıyor.

---

### 24. GitHub Actions'ta migration hatası

- **Belirti:** CI, `Apply migrations to the test database` adımında düşüyor.
- **Olası sebepler:** PostgreSQL servisi henüz hazır değil; `DATABASE_URL`
  workflow'da yanlış; bir migration boş veritabanına uygulanmıyor (örneğin
  var olmayan bir kolona bağımlı).
- **İlk kontrol:** Adım log'undaki ilk Prisma hata kodu — `P1001` (erişilemiyor)
  ile `P3018` (migration başarısız) tamamen farklı hikâyeler.
- **İlgili dosyalar:** `.github/workflows/ci.yml`,
  `server/prisma/migrations/`
- **Güvenli çözüm:** `P1001` ise healthcheck ayarları (`--health-retries`);
  migration hatası ise migration'ı yerelde **boş** bir veritabanına karşı
  dene — CI'nın yakaladığı şey tam olarak budur.
- **Mülakat açıklaması:** "CI'da migration çalıştırmamın sebebi bu: işlenmiş
  geçmişin gerçekten boş bir veritabanına uygulandığını kanıtlıyor. `db push`
  bu kontrolü tamamen atlardı."

---

## Belirtiden senaryoya hızlı tablo

| Belirti | Senaryo |
|---|---|
| Port dolu | 1 |
| "Server could not be reached" | 2 |
| Konsolda CORS | 3 |
| `403 INVALID_ORIGIN` | 3, 7 |
| Cookie yok | 4 |
| Yenileyince çıkış | 5 |
| Girişten sonra 401 | 6 |
| OWNER'a 403 | 7 |
| `409 PROJECT_KEY_IN_USE` | 8 |
| Beklenmedik 404 | 9, 20 |
| `Cannot find module generated/prisma` | 10 |
| `Invalid server environment` | 11, 21 |
| Sunucu testleri Prisma hatasıyla düşüyor | 12, 13 |
| `P1001` | 14, 24 |
| `P3009` / `P3018` | 15, 24 |
| Seed davranışı | 16 |
| Numara çakışması / `P2002` | 17 |
| Pano sırası bozuk | 18 |
| Ekran bayat | 19 |
| SPA rotasında 404 | 20 |
| Health check düşüyor | 21 |
| OpenSSL uyarısı | 22 |
| Docker API'ye bağlanamıyor | 23 |

---

## Genel kurallar

1. **Tahmin etme, ölç.** Network sekmesi ve log, fikirden daha hızlı karar
   verdirir.
2. **Belirtiyi değil kök nedeni düzelt.** Retry eklemek, `try/catch` ile yutmak
   ve bağımlılığı listeden çıkarmak düzeltme değildir.
3. **Kontrolleri kaldırma.** Test veritabanı kilidi, origin kontrolü ve
   `strictPort` bilerek gürültü çıkarıyor.
4. **Production verisi kutsaldır.** Sıfırlama yok, seed yok, elle `UPDATE` yok.
5. **Düzeltmeden önce başarısız olan bir test yaz.** Aksi hâlde neyi
   düzelttiğini bilemezsin.
6. **Sonucu yaz.** Bir cümle: belirti — kök neden — düzeltme.
