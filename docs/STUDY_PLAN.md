# DevFlow — 14 Günlük Çalışma Planı

> **Hedef:** Günde 60–90 dakika, iki hafta sonunda DevFlow'un her parçasını
> kendi cümlelerinle anlatabilmek ve bir staj mülakatında savunabilmek.
>
> **Her gün aynı yapı:** ana konu → incelenecek dosyalar → sesli anlatılacak
> kavramlar → pratik alıştırma → mülakat soruları → uygulamada manuel eylem →
> tamamlama listesi → **"Bunu kendi cümlemle anlatabiliyor muyum?"** → üç
> öz-test sorusu → bir küçük kodlama/hata ayıklama görevi.
>
> Kaynaklar: [PROJECT_FILE_MAP.md](PROJECT_FILE_MAP.md) ·
> [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) ·
> [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) ·
> [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md) ·
> [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) · [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

> **Her günün başında:** yerel veritabanı sunucusunu başlat, yoksa hiçbir
> veritabanı komutu çalışmaz.
> ```bash
> npx prisma dev --name devflow
> ```

---

## Gün 1 — Genel mimari ve dosya haritası

**Ana konu.** DevFlow neyden oluşuyor ve bir istek nereden nereye gidiyor.

**İncelenecek dosyalar.** `README.md`, `docs/ARCHITECTURE.md` §1–2,
`docs/PROJECT_FILE_MAP.md`, `package.json`, `server/src/app.ts`,
`client/src/App.tsx`

**Sesli anlat.** Tarayıcıdan PostgreSQL'e giden yolu, hiçbir yere bakmadan,
adım adım. npm workspaces neden var ve neyi kolaylaştırıyor.

**Pratik alıştırma.** Boş bir kâğıda mimari diyagramını çiz, sonra
[PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) §A1'deki akışla karşılaştır.

**Mülakat soruları.** INTERVIEW_GUIDE S1, S4, S19, S20

**Uygulamada manuel eylem.** Canlı adresi aç, `/api/health` yanıtını gör,
`/api/does-not-exist` adresinin JSON döndüğünü doğrula.

**Tamamlama listesi.**
- [ ] `server/src/app.ts` içindeki middleware sırasını sırayla sayabiliyorum
- [ ] `client` ve `server` klasörlerinin sorumluluk sınırını anlatabiliyorum
- [ ] Dosya haritasından beş dosyayı ezbere yerleştirebiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Bir istek Express'e girdiğinde sırayla hangi middleware'lerden geçiyor ve
   neden bu sırada?
2. Neden npm workspaces, neden Nx/Turborepo değil?
3. `createApp()` neden `app.listen` çağırmıyor?

**Küçük görev.** `npm run typecheck` ve `npm test` çalıştır; çıktının son
satırlarındaki test sayılarını not et.

---

## Gün 2 — React, Router ve AppShell

**Ana konu.** Arayüz nasıl kuruluyor ve rota ağacı nasıl çalışıyor.

**İncelenecek dosyalar.** `client/src/router/AppRoutes.tsx`,
`client/src/layouts/AppShell.tsx`, `client/src/layouts/RootLayout.tsx`,
`client/src/auth/RequireAuth.tsx`, `client/src/components/states.tsx`

**Sesli anlat.** İç içe rota nedir; `AppShell` neden bir kez mount oluyor;
korumalı rota neden güvenlik değil; dört durum (yükleniyor, hata, boş, veri).

**Pratik alıştırma.** INTERVIEW_GUIDE §18.4 C2 (korumalı rota) ve C3 (dört
durum).

**Mülakat soruları.** S7, S8, S14, S16, S17

**Uygulamada manuel eylem.** Uygulamayı 1440, 768 ve 390 piksel genişlikte gez;
menünün katlandığı noktayı bul.

**Tamamlama listesi.**
- [ ] Rota ağacını kâğıda çizebiliyorum
- [ ] `"new"` segmentinin `:issueId`'den önce olmasının sebebini biliyorum
- [ ] `PageHeader`'ın neden `div` render ettiğini açıklayabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. İki layout neden var, tek layout ne bozardı?
2. Boş durum ile hata durumu neden farklı ekranlar?
3. Bir sayfanın `h1`'i neden tek olmalı?

**Küçük görev.** `client/src/test/phase9.test.tsx` dosyasını aç ve mobil
navigasyon testinin tam olarak neyi doğruladığını bir cümleyle yaz.

---

## Gün 3 — TanStack Query ve API istemcisi

**Ana konu.** Server state, cache, key tasarımı ve invalidation.

**İncelenecek dosyalar.** `client/src/lib/apiClient.ts`,
`client/src/lib/queryClient.ts`, `client/src/lib/queryKeys.ts`,
`client/src/pages/BoardPage.tsx` (mutation kısmı)

**Sesli anlat.** Client state ile server state farkı; query key neden prefix ile
eşleşiyor; hangi mutation neyi invalidate ediyor; iyimser güncelleme ve geri
alma.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.4 C4 (key ağacı çiz) ve C5
(invalidation gerekçelendir).

**Mülakat soruları.** S9, S10, S11, S12, S13

**Uygulamada manuel eylem.** Bir issue oluştur ve dashboard sayısının
güncellendiğini gör; sonra Network sekmesinde kaç istek atıldığını say.

**Tamamlama listesi.**
- [ ] `retry: false` kararını savunabiliyorum
- [ ] `exact: true`'nun neden gerektiğini bir örnekle anlatabiliyorum
- [ ] `credentials: 'include'` olmadan ne bozulacağını biliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Query key'i bileşen içinde yazsam ne olur?
2. Kanban taşımasından sonra ne zaman dashboard invalidate ediliyor, ne zaman
   edilmiyor?
3. `staleTime: 30s` neyin ödünleşimi?

**Küçük görev.** DEBUGGING_PLAYBOOK senaryo 19'u oku ve "ekran bayat" belirtisi
için bakacağın üç yeri sırayla yaz.

---

## Gün 4 — Express ve REST akışı

**Ana konu.** Middleware, doğrulama, hata sözleşmesi, REST kararları.

**İncelenecek dosyalar.** `server/src/app.ts`, `server/src/lib/apiError.ts`,
`server/src/middleware/errorHandler.ts`, `server/src/middleware/notFound.ts`,
bir modülün `*.routes.ts` ve `*.schemas.ts` dosyası

**Sesli anlat.** Zod nerede çalışıyor ve neden yalnızca orada; hangi durum kodu
ne zaman; kararlı hata kodları neden var.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.3'ten iki REST tasarım alıştırması
(R2 ve R4 önerilir).

**Mülakat soruları.** S21, S22, S23, S32–S38

**Uygulamada manuel eylem.** `curl` ile oturumsuz bir korumalı uç noktayı çağır
ve dönen `code` alanını oku.

**Tamamlama listesi.**
- [ ] 401 ile 403 arasındaki farkı bir cümlede anlatabiliyorum
- [ ] `errorHandler`'ın neden dört parametreli olduğunu biliyorum
- [ ] Bilinmeyen adres 404'ünün eksik `code` alanını (F-1) hatırlıyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. CORS middleware'ini origin kontrolünden sonra koysam ne bozulur?
2. Production'da beklenmeyen bir hata istemciye ne döner ve neden?
3. Neden iç içe URL, neden `?projectId=` değil?

**Küçük görev.** DEBUGGING_PLAYBOOK D2 ve D8 alıştırmalarını (INTERVIEW_GUIDE
§18.5) bakmadan çöz.

---

## Gün 5 — PostgreSQL ve Prisma

**Ana konu.** Veri modeli, kısıtlar, index'ler, migration disiplini.

**İncelenecek dosyalar.** `server/prisma/schema.prisma` (tamamı),
`server/prisma.config.ts`, `server/prisma/migrations/` listesi,
`server/prisma/seed.ts`, `server/prisma/check.ts`

**Sesli anlat.** On modelin ilişkilerini; üç composite unique kısıtı ve her
birinin engellediği hatayı; Cascade / SetNull / Restrict farkını; `migrate dev`
ile `migrate deploy` farkını.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.2'den beş SQL sorusu (Q1, Q2, Q5, Q6,
Q9) — önce kendin yaz, sonra karşılaştır.

