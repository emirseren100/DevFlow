# DevFlow — Proje Dosya Haritası

> Bu dosya depoda **nerede ne olduğunu** gösterir. Amaç: bir mülakatta
> "bunu nerede yaptın?" sorusuna dosya yolu vererek cevap verebilmek.
>
> Okuma sırası için: [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) →
> [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) →
> [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) →
> [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) → [DEMO_SCRIPT.md](DEMO_SCRIPT.md) →
> [STUDY_PLAN.md](STUDY_PLAN.md) → [FINAL_QA.md](FINAL_QA.md)

Her satırda şunlar var: **yol**, **sorumluluk**, **kim çağırır**, **kimi çağırır**,
**neden var** ve tek cümlelik **mülakat cümlesi**.

Önemsiz dosyalar (üretilen Prisma çıktısı, tekil CSS parçaları, tip
tanım dosyaları) bilerek listelenmedi.

---

## 1. Kök yapılandırma

### `package.json`
- **Sorumluluk:** npm workspaces tanımı (`client`, `server`) ve kökten çalışan
  tüm komutlar (`dev`, `build`, `typecheck`, `test`, `db:*`).
- **Kim çağırır:** geliştirici, CI (`.github/workflows/ci.yml`),
  `Dockerfile.production`.
- **Kimi çağırır:** `client/package.json` ve `server/package.json` script'lerini
  `--workspace` ile delege eder.
- **Neden var:** iki paket tek `npm install` ve tek `package-lock.json` ile
  kurulsun diye.
- **Mülakat cümlesi:** "Tek repoda iki npm workspace var; kökteki script'ler
  `--workspace` ile alt paketlere delege ediyor, böylece CI ile yerel makine
  aynı komutları çalıştırıyor."

### `CLAUDE.md`
- **Sorumluluk:** projenin kalıcı çalışma kuralları (dil, kapsam disiplini,
  teknoloji yığını, kod kalitesi, Git kuralları).
- **Neden var:** proje birçok ayrı oturumda geliştirildi; kurallar yazılı olmasa
  mimari kayardı.
- **Mülakat cümlesi:** "Proje kurallarını dosyaya yazdım, böylece her oturumda
  aynı kısıtlarla çalıştım."

### `docker-compose.yml`
- **Sorumluluk:** yerel üç konteynerlik yığın — PostgreSQL, API, nginx'li client.
- **Kimi çağırır:** `server/Dockerfile`, `client/Dockerfile`.
- **Neden var:** "bende çalışıyor" sorununu çözen, tek komutla ayağa kalkan
  yerel ortam.
- **Mülakat cümlesi:** "Compose yığını yerel geliştirme içindir; host portları
  (5175/4000/5433) bilerek normal `npm run dev` ile çakışmayacak şekilde
  seçildi."

### `Dockerfile.production`
- **Sorumluluk:** dağıtım imajı. Çok aşamalı: bağımlılıklar → Prisma Client →
  client build → server build → yalnızca çalışma zamanı.
- **Kim çağırır:** Render (`render.yaml` içindeki `dockerfilePath`).
- **Neden var:** production'da tek origin/tek process mimarisi için tek imaj.
- **Mülakat cümlesi:** "Çok aşamalı build sayesinde imajda TypeScript derleyicisi
  ve test araçları yok; sadece derlenmiş JavaScript, `client/dist`, şema ve
  migration'lar var ve süreç `node` kullanıcısıyla çalışıyor."

### `render.yaml`
- **Sorumluluk:** Render Blueprint — bir web service, bir PostgreSQL,
  `healthCheckPath: /api/health`, `DATABASE_URL` veritabanından okunur.
- **Neden var:** dağıtımın tamamı gözden geçirilebilir tek dosyada olsun diye
  (infrastructure as code).
- **Mülakat cümlesi:** "Dağıtımı panelde tıklayarak değil, depoda duran bir
  Blueprint dosyasıyla tanımladım; içinde hiçbir kimlik bilgisi yok."

