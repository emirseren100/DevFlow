# DevFlow — Baştan Sona Proje Anlatımı

> Bu dosya projeyi sıfırdan anlatır. Her bölümde altı beat var:
> **1) Basit anlatım · 2) Teknik açıklama · 3) Gerçek dosya yolları ·
> 4) Request/data flow · 5) Sık yapılan hata · 6) Mülakat cevabı**

## Önerilen okuma sırası

1. [PROJECT_FILE_MAP.md](PROJECT_FILE_MAP.md) — depoda ne nerede
2. **PROJECT_WALKTHROUGH.md** (bu dosya) — her şey nasıl çalışıyor
3. [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) — soru–cevap ve alıştırmalar
4. [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) — bozulduğunda ne yapılır
5. [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) — simülasyon mülakatlar
6. [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — canlı gösterim metni
7. [STUDY_PLAN.md](STUDY_PLAN.md) — 14 günlük çalışma planı
8. [FINAL_QA.md](FINAL_QA.md) — doğrulanmış durum ve bilinen eksikler

---

# BÖLÜM A — KAVRAMLAR

## A1. Genel mimari

**Basit anlatım.** Bir web sitesi ve bir sunucu var. Tarayıcı ekranları çiziyor,
sunucu veriyi tutuyor ve kimin neyi yapabileceğine karar veriyor.

**Teknik açıklama.** Tek repoda iki npm workspace'ten oluşan bir monolit.
`client` bir single-page application; yalnızca REST API ile konuşur.
`server` PostgreSQL'e dokunan tek yer; her girdiyi Zod ile doğrular, her istekte
kimlik doğrulama ve yetkilendirme yapar ve tek bir yanıt şekli döner.
Production'da ikisini **aynı process** ve **aynı origin** sunar.

**Dosyalar.** `server/src/app.ts`, `client/src/App.tsx`,
`client/src/router/AppRoutes.tsx`, `docs/ARCHITECTURE.md`.

**Akış.**

```
Tarayıcı
  → React bileşeni (useQuery / useMutation)
  → client/src/lib/apiClient.ts  (fetch, credentials: 'include')
  → Express: helmet → cors → json(100kb) → cookie-parser
             → requireAllowedOrigin → (auth rate limit) → router
  → Zod doğrulama            (400 VALIDATION_ERROR)
  → requireAuth              (401 UNAUTHENTICATED)
  → requireWorkspaceMember   (404 / 403)
  → requireProject           (404 PROJECT_NOT_FOUND)
  → service (iş kuralları, transaction)
  → Prisma Client
  → PostgreSQL
  ← satırlar → düz yanıt nesnesi
  ← { success: true, data }
  ← TanStack Query cache
  ← React yeniden render
```

**Sık yapılan hata.** Yetkiyi yalnızca arayüzde kontrol etmek. Buton gizlemek
güvenlik değildir; `curl` aynı isteği atabilir.

**Mülakat cevabı.** "Tek ürün, tek ekip, tek veritabanı olduğu için monolit
seçtim. Mikroservis, sahip olmadığım bir ölçekleme problemine ağ çağrıları ve
dağıtık hata modları eklerdi. Kod zaten modüllere bölünmüş durumda, yani sınır
gerektiğinde mevcut."

---

## A2. npm workspaces

**Basit anlatım.** Bir klasörde iki proje var ve tek `npm install` ikisini de
kuruyor.

**Teknik açıklama.** Kök `package.json` içinde `workspaces: ["client","server"]`.
Bağımlılıklar tek `node_modules`'a hoist edilir, tek `package-lock.json` olur;
CI ve Docker `npm ci` ile tam olarak aynı ağacı kurar. Kök script'ler
`--workspace` ile delege eder.

**Dosyalar.** `package.json`, `client/package.json`, `server/package.json`.

**Faydaları.** Tek klon, tek kilit dosyası, tek kurulum, kökten çalışan tek
komut seti; CI ile yerel makinenin sapması imkânsıza yakın.

**Sınırları.** Görev grafiği ve build cache'i yok — `npm run build` her seferinde
her şeyi derler. Paketler arası paylaşılan tip paketi yok; tipler bilerek iki
tarafta ayrı tanımlı.

**Neden Nx/Turborepo değil.** İki paket için öğrenilecek ve mülakatta
savunulacak ikinci bir build sistemi. Kazanç (uzaktan cache, etkilenen paket
grafiği) bu boyutta yok.

**Mülakat cevabı.** "İki paket için monorepo aracı ceremony olurdu. npm
workspaces zaten npm ile geliyor ve sıfır maliyeti var. Onlarca paket ve
dakikalarca süren build olsaydı Turborepo'yu düşünürdüm."

---

## A3. React

**Basit anlatım.** Ekranı küçük, yeniden kullanılabilir parçalardan kuruyoruz.

**Teknik açıklama — DevFlow örnekleriyle.**

| Kavram | DevFlow'daki gerçek örnek |
|---|---|
| Bileşen | `client/src/components/ConfirmDialog.tsx` |
| Props | `ConfirmDialog`'a verilen `title`, `onConfirm`, `onCancel` |
| State | `IssueCreatePage.tsx` içindeki kontrollü form alanları (`useState`) |
| Effect | `AuthProvider.tsx` — mount'ta bir kez `GET /api/auth/me` |
| Context | `AuthProvider` / `useAuth()` — oturum açmış kullanıcı |
| Routing | `router/AppRoutes.tsx` |
| Kontrollü form | `LoginPage.tsx`, `RegisterPage.tsx`, `IssueCreatePage.tsx` |
| Korumalı rota | `auth/RequireAuth.tsx` |
| Layout | `layouts/RootLayout.tsx`, `layouts/AppShell.tsx` |
| Yeniden kullanılabilir bileşen | `components/states.tsx`, `components/badges.tsx` |

**Akış (kontrollü form).** Kullanıcı yazar → `onChange` state'i günceller →
React yeniden render eder → `value` state'ten gelir. "Tek doğruluk kaynağı"
React state'idir, DOM değil.

**Sık yapılan hata.** `useEffect` bağımlılık listesini "susturmak" için eksik
bırakmak. Phase 6'da `ActivityFeed` sonsuz refetch yapıyordu; çözüm bağımlılığı
listeden çıkarmak değil, `load` fonksiyonunu `useCallback` ile sabitlemekti.

**Mülakat cevabı.** "Sadece fonksiyon bileşeni ve hook kullandım. Paylaşılan
şeyler bileşen oldu — dialog, rozetler, durum ekranları; her HTML elementinin
etrafına sarmalayıcı yazmadım, o ceremony olurdu."

---

## A4. TypeScript

**Basit anlatım.** Hataları kullanıcı tıklayınca değil, ben yazarken yakalıyor.

**Teknik açıklama.** Strict mode açık; `any` ve `@ts-ignore` yok. API yanıt
tipleri `client/src/lib/*Api.ts` içinde bir kez tanımlanır ve bileşenlere akar.
Sunucuda Zod şemalarından `z.infer` ile tip türetilir, yani şekil iki kez
yazılmaz. `exactOptionalPropertyTypes` açık olduğu için `signal: undefined`
geçmek yerine anahtar tamamen atlanır (`apiClient.ts` içindeki `get()`).

**Derleme zamanı vs çalışma zamanı.** TypeScript **derleme** zamanında biter;
`tsc` çıktısında tip kontrolü kalmaz. Dışarıdan gelen veri (istek gövdesi,
query string, ortam değişkeni) çalışma zamanında **Zod** ile doğrulanır. İkisi
farklı işler yapar; biri diğerinin yerine geçmez.

**Dosyalar.** `client/tsconfig.json`, `server/tsconfig.json`,
`server/src/modules/*/**.schemas.ts`.

**Sık yapılan hata.** "TypeScript var, doğrulamaya gerek yok" demek. `req.body`
tipini elle `RegisterInput` yazmak sadece derleyiciye yalan söylemektir.

**Mülakat cevabı.** "TypeScript sözleşmeyi derleme zamanında tutuyor; Zod aynı
sözleşmeyi çalışma zamanında girdi üzerinde doğruluyor. Issue yanıtını
değiştirdiğimde derleyici değişmesi gereken her ekranı listeledi."

---

## A5. React Router

**Basit anlatım.** Adres çubuğuna göre hangi ekranın çizileceğine karar veriyor.

**Teknik açıklama.**
- **İç içe rotalar:** `/app` bir route ve alt rotaları `Outlet`'e render ediyor,
  yani `AppShell` bir kez mount oluyor.
- **Rota parametreleri:** `workspaces/:workspaceId/projects/:projectId/issues/:issueId`.
- **Korumalı rotalar:** `RequireAuth` sarmalayıcı route'u; oturum yüklenirken
  bekleme durumu, yoksa `/login`.
- **SPA fallback:** production'da `serveClient.ts`, `/api` dışındaki her `GET`
  için `index.html` döner.
- **Doğrudan yenileme:** `/app/workspaces/x/projects/y/board` adresinde F5
  basıldığında sunucu bu adres için bir dosya bilmiyor; fallback aynı belgeyi
  döner ve router doğru sayfayı çizer. **Doğrulandı:** production'da bu adres
  `200 text/html` dönüyor.

**Dosyalar.** `client/src/router/AppRoutes.tsx`,
`server/src/middleware/serveClient.ts`.

**Sık yapılan hata.** Fallback'i API 404'ünden **önce** takmak. O zaman
`/api/does-not-exist` JSON bekleyen istemciye HTML döner. DevFlow'da sıra:
router'lar → `app.use('/api', notFound)` → client router.

**Mülakat cevabı.** "SPA fallback'in API'yi yutmamasının sebebi sıralama:
`/api`'nin kendi JSON 404'ü client router'dan önce takılı."

---

## A6. TanStack Query

**Basit anlatım.** Sunucudan gelen veriyi hatırlıyor, aynı şeyi tekrar tekrar
indirmiyor ve bir değişiklikten sonra tam olarak neyin tazelenmesi gerektiğini
biliyor.

**Teknik açıklama.**
- **Client state vs server state.** Form taslağı tarayıcıya aittir ve her zaman
  doğrudur. Proje listesi PostgreSQL'e ait bir *kopyadır* ve okunduğu anda bayat
  olabilir. İkincisi cache, bayatlık kuralı ve tazeleme ister.
- **Query key.** Cache'teki adres. `client/src/lib/queryKeys.ts` içindeki tek
  factory'den gelir; prefix ile eşleşir.
- **Varsayılanlar** (`lib/queryClient.ts`): `retry: false`, focus'ta refetch yok,
  `staleTime: 30_000`.
- **Mutation + invalidation:** hedeflenmiş, asla "her şeyi invalidate et" değil.

**Gerçek örnekler.**

```ts
// client/src/lib/queryKeys.ts
board: (workspaceId, projectId) => [...queryKeys.project(workspaceId, projectId), 'board']
issueList: (workspaceId, projectId, filters) => [...queryKeys.issues(...), 'list', filters]
```

Invalidation matrisi (uygulanan davranış):

| Mutation | Tazelenen |
|---|---|
| Üye ekleme/çıkarma/rol | members + workspace + dashboard + workspace listesi |
| Proje oluştur/güncelle/sil | proje listeleri + proje detayı + dashboard |
| Issue oluştur/güncelle/sil | issue listeleri + proje detayı + board + proje aktivitesi + dashboard |
| Yorum | yorumlar + issue aktivitesi + proje aktivitesi + dashboard |
| Kanban taşıma | **her zaman** board; **yalnızca gerçek statü değişiminde** issue, listeler, akışlar, dashboard |

**Sık yapılan hata.** Bir scope key'i invalidate ederken altındaki her şeyi de
attığını unutmak. Phase 7'de Kanban taşımasından sonra `project(w,p)` invalidate
edilince board da refetch oluyor ve cache'e az önce yazılmış onaylı pano
çöpe gidiyordu. Çözüm: `exact: true` ve ayrı `…Lists` key'leri.

**Mülakat cevabı.** "Redux client state yönetir; buradaki state'in neredeyse
tamamı server state. Query bana cache, bayatlık, yükleme/hata durumu ve
invalidation veriyor. Gerçek client state'im — kim giriş yapmış — küçük bir React
context'inde."

---

## A7. Express

**Basit anlatım.** İstek küçük fonksiyonlardan oluşan bir kuyruktan geçer; her
biri ya cevaplar ya da bir sonrakine devreder.

**Teknik açıklama.** `createApp()` uygulamayı **dinlemeden** kurar
(`server/src/app.ts`); `server/src/server.ts` portu açar. Bu ayrım Supertest'in
gerçek HTTP isteği atmasını sağlar ve testler port çakışmaz.

Middleware sırası ve **nedeni**:

| # | Middleware | Neden bu sırada |
|---|---|---|
| 1 | `x-powered-by` kapalı | Yığın bilgisini saldırgana vermemek |
| 2 | `helmet` | Başlıklar hata yanıtlarında da olsun |
| 3 | `cors` | Preflight'ı reddeden bir şeyden **önce** cevaplamalı |
| 4 | `express.json({ limit: '100kb' })` | Route gövdeyi okumadan önce ayrıştırılmalı; limit bellek tüketimini engeller |
| 5 | `cookie-parser` | Oturum token'ı cookie olarak gelir |
| 6 | `requireAllowedOrigin` | CORS'tan sonra, yoksa `OPTIONS` bozulur |
| 7 | auth rate limiter | Yalnızca iki auth yolunda |
| 8 | router'lar | — |
| 9 | `app.use('/api', notFound)` | Bilinmeyen API adresi JSON kalmalı |
| 10 | client router (production) | Kalan adresler SPA |
| 11 | `notFound` → `errorHandler` | Hata yakalayıcı dört parametreli olduğu için Express onu tanır |

**Sağlık ucu neden public?** `GET /api/health` platformun "hazır mısın?"
sorusudur; oturum isteseydi platform cevap alamazdı. Ayrıca veritabanına
dokunmaz: veritabanı çökünce API'nin ölü görünmesini istemiyoruz.

**Sık yapılan hata.** Hata yakalayıcıyı üç parametreyle yazmak — Express onu
normal middleware sanar ve hiçbir hata yakalanmaz.

**Mülakat cevabı.** "Sıra kritik. CORS preflight'ı reddedilmeden önce
cevaplamalı, gövde route'tan önce ayrıştırılmalı, 404 route'lardan sonra ama
hata yakalayıcıdan önce olmalı. Birini kaydırırsanız sessizce bir şey bozulur."

---

## A8. REST API

**Basit anlatım.** Her şeyin bir adresi var, fiil ne yapılacağını söylüyor.

**Gerçek DevFlow adresleri.**

```
POST   /api/auth/register        POST /api/auth/login
POST   /api/auth/logout          GET  /api/auth/me
GET    /api/health

GET|POST      /api/workspaces
GET|PATCH|DELETE /api/workspaces/:workspaceId
GET|POST      /api/workspaces/:workspaceId/members
PATCH|DELETE  /api/workspaces/:workspaceId/members/:memberId
GET           /api/workspaces/:workspaceId/dashboard

GET|POST         /api/workspaces/:workspaceId/projects
GET|PATCH|DELETE /api/workspaces/:workspaceId/projects/:projectId

GET|POST         .../projects/:projectId/sprints
PATCH|DELETE     .../projects/:projectId/sprints/:sprintId

GET|POST         .../projects/:projectId/issues
GET|PATCH|DELETE .../projects/:projectId/issues/:issueId

GET|POST         .../issues/:issueId/comments
PATCH|DELETE     .../issues/:issueId/comments/:commentId

GET   .../projects/:projectId/activities
GET   .../projects/:projectId/issues/:issueId/activities

GET   .../projects/:projectId/board
PATCH .../projects/:projectId/issues/:issueId/move
```

**Durum kodları.** 400 doğrulama · 401 oturum yok · 403 izin yok · 404 yok ·
409 çakışma · 413 gövde çok büyük · 429 çok fazla istek · 500 beklenmeyen.

**Kararlı hata kodları.** `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`,
`WORKSPACE_NOT_FOUND`, `MEMBER_NOT_FOUND`, `PROJECT_NOT_FOUND`,
`PROJECT_KEY_IN_USE`, `SPRINT_NOT_FOUND`, `SPRINT_HAS_ISSUES`, `ISSUE_NOT_FOUND`,
`COMMENT_NOT_FOUND`, `INVALID_ASSIGNEE`, `INVALID_SPRINT`, `INVALID_DATE_RANGE`,
`INVALID_FILTER`, `INVALID_SORT`, `EMAIL_IN_USE`, `INVALID_CREDENTIALS`,
`RATE_LIMITED`, `INVALID_ORIGIN`, `PAYLOAD_TOO_LARGE`, `MALFORMED_JSON`,
`INTERNAL_ERROR`.

**Sayfalama ve filtreleme.** `page`, `limit` (varsayılan 20, en fazla 100),
`search`, `status`, `type`, `priority`, `assigneeId`, `reporterId`, `sprintId`,
`unassigned`, `sort`, `order`. Hepsi query string; ayrı uç nokta yok.

**Rota sahiplik doğrulaması.** İç içe URL bir **iddiadır**. Her sorgu ebeveyn
id'sini `where` filtresine koyar: `{ id: projectId, workspaceId }`. Adres
çubuğunda workspace id'sini değiştirmek veri değil `404` döndürür.

**Sık yapılan hata.** Yetkiyi "id tahmin edilemez" varsayımına bırakmak. cuid
tahmin edilemez ama sızabilir; tek koruma filtredir.

**Mülakat cevabı.** "İç içe URL'leri seçtim çünkü yetkilendirme kontrolünü
taşıyorlar: yoldaki workspace id'si her aramanın filtresi."

---

## A9. Zod

**Basit anlatım.** Dışarıdan gelen veriyi, kullanmadan önce kurallara uyup
uymadığına bakarak eliyor.

**Teknik açıklama.** Zod tam olarak iki yerde çalışır:
1. **API kenarı** — `body`, `params`, `query`
   (`server/src/lib/parseBody.ts`, `parseQuery.ts`, modüllerin `*.schemas.ts`
   dosyaları). Hata `400` + alan bazlı `fieldErrors`.
2. **Ortam değişkenleri** — `server/src/config.ts`, import anında bir kez.

Servis içinde tekrar doğrulama yoktur; veri oradan itibaren tipli ve güvenilir.

**TypeScript'ten farkı.** TypeScript derleme zamanında biter; Zod çalışma
zamanında gerçek veriyi kontrol eder. `z.infer` ile şekil iki kez yazılmaz.

**Örnek — kayıt hatası.**

```json
{ "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body",
             "fieldErrors": { "password": ["Password must be at least 8 characters."] } } }
```

**Sık yapılan hata.** Ortam değişkenlerini doğrulamamak. `PORT` string kalır,
`CLIENT_ORIGIN` sonunda eğik çizgiyle gelir ve gece yarısı anlaşılmaz bir CORS
hatası olur.

**Mülakat cevabı.** "Yapılandırma da dışarıdan gelen bir girdi. Zod ile
başlangıçta ayrıştırıyorum ve hata mesajı yalnızca değişken adını ve kuralı
yazıyor — değeri asla, çünkü `DATABASE_URL` parola taşıyor."

---

## A10. PostgreSQL

**Basit anlatım.** Veri, birbirini işaret eden tablolarda duruyor ve veritabanı
bu bağların bozulmasına izin vermiyor.

**DevFlow modelleriyle kavramlar.**

| Kavram | DevFlow'daki örnek |
|---|---|
| Tablo / satır | `issues` tablosu, her issue bir satır |
| Primary key | Her modelde `id String @id @default(cuid())` |
| Foreign key | `Issue.projectId → Project.id` |
| Unique | `User.email`, `Workspace.slug`, `Session.tokenHash` |
| Composite unique | `@@unique([projectId, number])`, `@@unique([workspaceId, userId])`, `@@unique([workspaceId, key])` |
| Index | `@@index([projectId, status, position])` (board sorgusu), `@@index([assigneeId])`, `@@index([workspaceId, createdAt])` |
| Nullable ilişki | `Issue.assigneeId`, `Issue.sprintId` |
| Cascade | `Comment` → issue silinince silinir; `WorkspaceMember` → workspace silinince silinir |
| SetNull | Sprint silinince `Issue.sprintId` null olur — iş kaybolmaz |
| Restrict | `Workspace.owner`, `Issue.reporter`, `Comment.author` — gerçek iş dururken kullanıcı silinemez |
| Enum | `WorkspaceRole`, `ProjectStatus`, `SprintStatus`, `IssueType`, `IssueStatus`, `IssuePriority`, `ActivityType` |
| Transaction | Issue numarası tahsisi, workspace oluşturma, Kanban taşıma |

**İlişki şeması.**

```
User 1─n Workspace                 (ownerId, Restrict)
User n─n Workspace                 WorkspaceMember üzerinden (role, joinedAt)
Workspace 1─n Project 1─n Sprint
                     1─n Issue     (sprintId nullable, SetNull)
User 1─n Issue                     reporter (zorunlu) ve assignee (opsiyonel)
Issue 1─n Comment
Workspace 1─n ActivityLog          (project, issue, actor opsiyonel)
```

**Dosya.** `server/prisma/schema.prisma`.

**Sık yapılan hata.** Rolü `Workspace` ya da `User` üzerinde tutmak. Rol
**çifte** aittir: aynı kişi bir workspace'te OWNER, başkasında MEMBER olabilir.

**Mülakat cevabı.** "Veritabanının garanti edebileceği kuralı uygulama koduna
bırakmadım. `(projectId, number)` composite unique index, transaction'ı unutan
gelecekteki bir kod yolu için son güvence."

---

## A11. Prisma

**Basit anlatım.** Tabloları okunabilir tek dosyada tanımlıyorum, Prisma bana
tipli sorgu fonksiyonları veriyor.

**Teknik açıklama.**
- **Şema:** `server/prisma/schema.prisma` tek doğruluk kaynağı.
- **Prisma Client:** `server/src/generated/prisma`'ya üretilir (git-ignore'lu),
  `server/src/lib/prisma.ts` süreç başına tek örnek verir. Prisma 7,
  `@prisma/adapter-pg` driver adapter'ı üzerinden `pg` havuzuna bağlanır.