**Mülakat soruları.** S39–S45, S51–S56

**Uygulamada manuel eylem.**
```bash
npm run db:status
```
```bash
npm run db:check
```
Çıktıdaki sayıları uygulamada gördüklerinle karşılaştır.

**Tamamlama listesi.**
- [ ] Şemayı kâğıda çizebiliyorum
- [ ] Her index'in neden orada olduğunu söyleyebiliyorum
- [ ] `db push` kullanmama gerekçemi anlatabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. `Restrict` yerine `Cascade` kullansaydım ne olurdu?
2. `(workspaceId, key)` yerine sadece `key` unique olsaydı ne bozulurdu?
3. Var olan satırlara zorunlu bir kolon nasıl eklenir?

**Küçük görev.** `Q5` sorgusundaki `LEFT JOIN`'i `JOIN` yap ve sonucun neden
değiştiğini bir cümleyle yaz.

---

## Gün 6 — Kimlik doğrulama

**Ana konu.** Kayıt, giriş, oturum geri yükleme, çıkış ve cookie kararları.

**İncelenecek dosyalar.** `server/src/modules/auth/auth.service.ts`,
`auth.middleware.ts`, `auth.routes.ts`, `client/src/auth/AuthProvider.tsx`

**Sesli anlat.** Dört akışı ([PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md)
§A12) baştan sona; hashing ile encryption farkı; neden Argon2id ama SHA-256.