### `.github/workflows/ci.yml`
- **Sorumluluk:** her PR ve `main` push'unda `npm ci` → `db:validate` →
  `db:generate` → `db:deploy` → `typecheck` → `test` → `build`.
- **Neden var:** migration'ların gerçekten uygulandığını ve testlerin temiz bir
  checkout'ta geçtiğini kanıtlamak için.
- **Mülakat cümlesi:** "CI, tek kullan-at `devflow_test` PostgreSQL servisine
  karşı yerelde çalıştırdığım aynı npm script'lerini çalıştırıyor; hiçbir adım
  `continue-on-error` değil."

---

## 2. Frontend giriş noktası ve yönlendirme

### `client/src/main.tsx`
- **Sorumluluk:** React uygulamasını DOM'a bağlar, `BrowserRouter`'ı burada
  sarar.
- **Neden var:** router provider'ı `main.tsx`'te olduğu için testler
  `MemoryRouter` verebiliyor.
- **Mülakat cümlesi:** "Router provider'ı uygulama bileşeninin dışında tuttum,
  böylece testlerde bellek içi router kullanabiliyorum."

### `client/src/App.tsx`
- **Sorumluluk:** `AuthProvider` + `QueryClientProvider` + `AppRoutes` sırası.
- **Kimi çağırır:** `lib/queryClient.ts`, `auth/AuthProvider.tsx`,
  `router/AppRoutes.tsx`.
- **Neden var:** `QueryClient` `AuthProvider` içinde oluşturuluyor ki bir `401`
  gelen kullanıcıyı temizleyebilsin; ayrıca her test kendi cache'ini alsın.
- **Mülakat cümlesi:** "`QueryClient`'i modül seviyesinde sabit yapmadım —
  bileşen içinde oluşturuyorum, yoksa bütün testler tek cache'i paylaşırdı."

### `client/src/router/AppRoutes.tsx`
- **Sorumluluk:** tüm rota tablosu; iki layout (`RootLayout` public,
  `AppShell` korumalı), iç içe rotalar, `*` ile 404.
- **Kimi çağırır:** her sayfa bileşeni, `RequireAuth`,
  `RedirectIfAuthenticated`.
- **Neden var:** rota ağacının tek yerde okunabilir olması.
- **Mülakat cümlesi:** "`new` segmentini `:issueId`'den önce yazdım, yoksa
  React Router `new` kelimesini bir id sanardı."

### `client/src/layouts/RootLayout.tsx` / `client/src/layouts/AppShell.tsx`
- **Sorumluluk:** `RootLayout` public site çerçevesi; `AppShell` oturum açmış
  uygulamanın çerçevesi (marka, workspace seçici, navigasyon, kullanıcı, çıkış,
  tek `<main>`).
- **Kimi çağırır:** `WorkspaceSwitcher`, `WorkspaceNavigation`,
  `hooks/useWorkspaces.ts`.
- **Neden var:** çerçeve bir kez mount olsun, her sayfa kendi etrafına header
  çizmesin.
- **Mülakat cümlesi:** "İç içe layout sayesinde sayfada tek `banner`, tek `main`
  ve tek `h1` var; navigasyonda gezerken shell yeniden kurulmuyor."

---

## 3. Kimlik doğrulama (frontend)

### `client/src/auth/AuthProvider.tsx`
- **Sorumluluk:** oturum yaşam döngüsü — mount'ta bir kez `GET /api/auth/me`,
  `login`, `register`, `logout`, `clearUser`.
- **Kim çağırır:** `App.tsx`, `useAuth()` kullanan her bileşen.
- **Kimi çağırır:** `lib/apiClient.ts`.
- **Neden var:** oturum HTTP-only cookie'de olduğu için istemci token tutmaz;
  "hâlâ giriş yapmış mıyım?" tek bir sunucu sorusudur.
- **Mülakat cümlesi:** "Sayfa yenilendiğinde tarayıcı cookie'yi kendisi
  gönderiyor; ben sadece `/auth/me` çağırıp kullanıcıyı geri kuruyorum."