- **Yapılandırma:** `server/prisma.config.ts` — şema yolu, migrations klasörü,
  seed komutu.
- **Komutlar:**
  - `db:generate` — client üretir (veritabanı gerekmez)
  - `db:validate` / `db:format` — şema araçları
  - `db:migrate` = `migrate dev` — **migration yazar**, yalnızca yerel
  - `db:deploy` = `migrate deploy` — **işlenmiş migration'ları oynatır**;
    yazmaz, sormaz, sıfırlamaz → container, CI, production
  - `db:seed` — idempotent geliştirme verisi
  - `db:status` — migration durumu
  - `db:check` — salt-okunur sağlık kontrolü

**Neden `db push` değil?** `db push` şemayı veritabanına dayatır ve **geçmiş
bırakmaz**. Ne değiştiğini, ne zaman ve neden değiştiğini gösteren dosya olmaz;
production'da geri alınamaz ve CI "migration'lar gerçekten uygulanıyor mu"
sorusunu kanıtlayamaz.

**Sık yapılan hata.** Production'da `migrate dev` çalıştırmak — sıfırlama
sorabilir. DevFlow'da hiçbir script `migrate reset`'i bağlamaz.

**Mülakat cevabı.** "Migration'lar commit'li, yani her ortam aynı şemaya aynı
gözden geçirilebilir adımlarla ulaşıyor. Production'da yalnızca `migrate deploy`
çalışıyor."

