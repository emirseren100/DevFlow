# DevFlow — Final QA Matrisi ve Kanıt Raporu

**Son çalıştırma:** 2026-07-29 · Windows 11, Node 22, Docker CLI 29.6.2
(daemon kapalı), yerel tek kullan-at `prisma dev` PostgreSQL sunucusu.

Durumlar: `PASS` · `FAIL` · `MANUAL PENDING` · `NOT APPLICABLE` · `BLOCKED`
Şiddet: `BLOCKER` · `HIGH` · `MEDIUM` · `LOW` · `COSMETIC`

> **Kural.** Bir satır ancak gerçekten yapılan bir kontrol sonucunda `PASS`
> olur. Yapılmamış kontrol `MANUAL PENDING`'dir; yanlış işaretlenmiş bir kutu
> hiç kutu olmamasından kötüdür.

İlgili: [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) ·
[DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) ·
[PROJECT_STATE.md](PROJECT_STATE.md)

---

## 0. Otomatik doğrulama (bu çalıştırmada gerçekten koşturuldu)

| # | Komut | Sonuç | Süre | Önemli çıktı | Portföyü engeller mi |
|---|---|---|---|---|---|
| 1 | `npm run typecheck` | **PASS** | ~20 sn | Hata yok | Hayır |
| 2 | `npm test` | **PASS** | ~90 sn | client **96**, server **218** → **314 test** | Hayır |
| 3 | `npm run test:coverage` | **PASS** | ~110 sn | client **%92.91** satır, server **%94.88** satır | Hayır |
| 4 | `npm run build` | **PASS** | ~2 sn (client) | CSS 18.97 kB (3.95 kB gzip), JS 386.82 kB (117.26 kB gzip) | Hayır |
| 5 | `npm run db:validate` | **PASS** | <5 sn | "The schema at prisma\schema.prisma is valid" | Hayır |
| 6 | `npm run db:generate` | **PASS** | <5 sn | "Generated Prisma Client (7.9.0)" | Hayır |
| 7 | `docker compose config` | **PASS** | <5 sn | YAML geçerli, servisler çözüldü | Hayır |
| 8 | `npm run db:status` | **PASS** | <5 sn | "3 migrations found", "Database schema is up to date!" | Hayır |
| 9 | `npm run db:check` | **PASS** | <5 sn | users 4, workspaces 1, members 3, projects 2, sprints 3, issues 10, comments 4, activity 10 | Hayır |
| 10 | `docker build -f Dockerfile.production` | **MANUAL PENDING** | — | `failed to connect to the docker API … dockerDesktopLinuxEngine` — **daemon kapalı**, kod hatası değil | Hayır |
| 11 | `docker compose up` (runtime) | **MANUAL PENDING** | — | Aynı sebep; Compose yığını bu makinede hiç başlatılmadı | Hayır |
| 12 | Yerel `npm run dev` başlangıcı | **MANUAL PENDING** | — | Bu çalıştırmada denenmedi; production canlı olarak doğrulandı | Hayır |

### Uyarılar (gerçek hata değil)

| Uyarı | Nerede | Değerlendirme |
|---|---|---|
| `Update available 7.9.0 -> 7.9.1` | `db:generate` | Zararsız sürüm bildirimi |
| `ExperimentalWarning: SQLite is an experimental feature` | `npx prisma dev` | Yalnızca yerel tek kullan-at sunucu; uygulama PostgreSQL kullanıyor |

### Ön koşul — dikkat

Sunucu test suite'i, ilk denemede **10 dosyada FAIL** verdi. Sebep kod değil,
**test veritabanının ayakta olmamasıydı**: bu makinede test veritabanı, tek
kullan-at `prisma dev` sunucusundaki `devflow_test` şeması. Sunucu

```bash
npx prisma dev --name devflow
```

ile başlatıldıktan sonra 218 sunucu testinin tamamı geçti. **Herhangi bir
veritabanı komutundan önce bu sunucunun çalışıyor olması gerekir.**

---

## 1. Depo