### `client/src/auth/RequireAuth.tsx`
- **Sorumluluk:** `/app` altındaki rotaları korur; `RedirectIfAuthenticated`
  tersini yapar (`/login`, `/register`).
- **Neden var:** kullanıcı deneyimi — boş korumalı sayfa yerine spinner ya da
  `/login` yönlendirmesi.
- **Mülakat cümlesi:** "Bu bir güvenlik katmanı değil, kullanıcı deneyimi;
  gerçek kontrol sunucudaki `requireAuth` middleware'i."

---

## 4. API istemcisi ve sunucu-state

### `client/src/lib/apiClient.ts`
- **Sorumluluk:** tek `apiRequest` fonksiyonu — `credentials: 'include'`,
  `{ success, data }` zarfını açar, hatayı tipli `ApiError`'a çevirir
  (`status` + `code`), `AbortSignal` destekler.
- **Kim çağırır:** `workspaceApi`, `projectApi`, `collaborationApi`,
  `dashboardApi`, `AuthProvider`.
- **Neden var:** hiçbir bileşen elle URL birleştirmesin, hiçbir bileşen yanıt
  şeklini elle çözmesin.
- **Mülakat cümlesi:** "`credentials: 'include'` olmadan tarayıcı oturum
  cookie'sini göndermez; bu tek satır tüm kimlik doğrulamanın çalışmasını
  sağlıyor."

### `client/src/lib/env.ts`
- **Sorumluluk:** `VITE_API_URL`'i okuyan ve doğrulayan tek yer; mutlak
  `http(s)` URL ya da tek eğik çizgiyle başlayan yol kabul eder,
  `//evil.example/api` gibi protokol-göreli değeri reddeder.
- **Mülakat cümlesi:** "Production bundle'ı `/api` ile derleniyor, yani pakete
  hiçbir dağıtım adresi gömülmüyor."

### `client/src/lib/queryClient.ts`
- **Sorumluluk:** tek `QueryClient` ve varsayılanları: `retry: false`, focus'ta
  refetch yok, `staleTime` 30 sn.
- **Mülakat cümlesi:** "`401`, `403`, `404` doğru cevaplardır, flake değil;
  yeniden denemek hatayı geciktirir, o yüzden retry kapalı ve her hata ekranında
  görünür bir 'Try again' var."

### `client/src/lib/queryKeys.ts`
- **Sorumluluk:** uygulamadaki **tüm** TanStack Query key'leri, tek factory.
- **Kim çağırır:** her `useQuery` ve her `invalidateQueries`.
- **Neden var:** invalidation ancak iki yer aynı key üzerinde anlaşırsa doğru
  olur; elle yazılan key'de bir yazım hatası sessizce çalışmayan bir cache
  üretir.
- **Mülakat cümlesi:** "Key'ler URL gibi genişten dara okunuyor ve prefix ile
  eşleşiyor; bu yüzden sadece detay değiştiğinde `exact: true`, sadece listeler
  değiştiğinde `…Lists` yardımcıları var."

### `client/src/lib/workspaceApi.ts` · `projectApi.ts` · `collaborationApi.ts` · `dashboardApi.ts`
- **Sorumluluk:** alan bazlı tipli çağrılar (workspace/üye, proje/sprint/issue,
  yorum/aktivite/board/move, dashboard) ve enum → okunabilir etiket haritaları
  (`TYPE_LABELS`, `ROLE_LABELS`, `PROJECT_STATUS_LABELS`, `SPRINT_STATUS_LABELS`).
- **Neden var:** URL kurma ve tip tanımı tek yerde; ekranlarda ham enum
  (`IN_PROGRESS`) görünmesin.
- **Mülakat cümlesi:** "API veritabanı enum'larını döndürüyor; insan okuyacak
  metin istemcide üretiliyor, böylece kelime değişikliği migration gerektirmiyor."

### `client/src/lib/activityText.ts`
- **Sorumluluk:** aktivite satırındaki yapılandırılmış alanları okunabilir
  cümleye çevirir.
- **Mülakat cümlesi:** "Veritabanında cümle değil, `previousStatus`/`nextStatus`
  gibi alanlar duruyor; cümle istemcide kuruluyor."