---

## A12. Kimlik doğrulama (tam akışlar)

### Kayıt

```
RegisterPage formu
  → POST /api/auth/register  { name, email, password }
  → Zod (auth.schemas.ts): e-posta trim + lowercase, parola uzunluğu
  → e-posta zaten var mı?  → 409 EMAIL_IN_USE
  → Argon2id ile parola hash'i (@node-rs/argon2)
  → prisma.$transaction: User satırı + PasswordCredential satırı
  → createSession(userId): 32 rastgele bayt (base64url) üret,
    SHA-256 hash'ini Session satırına yaz
  → setSessionCookie: httpOnly, sameSite=lax, secure (yalnızca production),
    path=/, maxAge = SESSION_TTL_DAYS
  → { success: true, data: { user } }
  → AuthProvider setUser → korumalı rotalar açılır
```

Kayıt olmak aynı zamanda giriş yapmaktır — ayrı bir login isteği yok.

### Giriş

```
LoginPage formu
  → POST /api/auth/login  { email, password }
  → Zod
  → verifyCredentials: kullanıcıyı normalize edilmiş e-postayla bul
      - kullanıcı yoksa DUMMY_PASSWORD_HASH'e karşı doğrula (zamanlama eşitliği)
      - Argon2id verify
      - başarısız → 401 INVALID_CREDENTIALS, "Invalid email or password."
        (bilinmeyen e-posta ile yanlış parola **aynı** cevap)
  → createSession + setSessionCookie
  → { user }
```