**Pratik alıştırma.** Kayıt akışını bir diyagram olarak çiz: form → Zod →
Argon2id → transaction → session → cookie → React state.

**Mülakat soruları.** S57–S66

**Uygulamada manuel eylem.** Canlı uygulamada giriş yap, DevTools →
Application → Cookies'te `HttpOnly` ve `Secure` işaretlerini gör; konsolda
`document.cookie` yazıp oturum cookie'sinin **görünmediğini** doğrula;
`localStorage`'ın boş olduğunu kontrol et.

**Tamamlama listesi.**
- [ ] "Opak token" ne demek, anlatabiliyorum
- [ ] Token'ı neden hash'leyerek sakladığımı anlatabiliyorum
- [ ] Bilinmeyen e-posta ile yanlış parolanın nasıl eşitlendiğini biliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. JWT yerine veritabanı oturumu seçmenin bedeli ne?
2. `PasswordCredential` neden ayrı tablo?
3. Süresi dolmuş bir oturum ne zaman ve nasıl siliniyor?

**Küçük görev.** DEBUGGING_PLAYBOOK senaryo 4 ve 5'i oku; "cookie saklanmıyor"
için kontrol sıranı üç adımda yaz.

---

## Gün 7 — Yetkilendirme ve roller

**Ana konu.** Rol modeli, middleware zinciri, ilişkisel izinler.

**İncelenecek dosyalar.**
`server/src/modules/workspaces/workspace.authorization.ts`,
`server/src/modules/projects/project.authorization.ts`,
`server/src/modules/issues/issue.authorization.ts`,
`server/src/modules/comments/comment.authorization.ts`

**Sesli anlat.** 401 ve 403 farkı; rolün neden veritabanından okunduğu; butonu
gizlemenin neden güvenlik olmadığı; yorum izinlerinin neden asimetrik olduğu.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.1 A7 (rol izni doğrulama) ve §18.4 C7
(izin tabanlı kontroller).

**Mülakat soruları.** S67–S73