### `client/src/hooks/useWorkspaces.ts`
- **Sorumluluk:** paylaşılan workspace listesi + yoldan okunan geçerli
  workspace.
- **Mülakat cümlesi:** "Aynı key'i kullanan bütün bileşenler tek istek
  paylaşıyor; iç içe sayfa fazladan istek eklemiyor."

---

## 5. Paylaşılan arayüz parçaları

| Yol | Sorumluluk | Mülakat cümlesi |
|---|---|---|
| `client/src/components/states.tsx` | `LoadingState`, `RefreshingHint`, `EmptyState`, `ErrorState`, `PermissionNotice` | "Dört sonuç var: yükleniyor, hata, boş, veri — `ErrorState` metnini HTTP durumundan seçiyor; 403 ve 404 yeniden deneme sunmuyor." |
| `client/src/components/badges.tsx` | `StatusBadge`, `PriorityBadge`, `TypeBadge`, `ProjectStatusBadge`, `RoleBadge` | "Durum asla yalnızca renkle anlatılmıyor; her rozet değerini yazıyor." |
| `client/src/components/ConfirmDialog.tsx` | Yıkıcı işlemler için tek modal | "`role="dialog" aria-modal="true"`, odak Cancel'da açılıyor, Tab hapsediliyor, Escape kapatıyor, odak geri veriliyor." |
| `client/src/components/PageHeader.tsx` | Sayfa başlığı + eylemler | "`<header>` değil `div` render ediyor, yoksa `main` içinde ikinci bir `banner` landmark oluşurdu." |
| `client/src/components/Breadcrumbs.tsx` | Kırıntı navigasyonu | "Konumu gösteriyor; proje sayfalarında gerçek navigasyonu `ProjectNav` taşıyor." |
| `client/src/components/WorkspaceSwitcher.tsx` · `WorkspaceNavigation.tsx` | Workspace seçimi ve 900px'te menüye katlanan navigasyon | "900px altında navigasyon `aria-expanded` taşıyan bir Menu düğmesinin arkasına katlanıyor." |
| `client/src/index.css` | Tüm görsel sistem: token'lar, elementler, bloklar, iki responsive geçiş | "Tek CSS dosyası; hiçbir bileşen kendi rengini uydurmuyor, hepsi token okuyor." |

---

## 6. Workspace ekranları

| Yol | Sorumluluk |
|---|---|
| `client/src/pages/WorkspaceListPage.tsx` | Workspace listesi + oluşturma |
| `client/src/pages/WorkspaceDetailPage.tsx` | Workspace **ayarları**: yeniden adlandırma ve tehlikeli bölge (silme) |
| `client/src/pages/MembersPage.tsx` | Üye listesi, ekleme, rol değiştirme, çıkarma |
| `client/src/pages/DashboardPage.tsx` | Tek `GET .../dashboard` isteğinden gelen metrikler |

**Mülakat cümlesi:** "Rolün kullanamayacağı kontroller gizleniyor ama bu bir
kolaylık; sunucu aynı isteği tekrar kontrol ediyor ve `curl` de aynı `403`'ü
alıyor."

---

## 7. Proje, sprint ve issue ekranları