| Kontrol | Durum | Kanıt |
|---|---|---|
| Çalışma ağacı temiz | **PASS** | `git status --short` boş (bu faz dokümantasyon yazmadan önce) |
| Aktif dal | **PASS** | `main` |
| GitHub remote | **PASS** | `origin https://github.com/emirseren100/DevFlow` |
| Commit geçmişi var, squash edilmemiş | **PASS** | 11 commit, Phase 0'dan 9B'ye anlamlı mesajlar |
| Depo public | **PASS** | GitHub API `"private": false` |
| **Depo açıklaması ayarlı** | **FAIL** | GitHub API `"description": null` — bulgu **F-5** |
| **Homepage (canlı demo) ayarlı** | **FAIL** | GitHub API `"homepage": null` — bulgu **F-5** |
| İzlenen `.env` dosyası yok | **PASS** | `git ls-files` yalnızca `.env.example`, `.env.test.example`, `.env.docker.example` gösteriyor |
| `dist/`, `coverage/`, `node_modules/` izlenmiyor | **PASS** | `git ls-files \| grep -E "dist/\|coverage/"` boş |
| `package-lock.json` izleniyor | **PASS** | 375 izlenen dosya içinde mevcut |
| Üretilen Prisma Client izlenmiyor | **PASS** | `git ls-files \| grep generated` boş |
| İzlenen dosyalarda sır taraması | **PASS** | Bağlantı dizesi, token, anahtar bulunamadı |
| Derlenen client bundle'ında sır yok | **PASS** | `client/dist/assets/*.js` içinde yalnızca `/api` ve `localhost:4000`; parola/hash/DB dizesi yok |
| GitHub Actions sonucu | **PASS** | Son iki `CI` çalıştırması `conclusion: success` (2026-07-27) |
| Render canlı URL | **PASS** | https://devflow-902d.onrender.com açılıyor |
| README bağlantıları | **MANUAL PENDING** | Bağlantılar tek tek tıklanmadı; ekran görüntüsü yer tutucuları hâlâ boş (bulgu **F-4**) |

---

## 2. Production sağlık kontrolü (gerçekten yapıldı)

| Adres | Beklenen | Gerçekleşen | Durum |
|---|---|---|---|
| `GET /` | 200 HTML | `200 text/html` | **PASS** |
| `GET /login` | 200 HTML | `200 text/html` | **PASS** |
| `GET /register` | 200 HTML | `200 text/html` | **PASS** |
| `GET /api/health` | 200 JSON | `{"success":true,"data":{"status":"ok"}}` | **PASS** |
| `GET /api/does-not-exist` | 404 JSON | `404 application/json` — ama `code` alanı yok (bulgu **F-1**) | **PASS (kısmi)** |
| `GET /app/workspaces/x/projects/y/board` (SPA yenileme) | 200 HTML | `200 text/html` | **PASS** |
| `GET /api/workspaces` (oturumsuz) | 401 | `401 UNAUTHENTICATED` | **PASS** |
| `POST /api/auth/login` yabancı `Origin` ile | 403 | `403 INVALID_ORIGIN` | **PASS** |
| CSP başlığı | mevcut | `default-src 'self'; …; connect-src 'self'` | **PASS** |
| HSTS | mevcut | `max-age=31536000; includeSubDomains` | **PASS** |
| `X-Content-Type-Options` | `nosniff` | `nosniff` | **PASS** |
| `X-Powered-By` | yok | Başlık yok | **PASS** |
| Render logları / Prisma-OpenSSL uyarısı | **NOT APPLICABLE** | Render loglarına erişim yok; iddia edilemez | — |
| Production'da giriş/kayıt akışı | **MANUAL PENDING** | Otomatik olarak production hesabı açılmadı; kimlik bilgisi gereken her akış manuel | — |

---

## 3. Kimlik doğrulama