### Oturum geri yükleme (sayfa yenileme)

```
F5
  → AuthProvider useEffect → GET /api/auth/me
  → tarayıcı devflow_session cookie'sini kendisi ekler
  → attachSession: cookie değerini SHA-256'la, Session'ı tokenHash ile bul
      - satır yok → oturum yok
      - expiresAt geçmişte → satırı sil, oturum yok
  → requireAuth: kullanıcı yoksa 401 UNAUTHENTICATED
  → { user }  → AuthProvider setUser
```

### Çıkış

```
POST /api/auth/logout
  → oturum satırı silinir (yoksa da hata değil)
  → clearSessionCookie
  → istemci: setUser(null), hata temizlenir
```

**Dosyalar.** `server/src/modules/auth/auth.service.ts`, `auth.middleware.ts`,
`auth.routes.ts`, `client/src/auth/AuthProvider.tsx`.

**Sık yapılan hata.** Token'ı `localStorage`'da tutmak. Sayfadaki her script onu
okuyabilir; tek XSS açığı oturumu çalar.

**Mülakat cevabı.** "İstemci hiçbir zaman bir sır tutmuyor. Oturum HTTP-only
cookie'de, veritabanında yalnızca token'ın SHA-256 hash'i var ve çıkış satırı
sildiği için iptal anında oluyor."

---

## A13. Güvenlik kavramları

| Kavram | DevFlow'da |
|---|---|
| **Hashing vs encryption** | Şifreleme çift yönlü, hash tek yönlü. Parola hash'lenir çünkü kimse — biz dahil — geri okuyamamalı. |
| **Argon2id** | OWASP varsayılanı; bilerek yavaş ve bellek-yoğun, GPU tahminini pahalı yapar. Her hash kendi tuzunu ve parametrelerini taşır. |
| **SHA-256 (oturum token'ı)** | Girdi zaten 32 rastgele bayt; tahmin edilecek bir şey yok. Yavaş hash **her istekte** gecikme ekler, hiçbir şey kazandırmaz. |
| **Entropi** | `crypto.randomBytes(32)` = 256 bit. Kaba kuvvetle bulunamaz. |
| **HttpOnly** | `document.cookie` okuyamaz → XSS oturum çalamaz. |
| **Secure** | Yalnızca HTTPS. Production'da açık; `http://localhost` geliştirmesi bozulmasın diye yerelde kapalı. |
| **SameSite=Lax** | Tarayıcı cookie'yi başka siteden gelen POST'a eklemez — klasik CSRF şeklini keser. |
| **CORS** | Tarayıcı kuralı: A origin'indeki sayfa B'nin yanıtını *okuyamaz*. Cookie kullanıldığı için origin tek ve tam değer olmalı; `*` ile credentials birlikte yasaktır. |
| **CSRF** | Tarayıcı cookie'yi isteği hangi sayfa başlattıysa ekler. DevFlow'un savunması: mutasyonlarda `Origin === CLIENT_ORIGIN` tam eşleşme kontrolü. |
| **Origin kontrolü** | `server/src/middleware/requireAllowedOrigin.ts`. `GET/HEAD/OPTIONS` asla engellenmez; eksik `Origin` production'da reddedilir. |
| **Rate limiting** | Yalnızca `login` ve `register`; IP başına, bellekte, 15 dakikada 10 deneme. Reddediş bilinen ve bilinmeyen e-posta için aynı. |
| **Helmet** | Standart güvenlik başlıkları; CSP yalnızca bu process bir **belge** sunduğunda (production, `config.serveClient`). |
| **Gövde limiti** | `express.json({ limit: '100kb' })` → `413 PAYLOAD_TOO_LARGE`. Şemanın izin verdiği en uzun açıklamanın ~10 katı. |
| **Güvenli hata** | Beklenmeyen her şey tek cümle + `INTERNAL_ERROR`; stack trace sunucu log'unda kalır. |

**Sık yapılan hata.** CSP'yi bir JSON API'ye eklemek. CSP bir **belgeyi** korur;
API belge döndürmüyorsa koruyacak bir şey yoktur. DevFlow CSP'yi tam olarak
client'ı sunduğu kurulumda açar.

**Mülakat cevabı.** "Origin kontrolü tam bir CSRF-token akışı değil, ama bu
topolojide yeterli: sayfa JavaScript'i `Origin` başlığını uyduramaz ve kontrol
on beş okunabilir satır. Farklı bir alt alan adı ya da proxy eklenirse yeniden
gözden geçirilmesi gerekir."

---

## A14. Yetkilendirme

**Basit anlatım.** Giriş yapmış olmak, izinli olmakla aynı şey değil.

**Teknik açıklama.**
- **Authentication** = kimsin? → yoksa **401**
- **Authorization** = burada bunu yapabilir misin? → hayırsa **403**

**Roller.** Workspace başına `OWNER`, `ADMIN`, `MEMBER`. Rol **her istekte**
PostgreSQL'den okunur (`requireWorkspaceMember`); gövdeden, başlıktan ya da
React state'inden asla.

**Zincir.**

```
requireAuth              → 401
requireWorkspaceMember   → workspace yok: 404 / üyelik yok: 403
                           req.workspace = { workspaceId, role, membershipId }
requireWorkspaceAdmin    → OWNER|ADMIN değilse 403
requireWorkspaceOwner    → OWNER değilse 403
requireProject           → proje bu workspace'te değilse 404 PROJECT_NOT_FOUND
servis                   → satır bazlı kurallar (reporter/assignee, yorum yazarı)
```

**İlişkisel kurallar.** Bazı izinler role değil **satıra** bağlıdır:
`canUpdateIssue(role, actorId, issue)` — MEMBER yalnızca kendi açtığı veya
kendisine atanmış issue'yu güncelleyebilir ve taşıyabilir.
`canEditComment` yalnızca yazara; `canDeleteComment` yazar + OWNER + ADMIN.

**Neden buton gizlemek güvenlik değil?** Tarayıcıdaki JavaScript'i herkes
düzenleyebilir. Gizleme bir nezakettir — her zaman başarısız olan bir buton kötü
bir deneyimdir. Gerçek kontrol sunucuda tekrarlanır; testler yasak istekleri
doğrudan göndererek bunu kanıtlar.

**Mülakat cevabı.** "401 'giriş yap ve tekrar dene' demektir, 403 'kim olduğunu
biliyorum ve cevap yine hayır'. Eksik oturuma 403 dönmek istemciyi giriş formunu
göstermek yerine pes etmeye iter."

---

## A15. Workspace'ler

**Basit anlatım.** Her ekip kendi alanında çalışır; kimse başkasının verisini
görmez.

**Teknik açıklama.**
- **Multi-tenant.** Tek veritabanı, tek tablo kümesi, birçok bağımsız ekip. Her
  satır bir workspace'e aittir ve her sorgu çağıranın gerçekten görebileceği
  workspace ile filtrelenir. İzolasyon **sorgularla** sağlanır.
- **Sahiplik ≠ üyelik.** `Workspace.ownerId` kimin kurduğunu söyler;
  `WorkspaceMember` kimin girebileceğini ve hangi rolle girebileceğini söyler.
  Erişimi yalnızca üyelik satırı verir — bu yüzden kurucuya da bir üyelik satırı
  yazılır, ve **aynı transaction içinde**.
- **Slug.** Ad'dan sunucuda üretilir, sayısal sonekle benzersizleştirilir; unique
  index yarışı kaybedilirse istek başarısız olmaz, yeniden denenir.
- **Açık many-to-many.** `WorkspaceMember` kendi verisini taşır (`role`,
  `joinedAt`), bu yüzden implicit many-to-many yetmez.

**Mülakat cevabı.** "Workspace oluşturma tek transaction: workspace, kurucunun
OWNER üyeliği ve aktivite kaydı. Aksi hâlde iki yazma arasındaki bir çökme
yöneticisi olmayan bir workspace bırakabilirdi."

---

## A16. Projeler ve sprint'ler

- **Proje anahtarı (`key`).** `API`, `WEB` gibi kısa, büyük harfli kimlik.
  Oluşturmada normalize edilir ve **sonradan değiştirilemez**, çünkü `API-14`
  sohbetlere, commit'lere ve yer imlerine yazılır.
- **Workspace kapsamlı benzersizlik.** `@@unique([workspaceId, key])` — iki
  farklı workspace'in ikisi de `API` anahtarını kullanabilir. Çakışma
  `409 PROJECT_KEY_IN_USE`.
- **Proje statüsü.** `ACTIVE` / `ARCHIVED`. Arşivleme projeyi aktif sayımdan
  çıkarır, silmez.
- **Sprint ilişkisi.** Sprint bir projeye aittir; issue **kendi projesinin** bir
  sprint'ini gösterebilir (`assertSprintInProject`, aksi hâlde
  `400 INVALID_SPRINT`).