| Yol | Sorumluluk |
|---|---|
| `client/src/pages/ProjectListPage.tsx` | Proje listesi, oluşturma, filtre |
| `client/src/pages/ProjectDetailPage.tsx` | Issue listesi + filtreler (URL query string'inde), sprint yönetimi, proje ayarları |
| `client/src/pages/IssueCreatePage.tsx` | Kontrollü form ile issue oluşturma |
| `client/src/pages/IssueDetailPage.tsx` | Issue detayı, düzenleme, yorumlar, issue geçmişi |
| `client/src/components/ProjectNav.tsx` | Issues / Board / Activity sekmeleri |

**Mülakat cümlesi:** "Filtreler URL'de yaşıyor, dolayısıyla geri tuşu, yenileme
ve paylaşılan bağlantı aynı görünümü geri getiriyor — ve her filtre kombinasyonu
cache'te ayrı anahtar."

---

## 8. Kanban

### `client/src/pages/BoardPage.tsx`
- **Sorumluluk:** beş kolon, `@dnd-kit` sürükle-bırak, iyimser güncelleme ve
  geri alma, sürüklemeden çalışan "Move … to" seçicisi.
- **Kimi çağırır:** `collaborationApi.getBoard` / `moveIssue`,
  `queryKeys.board`.
- **Mülakat cümlesi:** "Kart hemen hareket ediyor ama önceki pano bir değişkende
  saklanıyor; sunucu reddederse eski pano geri yükleniyor, yani reddedilen bir
  taşıma asla kart kopyalamıyor."

---

## 9. Yorumlar ve aktivite

| Yol | Sorumluluk |
|---|---|
| `client/src/components/CommentSection.tsx` | Yorum listesi, ekleme, yazarın düzenlemesi, silme onayı, `(edited)` işareti |
| `client/src/components/ActivityFeed.tsx` | Sayfalanmış akış, "Load more" |
| `client/src/pages/ProjectActivityPage.tsx` | Proje kapsamlı aktivite sayfası |

**Mülakat cümlesi:** "Yorumlar düz metin ve `white-space: pre-wrap` ile
render ediliyor, yani kullanıcının yazdığı HTML görünür karakter olarak kalıyor."

---

## 10. Backend altyapısı

### `server/src/app.ts`
- **Sorumluluk:** Express uygulamasını **dinlemeden** kurar; middleware sırası
  burada.
- **Kim çağırır:** `server/src/server.ts` ve tüm Supertest testleri.
- **Neden var:** testler gerçek HTTP isteği atabilsin ama port açılmasın.
- **Mülakat cümlesi:** "Sıra bilinçli: helmet → CORS → 100kb JSON → cookie →
  origin kontrolü → auth rate limit → router'lar → `/api` 404 → (production'da)
  statik client → 404 → error handler."

### `server/src/server.ts`
- **Sorumluluk:** `app.listen(config.port)`.
- **Mülakat cümlesi:** "Uygulama nesnesi ile portu açan kodu ayırmak testleri
  hızlı ve port çakışmasız yapıyor."

### `server/src/config.ts`
- **Sorumluluk:** `process.env`'i Zod ile bir kez ayrıştıran tek modül; origin
  çözümü `CLIENT_ORIGIN` → `RENDER_EXTERNAL_URL` → (production dışında)
  `http://localhost:5174`.
- **Mülakat cümlesi:** "Hata mesajı yalnızca değişken adını ve ihlal edilen
  kuralı yazıyor, değeri asla — çünkü `DATABASE_URL` bir parola taşıyor."

### `server/src/lib/apiError.ts`
- **Sorumluluk:** tüm beklenen hatalar için tek sınıf; `status`, `code`,
  `fieldErrors`.
- **Mülakat cümlesi:** "Hata kodları sabit bir küme; istemci metne değil koda
  bakabiliyor."

### `server/src/middleware/errorHandler.ts`
- **Sorumluluk:** tek hata biçimlendiricisi; beklenmeyen her şey
  `500 INTERNAL_ERROR` tek cümle.
- **Mülakat cümlesi:** "Stack trace, Prisma mesajı, dosya yolu — hiçbiri
  istemciye çıkmıyor; detay sunucu log'unda kalıyor."

### `server/src/middleware/notFound.ts`
- **Sorumluluk:** bilinmeyen adres için JSON 404.
- **Not:** bu yanıt `code` alanı taşımıyor — bkz. [FINAL_QA.md](FINAL_QA.md)
  bulgu **F-1**.

### `server/src/middleware/requireAllowedOrigin.ts`
- **Sorumluluk:** `POST/PUT/PATCH/DELETE` isteklerinde `Origin` başlığının tam
  eşleşmesi.
- **Mülakat cümlesi:** "Tarayıcı oturum cookie'sini isteği hangi sayfa
  başlattıysa başlatsın ekliyor; sayfa JavaScript'i `Origin` başlığını
  uyduramadığı için bu kontrol anlamlı — ve on beş okunabilir satır."