| Kontrol | Durum | Kanıt / not |
|---|---|---|
| Kayıt | **PASS** | `server/src/test/auth.test.ts` entegrasyon testleri |
| Yinelenen e-posta | **PASS** | `409 EMAIL_IN_USE` testi |
| Geçersiz form | **PASS** | Zod `400 VALIDATION_ERROR` + `fieldErrors` testi |
| Giriş | **PASS** | Test |
| Yanlış parola | **PASS** | Test |
| Jenerik kimlik hatası (bilinen ≡ bilinmeyen e-posta) | **PASS** | Test + `DUMMY_PASSWORD_HASH` zamanlama eşitliği |
| Yenilemeden sonra oturum geri yükleme | **PASS** | `GET /api/auth/me` testi + `AuthProvider` bileşen testi |
| Çıkış | **PASS** | Test (satır silinir, ikinci çıkış hata değil) |
| Korumalı rota yönlendirmesi | **PASS** | `client/src/test/auth.test.tsx` |
| Kimlikli rota erişimi | **PASS** | Test |
| Cookie `HttpOnly` | **PASS** (yerel/test) · production **MANUAL PENDING** | `auth.service.ts` `httpOnly: true`; canlı HTTPS'te tarayıcıdan doğrulanmadı |
| Production'da cookie `Secure` | **MANUAL PENDING** | Kod `secure: config.isProduction`; canlıda devtools ile bakılmadı |
| `localStorage`/`sessionStorage`'da token yok | **PASS** (kod) · canlı **MANUAL PENDING** | İstemci hiçbir yerde token yazmıyor (`apiClient.ts`) |
| Süresi dolmuş oturum davranışı | **PASS** | `getSessionContext` süresi geçmiş satırı siler; test kapsamında |

---

## 4. Workspace

| Kontrol | Durum |
|---|---|
| Workspace oluşturma (transaction: workspace + OWNER üyeliği + aktivite) | **PASS** — `workspace.test.ts` |
| Workspace listeleme (yalnızca üye olunanlar) | **PASS** |
| Workspace değiştirme | **PASS** — `client/src/test/phase7.test.tsx` |
| Yeniden adlandırma | **PASS** |
| Silme onayı (`ConfirmDialog`) | **PASS** — `client/src/test/phase9.test.tsx` |
| OWNER üyeliği kurucuya yazılır | **PASS** |
| Yabancı erişimi (üye olmayan) | **PASS** — `403`, workspace yok ise `404` |
| Boş durum | **PASS** — `EmptyState` bileşen testi |

---

## 5. Üyelik ve roller

| Kontrol | Durum | Not |
|---|---|---|
| OWNER izinleri | **PASS** | `workspace.test.ts` |
| ADMIN izinleri | **PASS** | `assertCanAssignRole` ADMIN yalnızca MEMBER ekler |
| MEMBER izinleri | **PASS** | Proje/sprint yönetimi yok |
| Var olan kullanıcıyı ekleme | **PASS** | — |
| Yinelenen üye | **PASS** | `409` + `@@unique([workspaceId, userId])` |
| Olmayan kullanıcı | **PASS** | `404` |
| Rol değiştirme | **PASS** | Yalnızca OWNER |
| OWNER koruması (demote/remove/duplicate yok) | **PASS** | `assertCanRemoveMember` + servis değişmezleri |
| Üye çıkarma | **PASS** | — |
| Yasak kontroller gizli | **PASS** | Bileşen testleri role göre render'ı doğruluyor |
| Sunucu yasak istekleri reddediyor | **PASS** | Testler yasak istekleri doğrudan gönderiyor |

---

## 6. Projeler

| Kontrol | Durum |
|---|---|
| Proje oluşturma | **PASS** — `project.test.ts` |
| Anahtar normalizasyonu (büyük harf) | **PASS** |
| Anahtar benzersizliği (workspace kapsamlı) | **PASS** — `409 PROJECT_KEY_IN_USE` |
| Proje güncelleme | **PASS** |
| Arşivleme / yeniden etkinleştirme | **PASS** |
| Proje silme (issue ve yorumlar cascade) | **PASS** |
| MEMBER kısıtları | **PASS** — `403` |

---

## 7. Sprint'ler

| Kontrol | Durum |
|---|---|
| Sprint oluşturma | **PASS** — `sprint.test.ts` |
| Tarih doğrulama | **PASS** — `400 INVALID_DATE_RANGE` |
| Statü güncelleme | **PASS** |
| Sprint silme | **PASS** |
| Issue içeren sprint çakışması | **PASS** — `409 SPRINT_HAS_ISSUES` |

---

## 8. Issue'lar