- **Sprint doğrulama.** Bitiş tarihi başlangıçtan önce olamaz
  (`INVALID_DATE_RANGE`); issue içeren sprint silinemez
  (`409 SPRINT_HAS_ISSUES`) — silme, işi sessizce backlog'a atmaktan iyidir.
- **Sıralama detayı.** PostgreSQL enum'u tanım sırasına göre sıralar
  (PLANNED, ACTIVE, COMPLETED); bu pano sırası değil, o yüzden kısa sprint
  listesi TypeScript tarafında açık bir rank ile sıralanır.

---

## A17. Issue'lar

| Alan | Anlamı | Not |
|---|---|---|
| `reporter` | İşi isteyen | **Her zaman** oturumdaki kullanıcı; gövdeden asla okunmaz |
| `assignee` | İşi yapan | Opsiyonel; **workspace üyesi olmalı** (`INVALID_ASSIGNEE`) |
| `project` | Sahip proje | URL'den, gövdeden değil |
| `sprint` | Opsiyonel sprint | Aynı projeye ait olmalı |
| `type` | `TASK` / `BUG` | — |
| `status` | 5 değer | Kanban kolonu |
| `priority` | `LOW…URGENT` | — |
| `dueDate` | Opsiyonel | Gecikme sunucu saatiyle ölçülür |
| `number` | Proje kapsamlı sayaç | **Değiştirilemez** |
| `position` | Kolon içi sıra | Sunucuya ait |

**Değişmez alanlar.** `reporterId`, `number`, `projectId`, `workspaceId` — hiçbir
zaman istek gövdesinden okunmaz.

**Filtreleme ve sayfalama.** Query string Zod ile ayrıştırılır, tek Prisma
`where` nesnesine dönüşür ve iki sorguyla cevaplanır: sayım (`count`) ve sayfa
(`findMany`, `skip`/`take`, en fazla 100). Arama başlıkta, açıklamada ve
numarada çalışır — `14`, `API-14`, `api-14` hepsi issue 14'ü bulur.

---

## A18. Issue numaralandırma (derinlemesine)

**Basit anlatım.** Her proje kendi issue'larını sayar, böylece `#4297` yerine
`API-1` ve `WEB-1` görürsünüz.

**Nasıl çalışıyor.**

```ts
// server/src/modules/issues/issue.service.ts
const issue = await prisma.$transaction(async (tx) => {
  const counter = await tx.project.update({
    where: { id: project.projectId },
    data: { nextIssueNumber: { increment: 1 } },
    select: { nextIssueNumber: true },
  });
  const number = counter.nextIssueNumber - 1;   // update artıştan SONRAKİ değeri döner
  ...
});
```

**`count + 1` neden güvensiz?** İki istek aynı milisaniyede "7 issue var" okur ve
ikisi de 8 yazar. Sayım hiçbir satırı kilitlemez.

**Yarış durumu (race condition) nedir?** Sonucun, iki eşzamanlı işlemin
sıralamasına bağlı olması. Burada iki `POST .../issues` isteği aynı anda gelirse:

```
count+1 ile:                        transaction + increment ile:
T1 count → 7                        T1 UPDATE project SET next = next+1  (satır kilitlenir)
T2 count → 7                        T2 aynı satırı UPDATE etmek ister → BEKLER
T1 INSERT number 8                  T1 number 8 alır, INSERT eder, COMMIT
T2 INSERT number 8  ← ÇAKIŞMA       kilit serbest → T2 number 9 alır
```

**Transaction neden gerekli?** Sayacın artması ile issue'nun yazılması **birlikte**
olmalı. Aksi hâlde bir çökme sayacı ileri kaydırmış ama hiç var olmayan bir
issue bırakmış olurdu.

**Composite unique index.** `@@unique([projectId, number])` son güvencedir.
Gelecekte biri transaction'ı unutursa veritabanı yazmayı reddeder — sessiz bozuk
veri yerine gürültülü hata.

**Görüntülenen anahtar.** `API-14` **türetilmiştir** (`displayKey(key, number)`),
üçüncü bir kolon olarak saklanmaz; yoksa proje adı değişince eskiyen bir kopya
oluşurdu.

**Mülakat cevabı (eşzamanlılık).** "İki kullanıcı aynı anda issue açarsa, ikisi
de aynı numarayı almamalı. Sayacı proje satırında tutuyorum ve issue'yu yaratan
transaction'ın içinde artırıyorum. `UPDATE` o satırı kilitliyor, dolayısıyla
ikinci istek bekliyor ve bir sonraki numarayı alıyor. `count + 1` bunu yapmaz,
çünkü okuma kilit almaz. Son güvence `(projectId, number)` üzerindeki composite
unique index."

---

## A19. Kanban sıralaması

**Basit anlatım.** Her kolon kartlarını 0, 1, 2 diye numaralar. Bir kart
taşındığında etkilenen kolonlar yeniden numaralanır.

**Teknik açıklama.**
- **Kolon** = `Issue.status` (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE)
- **Kolon içi yer** = `Issue.position`, **kolona özel** tamsayı, 0'dan başlar
- **İstemci yalnızca üç şey gönderir:** `issueId`, `targetStatus`, `targetIndex`
- **Sunucu sahiptir:** hedef kolonu gerçek sırayla okur, indeksi kolon uzunluğuna
  **kırpar** (negatif indeks `400 VALIDATION_ERROR`), kartı ekler, hedefi
  yeniden numaralandırır ve statü değiştiyse kaynak kolonu da kapatır, bir
  `ISSUE_STATUS_CHANGED` satırı yazar
- **Hepsi tek `Serializable` transaction**, `P2034` (yazma çakışması) hâlinde en
  fazla 3 deneme
- **Aynı kolon içi yeniden sıralama aktivite yazmaz**
- **Yanıt onaylanmış panodur** ve istemcinin çizdiği şey odur

**İstemci akışı ve geri alma.** `@dnd-kit` bırakmayı bildirir → pano yerel olarak
güncellenir (anında geri bildirim) → istek gider → başarıda sunucunun panosu
yereli değiştirir → **başarısızlıkta saklanan önceki pano geri yüklenir** ve hata
gösterilir. Böylece reddedilen bir taşıma asla kart kopyalamaz veya kaybetmez.

**İzinler.** Taşımak bir issue güncellemesidir, aynı kurala tabidir:
OWNER/ADMIN her kartı, MEMBER yalnızca kendi açtığı ya da atandığı kartı.
`canMove: false` olan kartın sürükleme tutamacı gizlenir — bu kolaylık, koruma
değil; sunucu satırı tekrar kontrol eder.

**Neden kesirli pozisyon değil?** `1000, 1500, 1750` yazma sayısını azaltır ama
kayan nokta hassasiyetine sürüklenir ve periyodik sıkıştırma ister. Bir kolonu
yeniden numaralamak birkaç satır ve "To Do'nun üçüncü kartı" veritabanından
doğrudan okunabiliyor.

**Neden `Serializable`?** Aynı kolonu iki kişi aynı anda sıralarsa okumaları
iç içe geçebilir ve yinelenen pozisyon üretebilir. `Serializable` bunu imkânsız
kılar; bedeli ara sıra bir çakışma hatası, ki sınırlı retry tam olarak onu
karşılar. Sınırsız retry düzeltme değil, kilitlenmedir.

---