### `server/src/middleware/rateLimit.ts`
- **Sorumluluk:** yalnızca `POST /api/auth/login` ve `/register` için IP başına
  bellek içi sayaç.
- **Mülakat cümlesi:** "Tüm API'ye limit koymak normal kullanımı bozardı; tek
  pano ekranı zaten birkaç istek atıyor."

### `server/src/middleware/serveClient.ts`
- **Sorumluluk:** production'da `client/dist` statik sunumu + SPA fallback.
- **Mülakat cümlesi:** "Bu router API'nin kendi 404'ünden **sonra** takılı, yani
  bilinmeyen bir `/api` adresi asla HTML'e düşemiyor."

### `server/src/lib/parseBody.ts` · `parseQuery.ts` · `pathParam.ts`
- **Sorumluluk:** Zod şemalarını istek gövdesine/query'sine uygulayan yardımcı
  fonksiyonlar; bilinmeyen sıralama alanı `INVALID_SORT`, bozuk filtre
  `INVALID_FILTER`.
- **Mülakat cümlesi:** "Doğrulama tek yerde — API'nin kenarında; servis içinde
  veri zaten tipli ve güvenilir."

### `server/src/lib/prisma.ts`
- **Sorumluluk:** süreç başına tek Prisma Client; `globalThis` üzerinde
  önbelleklenir.
- **Mülakat cümlesi:** "`tsx watch` her yeniden yüklemede yeni bir havuz
  açmasın diye client global'de saklanıyor."

### `server/src/routes/health.ts`
- **Sorumluluk:** `GET /api/health` — public, veritabanına dokunmaz.
- **Mülakat cümlesi:** "Sağlık ucu 'süreç ayakta mı' sorusunu yanıtlıyor;
  veritabanı çöktüğünde de doğru cevap veriyor, veritabanı kontrolü ayrı bir
  komut."

---

## 11. Backend modülleri

Her modül aynı şablonda: `*.routes.ts` (HTTP), `*.schemas.ts` (Zod),
`*.service.ts` (Prisma ve iş kuralları), `*.authorization.ts` (izinler),
`*.types.ts` (yanıt şekilleri).

### `server/src/modules/auth/`
| Dosya | Sorumluluk |
|---|---|
| `auth.routes.ts` | `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` |
| `auth.schemas.ts` | Zod: e-posta normalizasyonu, parola kuralları |
| `auth.service.ts` | Argon2id hash, opak token üretimi, SHA-256 saklama, cookie seçenekleri, `DUMMY_PASSWORD_HASH` |
| `auth.middleware.ts` | `attachSession` (cookie → oturum), `requireAuth` (401) |
| `auth.types.ts` | `SafeUser` ve `req.user` genişletmesi |

**Mülakat cümlesi:** "Bilinmeyen e-postada bile bir sahte hash doğrulanıyor,
yani ne mesaj ne de süre hesabın var olup olmadığını ele veriyor."

### `server/src/modules/workspaces/`
- `workspace.authorization.ts` — `requireWorkspaceMember` (404/403 ayrımı),
  `requireWorkspaceAdmin`, `requireWorkspaceOwner`, `assertCanAssignRole`,
  `assertCanRemoveMember`.
- `workspace.service.ts` — slug üretimi, oluşturma transaction'ı (workspace +
  OWNER üyeliği + aktivite), OWNER değişmezleri.
- **Mülakat cümlesi:** "Rol her istekte PostgreSQL'den okunuyor; gövdeden,
  başlıktan ya da React state'inden asla."

### `server/src/modules/projects/`
- `project.authorization.ts` — `requireProject`: projeyi **URL'deki workspace
  id'siyle filtreleyerek** yükler.
- `project.service.ts` — anahtar normalizasyonu, `(workspaceId, key)`
  benzersizliği, arşivleme, silme.
- **Mülakat cümlesi:** "İç içe URL bir iddiadır, kanıt değil; ebeveyn id'si her
  zaman `where` filtresinde."