| Kontrol | Durum |
|---|---|
| Task oluşturma | **PASS** — `issue.test.ts` |
| Bug oluşturma | **PASS** |
| Proje kapsamlı numaralandırma | **PASS** — transaction + `@@unique([projectId, number])` testi |
| Issue detayı | **PASS** |
| Issue güncelleme | **PASS** |
| Issue silme | **PASS** |
| Reporter (oturumdan) | **PASS** |
| Assignee | **PASS** |
| Geçersiz assignee | **PASS** — `400 INVALID_ASSIGNEE` |
| Geçersiz sprint | **PASS** — `400 INVALID_SPRINT` |
| Due date | **PASS** |
| Arama (başlık / açıklama / numara) | **PASS** |
| Statü filtresi | **PASS** |
| Tip filtresi | **PASS** |
| Öncelik filtresi | **PASS** |
| Assignee filtresi | **PASS** |
| Atanmamış filtresi | **PASS** |
| Sayfalama | **PASS** — limit 100 ile sınırlı |
| Sıralama | **PASS** — bilinmeyen alan `INVALID_SORT` |
| URL'den filtre geri yükleme | **PASS** — `client/src/test/projects.test.tsx` |

---

## 9. Kanban

| Kontrol | Durum |
|---|---|
| Beş kolon | **PASS** — `kanban.test.ts` + `BOARD_STATUSES` |
| Kartlar veritabanından | **PASS** |
| Aynı kolon içi yeniden sıralama | **PASS** (aktivite yazılmaz) |
| Kolonlar arası taşıma | **PASS** (bir `ISSUE_STATUS_CHANGED`) |
| Pozisyon sürekliliği (0,1,2…) | **PASS** |
| OWNER taşıma | **PASS** |
| ADMIN taşıma | **PASS** |
| Yetkili MEMBER taşıma (reporter/assignee) | **PASS** |
| Yetkisiz MEMBER reddi | **PASS** — `403` |
| Hata durumunda geri alma | **PASS** — `client/src/test/phase6.test.tsx` |
| Klavye / sürüklemesiz alternatif ("Move … to") | **PASS** — bileşen testi |
| Mobil yatay kaydırma | **PASS** (Phase 9A tarayıcı QA'sı) · yeniden doğrulama **MANUAL PENDING** |
| Gerçek işaretçiyle sürükle-bırak | **MANUAL PENDING** | Erişilebilir kontrolle test edildi; gerçek pointer drag hiç denenmedi |

---

## 10. Yorumlar

| Kontrol | Durum |
|---|---|
| Yorum listesi | **PASS** — `comment.test.ts` |
| Yorum oluşturma | **PASS** |
| Yalnızca boşluk reddi | **PASS** — `400` |
| Çok uzun yorum reddi (>5000) | **PASS** |
| Yazar düzenlemesi | **PASS** |
| Yetkisiz düzenleme reddi | **PASS** — OWNER bile başkasının yorumunu düzenleyemez |
| Yazar silme | **PASS** |
| OWNER/ADMIN silme | **PASS** |
| Düz metin render'ı (`white-space: pre-wrap`) | **PASS** |
| `(edited)` işareti | **PASS** — bir saniyelik tolerans |

---

## 11. Aktivite

| Kontrol | Durum |
|---|---|
| Issue oluşturma aktivitesi | **PASS** — `activity.test.ts` |
| Issue güncelleme aktivitesi | **PASS** (yalnızca gerçekten değişen alanlar) |
| Statü değişimi aktivitesi | **PASS** |
| Atama aktivitesi | **PASS** |
| Yorum aktivitesi | **PASS** |
| Proje kapsamı | **PASS** |
| Issue kapsamı | **PASS** |
| Sayfalama (`createdAt desc, id desc`) | **PASS** |
| Güvenli metadata (anahtar whitelist'i) | **PASS** |
| İstemcide okunabilir metin | **PASS** — `activityText.ts`, metadata yoksa zarifçe düşer |

---

## 12. Dashboard

| Kontrol | Durum |
|---|---|
| Proje sayıları | **PASS** — `dashboard.test.ts` |
| Açık issue sayısı | **PASS** |
| Bana atanan | **PASS** |
| Geciken (sunucu saati) | **PASS** |
| Atanmamış | **PASS** |
| Statü dağılımı (sıfırla tohumlanmış) | **PASS** |
| Öncelik dağılımı | **PASS** |
| Son issue'lar | **PASS** |
| Son aktiviteler | **PASS** |
| Boş durumlar | **PASS** |
| Workspace izolasyonu | **PASS** — başka workspace'in satırları sayılmıyor |

---

## 13. UI/UX

| Genişlik | Durum | Not |
|---|---|---|
| 1440px | **PASS** (Phase 9A tarayıcı QA'sı) | Bu fazda **yeniden doğrulanmadı** |
| 1024px | **PASS** (Phase 9A) | Aynı |
| 768px | **PASS** (Phase 9A) | Aynı |
| 390px | **PASS** (Phase 9A) | Aynı |

| Öğe | Durum |
|---|---|
| Uygulama kabuğu, navigasyon, mobil menü | **PASS** (Phase 9A + `phase9.test.tsx`) |
| Formlar, tablolar, filtreler, dialoglar | **PASS** (Phase 9A) |
| Uzun başlık / açıklama sarması | **PASS** (Phase 9A — 60 karakterlik kesintisiz ad) |
| Hata metni, yükleme/boş/hata durumları | **PASS** — `states.tsx` bileşen testleri |
| Kanban yatay kaydırma, dokunma hedefleri, taşma | **PASS** (Phase 9A) |
| 403 ve 404 deneyimi | **PASS** — `phase9.test.tsx` |
| **Production'da canlı responsive kontrol** | **MANUAL PENDING** | Canlı URL'de dört genişlik tarayıcıyla gezilmedi |

---

## 14. Erişilebilirlik

| Kontrol | Durum | Not |
|---|---|---|
| Klavye navigasyonu | **PASS** (Phase 9A) | Bu fazda yeniden doğrulanmadı |
| Görünür odak halkası (2px) | **PASS** (Phase 9A) | — |
| Semantik landmark'lar (tek `banner`, tek `main`) | **PASS** | `PageHeader` bilerek `div` |
| Başlık sırası (`h1` → `h2`) | **PASS** (Phase 9A) | — |
| Form etiketleri | **PASS** | Bileşen testleri etiketle sorguluyor |
| Dialog odağı (Cancel'da açılır, Tab hapsi, Escape) | **PASS** | `phase9.test.tsx` |
| Erişilebilir hata mesajları | **PASS** | — |
| Adı olan düğmeler | **PASS** | `aria-label`'lı sürükleme tutamacı dahil |
| Renkten bağımsız anlam | **PASS** | Her rozet değerini yazıyor |
| Klavyeyle Kanban alternatifi | **PASS** | "Move … to" select |
| Otomatik erişilebilirlik denetimi (axe vb.) | **MANUAL PENDING** | Hiç çalıştırılmadı |

---

## 15. Güvenlik

| Kontrol | Durum | Kanıt |
|---|---|---|
| Ham parola saklanmıyor | **PASS** | `auth.service.ts` yalnızca `argonHash` sonucunu yazıyor |
| Argon2id | **PASS** | `Algorithm.Argon2id` |
| Veritabanında ham oturum token'ı yok | **PASS** | `Session.tokenHash` |
| Oturum token'ı SHA-256 hash'i | **PASS** | `hashSessionToken` |
| HTTP-only cookie | **PASS** | `httpOnly: true` |
| Tam eşleşen izinli origin | **PASS** | Canlıda `403 INVALID_ORIGIN` doğrulandı |
| CORS credentials açık | **PASS** | `cors({ origin: config.clientOrigin, credentials: true })` |
| Wildcard origin yok | **PASS** | Tek dize; `*` hiç kullanılmıyor |
| Auth rate limiting | **PASS** | `security.test.ts` (amaca özel limiter ile) |
| Gövde boyutu limiti | **PASS** | `413 PAYLOAD_TOO_LARGE` testi |
| Helmet | **PASS** | Canlı başlıklar doğrulandı |
| Production'da güvenli hatalar | **PASS** | `errorHandler` tek cümle + `INTERNAL_ERROR` |
| Client bundle'ında sır yok | **PASS** | `client/dist/assets/*.js` tarandı |
| Git'te sır yok | **PASS** | İzlenen dosya taraması temiz |
| Canlıda 429 rate limit gözlemi | **MANUAL PENDING** | Production'a bilerek başarısız giriş denemesi yapılmadı |

---

## 16. Altyapı

| Kontrol | Durum | Not |
|---|---|---|
| `docker compose config` doğrulaması | **PASS** | — |
| Docker imaj build'i | **MANUAL PENDING** | Docker daemon kapalı (`dockerDesktopLinuxEngine` bulunamadı) |
| PostgreSQL healthcheck | **PASS (statik)** / runtime **MANUAL PENDING** | `pg_isready` tanımlı, Compose hiç çalıştırılmadı |
| Volume kalıcılığı | **MANUAL PENDING** | Aynı |
| Yerel Docker portları (5175 / 4000 / 5433) | **PASS (statik)** | Dosyada doğru |
| Production Dockerfile | **PASS (statik)** | Çok aşamalı, `USER node`, healthcheck, `start:production` |
| `prisma migrate deploy` akışı | **PASS** | CI'da gerçekten uygulandı; production canlı |
| CI test veritabanı | **PASS** | `devflow_test` servis konteyneri |
| CI typecheck / test / build | **PASS** | Son iki çalıştırma yeşil |
| Render health check | **PASS** | `/api/health` 200 |
| Tek origin production dağıtımı | **PASS** | HTML ve JSON ayrımı canlıda doğrulandı |

---

## 17. Veritabanı kalıcılığı ve oturum davranışı

| Kontrol | Durum |
|---|---|
| Yeniden dağıtımda veri kalıcılığı | **MANUAL PENDING** |
| Yeniden başlatmada oturumların kaybolmaması | **PASS (tasarım)** — oturumlar PostgreSQL'de; canlı doğrulama **MANUAL PENDING** |
| Production veritabanı hiç sıfırlanmadı/seed edilmedi | **PASS** | Hiçbir script `migrate reset` bağlamıyor; bu fazda production verisine dokunulmadı |
| Çıkışta cookie + satır temizliği | **PASS** — test |
| Çıkıştan sonra geri tuşu korumalı veri göstermiyor | **MANUAL PENDING** |
| İki tarayıcı iki bağımsız oturum | **MANUAL PENDING** |

---

# BULGULAR

## F-1 — Bilinmeyen adres 404'ü kararlı `code` alanı taşımıyor

- **Alan:** API hata sözleşmesi
- **Beklenen:** Dokümantasyon ([ARCHITECTURE.md](ARCHITECTURE.md) §8,
  [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) REST bölümü) "her hata makine
  tarafından okunabilir bir `code` taşır" diyor.
- **Gerçekleşen:** `GET https://devflow-902d.onrender.com/api/does-not-exist`
  → `404 {"success":false,"error":{"message":"Route not found"}}` — `code` yok.
  İstemcide `ApiError.code` `undefined` oluyor.
- **Yeniden üretim:**
  ```bash
  curl -s https://devflow-902d.onrender.com/api/does-not-exist
  ```
- **İlgili dosyalar:** `server/src/middleware/notFound.ts`,
  `client/src/lib/apiClient.ts`
- **Şiddet:** **LOW** — hiçbir ekran bu koda dallanmıyor; durum kodu doğru.
- **Önerilen adım:** Ayrı bir küçük görevde `notFound` yanıtına
  `code: 'NOT_FOUND'` eklemek ve `deployment.test.ts` içine bir assertion
  yazmak. **Bu fazda düzeltilmedi** (yalnızca dokümantasyon değişikliğine izin
  var).
- **Engelliyor mu:** Hayır — ne dağıtımı ne portföy kullanımını engeller.

## F-2 — `docs/PROJECT_STATE.md` gerçeği yansıtmıyordu

- **Alan:** Dokümantasyon
- **Beklenen:** Devir dosyası şu an neyin doğru olduğunu anlatır.
- **Gerçekleşen (düzeltme öncesi):** "no remote", "5 commits", "Nothing is
  deployed", "Live URL: Pending" yazıyordu; oysa `origin` var, 11 commit var, CI
  yeşil ve uygulama canlı.
- **Şiddet:** **MEDIUM** (yanıltıcı devir bilgisi)
- **Durum:** **Bu fazda düzeltildi** — PROJECT_STATE artık Phase 10'u ve canlı
  dağıtımı anlatıyor.

## F-3 — `README.md` "Live demo" bölümü kendisiyle çelişiyordu

- **Gerçekleşen (düzeltme öncesi):** Bölüm hem URL'yi içeriyor hem de "This
  section will carry the URL once the service exists" diyordu; "Project status"
  tablosu "Pushed to GitHub: Pending" ve "Deployed to Render: Pending"
  gösteriyordu.
- **Şiddet:** **MEDIUM** — portföy okuyucusu için doğrudan yanıltıcı.
- **Durum:** **Bu fazda düzeltildi.**

## F-4 — Ekran görüntüleri hâlâ yok

- **Alan:** Portföy
- **Beklenen:** README'de dashboard, filtreli issue listesi, issue detayı,
  Kanban ve mobil düzen görselleri.
- **Gerçekleşen:** "_Placeholder._" metni duruyor.
- **Şiddet:** **MEDIUM** (portföy etkisi), teknik olarak **COSMETIC**
- **Önerilen adım:** Canlı uygulamada demo verisi oluşturup beş ekran görüntüsü
  almak ve README'ye eklemek. Bkz. [DEPLOYMENT.md](DEPLOYMENT.md) §11.
- **Engelliyor mu:** Dağıtımı hayır; **portföy sunumunu kısmen** evet.

## F-5 — GitHub deposunun açıklaması ve homepage'i boş

- **Gerçekleşen:** GitHub API `"description": null`, `"homepage": null`.
- **Şiddet:** **LOW** (portföy)
- **Önerilen adım:** Depo ayarlarından açıklamayı
  [PORTFOLIO_COPY.md](PORTFOLIO_COPY.md) §4'teki metinle doldurmak, homepage
  alanına canlı URL'yi yazmak, topic'leri eklemek. Manuel adım.

## F-6 — Enum adı dokümantasyonda yanlış yazılmış

- **Gerçekleşen (düzeltme öncesi):** README ve ARCHITECTURE öncelik enum'unu
  `Priority` diye anıyordu; şemadaki gerçek ad `IssuePriority`.
- **Şiddet:** **LOW**
- **Durum:** **Bu fazda düzeltildi.**

## F-7 — Test veritabanı ön koşulu belgelenmemişti

- **Gerçekleşen:** `npm test`, `npx prisma dev --name devflow` çalışmıyorsa
  10 sunucu test dosyasında Prisma bağlantı hatasıyla düşüyor ve hata mesajı
  sebebi açıkça söylemiyor.
- **Şiddet:** **LOW** (yalnızca geliştirici deneyimi)
- **Durum:** Bu dosyada ve
  [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) senaryo 12'de belgelendi.

---

# ÖZET

| Kategori | Sonuç |
|---|---|
| Otomatik doğrulama | **9/9 çalıştırılabilir komut PASS**; 3 kontrol Docker daemon kapalı olduğu için MANUAL PENDING |
| Test | **314 test geçti** (client 96, server 218) |
| Coverage | client %92.91, server %94.88 satır |
| Production | Canlı, sağlıklı, güvenlik başlıkları yerinde, yetki kontrolleri canlıda doğrulandı |
| CI | Son iki çalıştırma yeşil |
| Açık bulgu | 1 kod bulgusu (**F-1, LOW**), 2 portföy bulgusu (**F-4 MEDIUM, F-5 LOW**) |
| Düzeltilen dokümantasyon | F-2, F-3, F-6, F-7 |
| **Dağıtımı engelleyen bulgu** | **Yok** |
| **Portföy kullanımını engelleyen bulgu** | **Yok** — F-4 (ekran görüntüleri) sunumu zayıflatıyor ama engellemiyor |

## Kalan manuel işler (öncelik sırasıyla)

1. Canlı uygulamada demo verisi oluştur ve **ekran görüntülerini** al (F-4).
2. GitHub depo **açıklaması + homepage + topics** (F-5).
3. Canlı uygulamada **kimlik doğrulama akışını** tarayıcıyla doğrula: cookie
   `HttpOnly`/`Secure`, `document.cookie` okunamıyor, `localStorage` boş.
4. Docker Desktop'ı başlatıp `docker build -f Dockerfile.production` ve
   `docker compose up` çalıştır.
5. F-1 için ayrı, küçük bir kod görevi aç.