**Uygulamada manuel eylem.** Mümkünse iki hesapla dene: bir MEMBER hesabıyla
proje ayarlarının görünmediğini, ama kendi açtığı issue'yu taşıyabildiğini
doğrula.

**Tamamlama listesi.**
- [ ] Yetki zincirini sırayla sayabiliyorum
- [ ] `requireProject`'in neden `workspaceId`'yi filtreye koyduğunu biliyorum
- [ ] Rol matrisini ezbere yazabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Bir OWNER neden 403 alabilir? (En az iki sebep.)
2. Başka bir workspace'in proje id'si neden 404 dönüyor, 403 değil?
3. Bir ADMIN neden ADMIN ekleyemiyor?

**Küçük görev.** INTERVIEW_GUIDE §18.5 D4 ve D5'i bakmadan çöz.

---

## Gün 8 — Projeler, sprint'ler ve issue'lar

**Ana konu.** Ürünün çekirdeği: anahtarlar, ilişkiler, filtreleme, sayfalama.

**İncelenecek dosyalar.** `server/src/modules/projects/project.service.ts`,
`server/src/modules/sprints/sprint.service.ts`,
`server/src/modules/issues/issue.service.ts` (`listIssues` kısmı),
`server/src/lib/parseQuery.ts`, `client/src/pages/ProjectDetailPage.tsx`

**Sesli anlat.** Proje anahtarı neden değiştirilemez; sprint doğrulama kuralları;
issue'nun değişmez alanları; filtre ve sayfalamanın neden veritabanında olduğu.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.1 A6 (anahtar normalizasyonu) ve A9
(sayfalama matematiği).

**Mülakat soruları.** S37, S38, S47, S49, S50

**Uygulamada manuel eylem.** Bir filtre uygula, URL'yi kopyala, yeni bir sekmede
aç ve aynı görünümün geldiğini doğrula.

**Tamamlama listesi.**
- [ ] Filtre listesini ezbere sayabiliyorum
- [ ] `INVALID_SORT` ile `INVALID_FILTER` farkını biliyorum
- [ ] `total = 0` iken `totalPages` neden 1, açıklayabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Bir issue'ya başka bir workspace'ten birini atamaya çalışsam ne olur?
2. Issue içeren bir sprint neden silinemiyor?
3. `displayKey` neden saklanmıyor?

**Küçük görev.** Arama kutusuna `14`, `API-14` ve `api-14` yaz; üçünün de aynı
issue'yu bulduğunu doğrula ve `searchedNumber` fonksiyonunun bunu nasıl
yaptığını bir cümleyle açıkla.

---

## Gün 9 — Transaction'lar, issue numaralandırma ve Kanban

**Ana konu.** Projenin en zor iki yeri. **Bu gün en önemli gün.**

**İncelenecek dosyalar.** `server/src/modules/issues/issue.service.ts`
(`createIssue`), `server/src/modules/kanban/kanban.service.ts` (tamamı),
`client/src/pages/BoardPage.tsx` (`withMovedCard` ve mutation)

**Sesli anlat.** Yarış durumunun ne olduğunu, `count + 1`'in neden bozuk
olduğunu ve transaction'ın onu nasıl çözdüğünü — **kâğıda iki zaman çizgisi
çizerek**. Sonra Kanban taşımasını adım adım.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.1 A10 (immutable reorder) ve §18.5 D1.

**Mülakat soruları.** S45, S46, S48, S73 ve MOCK_INTERVIEWS Mülakat 4 §4.7–4.8

**Uygulamada manuel eylem.** Bir kartı taşı, sayfayı yenile, yerinde kaldığını
doğrula; sonra "Move … to" seçicisiyle aynı şeyi yap.

**Tamamlama listesi.**
- [ ] Yarış durumu anlatımını 60 saniyede yapabiliyorum
- [ ] `Serializable` ve `P2034` retry'ını açıklayabiliyorum
- [ ] Aynı kolon yeniden sıralamasının neden aktivite yazmadığını biliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. `count + 1` yerine `increment` neden yarışı çözüyor?
2. Composite unique index olmasaydı ne değişirdi?
3. İstemci bir issue id listesi gönderse ne olurdu?