### `server/src/modules/sprints/`
- `sprint.service.ts` — tarih doğrulama (`INVALID_DATE_RANGE`), issue içeren
  sprint silinemez (`409 SPRINT_HAS_ISSUES`), enum yerine açık sıralama.

### `server/src/modules/issues/`
- `issue.service.ts` — filtre/sayfalama sorgusu (`count` + `findMany`), numara
  tahsis eden transaction, `displayKey`, `assertAssigneeIsMember`,
  `assertSprintInProject`.
- `issue.authorization.ts` — `canUpdateIssue` (OWNER/ADMIN her zaman; MEMBER
  yalnızca kendi açtığı ya da atandığı issue), `canDeleteIssue`.
- **Mülakat cümlesi:** "`nextIssueNumber` transaction içinde artırılıyor; bu
  proje satırını kilitliyor ve `(projectId, number)` composite unique index son
  güvence."

### `server/src/modules/comments/`
- `comment.authorization.ts` — düzenleme yalnızca yazara, silme yazar + OWNER +
  ADMIN'e.
- **Mülakat cümlesi:** "Düzenleme ile silme aynı hak değil: moderasyon yazarlık
  değildir."

### `server/src/modules/activities/`
- `activity.service.ts` — metadata anahtar whitelist'i, `createdAt desc, id desc`
  ile kararlı sayfalama.

### `server/src/modules/kanban/`
- `kanban.service.ts` — `getBoard` (tek sorgu, bellekte gruplama),
  `moveIssue` → `runMove`: hedef kolonu gerçek sırayla oku, indeksi kırp, ekle,
  iki kolonu da yeniden numaralandır, aktivite yaz — hepsi tek `Serializable`
  transaction, `P2034`'te en fazla 3 deneme.
- **Mülakat cümlesi:** "İstemci yalnızca issue, hedef kolon ve hedef indeks
  gönderiyor; sıralamanın sahibi sunucu."

### `server/src/modules/dashboard/`
- `dashboard.service.ts` — tek istekte tüm pano: `count` ve `groupBy`, sıfırla
  tohumlanmış dağılımlar, sunucu saatine göre `overdue`.
- **Mülakat cümlesi:** "Altı ayrı liste isteği altı farklı ana tarif ederdi; tek
  uç nokta tutarlı bir an veriyor ve sayım PostgreSQL'de yapılıyor."

---

## 12. Prisma ve veritabanı

| Yol | Sorumluluk | Mülakat cümlesi |
|---|---|---|
| `server/prisma/schema.prisma` | 10 model, 7 enum, index'ler, unique kısıtlar, referential action'lar | "Veritabanının garanti edebileceği hiçbir kural uygulama koduna bırakılmadı." |
| `server/prisma.config.ts` | Prisma 7 yapılandırması: şema yolu, migrations klasörü, seed komutu | "Boş `shadowDatabaseUrl` `migrate deploy` tarafından reddediliyor (`P1013`); anahtar değişken yoksa tamamen atlanıyor." |
| `server/prisma/migrations/` | Üç işlenmiş migration | "Migration dosyaları commit'li, yani her ortam aynı şemaya aynı adımlarla ulaşıyor." |
| `server/prisma/seed.ts` | Idempotent geliştirme verisi (`seed_*` id + `upsert`) | "Seed iki kez çalıştırılabilir ve production'da asla çalıştırılmıyor." |
| `server/prisma/check.ts` | Salt-okunur satır sayımı ve ilişki kontrolü | "`npm run db:check` 'veritabanı erişilebilir ve kurulu mu' sorusunu yanıtlıyor." |
| `server/prisma/testDbUrl.ts` | Güvenlik kilidi: `DATABASE_URL` içinde `devflow_test` geçmiyorsa test çalışmaz | "Yanlış yazılmış bir URL geliştirme verisini silemesin diye testler bir işaret arıyor." |

**Migration listesi**
- `20260726000000_init_devflow_schema`
- `20260726010000_add_authentication_models`
- `20260726020000_add_project_issue_numbering`