## A20. Yorumlar ve aktiviteler

**Neden iki ayrı model?** Yorum yazarın sesidir ve yazar tarafından
düzenlenebilir. Aktivite satırı sistemin kaydıdır: **append-only**, kimse
düzenlemez ve silmez. Tek "timeline" tablosu, iki farklı izin kümesi ve
nullable bir gövde ile kimlik krizi yaşardı.

**Yorum yetkilendirmesi (asimetrik).**

| İşlem | Yazar | OWNER | ADMIN | Diğer MEMBER |
|---|---|---|---|---|
| Okuma | ✔ | ✔ | ✔ | ✔ |
| Yazma | ✔ | ✔ | ✔ | ✔ |
| Düzenleme | ✔ | ✘ | ✘ | ✘ |
| Silme | ✔ | ✔ | ✔ | ✘ |

Moderasyon yazarlık değildir: bir OWNER birinin sözünü silebilir ama yeniden
yazamaz.

**Yapılandırılmış metadata.** Satır bir `type` ve küçük bir JSON tutar
(`previousStatus`, `nextStatus`, `previousAssigneeId`, `nextAssigneeId`,
`changedFields`, `commentId`, `number`, `key`, `slug`, `addedUserId`,
`assignedRole`). Cümle **istemcide** kurulur
(`client/src/lib/activityText.ts`), yani "Ada moved API-2 from To Do to In
Progress" ifadesi migration olmadan değiştirilebilir veya çevrilebilir.
Çıkışta metadata bir anahtar whitelist'inden geçer, aktör `id/name/email`'e
indirgenir (ya da `null` → sistem eylemi).

**Denetim geçmişinin sınırları.** Tablo append-only ama **değiştirilemez
değil**: veritabanına yazma erişimi olan biri satırı düzenleyebilir. Gerçek
immutability için ayrı bir yazma-bir-kez deposu, hash zinciri ya da harici log
gerekir. Ayrıca silme yok, dışa aktarma yok ve workspace geneli bir görünüm yok
(proje ve issue kapsamlı).

---

## A21. Dashboard

**Basit anlatım.** Tek ekran, tek istek, tutarlı bir an.

**Teknik açıklama.** `GET /api/workspaces/:workspaceId/dashboard` — her üye
erişebilir. Tek `Promise.all` içinde: workspace + üye sayısı, proje sayımları
(`groupBy` status), açık issue, bana atanan, geciken, atanmamış (`count`), statü
ve öncelik dağılımları (`groupBy`), 5 son güncellenen issue, 8 son aktivite.

- **Sayım PostgreSQL'de yapılır** — issue listesi indirilip tarayıcıda sayılmaz.
- **Dağılımlar sıfırla tohumlanır**, böylece istemci eksik bir statüyü tahmin
  etmez.
- **"Açık" = `status != DONE`.** **Gecikme** = `dueDate < now` **ve** açık;
  `now` **sunucu** saatidir — tarayıcıdan gelen tarih asla okunmaz.
- **N+1 yok:** on proje için on bir sorgu yerine bir `groupBy`.
- Issue açıklaması, yorum gövdesi ya da iç içe kayıt seçilmez.

**Neden altı ayrı istek değil?** Altı istek altı farklı ana ulaşır ve hafifçe
farklı altı durumu anlatır. Tek uç nokta tek an verir.

---

## A22. Hata yönetimi

| Tür | Kod | HTTP | Nereden |
|---|---|---|---|
| Doğrulama | `VALIDATION_ERROR` | 400 | Zod, API kenarı |
| Kimlik | `UNAUTHENTICATED` | 401 | `requireAuth` |
| Yetki | `FORBIDDEN` | 403 | rol/ilişki kontrolleri |
| Bulunamadı | `*_NOT_FOUND` | 404 | ebeveyn-filtreli aramalar |
| Çakışma | `EMAIL_IN_USE`, `PROJECT_KEY_IN_USE`, `SPRINT_HAS_ISSUES` | 409 | servisler |
| Gövde | `PAYLOAD_TOO_LARGE`, `MALFORMED_JSON` | 413 / 400 | `express.json` |
| Limit | `RATE_LIMITED` | 429 | auth limiter |
| Origin | `INVALID_ORIGIN` | 403 | `requireAllowedOrigin` |
| Beklenmeyen | `INTERNAL_ERROR` | 500 | `errorHandler` |

**Production güvenliği.** Beklenmeyen bir hata tek sabit cümleye dönüşür: stack
trace yok, Prisma mesajı yok, dosya yolu yok, ortam değeri yok. Detay sunucu
log'una gider — `NODE_ENV=test` hariç, çünkü orada hata yolları bilerek
denenir ve stack trace test çıktısını gömerdi.

---

## A23. Test

**Katmanlar.**

| Katman | Araç | Ne kanıtlar |
|---|---|---|
| Birim | Vitest | Saf fonksiyonlar: izin yardımcıları, `displayKey`, `activityText` |
| API entegrasyon | Vitest + Supertest | Gerçek Express uygulaması + **gerçek** PostgreSQL: durum kodları, yanıt şekli, yetki kuralları |
| Bileşen | Vitest + React Testing Library | Kullanıcının gördüğü şey: roller, etiketler, metin |

**Test veritabanı ve izolasyon.** `server/prisma/testDbUrl.ts`, `DATABASE_URL`
içinde `devflow_test` geçmeyen her değeri reddeder ve bu kontrol **uygulama —
dolayısıyla Prisma — import edilmeden önce** çalışır. Her suite kendi e-posta
alan adına sahiptir ve yalnızca kendi satırlarını temizler; sunucu projesinde
dosya paralelliği kapalıdır çünkü tüm suite'ler tek veritabanını paylaşır.

**Fixture'lar.** `server/src/test/phase5.helpers.ts` — kullanıcı, workspace,
proje ve issue kuran ortak yardımcılar.

**Neden veritabanını mock'lamıyorum?** O zaman mock'u test etmiş olurum.
Önemsediğim hatalar — issue numarasındaki yarış, fazla silen bir cascade, bayat
değer okuyan bir rol kontrolü — yalnızca gerçek veritabanında var.

**Coverage neden doğruluk değil?** Coverage hangi satırların **çalıştığını**
söyler, davranışın **doğru** olup olmadığını değil. Tamamen kapsanmış bir
fonksiyon yanlış cevap dönebilir. Bu yüzden eşik yok.

---

## A24. Docker

| Kavram | Anlamı | DevFlow'da |
|---|---|---|
| **Dockerfile** | Bir imajın tarifi | `Dockerfile.production`, `server/Dockerfile`, `client/Dockerfile` |
| **Image** | Salt-okunur dosya sistemi + komut | `devflow:production` |
| **Container** | Çalışan bir imaj örneği | Render'daki süreç |
| **Compose** | Birden çok servisi birlikte tanımlama | `docker-compose.yml` |
| **Servis** | Compose içindeki bir konteyner tanımı | `postgres`, `server`, `client` |
| **Network** | Servislerin **servis adıyla** birbirine ulaştığı özel ağ | server → `postgres:5432` |
| **Volume** | Konteynerin dışında yaşayan dizin | `devflow_postgres_data` |
| **Healthcheck** | "Gerçekten hazır mısın?" komutu | `pg_isready`; server bunu bekler |
| **Multi-stage build** | Bir aşamada derle, sonucu temiz aşamaya kopyala | Üretim imajında derleyici ve test aracı yok |

**Yerel vs Docker portları.** İkisi aynı anda çalışabilsin diye:
Vite `5174`, Docker client `5175`, API `4000`, yerel PostgreSQL `5432`,
Docker PostgreSQL `5433`.

**Dikkat.** `docker compose down` veriyi korur. `docker compose down -v`
**volume'ü ve içindeki her satırı siler.**

---

## A25. CI

**Tetikleyici.** Her pull request ve `main`'e her push.

**Adımlar.** `npm ci` → `db:validate` → `db:generate` → `db:deploy` →
`typecheck` → `test` → `build`, tek kullan-at `devflow_test` PostgreSQL servis
konteynerine karşı. Hiçbir adım `continue-on-error` değil. İş akışı **dağıtım
yapmaz**.

**Neden değerli?**
- Temiz bir checkout'ta çalışır → "bende çalışıyor" argümanı biter.
- `migrate deploy` işlenmiş migration'ların boş bir veritabanına gerçekten
  uygulandığını kanıtlar; `db push` bu kontrolü tamamen atlar.