**Küçük görev.** `kanban.service.ts` içindeki `runMove` fonksiyonunu satır satır
oku ve "statü değişmediğinde ne yapılmıyor?" sorusunu cevapla.

---

## Gün 10 — Yorumlar, aktiviteler ve dashboard

**Ana konu.** İşbirliği katmanı ve tek istekle çalışan özet ekran.

**İncelenecek dosyalar.**
`server/src/modules/comments/comment.service.ts`,
`server/src/modules/activities/activity.service.ts`,
`server/src/modules/dashboard/dashboard.service.ts`,
`client/src/lib/activityText.ts`

**Sesli anlat.** Yorum ve aktivitenin neden iki ayrı model olduğu;
yapılandırılmış metadata'nın neden cümleden iyi olduğu; dashboard'un neden tek
uç nokta olduğu; N+1'i nerede önlediğin.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.1 A1, A2, A4 (gruplama, geciken,
sayım) — bunların üçü de dashboard mantığının küçük hâli.

**Mülakat soruları.** S50 ve PROJECT_WALKTHROUGH §A20–A21

**Uygulamada manuel eylem.** Bir yorum ekle, aktivite akışında göründüğünü
doğrula, dashboard'daki "son aktivite" listesini kontrol et.

**Tamamlama listesi.**
- [ ] Metadata whitelist'inin ne işe yaradığını biliyorum
- [ ] "Append-only ≠ immutable" ayrımını yapabiliyorum
- [ ] "Geciken" hesabının neden sunucu saatiyle yapıldığını biliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Neden tek bir "timeline" tablosu değil?
2. Bir OWNER neden başkasının yorumunu silebiliyor ama düzenleyemiyor?
3. Dashboard altı ayrı istek olsaydı hangi problem çıkardı?

**Küçük görev.** `activityText.ts` içinde metadata eksik olduğunda ne
döndüğünü bul ve neden böyle tasarlandığını yaz.

---

## Gün 11 — Test ve hata ayıklama

**Ana konu.** Neyin nasıl kanıtlandığı ve bozulduğunda ne yapıldığı.

**İncelenecek dosyalar.** `server/src/test/setup.ts`,
`server/prisma/testDbUrl.ts`, `server/src/test/issue.test.ts`,
`client/src/test/phase7.test.tsx`, `docs/DEBUGGING_PLAYBOOK.md` (yöntem kısmı)

**Sesli anlat.** Üç test katmanı; neden gerçek veritabanı; izolasyon stratejisi;
coverage'ın ne söylediği ve söylemediği; 11 adımlı hata ayıklama yöntemi.

**Pratik alıştırma.** INTERVIEW_GUIDE §18.5'teki sekiz hata ayıklama
alıştırmasının hepsi.

**Mülakat soruları.** S83–S89, S107–S111

**Uygulamada manuel eylem.**
```bash
npm run test:kanban
```
Çıktıyı oku; hangi davranışların doğrulandığını üç madde hâlinde yaz.

**Tamamlama listesi.**
- [ ] Test veritabanı kilidinin nasıl çalıştığını biliyorum
- [ ] E2E testin olmadığını dürüstçe söyleyebiliyorum
- [ ] 11 adımlı yöntemi ezbere sayabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Veritabanını mock'lasaydım hangi hataları kaçırırdım?
2. Coverage %95 olması ne kanıtlar, ne kanıtlamaz?
3. Bir hata bulduğumda önce ne yaparım?

**Küçük görev.** Bir test dosyasında bir assertion'ı bilerek boz, testin
kırıldığını gör, geri al ve tekrar çalıştır.

---

## Gün 12 — Güvenlik