---

## 13. Testler

| Yol | Kapsam |
|---|---|
| `server/src/test/auth.test.ts` | Kayıt, giriş, oturum geri yükleme, çıkış, jenerik hata mesajı |
| `server/src/test/workspace.test.ts` | Üyelik, roller, yasak istekler |
| `server/src/test/project.test.ts` | Proje CRUD, anahtar benzersizliği, MEMBER kısıtları |
| `server/src/test/sprint.test.ts` | Sprint doğrulama ve silme çakışması |
| `server/src/test/issue.test.ts` | Numaralandırma, filtre, sayfalama, geçersiz assignee/sprint |
| `server/src/test/comment.test.ts` | Yorum izinleri, boşluk reddi |
| `server/src/test/activity.test.ts` | Akış kapsamı, metadata whitelist'i, sayfalama |
| `server/src/test/kanban.test.ts` | Aynı kolon / kolonlar arası taşıma, izinler, pozisyon sürekliliği |
| `server/src/test/dashboard.test.ts` | Sayımlar, dağılımlar, workspace izolasyonu |
| `server/src/test/security.test.ts` | Origin kontrolü, gövde limiti, rate limit, güvenli hatalar |
| `server/src/test/deployment.test.ts` | Origin çözümü, SPA fallback, API 404 |
| `client/src/test/*.test.tsx` | Sayfa render'ı, form akışları, rol bazlı kontroller, mobil navigasyon, dialog erişilebilirliği |

**Mülakat cümlesi:** "Sunucu testleri gerçek bir PostgreSQL'e karşı çalışıyor,
çünkü önemsediğim hatalar — unique constraint, cascade, transaction, rol
kontrolü — bir mock'ta zaten yok."

---

## 14. Docker, CI ve dağıtım dosyaları

| Yol | Rol |
|---|---|
| `Dockerfile.production` | Dağıtım imajı (tek origin) |
| `server/Dockerfile` | Compose için API imajı |
| `client/Dockerfile` + `client/nginx.conf` | Compose için nginx'li client imajı |
| `docker-compose.yml` | Yerel üç servis |
| `.env.docker.example` | Compose değişken şablonu |
| `.github/workflows/ci.yml` | CI iş akışı |
| `render.yaml` | Render Blueprint |
| `docs/DEPLOYMENT.md` | Adım adım GitHub + Render yönergesi |

---

## 15. Dokümantasyon

| Dosya | İçerik |
|---|---|
| [README.md](../README.md) | Kamuya açık proje tanıtımı |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md) | Sistem tasarımı, veri akışı, güvenlik, production topolojisi |
| [docs/DECISIONS.md](DECISIONS.md) | 91 teknik karar, reddedilen alternatifleriyle |
| [docs/ROADMAP.md](ROADMAP.md) | On faz ve kabul kriterleri |
| [docs/PROJECT_STATE.md](PROJECT_STATE.md) | Devir dosyası — şu an ne doğru |
| [docs/LEARNING_LOG.md](LEARNING_LOG.md) | Faz bazlı öğrenme notları |
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | Dağıtım rehberi |
| [docs/FINAL_QA.md](FINAL_QA.md) | Son QA matrisi ve bulgular |
| **[docs/PROJECT_FILE_MAP.md](PROJECT_FILE_MAP.md)** | (bu dosya) |
| [docs/PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) | Baştan sona proje anlatımı ve istek akışları |
| [docs/INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) | Konu anlatımı + 80+ mülakat sorusu + alıştırmalar |
| [docs/MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) | On simülasyon mülakatı |
| [docs/DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) | Hata ayıklama yöntemi ve 24 senaryo |
| [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md) | 30 sn / 2 dk / 5 dk / 10 dk demo metinleri |
| [docs/STUDY_PLAN.md](STUDY_PLAN.md) | 14 günlük çalışma planı ve öz değerlendirme cetveli |
| [docs/PORTFOLIO_COPY.md](PORTFOLIO_COPY.md) | Portföy metinleri ve portföy hazırlık incelemesi |