- Adımların hepsi geliştiricinin de çalıştırdığı npm script'leri, dolayısıyla CI
  yerelden sapamaz.

---

## A26. Dağıtım

```
git push origin main
  → GitHub Actions CI çalışır (doğrular, dağıtmaz)
  → Render autoDeploy tetiklenir
  → Dockerfile.production build edilir (çok aşamalı)
  → Konteyner başlar:  prisma migrate deploy && node dist/server.js
       migration başarısız olursa && sayesinde sunucu HİÇ başlamaz
  → Render GET /api/health çağırır
  → 200 gelirse trafik yeni sürüme yönlendirilir, servis "Live"
```

- **Tek origin.** Express `/api/*` cevaplar, diğer her adres için
  `client/dist`. Oturum cookie'si first-party kalır, `SameSite=Lax` anlamını
  korur ve gerçek istemci için CORS istisnası gerekmez.
- **Göreli `/api`.** Production bundle'ı `VITE_API_URL=/api` ile derlenir, yani
  pakete hiçbir dağıtım adresi gömülmez.
- **Port ve origin platformdan.** `PORT` atanır; güvenilen origin
  `CLIENT_ORIGIN` → `RENDER_EXTERNAL_URL` sırasıyla çözülür ve production'da
  yedek yoktur — çözülemezse süreç başlamayı reddeder.
- **`trust proxy` = 1 hop**, böylece rate limiter proxy'yi değil gerçek çağıranı
  sayar.
- **`DATABASE_URL`** Blueprint tarafından yönetilen veritabanından okunur;
  depoda hiçbir kimlik bilgisi yoktur.
- **Health check** public, oturumsuz, veritabanına dokunmaz.
- **Production asla seed edilmez**; ilk hesap `/register` ile açılır.

---

# BÖLÜM B — İSTEK AKIŞI VAKA ÇALIŞMALARI

Her akışta: frontend eylemi → API rotası → doğrulama → kimlik → yetki → Prisma →
veritabanı etkisi → yanıt → Query güncellemesi → kullanıcının gördüğü →
olası hatalar.

---

## 1. Kullanıcı kaydı