**Ana konu.** Parola, oturum, cookie, CSRF, CORS, rate limit, güvenli hatalar.

**İncelenecek dosyalar.** `server/src/middleware/requireAllowedOrigin.ts`,
`server/src/middleware/rateLimit.ts`, `server/src/app.ts` (helmet/CSP kısmı),
`server/src/config.ts`, `server/src/test/security.test.ts`

**Sesli anlat.** CSRF'in neden var olduğunu ve origin kontrolünün onu nasıl
karşıladığını; CORS'un neyi koruduğunu; CSP'nin neden yalnızca belge sunulduğunda
açıldığını.

**Pratik alıştırma.** MOCK_INTERVIEWS Mülakat 5'in tamamını sesli yap.

**Mülakat soruları.** S74–S82

**Uygulamada manuel eylem.** Canlı adrese yabancı bir `Origin` ile bir mutasyon
gönder ve `403 INVALID_ORIGIN` aldığını gör:
```bash
curl -s -X POST -H "Origin: http://evil.example" -H "Content-Type: application/json" -d "{}" https://devflow-902d.onrender.com/api/auth/login
```

**Tamamlama listesi.**
- [ ] "CORS sunucuyu korumaz" cümlesini kurabiliyorum
- [ ] Rate limiter'ın sınırını (bellekte, süreç içi) söyleyebiliyorum
- [ ] Origin kontrolünün tam CSRF-token akışı olmadığını kabul edebiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. `SameSite=Lax` tam olarak neyi engelliyor?
2. Neden yalnızca mutasyonlarda `Origin` kontrol ediliyor?
3. Bir XSS açığı olsaydı oturum cookie'si çalınabilir miydi? Peki hangi saldırı
   yine de mümkün olurdu?

**Küçük görev.** `client/dist/assets/*.js` içinde bir sır olup olmadığını
kendin tara ve sonucu yaz.

---

## Gün 13 — Docker, CI ve Render

**Ana konu.** Kodun makineden internete giden yolu.

**İncelenecek dosyalar.** `Dockerfile.production`, `docker-compose.yml`,
`.github/workflows/ci.yml`, `render.yaml`, `docs/DEPLOYMENT.md`

**Sesli anlat.** Image ile container farkı; multi-stage build'in kazandırdığı;
healthcheck'in neden gerekli; `migrate deploy && node dist/server.js` içindeki
`&&`'in neden bir güvenlik özelliği olduğu; tek origin dağıtımının kazandırdığı.

**Pratik alıştırma.** MOCK_INTERVIEWS Mülakat 7'nin tamamını sesli yap.

**Mülakat soruları.** S90–S106

**Uygulamada manuel eylem.** GitHub Actions sekmesinde son çalıştırmayı aç ve
adımları sırayla oku. Docker Desktop'ı başlatabiliyorsan:
```bash
docker build -f Dockerfile.production -t devflow:production .
```

**Tamamlama listesi.**
- [ ] CI adımlarını sırayla sayabiliyorum
- [ ] Production'da migration başarısız olursa ne olduğunu biliyorum
- [ ] Neden Render, neden Vercel değil sorusunu cevaplayabiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. `docker compose down` ile `down -v` farkı ne?
2. CI'da migration çalıştırmak neyi kanıtlıyor?
3. Health check neden veritabanına dokunmuyor?

**Küçük görev.** DEBUGGING_PLAYBOOK senaryo 21'i (health check düşüyor) oku ve
kendi kontrol sıranı üç adımda yaz.

---

## Gün 14 — Tam mülakat provası ve canlı demo

**Ana konu.** Her şeyi birleştir.

**Program (90 dakika).**
1. **20 dk** — [DEMO_SCRIPT.md](DEMO_SCRIPT.md) 5 dakikalık demoyu **üç kez**
   baştan sona yap. Süre tut.
2. **30 dk** — MOCK_INTERVIEWS Mülakat 1, 4 ve 5'i sesli yap; kendine puan ver.
3. **20 dk** — En düşük puan aldığın iki konuyu ilgili gün dosyalarından tekrar
   et.
4. **10 dk** — 10 dakikalık teknik sunumun ilk beş dakikasını prova et.
5. **10 dk** — Aşağıdaki cetveli doldur.

**Uygulamada manuel eylem.** Demo verisinin gerçekten "kullanılmış bir workspace"
gibi göründüğünü kontrol et: iki proje, 6–10 issue, birkaç yorum, birkaç
aktivite, bir geciken issue. Ekran görüntülerini al (bkz.
[FINAL_QA.md](FINAL_QA.md) bulgu F-4).

**Tamamlama listesi.**
- [ ] 30 saniyelik tanıtımı notsuz yapabiliyorum
- [ ] 5 dakikalık demoyu süre içinde bitirebiliyorum
- [ ] Yarış durumu anlatımını akıcı yapabiliyorum
- [ ] Bilinen sınırları soru sorulmadan söyleyebiliyorum

**Bunu kendi cümlemle anlatabiliyor muyum?**

**Öz-test.**
1. Bu projeyi neden yaptım ve ne öğrendim?
2. En zor teknik problem neydi ve nasıl çözdüm?
3. Yapay zekâ kullanımını nasıl anlatırım?

**Küçük görev.** Bu 14 günde bulduğun bir belirsizliği ya da eksiği
`docs/FINAL_QA.md` içine yeni bir bulgu olarak ekle — dürüst QA alışkanlığı
projenin bir parçası.

---

# Öz Değerlendirme Cetveli

Her konuya **0–4** arası puan ver. Puanları **kendin doldur** — burada hesaplanmış
bir sonuç yok, çünkü sahte bir toplam hiçbir şey öğretmez.

| Puan | Anlamı |
|---|---|
| **0** | Bilmiyorum. |
| **1** | Tanıyorum ama açıklayamıyorum. |
| **2** | Temel bir açıklama yapabiliyorum. |
| **3** | DevFlow örnekleriyle açıklayabiliyorum. |
| **4** | Ödünleşimleri anlatabiliyor ve devam sorularını karşılayabiliyorum. |

| # | Konu | 1. hafta | 2. hafta | Notlar |
|---|---|---|---|---|
| 1 | React | | | |
| 2 | TypeScript | | | |
| 3 | React Router | | | |
| 4 | TanStack Query | | | |
| 5 | Express | | | |
| 6 | REST | | | |
| 7 | Zod | | | |
| 8 | PostgreSQL | | | |
| 9 | Prisma | | | |
| 10 | Kimlik doğrulama | | | |
| 11 | Yetkilendirme | | | |
| 12 | Cookie'ler | | | |
| 13 | Güvenlik | | | |
| 14 | Transaction'lar | | | |
| 15 | Test | | | |
| 16 | Docker | | | |
| 17 | CI | | | |
| 18 | Dağıtım | | | |
| 19 | Hata ayıklama | | | |
| 20 | Git | | | |

**Nasıl kullanılır.**
- Gün 1'de bir kez doldur (dürüstçe, çalışmadan önce).
- Gün 14'te tekrar doldur ve iki sütunu karşılaştır.
- **2 ve altındaki her konu** için ilgili günü tekrar et; 3'ler için
  INTERVIEW_GUIDE'daki devam sorularını çalış.
- Mülakattan önce **yalnızca 0–2 arası** konulara zaman ayır.

---

## Plan bittiğinde

- Haftada bir [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) içinden bir mülakat
  tekrar et.
- [FINAL_QA.md](FINAL_QA.md) içindeki açık bulguları sırayla kapat (F-4
  ekran görüntüleri, F-5 depo açıklaması, F-1 kod düzeltmesi).
- Bir sonraki özellik olarak parola sıfırlamayı yaz — hem gerçek bir eksiği
  kapatır hem mülakatta "sırada ne var" sorusuna canlı bir cevap olur.