| Adım | Detay |
|---|---|
| Frontend | `RegisterPage.tsx` kontrollü formu, `useAuth().register()` |
| Rota | `POST /api/auth/register` |
| Doğrulama | Zod: ad, e-posta (trim + lowercase), parola uzunluğu |
| Kimlik | Gerekmez |
| Yetki | Gerekmez |
| Prisma | `user.findUnique` (çakışma), `$transaction`: `user.create` + `passwordCredential.create`, ardından `session.create` |
| DB etkisi | 3 yeni satır: `users`, `password_credentials`, `sessions` |
| Yanıt | `201`/`200` + `{ user }` + `Set-Cookie: devflow_session=…` |
| Query | `AuthProvider.setUser`; korumalı rotalar açılır |
| Kullanıcı | `/app/workspaces` sayfasında oturum açmış hâlde |
| Hatalar | `409 EMAIL_IN_USE`, `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `403 INVALID_ORIGIN` |

---

## 2. Kullanıcı girişi

| Adım | Detay |
|---|---|
| Frontend | `LoginPage.tsx` → `useAuth().login()` |
| Rota | `POST /api/auth/login` |
| Doğrulama | Zod |
| Servis | `verifyCredentials`: kullanıcı yoksa bile `DUMMY_PASSWORD_HASH` doğrulanır → zamanlama eşit |
| Prisma | `user.findUnique` + `session.create` |
| DB etkisi | 1 yeni `sessions` satırı |
| Yanıt | `200 { user }` + cookie |
| Kullanıcı | Uygulamaya girer |
| Hatalar | `401 INVALID_CREDENTIALS` (bilinmeyen e-posta ve yanlış parola **aynı** cevap), `429`, `403 INVALID_ORIGIN` |

---

## 3. Aktif oturumla sayfa yenileme

| Adım | Detay |
|---|---|
| Frontend | `AuthProvider` mount → `GET /api/auth/me` |
| Cookie | Tarayıcı otomatik ekler (`credentials: 'include'`) |
| Middleware | `attachSession`: cookie → SHA-256 → `session.findUnique({ tokenHash })` |
| Süre | `expiresAt <= now` ise satır silinir ve oturum yok sayılır |
| Yetki | `requireAuth` → kullanıcı yoksa `401` |
| Prisma | Tek indexed lookup, yalnızca `SafeUser` kolonları seçilir |
| Yanıt | `200 { user }` veya `401` |
| Query | Kullanıcı geri gelir; `RequireAuth` sayfayı gösterir |
| Hatalar | Süresi dolmuş/silinmiş oturum → `/login` yönlendirmesi |

---

## 4. Workspace oluşturma

| Adım | Detay |
|---|---|
| Frontend | `WorkspaceListPage.tsx` formu → `useMutation` |
| Rota | `POST /api/workspaces` |
| Doğrulama | Zod: ad uzunluğu |
| Kimlik | `requireAuth` |
| Yetki | Gerekmez (herkes kendi workspace'ini açabilir) |
| Prisma | `$transaction`: `workspace.create` + `workspaceMember.create` (OWNER) + `activityLog.create` (`WORKSPACE_CREATED`) |
| DB etkisi | 3 satır; slug benzersizleştirilir, unique index yarışı kaybedilirse yeniden denenir |
| Yanıt | `201 { workspace }` |
| Query | `queryKeys.workspaceList()` invalidate |
| Kullanıcı | Listede yeni workspace; OWNER |
| Hatalar | `400 VALIDATION_ERROR`, slug yarışı (şeffaf retry) |

---

## 5. Workspace'e üye ekleme

| Adım | Detay |
|---|---|
| Frontend | `MembersPage.tsx` — e-posta + rol |
| Rota | `POST /api/workspaces/:workspaceId/members` |
| Doğrulama | Zod; `OWNER` **atanabilir rol değil** |
| Kimlik | `requireAuth` |
| Yetki | `requireWorkspaceMember` → `requireWorkspaceAdmin` → `assertCanAssignRole` (ADMIN yalnızca MEMBER ekler) |
| Prisma | Kullanıcıyı e-postayla bul → yoksa `404`; mevcut üyelik kontrolü → `409`; `workspaceMember.create` + `MEMBER_ADDED` aktivitesi |
| DB etkisi | 1 üyelik + 1 aktivite; `@@unique([workspaceId, userId])` yarışı da kapatır |
| Yanıt | `201 { member }` |
| Query | members + workspace + dashboard + workspace listesi invalidate |
| Kullanıcı | Üye listede görünür |
| Hatalar | `404` kullanıcı yok, `409` zaten üye, `403` yetki yok |

---

## 6. Proje oluşturma

| Adım | Detay |
|---|---|
| Frontend | `ProjectListPage.tsx` formu |
| Rota | `POST /api/workspaces/:workspaceId/projects` |
| Doğrulama | Zod: ad, anahtar (büyük harfe normalize) |
| Yetki | üye → `requireWorkspaceAdmin` (MEMBER **proje açamaz**) |
| Prisma | `project.create` + `PROJECT_CREATED` aktivitesi |
| DB etkisi | `nextIssueNumber` 1'den başlar; `@@unique([workspaceId, key])` |
| Yanıt | `201 { project }` |
| Query | proje listeleri + dashboard invalidate |
| Hatalar | `409 PROJECT_KEY_IN_USE`, `403 FORBIDDEN` |

---

## 7. Sprint oluşturma

| Adım | Detay |
|---|---|
| Frontend | `ProjectDetailPage.tsx` sprint bölümü |
| Rota | `POST .../projects/:projectId/sprints` |
| Doğrulama | Zod; bitiş < başlangıç → `400 INVALID_DATE_RANGE` |
| Yetki | `requireWorkspaceMember` → `requireProject` → admin |
| Prisma | `sprint.create` |
| Yanıt | `201 { sprint }` |
| Query | sprints + proje detayı invalidate |
| Hatalar | `400 INVALID_DATE_RANGE`, `403`, `404 PROJECT_NOT_FOUND` |

---

## 8. `DEV-1` oluşturma

| Adım | Detay |
|---|---|
| Frontend | `IssueCreatePage.tsx` |
| Rota | `POST .../projects/:projectId/issues` |
| Doğrulama | Zod: başlık, tip, statü, öncelik, opsiyonel assignee/sprint/dueDate |
| Kimlik | `requireAuth` |
| Yetki | Her üye issue açabilir; `requireProject` projeyi workspace ile filtreler |
| Ön kontrol | `assertAssigneeIsMember`, `assertSprintInProject` |
| Prisma | `$transaction`: `project.update({ nextIssueNumber: { increment: 1 } })` → `number = next - 1` → hedef kolondaki issue sayısı = `position` → `issue.create` → `ISSUE_CREATED` aktivitesi |
| DB etkisi | Proje sayacı 1→2, issue `number = 1`, kolonun sonuna yerleşir |
| Yanıt | `201` + `displayKey: "DEV-1"` |
| Query | issue listeleri + proje detayı + board + aktivite + dashboard invalidate |
| Kullanıcı | Issue detayında `DEV-1` |
| Hatalar | `400 INVALID_ASSIGNEE`, `400 INVALID_SPRINT`, `404 PROJECT_NOT_FOUND`, eşzamanlı istekte ikinci istek `DEV-2` alır |

---

## 9. Issue filtreleme

| Adım | Detay |
|---|---|
| Frontend | `ProjectDetailPage.tsx` filtre çubuğu → URL query string'i günceller |
| Rota | `GET .../issues?status=IN_PROGRESS&priority=HIGH&page=2&limit=20` |
| Doğrulama | `parseQuery.ts` + Zod; bilinmeyen sıralama alanı `INVALID_SORT`, bozuk değer `INVALID_FILTER` |
| Yetki | üye + `requireProject` |
| Prisma | Tek `where`; `count` + `findMany` (`skip`/`take`, limit 100) |
| Yanıt | `{ issues, pagination: { page, limit, total, totalPages, hasPreviousPage, hasNextPage }, filters }` |
| Query | Key: `queryKeys.issueList(w, p, filters)` — her filtre kombinasyonu ayrı cache girdisi |
| Kullanıcı | Filtreli liste; geri/ileri/yenileme/paylaşılan bağlantı aynı görünümü verir |
| Hatalar | `400 INVALID_SORT` / `INVALID_FILTER`; eski bir filtrenin geç gelen cevabı güncel listeyi ezemez (farklı key) |

---

## 10. Kanban'da issue taşıma

| Adım | Detay |
|---|---|
| Frontend | `BoardPage.tsx` — `@dnd-kit` bırakma **veya** "Move … to" seçimi |
| İyimser | `withMovedCard` ile pano yerel güncellenir, önceki pano saklanır |
| Rota | `PATCH .../projects/:projectId/issues/:issueId/move` `{ targetStatus, targetIndex }` |
| Doğrulama | Zod; negatif indeks `400 VALIDATION_ERROR` |
| Yetki | `findIssueRef` → `canUpdateIssue(role, actorId, issue)`, aksi hâlde `403` |
| Prisma | `Serializable` `$transaction`: hedef kolonu oku (taşınan kart hariç) → indeksi kırp → ekle → 0..n yeniden numaralandır → statü değiştiyse kaynak kolonu da kapat → `ISSUE_STATUS_CHANGED` yaz. `P2034` → en fazla 3 deneme |
| DB etkisi | Etkilenen kolonların `position` değerleri bitişik; aynı kolon sıralamasında **aktivite yazılmaz** |
| Yanıt | Onaylanmış **tam pano** |
| Query | board her zaman; gerçek statü değişiminde ayrıca issue, listeler, akışlar, dashboard |
| Kullanıcı | Kart yeni yerinde; yenilemede de orada |
| Hatalar | `403` (izinsiz taşıma) → istemci önceki panoyu geri yükler; `404 ISSUE_NOT_FOUND`; `P2034` üç denemeden sonra hata |

---

## 11. Yorum ekleme

| Adım | Detay |
|---|---|
| Frontend | `CommentSection.tsx` textarea |
| Rota | `POST .../issues/:issueId/comments` |
| Doğrulama | Zod: trim sonrası 1–5000 karakter; yalnızca boşluk → `400` |
| Yetki | üye → proje → issue zinciri; yazar **oturumdan** alınır |
| Prisma | `comment.create` + `COMMENT_CREATED` aktivitesi |
| Yanıt | `201 { comment, permissions }` |
| Query | comments + issue aktivitesi + proje aktivitesi + dashboard invalidate |
| Kullanıcı | Yorum listede; `white-space: pre-wrap` satır sonlarını korur, yazılan HTML görünür metin kalır |
| Hatalar | `400` boş/çok uzun, `404 ISSUE_NOT_FOUND`, `403` |

---

## 12. Dashboard metriklerini yükleme

| Adım | Detay |
|---|---|
| Frontend | `DashboardPage.tsx` → `useQuery(queryKeys.workspaceDashboard(w))` |
| Rota | `GET /api/workspaces/:workspaceId/dashboard` |
| Yetki | `requireWorkspaceMember` (her rol) |
| Prisma | Tek `Promise.all`: `count` × 4, `groupBy` × 3, `findMany` × 2 |
| DB etkisi | Yok — salt okuma |
| Yanıt | workspace özeti, issue metrikleri, statü/öncelik dağılımları, son issue'lar, son aktiviteler, `generatedAt` |
| Query | 30 sn `staleTime`; mutasyonlar hedeflenmiş invalidate eder |
| Kullanıcı | Sayılar, dağılım çubukları, son hareketler |
| Hatalar | `403` (üye değil), `404 WORKSPACE_NOT_FOUND` |

---

## 13. Çıkış yapma

| Adım | Detay |
|---|---|
| Frontend | `AppShell` içindeki "Sign out" → `useAuth().logout()` |
| Rota | `POST /api/auth/logout` |
| Prisma | `session.delete` (satır yoksa da hata değil) |
| DB etkisi | Oturum satırı gider → sonraki istek anında `401` |
| Yanıt | `200` + `Set-Cookie` temizleme |
| Query | `setUser(null)`; korumalı rotalar `/login`'e yönlenir |
| Kullanıcı | Çıkış yapmış; geri tuşu korumalı veriyi göstermez |
| Hatalar | İstek başarısız olsa bile istemci kullanıcıyı temizler (`finally`) |

---

## 14. `git push` sonrası CI hattı

```
git push
  → GitHub Actions "CI / Typecheck, test and build" başlar
  → postgres:17-alpine servis konteyneri kalkar, pg_isready bekleniyor
  → actions/checkout → setup-node 22 (npm cache)
  → npm ci
  → npm run db:validate     şema geçerli mi
  → npm run db:generate     Prisma Client
  → npm run db:deploy       3 migration boş veritabanına uygulanır
  → npm run typecheck
  → npm test                client 96 + server 218
  → npm run build
  → yeşil tik
```

**Olası hatalar.** Lockfile ile `package.json` uyumsuzsa `npm ci` düşer;
migration boş veritabanına uygulanmıyorsa `db:deploy` düşer; testler test
veritabanı adında `devflow_test` geçmezse başlamadan reddedilir.

---

## 15. `main` push'u sonrası Render dağıtımı

```
main'e push
  → Render autoDeploy tetikler
  → Dockerfile.production build (deps → prisma generate → client build → server build → runtime)
  → konteyner: npm run start:production
        = prisma migrate deploy && node dist/server.js
  → log: "3 migrations found", "All migrations have been successfully applied."
  → log: "DevFlow API listening on http://localhost:<PORT>"
  → Render GET /api/health → 200 → servis Live
```

**Olası hatalar.**
- `P1013` — `prisma.config.ts` boş `shadowDatabaseUrl` (bu projede düzeltildi)
- `P3009` — daha önce yarım kalmış migration; production sıfırlanmaz, ileri
  yönlü migration yazılır
- `Invalid server environment: - CLIENT_ORIGIN: …` — özel alan adı varsa
  `CLIENT_ORIGIN` panelde ayarlanmalı
- Health check düşerse yeni sürüm trafiği devralmaz, eski sürüm çalışmaya devam
  eder

---

## İlgili dokümanlar

- Sorular ve cevaplar: [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md)
- Bozulduğunda: [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md)
- Prova: [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md), [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- Doğrulanmış durum: [FINAL_QA.md](FINAL_QA.md)
