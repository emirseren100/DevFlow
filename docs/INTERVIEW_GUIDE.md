# DevFlow — Teknik Mülakat Rehberi

> Staj mülakatı için hazırlanmış soru–cevap bankası. Her soruda altı alan var:
> **Ne ölçülüyor · Basit cevap · Güçlü cevap · DevFlow kanıtı · Devam sorusu ·
> Kaçınılacak hata**
>
> Kendi cümlelerinle cevapla. Bilmediğin bir şeyi bilmiyorum deyip **nereye
> bakacağını** söylemek, kendinden emin yanlış cevaptan daha iyi puan alır.
>
> Konu anlatımı: [PROJECT_WALKTHROUGH.md](PROJECT_WALKTHROUGH.md) ·
> Dosya haritası: [PROJECT_FILE_MAP.md](PROJECT_FILE_MAP.md) ·
> Prova: [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md)

**Dürüstlük kuralı.** Bu bir öğrenme projesi ve yapay zekâ desteğiyle
geliştirildi. Cevaplar bir stajyer adayı gibi olmalı — kıdemli mimar gibi değil.
Abartma; anlattığın her şeyi dosyadan gösterebilecek durumda ol.

---

## İçindekiler

1. [Proje tanıtımı](#1-proje-tanıtımı) · 2. [Frontend](#2-frontend) ·
3. [Backend](#3-backend) · 4. [TypeScript](#4-typescript) · 5. [REST](#5-rest) ·
6. [Veritabanı](#6-veritabanı) · 7. [Prisma](#7-prisma) ·
8. [Kimlik doğrulama](#8-kimlik-doğrulama) · 9. [Yetkilendirme](#9-yetkilendirme) ·
10. [Güvenlik](#10-güvenlik) · 11. [Test](#11-test) · 12. [Docker](#12-docker) ·
13. [CI/CD](#13-cicd) · 14. [Dağıtım](#14-dağıtım) ·
15. [Hata ayıklama](#15-hata-ayıklama) ·
16. [Mimari ve ödünleşimler](#16-mimari-ve-ödünleşimler) ·
17. [Davranışsal sorular](#17-davranışsal-sorular) ·
18. [Pratik alıştırmalar](#18-pratik-alıştırmalar)

---

## 1. Proje tanıtımı

### S1. DevFlow nedir, bana anlat.
- **Ne ölçülüyor:** Karmaşık bir şeyi kısa anlatabiliyor musun.
- **Basit cevap:** Küçük yazılım ekipleri için bir issue ve sprint takip
  uygulaması. Ekip workspace açıyor, üye ekliyor, proje ve sprint oluşturuyor,
  issue açıyor, Kanban panosunda taşıyor, yorumluyor ve aktivite akışından neyin
  değiştiğini görüyor.
- **Güçlü cevap:** Yukarıdakine ek olarak: tek repoda iki npm workspace — React
  istemci ve Express API. Veritabanı PostgreSQL, erişim Prisma ile. Oturum
  veritabanında ve HTTP-only cookie ile taşınıyor; yetkilendirme her istekte
  veritabanından okunan workspace rolüne dayanıyor. 314 test var, Docker ve
  GitHub Actions kurulu ve tek origin üzerinden Render'a dağıtıldı.
- **DevFlow kanıtı:** https://devflow-902d.onrender.com, `README.md`
- **Devam sorusu:** "En zor kısım neydi?"
- **Kaçın:** Özellik listesi okumak. Bir cümlede ne olduğunu söyle, sonra
  teknik omurgayı ver.

### S2. Bu projeyi neden yaptın?
- **Ne ölçülüyor:** Motivasyon ve öğrenme hedefi.
- **Basit cevap:** Tutorial to-do listesinden gerçek bir uygulamaya geçmek
  istedim.
- **Güçlü cevap:** Üç şeyi öğrenmek istedim: gerçek ilişkisel veri modelleme,
  sunucu tarafında ciddi bir yetkilendirme katmanı ve çalıştığını
  kanıtlayabildiğim testler. To-do listesi bunların hiçbirini zorlamıyor;
  çok kullanıcılı ve rol tabanlı bir ürün zorluyor.
- **DevFlow kanıtı:** `docs/DECISIONS.md` — 91 karar, reddedilen alternatifleriyle
- **Devam sorusu:** "Hangi kararı yeniden verirdin?"
- **Kaçın:** "CV'me koymak için" demek.

### S3. Kaç kişiydiniz, ne kadar sürdü?
- **Basit cevap:** Tek kişilik bir öğrenme projesi; on faza böldüm ve her fazın
  kabul kriterleri yazılıydı.
- **Güçlü cevap:** Fazlar sırayla: iskele, veri modeli, kimlik doğrulama,
  workspace ve roller, proje/sprint/issue, yorum-aktivite-Kanban, frontend
  entegrasyonu, güvenlik-Docker-CI, UI ve dağıtım. Her fazın sonunda
  `PROJECT_STATE.md` güncellendi, böylece yeni bir oturuma tek dosya okuyarak
  devam edebildim.
- **DevFlow kanıtı:** `docs/ROADMAP.md`, `docs/PROJECT_STATE.md`
- **Kaçın:** Süreyi abartmak veya ekip varmış gibi "biz" demek.

### S4. Projenin en güçlü üç teknik noktası nedir?
- **Güçlü cevap:** (1) Sunucunun sahip olduğu, tek `Serializable` transaction
  içinde çalışan Kanban sıralaması. (2) Yarış durumuna dayanıklı, proje bazlı
  issue numaralandırma. (3) Tek origin production mimarisi — cookie first-party
  kalıyor.
- **DevFlow kanıtı:** `server/src/modules/kanban/kanban.service.ts`,
  `server/src/modules/issues/issue.service.ts`,
  `server/src/middleware/serveClient.ts`
- **Devam sorusu:** "Kanban taşımasında iki kişi aynı anda ne olur?"
- **Kaçın:** "React kullandım" gibi teknoloji saymak.

### S5. Bu projeyi bir stajyer olarak neden savunabiliyorsun?
- **Güçlü cevap:** Her mimari kararın gerekçesi ve reddedilen alternatifi
  depoda yazılı; herhangi bir dosyayı açıp neden öyle olduğunu anlatabilirim.
  Doğrulamayı da belgeledim: neyin test edildiğini, neyin manuel beklediğini
  `docs/FINAL_QA.md` dürüstçe listeliyor.
- **Kaçın:** "Her satırını elle yazdım" demek — doğru değil ve kontrol edilebilir.

---

## 2. Frontend

### S6. Neden React?
- **Ne ölçülüyor:** Teknoloji seçimini gerekçelendirme.
- **Basit cevap:** Arayüzü küçük, yeniden kullanılabilir parçalara bölüyor ve
  ekibin/ekosistemin en yaygın seçimi.
- **Güçlü cevap:** Bu bir içerik sitesi değil, oturum arkasında çok ekranlı bir
  yönetim uygulaması — yani SPA doğru şekil. React'in bileşen modeli tekrar eden
  blokları (rozet, panel, dialog, durum ekranı) tek yerde tutmamı sağladı ve
  React Router + TanStack Query gibi olgun kütüphanelerle geliyor.
- **DevFlow kanıtı:** `client/src/components/`, `client/src/pages/`
- **Devam sorusu:** "Next.js neden değil?" → SEO gereken public sayfa yok,
  her şey oturum arkasında; SSR bana bir şey kazandırmadan build ve dağıtım
  karmaşıklığı eklerdi.
- **Kaçın:** "Popüler olduğu için" tek başına.

### S7. Bileşen, prop ve state farkı nedir?
- **Basit cevap:** Bileşen ekranın bir parçası; prop dışarıdan verilen veri;
  state bileşenin kendi hatırladığı veri.
- **Güçlü cevap:** Prop yukarıdan aşağı akar ve salt okunurdur; state bileşene
  aittir ve değiştiğinde yeniden render tetikler. DevFlow'da `ConfirmDialog`
  tamamen prop ile sürülüyor (başlık, onay geri çağrısı), form alanları ise
  `useState` ile kontrollü.
- **DevFlow kanıtı:** `client/src/components/ConfirmDialog.tsx`,
  `client/src/pages/IssueCreatePage.tsx`
- **Devam sorusu:** "Kontrollü ve kontrolsüz form farkı?"
- **Kaçın:** State'i prop'a yazmaya çalışmak.

### S8. `useEffect` ne zaman gerekir?
- **Basit cevap:** Render dışında bir şey yapmam gerektiğinde — örneğin sayfa
  açılırken sunucuya sormak.
- **Güçlü cevap:** Effect bir **senkronizasyon** aracı: React dışındaki bir
  sistemle (ağ, tarayıcı API'si, abonelik) durum eşitler. DevFlow'da tek gerçek
  effect `AuthProvider` içindeki mount anındaki `GET /api/auth/me`. Geri kalan
  veri çekme işi TanStack Query'ye taşındı, çünkü effect ile fetch yapmak cache,
  yarış koşulu ve iptali elle yönetmek demek.
- **DevFlow kanıtı:** `client/src/auth/AuthProvider.tsx`
- **Devam sorusu:** "Bağımlılık listesini neden eksik bırakmamalı?"
- **Kaçın:** Türetilebilir değeri effect ile state'e yazmak.

### S9. Context ne işe yarar, neden Redux değil?
- **Basit cevap:** Context, prop zinciri kurmadan bir değeri ağaca yaymak için.
- **Güçlü cevap:** DevFlow'da tek gerçek client state "kim giriş yapmış" ve o
  küçük bir context'te. Geri kalan her şey **server state**: PostgreSQL'e ait bir
  kopya, bayatlayabilir. Redux client state yönetir; cache, staleness ve
  invalidation hikâyesi vermez — o yüzden TanStack Query.
- **DevFlow kanıtı:** `client/src/auth/AuthProvider.tsx`,
  `client/src/lib/queryClient.ts`
- **Devam sorusu:** "Context değişince ne yeniden render olur?" → tüm tüketiciler;
  bu yüzden `value` `useMemo` ile sabitlenmiş.
- **Kaçın:** "Redux eski" demek. Doğru cevap "farklı bir problemi çözüyor".

### S10. Neden TanStack Query?
- **Basit cevap:** Sunucudan gelen veriyi hatırlıyor, tekrar indirmiyor ve bir
  değişiklikten sonra doğru yerleri tazeliyor.
- **Güçlü cevap:** Her ekrana aynı dört sonucu veriyor (bekliyor, hata, boş,
  veri), aynı key'i isteyen bileşenler tek isteği paylaşıyor ve mutasyondan
  sonra hedeflenmiş invalidation yapabiliyorum. Öncesinde her sayfada kendi
  `useEffect` fetch'i, kendi loading dalı ve mutasyondan sonra bayat ekran vardı.
- **DevFlow kanıtı:** `client/src/lib/queryKeys.ts`, `queryClient.ts`
- **Devam sorusu:** "Retry'ı neden kapattın?" → `401/403/404` doğru cevaplar,
  flake değil; yeniden denemek hatayı geciktirir. Hata ekranında görünür bir
  "Try again" var.
- **Kaçın:** Query'yi bir "fetch kütüphanesi" sanmak; isteği hâlâ `fetch` atıyor.

### S11. Query key nasıl tasarlanır?
- **Güçlü cevap:** Key, cache'teki adrestir ve **prefix** ile eşleşir. DevFlow'da
  hepsi tek factory'den geliyor ve URL gibi genişten dara okunuyor:
  `['workspaces','detail',w,'projects','detail',p,'board']`. `list` ve `detail`
  ayrı segment, böylece listeyi invalidate etmek altındaki detayları atmıyor.
  Filtreler key'in parçası, çünkü farklı filtre farklı veri.
- **DevFlow kanıtı:** `client/src/lib/queryKeys.ts`
- **Devam sorusu:** "Bir scope key'i invalidate edersen ne olur?" → altındaki her
  şey de geçersiz olur; bu yüzden `exact: true` ve `…Lists` yardımcıları var.
- **Kaçın:** Key'i bileşen içinde elle yazmak.

### S12. Mutation'dan sonra ne invalidate edilir?
- **Güçlü cevap:** Yalnızca gerçekten etkilenenler. Üye eklemek üyeleri,
  workspace'i ve dashboard'u tazeler. Kanban taşıması **her zaman** panoyu,
  **yalnızca gerçek statü değişiminde** ayrıca issue'yu, listeleri, akışları ve
  dashboard'u tazeler. "Her şeyi invalidate et" çalışır ama bir yazmayı on
  isteğe çevirir.
- **DevFlow kanıtı:** `client/src/pages/BoardPage.tsx`, `MembersPage.tsx`
- **Kaçın:** `queryClient.invalidateQueries()` parametresiz çağırmak.

### S13. İyimser güncelleme (optimistic update) nedir, riski nedir?
- **Güçlü cevap:** Sunucu cevaplamadan arayüzü güncellemek. Riski: sunucu
  reddederse ekran yalan söylemiş olur. DevFlow'da Kanban taşıması önceki panoyu
  bir değişkende saklıyor; hata olursa geri yüklüyor ve mesaj gösteriyor.
  Geri alması olmayan iyimser güncelleme "genelde doğru olan bir yalandır".
- **DevFlow kanıtı:** `client/src/pages/BoardPage.tsx`
- **Devam sorusu:** "Sunucunun cevabını neden doğrudan yazıyorsun?" → onaylanmış
  pano tek doğruluk kaynağı.

### S14. Korumalı rota nasıl çalışıyor?
- **Güçlü cevap:** `RequireAuth` sarmalayıcı bir route; oturum kontrolü sürerken
  yükleme durumu, sonra ya sayfa ya `/login` yönlendirmesi. Bu **güvenlik
  değil**, kullanıcı deneyimi; gerçek kontrol sunucudaki `requireAuth`.
- **DevFlow kanıtı:** `client/src/auth/RequireAuth.tsx`
- **Kaçın:** İstemci guard'ını güvenlik olarak sunmak.

### S15. Filtreleri neden URL'de tutuyorsun?
- **Güçlü cevap:** URL, kullanıcının düzenleyebildiği, paylaşabildiği ve yer imi
  yapabildiği bir state. Geri tuşu, yenileme ve paylaşılan bağlantı aynı
  görünümü veriyor. Ayrıca filtre query key'in parçası olduğu için her
  kombinasyon ayrı cache'leniyor ve eski bir filtrenin geç gelen cevabı güncel
  listeyi ezemiyor.
- **DevFlow kanıtı:** `client/src/pages/ProjectDetailPage.tsx`

### S16. Responsive tasarımı nasıl ele aldın?
- **Güçlü cevap:** Yapısal önce: 900px'te navigasyon `aria-expanded` taşıyan bir
  Menu düğmesinin arkasına katlanıyor, 560px'te filtre çubuğu dikleşiyor ve
  eylemler tam genişlik dokunma hedefi oluyor. Kanban her genişlikte yatay
  kayıyor, çünkü beş kolonu telefona sıkıştırmak okunabilir değil.
- **DevFlow kanıtı:** `client/src/index.css`, `client/src/test/phase9.test.tsx`
- **Devam sorusu:** "Hangi genişliklerde test ettin?" → 1440, 1024, 768, 390 —
  tek Chromium motorunda; Safari ve Firefox denenmedi.

### S17. Erişilebilirlik için ne yaptın?
- **Güçlü cevap:** Yapısal şeyler: sayfa başına tek `banner`, tek `main`, tek
  `h1`; görünür odak halkası; her form alanının etiketi; durumun asla yalnızca
  renkle anlatılmaması; sürüklemenin tek yol olmaması. `ConfirmDialog`
  `role="dialog" aria-modal="true"`, odağı Cancel'da açıyor, Tab'ı hapsediyor,
  Escape ile kapanıyor ve odağı geri veriyor.
- **DevFlow kanıtı:** `client/src/components/ConfirmDialog.tsx`,
  `client/src/components/PageHeader.tsx` (bilerek `div`, ikinci banner olmasın)
- **Kaçın:** "Erişilebilir" demek ama otomatik denetim çalıştırmamış olmak —
  dürüst cevap: axe gibi bir araç henüz çalıştırılmadı.

### S18. Neden UI framework kullanmadın?
- **Güçlü cevap:** Uygulama bir kabuk, bir form, bir liste, bir rozet ve bir
  dialog. Bir bileşen kütüphanesi beş tür blok için kendi tasarım sistemini ve
  fikirlerini getirir ve her anlaşmazlıkta onunla dövüşürüm. Bunun yerine tek
  CSS token dosyası: dört yüzey, üç metin adımı, bir vurgu, altı boşluk adımı.
- **DevFlow kanıtı:** `client/src/index.css`, `docs/DECISIONS.md` satır 79
- **Kaçın:** "Framework kötü" demek. Ödünleşim: bu ölçekte kazanç yok.

---

## 3. Backend

### S19. Neden Express?
- **Basit cevap:** Küçük, tanıdık ve tam olarak ihtiyacım olan kadarını yapıyor.
- **Güçlü cevap:** İhtiyacım olan şey bir middleware zinciri ve bir router.
  Express bunu görünür kılıyor — istek sırası okunabilir ve öğretilebilir.
  NestJS bir DI konteyneri ve dekoratör modeli getirirdi; bu boyutta öğrenme
  maliyeti kazançtan büyük. Fastify daha hızlı ama darboğazım veritabanı, HTTP
  katmanı değil.
- **DevFlow kanıtı:** `server/src/app.ts`
- **Devam sorusu:** "Ne zaman NestJS'e geçerdin?" → çok modüllü, çok kişili bir
  ekip ve tekrar eden altyapı kodu olduğunda.

### S20. `app.ts` ile `server.ts` neden ayrı?
- **Güçlü cevap:** `createApp()` uygulamayı dinlemeden kuruyor; `server.ts`
  portu açıyor. Supertest uygulamayı import edip gerçek HTTP isteği atabiliyor,
  ama hiçbir port açılmıyor. Testler hızlı ve port çakışması imkânsız.
- **DevFlow kanıtı:** `server/src/app.ts`, `server/src/server.ts`

### S21. Middleware sırası neden önemli?
- **Güçlü cevap:** CORS preflight'ı, isteği reddedebilecek bir şeyden önce
  cevaplamalı; gövde route okumadan önce ayrıştırılmalı; origin kontrolü CORS'tan
  sonra gelmeli yoksa `OPTIONS` bozulur; `/api` 404'ü client router'dan önce
  olmalı yoksa bilinmeyen bir API adresi HTML döner; hata yakalayıcı en sonda ve
  **dört parametreli** olmalı, Express onu böyle tanıyor.
- **DevFlow kanıtı:** `server/src/app.ts` yorumlu sıra listesi
- **Kaçın:** Sırayı "alışkanlık" diye açıklamak.

### S22. Zod'u neden ve nerede kullanıyorsun?
- **Güçlü cevap:** Tam olarak iki yerde: API kenarında (`body`, `params`,
  `query`) ve başlangıçta ortam değişkenlerinde. Servis içinde tekrar doğrulama
  yok, çünkü veri oradan itibaren tipli. `z.infer` sayesinde şekil iki kez
  yazılmıyor.
- **DevFlow kanıtı:** `server/src/modules/*/*.schemas.ts`, `server/src/config.ts`
- **Devam sorusu:** "TypeScript zaten tip kontrolü yapmıyor mu?" → TypeScript
  derleme zamanında biter; `req.body` çalışma zamanında her şey olabilir.

### S23. Hataları nasıl yönetiyorsun?
- **Güçlü cevap:** Tek `ApiError` sınıfı (`status`, `code`, `fieldErrors`) ve
  tek `errorHandler`. Beklenen hatalar sınıflandırılıp aynı şekilde dönüyor;
  beklenmeyen her şey `500 INTERNAL_ERROR` tek cümle — stack trace, Prisma
  mesajı ve dosya yolu sunucuda kalıyor. `express.json()`'ın attığı iki hata
  (`entity.too.large`, `entity.parse.failed`) da isimlendirilmiş hatalara
  çevriliyor, yoksa anonim 500 olurlardı.
- **DevFlow kanıtı:** `server/src/lib/apiError.ts`,
  `server/src/middleware/errorHandler.ts`
- **Devam sorusu:** "Testte neden log basmıyorsun?" → hata yolları bilerek
  deneniyor; stack trace test çıktısını gömerdi.

### S24. Sağlık ucu neden veritabanına dokunmuyor?
- **Güçlü cevap:** `GET /api/health` "süreç ayakta ve erişilebilir mi" sorusunu
  yanıtlıyor. Veritabanına dokunsaydı, veritabanı çöktüğünde API'nin kendisi
  ölü görünürdü ve platform sağlıklı bir konteyneri öldürürdü. Veritabanı
  sorusunun ayrı bir cevabı var: `npm run db:check`.
- **DevFlow kanıtı:** `server/src/routes/health.ts`, `server/prisma/check.ts`

### S25. Modül yapısı neden böyle?
- **Güçlü cevap:** Her modül aynı beş dosya: `routes` (HTTP), `schemas` (Zod),
  `service` (Prisma ve iş kuralları), `authorization` (izinler), `types`.
  Tahmin edilebilir olduğu için yeni bir modül eklemek düşünmeden yapılabiliyor
  ve bir dosyanın sorumluluğu adından okunuyor.
- **DevFlow kanıtı:** `server/src/modules/issues/`

### S26. Servis katmanı neden var?
- **Güçlü cevap:** Route HTTP'yi bilir (durum kodu, gövde); servis iş kuralını
  bilir (transaction, doğrulama, Prisma). Ayırmak, aynı kuralı ikinci bir
  yerden — örneğin bir script'ten — çağırabilmeyi ve testte HTTP olmadan
  denemeyi mümkün kılıyor.

---

## 4. TypeScript

### S27. Neden TypeScript?
- **Basit cevap:** Hataları kullanıcı tıklayınca değil, ben yazarken yakalıyor.
- **Güçlü cevap:** İstemci ve sunucu bir şekil üzerinde anlaşıyor. Issue
  yükünü değiştirdiğimde derleyici değişmesi gereken her ekranı listeledi;
  TypeScript olmasaydı onları tıklayarak bulacaktım. Ayrıca editörde
  otomatik tamamlama gerçek dokümantasyon gibi çalışıyor.
- **DevFlow kanıtı:** `client/src/lib/projectApi.ts` tipleri
- **Kaçın:** "Daha az bug" demek — TypeScript mantık hatasını yakalamaz.

### S28. `interface` ve `type` farkı?
- **Güçlü cevap:** `interface` genişletilebilir ve declaration merging yapar —
  bu yüzden Express `Request`'i genişletmek için kullanıldı. `type` birleşim
  (`union`), kesişim ve eşlenmiş tiplerde daha esnek. Pratikte: nesne şekli için
  `interface`, birleşim için `type`.
- **DevFlow kanıtı:** `server/src/modules/auth/auth.types.ts` (`req.user`
  genişletmesi)

### S29. Strict mode ne kazandırıyor?
- **Güçlü cevap:** `strictNullChecks` `null`/`undefined`'ı görünür yapıyor,
  `noImplicitAny` sessiz `any`'yi engelliyor, `exactOptionalPropertyTypes`
  "anahtar yok" ile "anahtar var ama `undefined`" arasındaki farkı koruyor.
  Sonuncusu gerçek bir kod değişikliğine sebep oldu: `signal: undefined`
  geçmek yerine anahtarı tamamen atlıyorum.
- **DevFlow kanıtı:** `client/src/lib/apiClient.ts` `get()` fonksiyonu

### S30. `any` yerine ne yapıyorsun?
- **Güçlü cevap:** `unknown` + daraltma. Hata yakalarken `catch (error: unknown)`
  ve `error instanceof ApiError` ile daraltıyorum; Prisma hata kodunu kontrol
  ederken `'code' in error` şeklinde tip koruması yazıyorum.
- **DevFlow kanıtı:** `server/src/modules/kanban/kanban.service.ts`
  `isTransactionConflict`
- **Kaçın:** `as any` ile susturmak.

### S31. Derleme zamanı vs çalışma zamanı doğrulaması?
- **Güçlü cevap:** İkisi farklı şeyler. `tsc` çıktısında tip kontrolü kalmaz;
  ağdan gelen JSON istediği gibi olabilir. Bu yüzden sınırda Zod var ve
  şemalardan `z.infer` ile tip üretiliyor — tek kaynak, iki garanti.

---

## 5. REST

### S32. REST tasarımını nasıl yaptın?
- **Güçlü cevap:** Kaynak odaklı, çoğul isimler ve sahiplik zincirini yansıtan
  iç içe yollar:
  `/api/workspaces/:workspaceId/projects/:projectId/issues/:issueId`.
  `GET` okur, `POST` yaratır, `PATCH` düzenler, `DELETE` siler. Filtreleme,
  arama, sıralama ve sayfalama query parametresi — asla ayrı uç nokta değil.
- **DevFlow kanıtı:** `server/src/modules/*/**.routes.ts`

### S33. Neden iç içe URL?
- **Güçlü cevap:** Çünkü yetkilendirme kontrolünü taşıyorlar. Yoldaki workspace
  id'si her aramanın `where` filtresi; başka bir workspace'in proje id'si
  `404 PROJECT_NOT_FOUND` alıyor, veri değil.
- **DevFlow kanıtı:** `server/src/modules/projects/project.authorization.ts`
- **Devam sorusu:** "Neden 403 değil 404?" → varlığı doğrulamamak için;
  "yok" ile "senin değil" aynı cevabı veriyor.

### S34. 401 ile 403 farkı?
- **Güçlü cevap:** 401 = kimliğin yok, giriş yap ve tekrar dene. 403 = kim
  olduğunu biliyorum ve cevap yine hayır. Eksik oturuma 403 dönmek istemciyi
  giriş formu göstermek yerine pes etmeye iter.
- **DevFlow kanıtı:** `requireAuth` → 401, `requireWorkspaceMember` → 403

### S35. Hangi durum kodlarını kullandın?
- **Güçlü cevap:** 400 doğrulama, 401 oturum yok, 403 izin yok / geçersiz origin,
  404 bulunamadı, 409 çakışma (`EMAIL_IN_USE`, `PROJECT_KEY_IN_USE`,
  `SPRINT_HAS_ISSUES`), 413 gövde çok büyük, 429 rate limit, 500 beklenmeyen.
- **Kaçın:** Her hataya 400 dönmek.

### S36. Kararlı hata kodları neden var?
- **Güçlü cevap:** İstemci metne değil koda dallanabilsin diye. Metin
  değişebilir, çevrilebilir; `ISSUE_NOT_FOUND` değişmez. DevFlow'da istemci hem
  `status` hem `code` tutuyor: ekran kararını status'tan veriyor, kod
  sorun gidermede işe yarıyor.
- **DevFlow kanıtı:** `client/src/lib/apiClient.ts`
- **Dürüst not:** Bilinmeyen adres 404'ü şu an `code` taşımıyor — bu
  `docs/FINAL_QA.md` içinde **F-1** olarak kayıtlı.

### S37. Sayfalama nasıl çalışıyor?
- **Güçlü cevap:** `page` ve `limit` → Prisma `skip`/`take`; limit 100'de
  sınırlı, yani yanıt boyutu projenin ne kadar büyüdüğüne bağlı değil. Yanıt
  `total`, `totalPages`, `hasPreviousPage`, `hasNextPage` taşıyor, böylece UI
  tahmin yapmadan pager çiziyor. Sıralama sonunda `number` ile kırılıyor ki
  aynı `updatedAt`'e sahip iki issue sayfalar arasında zıplamasın.
- **DevFlow kanıtı:** `server/src/modules/issues/issue.service.ts`
- **Devam sorusu:** "Cursor pagination ne zaman daha iyi?" → çok büyük
  veri kümelerinde `OFFSET` pahalılaşır ve araya eklenen satır sayfaları
  kaydırır; cursor bunu çözer.

### S38. Filtreleme neden sunucuda?
- **Güçlü cevap:** Veritabanında filtrelemek yalnızca istenen satırları gönderir;
  tarayıcıda filtrelemek her şeyi indirip bir kısmını gizlemektir. Ayrıca yetki
  sınırının içinde kalır.

---

## 6. Veritabanı

### S39. Neden PostgreSQL?
- **Basit cevap:** Veri gerçekten ilişkisel: kullanıcı, workspace, proje, sprint,
  issue, yorum birbirine bağlı.
- **Güçlü cevap:** İhtiyacım olan garantiler ilişkisel: yabancı anahtar,
  composite unique index, gerçek enum, transaction ve izolasyon seviyeleri.
  Issue numaralandırmasındaki yarışı bir satır kilidiyle çözebilmem doğrudan
  PostgreSQL'in verdiği bir şey.
- **DevFlow kanıtı:** `server/prisma/schema.prisma`

### S40. Neden MongoDB değil?
- **Güçlü cevap:** Verim doküman şeklinde değil, çok-çoklu ilişkilerle dolu.
  Mongo'da workspace üyeliği ya gömülü dizi (rol taşımak ve tutarlılığı korumak
  zor) ya da elle yönetilen bir referans olurdu. Ayrıca `(projectId, number)`
  benzersizliğini ve `Serializable` sıralamayı uygulama kodunda taklit etmem
  gerekirdi. Şema serbestliği burada bir kazanç değil, kayıp olurdu.
- **Kaçın:** "Mongo kötü" demek. Doğru cevap: veri şekli bu değil.

### S41. Explicit `WorkspaceMember` join tablosu neden?
- **Güçlü cevap:** Çünkü üyelik **veri taşıyor**: `role` ve `joinedAt`. Rol
  kullanıcıya da workspace'e de ait değil, **çifte** ait — aynı kişi bir
  workspace'te OWNER, başkasında MEMBER olabiliyor. Implicit many-to-many
  tablosunda bu kolon için yer yok.
- **DevFlow kanıtı:** `schema.prisma` `WorkspaceMember`

### S42. Composite unique constraint nedir, nerede kullandın?
- **Güçlü cevap:** Birden fazla kolonun **birlikte** benzersiz olması. Üç yerde:
  `@@unique([projectId, number])` — bir projede iki issue aynı numarayı alamaz;
  `@@unique([workspaceId, userId])` — aynı kişi bir workspace'e iki kez üye
  olamaz; `@@unique([workspaceId, key])` — proje anahtarı workspace içinde
  benzersiz, yani iki farklı workspace ikisi de `API` kullanabilir.
- **Devam sorusu:** "Uygulama kodunda kontrol etsen olmaz mıydı?" → Olmaz.
  Aynı milisaniyede gelen iki istek ikisi de "yok" görür. Kısıt veritabanında
  olmalı.

### S43. Index ne işe yarar, hangilerini ekledin?
- **Güçlü cevap:** Index filtreli sorguyu hızlandıran arama yapısı; bedeli biraz
  daha yavaş yazma ve ek yer. Sadece gerçekten filtrelediğim yerlere ekledim:
  `(projectId, status, position)` — pano sorgusu ve yeniden sıralama okumaları;
  `assigneeId`, `sprintId`; aktivite için `(workspaceId, createdAt)`,
  `(projectId, createdAt)`, `(issueId, createdAt)`; `Session.userId`,
  `Session.expiresAt`.
- **Kaçın:** "Her kolona index" demek.

### S44. Cascade, SetNull ve Restrict farkı?
- **Güçlü cevap:** Silme davranışları niyeti kodluyor.
  **Cascade** — issue silinince yorumları da gider; yorumun issue'suz anlamı yok.
  **SetNull** — sprint silinince `Issue.sprintId` null olur; iş kaybolmamalı.
  **Restrict** — workspace sahibi, issue reporter'ı, yorum yazarı: gerçek iş
  dururken kullanıcı satırı silinemez, yoksa yorum yazarını kaybederdi.
- **DevFlow kanıtı:** `schema.prisma` ilişki tanımları

### S45. Transaction nedir, nerede kullandın?
- **Güçlü cevap:** Ya hepsi olur ya hiçbiri. Dört yerde: (1) kayıt — `User` ve
  `PasswordCredential` birlikte, parolasız kullanıcı olmasın; (2) workspace
  oluşturma — workspace + OWNER üyeliği + aktivite, yöneticisiz workspace
  olmasın; (3) issue oluşturma — sayaç artışı ve satır ekleme; (4) Kanban
  taşıma — iki kolonun yeniden numaralandırılması ve aktivite.
- **DevFlow kanıtı:** `auth.service.ts`, `workspace.service.ts`,
  `issue.service.ts`, `kanban.service.ts`

### S46. `Serializable` izolasyon neden?
- **Güçlü cevap:** Aynı kolonu iki kişi aynı anda sıralarsa okumaları iç içe
  geçip yinelenen pozisyon üretebilir. `Serializable` bu geçişmeyi imkânsız
  kılıyor; bedeli ara sıra bir yazma çakışması (Prisma `P2034`) ve onu **sınırlı**
  bir retry karşılıyor — en fazla üç deneme. Sınırsız retry düzeltme değil,
  kilitlenmedir.
- **DevFlow kanıtı:** `kanban.service.ts`

### S47. Proje bazlı issue numaralandırmayı neden seçtin?
- **Güçlü cevap:** `#4297` kimseye bir şey anlatmıyor; `API-14` hangi projede
  olduğunu söylüyor ve sohbette, commit mesajında, yer iminde kullanılabiliyor.
  Sayaç proje satırında, bu yüzden `API-1` ve `WEB-1` birlikte var olabiliyor.
- **DevFlow kanıtı:** `Project.nextIssueNumber`, `Issue.number`

### S48. Burada hangi yarış durumu oluşabilirdi?
- **Güçlü cevap:** İki kullanıcı aynı anda issue açarsa. `count + 1` yaklaşımında
  ikisi de "7 issue var" okur ve ikisi de 8 yazar — okuma kilit almaz. Çözüm:
  sayacı issue'yu yaratan transaction içinde `increment` ile artırmak. `UPDATE`
  proje satırını kilitliyor, ikinci istek bekliyor ve 9'u alıyor. Son güvence
  `(projectId, number)` composite unique index — gelecekte biri transaction'ı
  unutursa veritabanı sessiz bozuk veri yerine gürültülü hata veriyor.
- **DevFlow kanıtı:** `issue.service.ts` `createIssue`

### S49. `displayKey` neden saklanmıyor?
- **Güçlü cevap:** Türetilmiş değer. Proje anahtarı ve numara zaten var;
  üçüncü bir kolon kopya olur ve sapabilir. Yanıt kurulurken hesaplanıyor.

### S50. N+1 problemi nedir, nerede önledin?
- **Güçlü cevap:** Bir liste için bir sorgu, sonra her satır için bir sorgu daha.
  İki yerde önledim: issue listesinde reporter/assignee/sprint tek `select` ile
  join ediliyor; dashboard'da on proje için on bir sorgu yerine tek `groupBy`.
  Pano da tek `findMany` ve bellekte gruplama.

---

## 7. Prisma

### S51. Neden Prisma?
- **Basit cevap:** Tabloları okunabilir tek dosyada tanımlıyorum, o bana tipli
  sorgu fonksiyonları veriyor.
- **Güçlü cevap:** Şemadan üretilen client sayesinde olmayan bir kolonu
  `select` eden kod derlenmiyor; migration'lar dosya olarak commit'leniyor;
  `groupBy`, `count` ve `$transaction` doğrudan destekleniyor.
- **DevFlow kanıtı:** `server/prisma/schema.prisma`, `server/src/lib/prisma.ts`

### S52. Prisma'nın dezavantajları neler?
- **Güçlü cevap:** Karmaşık SQL'i ifade etmek ham SQL'den zor; üretilen client
  senkronda tutulması gereken ek bir build adımı; sürüm geçişleri (Prisma 7'de
  driver adapter zorunluluğu, config dosyası değişikliği) gerçek iş çıkarıyor.
  Rapor ağırlıklı bir sorgu için `$queryRaw`'a inerdim.
- **Dürüstlük puanı:** Bir aracın dezavantajını sayabilmek, mülakatta güven verir.

### S53. `migrate dev` ile `migrate deploy` farkı?
- **Güçlü cevap:** `migrate dev` **migration yazar**, sorabilir ve
  sıfırlayabilir — yalnızca geliştirici makinesinde. `migrate deploy`
  işlenmiş migration'ları oynatır; yazmaz, sormaz, sıfırlamaz. Container, CI ve
  production yalnızca `deploy` çalıştırıyor.
- **DevFlow kanıtı:** `.github/workflows/ci.yml`, `Dockerfile.production`

### S54. Neden `db push` değil?
- **Güçlü cevap:** `db push` şemayı dayatır ve **geçmiş bırakmaz**. Ne
  değiştiğini gösteren gözden geçirilebilir bir dosya olmaz; CI "migration'lar
  gerçekten uygulanıyor mu" sorusunu kanıtlayamaz ve production'da geri dönüş
  planı kalmaz.

### S55. Production'da migration başarısız olursa ne olur?
- **Güçlü cevap:** Başlangıç komutu `prisma migrate deploy && node dist/server.js`.
  `&&` sayesinde sunucu hiç başlamıyor, konteyner çıkıyor ve platform önceki
  sürümü çalıştırmaya devam ediyor. Yarım migrate edilmiş bir veritabanı asla
  servis edilmiyor. `P3009` görürsem production'ı sıfırlamam — ileri yönlü bir
  migration yazarım.
- **DevFlow kanıtı:** `docs/DEPLOYMENT.md` §13-14

### S56. Seed ne yapıyor, production'da neden çalışmıyor?
- **Güçlü cevap:** `seed_*` sabit id'leri ve `upsert` ile idempotent bir
  geliştirme veri kümesi yazıyor — iki kez çalıştırılabilir. Production'da asla
  çalışmıyor, çünkü hesapları paylaşılan ve dokümante edilmiş bir parola
  kullanıyor. Production boş başlıyor ve ilk hesap `/register` ile açılıyor.

---

## 8. Kimlik doğrulama

### S57. Kimlik doğrulama nasıl çalışıyor, adım adım?
- **Güçlü cevap:** Kayıt/giriş → Zod → Argon2id (hash ya da verify) → 32 rastgele
  bayttan opak token → token'ın SHA-256 hash'i `Session` satırına → ham token
  HTTP-only cookie'de → her istekte cookie'yi hash'leyip satırı bul, süresini
  kontrol et, `SafeUser`'ı isteğe iliştir → çıkışta satırı sil ve cookie'yi
  temizle.
- **DevFlow kanıtı:** `server/src/modules/auth/auth.service.ts`,
  `auth.middleware.ts`

### S58. Neden JWT değil?
- **Güçlü cevap:** İptal. JWT süresi dolana kadar geçerli kalır; "her yerden
  çıkış yap" için bir denylist gerekir — ki bu fazladan adımlarla bir oturum
  tablosudur. Zaten PostgreSQL'im var; oturum satırı tek indexed lookup ve çıkış
  bir `DELETE`.
- **Devam sorusu:** "JWT ne zaman doğru olurdu?" → durumsuz, yatay ölçeklenen
  çok servisli bir mimaride ve kısa ömürlü access token + refresh token ile.
- **Kaçın:** "JWT güvensiz" demek. Doğru cevap: farklı ödünleşim.

### S59. Neden HTTP-only cookie, neden `localStorage` değil?
- **Güçlü cevap:** `localStorage`'daki her şeyi sayfadaki her script okuyabilir;
  tek XSS açığı token'ı götürür. `httpOnly` cookie'yi `document.cookie`'den
  görünmez yapıyor ve istemci hiçbir zaman bir sır tutmuyor. Bedeli CSRF'i ayrıca
  düşünmek — bunu `SameSite=Lax` + origin kontrolüyle karşıladım.
- **DevFlow kanıtı:** `setSessionCookie` içindeki cookie seçenekleri

### S60. Neden Argon2id?
- **Güçlü cevap:** OWASP'ın parola için güncel varsayılanı. Bilerek yavaş ve
  **bellek-yoğun**, yani GPU ile paralel tahmin pahalı. `id` varyantı iki Argon2
  modunu karıştırıp hem GPU kırmaya hem yan kanal saldırılarına direniyor. Her
  hash kendi tuzunu ve parametrelerini taşıyor.
- **Devam sorusu:** "bcrypt olsa?" → kabul edilebilir ama bellek sertliği yok;
  yeni proje için Argon2id öneriliyor.

### S61. Neden parolada Argon2id ama token'da SHA-256?
- **Güçlü cevap:** Parola düşük entropili ve insan seçimi — hash yavaş olmalı.
  Oturum token'ı zaten 256 bit rastgelelik; tahmin edilecek bir şey yok. Yavaş
  hash **her istekte** gecikme ekler ve hiçbir şey kazandırmaz.

### S62. Oturum token'ını neden hash'leyerek saklıyorsun?
- **Güçlü cevap:** `sessions` tablosunu okuyan biri (sızan yedek, SQL enjeksiyon
  hatası) aksi hâlde her oturum için çalışan token elde ederdi. Hash ile giriş
  yapılamıyor: istek, gelen cookie hash'lenip o hash aranarak doğrulanıyor.
- **DevFlow kanıtı:** `hashSessionToken`, `Session.tokenHash @unique`

### S63. "Opak token" ne demek?
- **Güçlü cevap:** İçinde veri taşımayan, yalnızca bir satıra işaret eden
  rastgele dize. İçinden bir şey okunamaz ve içine bir şey uydurulamaz — JWT'nin
  aksine.

### S64. Bilinmeyen e-posta ile yanlış parolayı nasıl ayırt edilemez yaptın?
- **Güçlü cevap:** İki şeyi eşitledim: mesaj ve süre. Her ikisi de
  `401 INVALID_CREDENTIALS` / "Invalid email or password." dönüyor ve kullanıcı
  bulunamadığında bile bir `DUMMY_PASSWORD_HASH`'e karşı doğrulama yapılıyor,
  böylece cevap süresi de bilgi sızdırmıyor.
- **DevFlow kanıtı:** `verifyCredentials`

### S65. Parola neden ayrı tabloda?
- **Güçlü cevap:** İlk içgüdü `User.passwordHash` kolonuydu. Ayrı
  `PasswordCredential` tablosu, rutin bir kullanıcı sorgusunun hash'i yanlışlıkla
  seçmesini imkânsız kılıyor ve kolon "nullable ama aslında zorunlu" olmuyor.

### S66. Oturum süresi dolduğunda ne oluyor?
- **Güçlü cevap:** `getSessionContext` satırı buluyor, `expiresAt` geçmişse
  satırı siliyor ve oturum yok sayıyor. İstemci `401` alınca `clearUser`
  çağrılıyor ve kullanıcı `/login`'e yönleniyor.

---

## 9. Yetkilendirme

### S67. Authentication ile authorization farkı?
- **Güçlü cevap:** Authentication "kimsin?" — geçerli bir oturum var mı.
  Authorization "burada bunu yapabilir misin?" — workspace üyeliği ve rol.
  Aynı kullanıcı her yerde kimliklidir ama her workspace'te farklı yetkilidir.

### S68. Rol modelini anlat.
- **Güçlü cevap:** Workspace başına `OWNER`, `ADMIN`, `MEMBER`. OWNER tek ve
  demote/remove/duplicate edilemez. ADMIN workspace'i yeniden adlandırabilir,
  proje ve sprint yönetebilir, yalnızca MEMBER ekleyip çıkarabilir. MEMBER
  görebilir, issue açabilir, yorum yazabilir ve **yalnızca kendi açtığı ya da
  atandığı** issue'yu düzenleyip taşıyabilir.
- **DevFlow kanıtı:** `workspace.authorization.ts`, `issue.authorization.ts`

### S69. Rol nereden okunuyor?
- **Güçlü cevap:** Her istekte PostgreSQL'den, `requireWorkspaceMember` ile.
  Gövdeden, başlıktan ya da React state'inden asla — hepsi istemci tarafından
  uydurulabilir.

### S70. Butonu gizlemek güvenlik mi?
- **Güçlü cevap:** Hayır. Gizlemek nezakettir; her zaman başarısız olan bir
  buton kötü bir deneyimdir. Gerçek kontrol sunucuda tekrarlanıyor ve testler
  yasak istekleri doğrudan göndererek bunu kanıtlıyor — `curl` da aynı `403`'ü
  alıyor.

### S71. İç içe kaynaklarda yetkiyi nasıl kontrol ediyorsun?
- **Güçlü cevap:** Her seviye veritabanında yeniden kanıtlanıyor: kullanıcı
  workspace üyesi mi, proje bu workspace'e mi ait, issue bu projeye mi ait,
  yorum bu issue'ya mı ait. URL bir iddia, `where` filtresi kanıt.

### S72. Rol tabanlı olmayan izinler var mı?
- **Güçlü cevap:** Evet, ilişkisel olanlar. `canUpdateIssue` role **ve satıra**
  bakıyor: MEMBER kendi `reporterId`'si ya da `assigneeId`'si olan issue'yu
  güncelleyebiliyor. Yorumda ise düzenleme yalnızca yazara, silme yazar + OWNER +
  ADMIN'e — moderasyon yazarlık değil.

### S73. Kanban taşıma izni nasıl karar veriliyor?
- **Güçlü cevap:** Taşımak bir issue güncellemesi, aynı `canUpdateIssue`
  kuralına tabi. Pano yanıtı her kart için `canMove` gönderiyor ve istemci
  sürükleme tutamacını buna göre gizliyor — ama sunucu `moveIssue` içinde
  satırı tekrar kontrol ediyor.

---

## 10. Güvenlik

### S74. CSRF nedir, nasıl korundun?
- **Güçlü cevap:** Tarayıcı oturum cookie'sini isteği hangi sayfa başlattıysa
  ekler, dolayısıyla düşman bir sayfadaki form giriş yapmış kullanıcı gibi
  davranabilir. İki katman: `SameSite=Lax` cookie'yi çapraz siteden gelen
  POST'lara eklemiyor, ve mutasyonlarda `Origin` başlığının tam olarak
  `CLIENT_ORIGIN`'e eşit olması zorunlu. Sayfa JavaScript'i `Origin`'i
  uyduramadığı için kontrol anlamlı.
- **Dürüst not:** Bu tam bir CSRF-token akışı değil. Bu topoloji için yeterli;
  farklı alt alan adı ya da proxy eklenirse yeniden gözden geçirilmeli.
- **DevFlow kanıtı:** `requireAllowedOrigin.ts`; canlıda `403 INVALID_ORIGIN`
  doğrulandı.

### S75. CORS nedir? Güvenlik midir?
- **Güçlü cevap:** CORS bir **tarayıcı** kuralı: A origin'indeki sayfa B'nin
  yanıtını, B izin vermedikçe *okuyamaz*. Kullanıcıyı korur, sunucuyu değil —
  istek yine ulaşır. Cookie kullanıldığı için origin tek ve tam bir değer olmalı;
  `*` ile credentials birlikte yasaktır.

### S76. Rate limiting neden yalnızca login ve register'da?
- **Güçlü cevap:** Tahmin edilebilir uç noktalar bunlar. Tüm API'ye limit koymak
  normal kullanımı bozardı — tek bir pano ekranı birkaç istek atıyor. Reddediş
  bilinen ve bilinmeyen e-posta için aynı, yoksa limiter'ın kendisi hesap bulma
  aracına dönerdi.
- **Sınır:** Sayaç süreç içi ve bellekte; yeniden başlatmada sıfırlanıyor ve
  örnekler arasında paylaşılmıyor. Çok örnekli dağıtım paylaşılan bir depo ister
  (Redis).

### S77. Gövde boyutu limiti neden var?
- **Güçlü cevap:** Limit olmadan herkes gigabaytlarca JSON akıtıp belleği
  tüketebilir — exploit gerektirmeyen bir hizmet reddi. 100kb, şemanın izin
  verdiği en uzun açıklamanın ~10 katı, yani gerçek içerik geçiyor ve gerisi
  temiz bir `413` alıyor.

### S78. Helmet ve CSP ne yapıyor?
- **Güçlü cevap:** Helmet standart güvenlik başlıklarını tek satırda ayarlıyor.
  CSP bir **belgeyi** korur; API yalnızca JSON döndüğünde korunacak bir belge
  yok. Bu yüzden CSP tam olarak bu process bir belge sunduğunda — production'ın
  tek origin kurulumunda — açılıyor: `default-src 'self'`, framing yok, object
  yok, script ve API çağrıları yalnızca aynı origin'den.
- **DevFlow kanıtı:** Canlı yanıt başlığı doğrulandı.

### S79. Production'da hata mesajlarını neden kısıtladın?
- **Güçlü cevap:** Stack trace saldırgana framework'ü, dosya düzenini ve çoğu
  zaman başarısız sorguyu söyler. Beklenmeyen her hata tek cümle ve
  `INTERNAL_ERROR`; detay sunucu log'unda kalıyor.

### S80. Client bundle'ına sır konabilir mi?
- **Güçlü cevap:** Hayır. Vite yalnızca `VITE_` önekli değişkenleri paketliyor
  ve paket herkese açık JavaScript. Bu yüzden oradaki tek değer `VITE_API_URL`
  ve production'da o da `/api` — bir sır değil, hatta bir alan adı bile değil.

### S81. `SESSION_SECRET` neden yok?
- **Güçlü cevap:** Oturumlar imzalı veri değil; veritabanında aranan rastgele
  token. İmzalanacak bir şey olmadığı için imza anahtarı da yok.

### S82. Bir güvenlik açığı bulsan ne yapardın?
- **Güçlü cevap:** Önce yeniden üretir ve etkisini yazardım, sonra düzeltmeyi
  kanıtlayacak bir test yazar, sonra düzeltirdim. Sızmış bir sırsa dosyayı
  silmek yetmez — sır rotasyona girmeli, çünkü git geçmişinde kalıyor.

---

## 11. Test

### S83. Neyi nasıl test ettin?
- **Güçlü cevap:** Üç katman. Birim: saf fonksiyonlar (izin yardımcıları,
  `displayKey`, aktivite metni). API entegrasyon: Supertest ile gerçek Express
  uygulamasına gerçek HTTP isteği, **gerçek** PostgreSQL test veritabanına
  karşı. Bileşen: React Testing Library ile kullanıcının gördüğü şey — roller,
  etiketler, metin; sınıf adı ya da iç state değil.
- **DevFlow kanıtı:** 314 test (client 96, server 218)

### S84. Neden veritabanını mock'lamadın?
- **Güçlü cevap:** O zaman mock'u test etmiş olurdum. Önemsediğim hatalar —
  issue numarasındaki yarış, fazla silen bir cascade, bayat değer okuyan bir
  rol kontrolü — yalnızca gerçek veritabanında var.

### S85. Test veritabanı izolasyonunu nasıl sağladın?
- **Güçlü cevap:** `prisma/testDbUrl.ts`, `DATABASE_URL` içinde `devflow_test`
  geçmeyen her değeri reddediyor ve bu kontrol uygulama — dolayısıyla Prisma —
  import edilmeden **önce** çalışıyor. Her suite kendi e-posta alan adına sahip
  ve yalnızca kendi satırlarını temizliyor; sunucu projesinde dosya paralelliği
  kapalı çünkü tüm suite'ler tek veritabanını paylaşıyor.
- **Devam sorusu:** "Neden her test için ayrı veritabanı değil?" → kurulum
  maliyeti; alan adı bazlı temizlik yeterli izolasyonu daha ucuza veriyor.

### S86. Coverage kaç ve ne anlama geliyor?
- **Güçlü cevap:** İstemci %92.91, sunucu %94.88 satır. Coverage hangi satırların
  **çalıştığını** söyler, davranışın **doğru** olduğunu değil — tamamen kapsanmış
  bir fonksiyon yanlış cevap dönebilir. Bu yüzden bilerek eşik koymadım; kovalanan
  bir sayı test yazma sebebine dönüşüyor.

### S87. İyi bir test neye benzer?
- **Güçlü cevap:** Kullanıcının görebileceği davranışı doğrular, uygulama
  detayına bağlı değildir ve tek bir sebeple kırılır. Phase 9A'da on altı test
  kırıldı çünkü metin ve yapı gerçekten değişti — her birini güncelledim, fazı
  geçirmek için hiçbirini silmedim.

### S88. Test yazmayı nerede zor buldun?
- **Güçlü cevap:** Rate limiter. Suite tek adresten onlarca hesap açıyor ve
  on birincide düşmeye başlardı. `NODE_ENV=test` altında kapatıp davranışı
  maksimumu iki olan amaca özel bir limiter ile test etmek hem suite'i hızlı
  hem özelliği kapsanmış tuttu.

### S89. E2E testin var mı?
- **Güçlü cevap:** Hayır — dürüst cevap bu. Playwright ile uçtan uca testler
  bir sonraki adım olarak yazılı. Şu an tarayıcı doğrulaması manuel ve
  `docs/FINAL_QA.md` neyin manuel beklediğini açıkça listeliyor.

---

## 12. Docker

### S90. Neden Docker?
- **Güçlü cevap:** İki sebep. Yerelde: PostgreSQL, API ve nginx'li istemciyi
  tek komutla, sürümleri sabitlenmiş şekilde ayağa kaldırıyor. Production'da:
  Render'a "şu imajı çalıştır" diyorum, çalışma ortamını platformun Node
  sürümüne bırakmıyorum.

### S91. Image ile container farkı?
- **Güçlü cevap:** Image salt-okunur bir tarif — dosya sistemi artı komut.
  Container onun çalışan bir örneği. Container silinince yazdığı her şey gider;
  veritabanlarının volume istemesinin sebebi bu.

### S92. Neden multi-stage build?
- **Güçlü cevap:** Build TypeScript'e, Prisma CLI'ya ve tüm devDependency'lere
  ihtiyaç duyuyor; çalışan sunucu hiçbirine. Aşamaları ayırmak daha küçük ve
  saldırı yüzeyi çok daha dar bir imaj veriyor. DevFlow'un runtime aşamasında
  yalnızca production bağımlılıkları, derlenmiş sunucu, `client/dist`, şema ve
  migration'lar var ve süreç `node` kullanıcısıyla çalışıyor.

### S93. Docker Compose neyi çözüyor?
- **Güçlü cevap:** Birden çok servisi ve aralarındaki bağımlılığı tanımlıyor.
  DevFlow'da server, PostgreSQL'in **healthcheck**'ini bekliyor — sadece
  konteynerin başlamasını değil. Başlamış bir PostgreSQL, bağlantı kabul eden bir
  PostgreSQL demek değil; bu olmadan ilk migration veritabanla yarışır.

### S94. Volume nedir, `down -v` neden tehlikeli?
- **Güçlü cevap:** Volume, konteynerin kendi dosya sisteminin dışında yaşayan bir
  dizin, yani PostgreSQL verisi yeniden başlatmayı ve rebuild'i atlatıyor.
  `docker compose down` veriyi koruyor; `down -v` **volume'ü ve içindeki her
  satırı siliyor**. Ayrı ve bilinçli bir komut olmasının sebebi tam olarak bu.

### S95. Port seçimlerini neden değiştirdin?
- **Güçlü cevap:** İki kurulum aynı anda çalışabilsin diye: Vite 5174, Docker
  client 5175, API 4000, yerel PostgreSQL 5432, Docker PostgreSQL 5433. Compose
  ağı içinde servisler zaten servis adı ve gerçek portla (`postgres:5432`)
  konuşuyor; host eşlemesi yalnızca insanlar için.

---

## 13. CI/CD

### S96. CI ne yapıyor?
- **Güçlü cevap:** Her PR ve `main` push'unda tek iş: `npm ci` → `db:validate` →
  `db:generate` → `db:deploy` → `typecheck` → `test` → `build`, tek kullan-at
  `devflow_test` PostgreSQL servis konteynerine karşı. Hiçbir adım
  `continue-on-error` değil ve iş akışı dağıtım yapmıyor.
- **DevFlow kanıtı:** Son iki çalıştırma yeşil.

### S97. CI neden değerli?
- **Güçlü cevap:** Temiz bir checkout'ta çalışıyor, yani "bende çalışıyor"
  argümanı bitiyor. Adımların hepsi geliştiricinin de çalıştırdığı npm
  script'leri, dolayısıyla CI yerelden sapamıyor.

### S98. CI'da migration'ı neden çalıştırıyorsun?
- **Güçlü cevap:** İşlenmiş migration'ların boş bir veritabanına gerçekten
  uygulandığını kanıtlıyor. `db push` bu kontrolü tamamen atlardı.

### S99. Neden GitHub Actions?
- **Güçlü cevap:** Depo zaten GitHub'da; ayrı bir servis, ayrı bir hesap ve ayrı
  bir yapılandırma dili yok. Servis konteynerleri (PostgreSQL) yerleşik ve
  ücretsiz katman bu boyut için yeterli.

### S100. CD var mı?
- **Güçlü cevap:** Kısmen. GitHub Actions yalnızca doğruluyor; dağıtımı Render
  `autoDeploy` yapıyor — `main`'e her push yeni bir build tetikliyor. Yani
  "deploy" ayrı bir sistem, bilerek: CI'nın sırlara ihtiyacı olmuyor.

---

## 14. Dağıtım

### S101. Neden Render?
- **Güçlü cevap:** Bir Docker web servisi ve yönetilen bir PostgreSQL'i tek
  Blueprint dosyasıyla, kimlik bilgisi depoya girmeden tanımlayabiliyorum;
  health check ve otomatik dağıtım yerleşik. Bir stajyer projesi için
  operasyonel yükü sıfıra yakın.

### S102. Neden Vercel değil?
- **Güçlü cevap:** Vercel bu mimariye uymuyor. Uzun ömürlü bir Express süreci ve
  kalıcı bir PostgreSQL bağlantı havuzu istiyorum; Vercel'in modeli serverless
  fonksiyon, yani her istek soğuk başlayabilen ayrı bir bağlam ve bağlantı havuzu
  ayrı bir problem hâline geliyor. Ayrıca tek origin kurulumumu bölerdi: frontend
  Vercel'de, API başka yerde olurdu ve cookie çapraz-site olurdu.
- **Kaçın:** "Vercel kötü" demek — Next.js için mükemmel, bu mimari için değil.

### S103. Tek origin dağıtımı ne kazandırıyor?
- **Güçlü cevap:** Oturum cookie'si **first-party** kalıyor: `SameSite=Lax`
  anlamını koruyor, origin kontrolü tek bir tam dize karşılaştırması oluyor ve
  gerçek istemci için CORS istisnasına gerek kalmıyor. Bölünmüş bir dağıtım her
  kimlikli isteği çapraz-site yapar ve `SameSite=None` gerektirir — tarayıcıların
  giderek kısıtladığı bir şey.
- **Bedeli:** Yaklaşık doksan satır middleware ve tek bir sıralama kuralı.

### S104. SPA fallback API'yi neden yutmuyor?
- **Güçlü cevap:** Sıralama. API router'ları ve `/api`'nin kendi JSON 404'ü
  client router'dan önce takılı, yani `/api` ile başlayan hiçbir adres
  fallback'e ulaşamıyor. Ayrıca fallback yalnızca `GET`/`HEAD` için çalışıyor;
  bilinmeyen bir adrese `POST` sayfa taklidi yapmadan 404 kalıyor.

### S105. Production'da `PORT` ve origin nereden geliyor?
- **Güçlü cevap:** Platform `PORT` atıyor ve `RENDER_EXTERNAL_URL` yayınlıyor.
  Güvenilen origin `CLIENT_ORIGIN` → `RENDER_EXTERNAL_URL` sırasıyla çözülüyor
  ve production'da **yedek yok** — çözülemezse süreç okunabilir bir mesajla
  başlamayı reddediyor. `localhost` varsayılanı çalışıyormuş gibi görünüp her
  mutasyonu reddederdi.

### S106. `trust proxy` neden 1?
- **Güçlü cevap:** Render'ın HTTPS proxy'si arkasında gerçek istemci adresi
  `X-Forwarded-For` başlığında geliyor. Tam bir hop'a güvenmek `req.ip`'i gerçek
  çağıran yapıyor, ki rate limiter onu sayıyor. Birden fazla hop'a güvenmek
  başlığın uydurulmasına izin verirdi.

---

## 15. Hata ayıklama

### S107. Bir hatayı nasıl ayıklarsın?
- **Güçlü cevap:** Sırayla: yeniden üret, kapsamı daralt (istemci mi sunucu mu
  veritabanı mı), hatayı gerçekten oku, Network sekmesine bak (durum kodu ve
  gövde), sunucu log'una bak, ortam değişkenlerini kontrol et, veritabanına bak,
  hatayı yakalayan dar bir test yaz, **kök nedeni** düzelt, testi ve çevresini
  tekrar çalıştır, sonucu not et.
- **DevFlow kanıtı:** [DEBUGGING_PLAYBOOK.md](DEBUGGING_PLAYBOOK.md)

### S108. Kendin çözdüğün bir hatayı anlat.
- **Güçlü cevap:** Production imajı Prisma `P1013` ile başlamıyordu.
  `prisma.config.ts` içindeki **boş** `shadowDatabaseUrl`, "shadow URL yok" ile
  aynı şey değil ve `migrate deploy` boş dizeyi reddediyor. Yerelde hiç
  görünmemişti çünkü değişken orada hep doluydu. Düzeltme, değişken yoksa
  anahtarı tamamen atlamak. Bunu ne tip sistemi ne test suite'i ne build çıktısı
  bulabilirdi — yalnızca imajı gerçekten çalıştırmak buldu.
- **Devam sorusu:** "Bunu nasıl daha erken yakalardın?" → dağıtım imajını
  platforma güvenmeden önce tek kullan-at bir veritabanına karşı çalıştırarak,
  ki sonra tam olarak bunu yaptım.

### S109. Testlerde açıklanamayan hatalar gördün mü?
- **Güçlü cevap:** Evet. Paralel isteklerde `08P01` protokol hataları ve sahte
  `403`'ler. Sorun kodda değildi: yerel tek kullan-at veritabanı sunucusu birkaç
  bağlantıdan sonra düşürüyordu. Bunu Prisma olmadan düz `pg` ile yeniden
  ürettim, sonra uygulama mantığını değiştirmek yerine `DATABASE_POOL_MAX`
  ayarlanabilir hâle geldi ve yerelde 2'ye çekildi.

### S110. Bir sonsuz döngü hatası anlat.
- **Güçlü cevap:** Paylaşılan aktivite akışı sonsuz refetch yapıyordu, çünkü
  ebeveyn her render'da yeni bir `load` fonksiyonu geçiyordu. Çözüm bağımlılığı
  listeden çıkarmak değil, `useCallback` ile bağımlılığı dürüst hâle getirmekti.

### S111. Production'da bir hata olsa nasıl bakarsın?
- **Güçlü cevap:** Önce `/api/health`; sonra Render log'unda `INTERNAL_ERROR`
  girdileri ve migration çıktısı; sonra tarayıcı Network sekmesinde gerçek durum
  kodu ve hata kodu; sonra bu isteği yerelde aynı verilerle yeniden üretmeye
  çalışırım. Production verisini asla sıfırlamam.

---

## 16. Mimari ve ödünleşimler

### S112. En büyük ödünleşimlerin neler?

| Seçilen | Yerine | Neden |
|---|---|---|
| Monolit, tek origin | Bölünmüş servis ve host | Tek ürün, tek ekip; cookie first-party kalıyor |
| Veritabanı oturumu | JWT | Anında iptal |
| Mutasyonlarda origin kontrolü | CSRF token akışı | ~15 okunabilir satır, token deposu yok, bu ölçekte yeterli |
| Sunucunun sahip olduğu Kanban sırası | İstemcinin listesine güvenmek | İstemci başkasının kartlarıyla güvenilmez |
| Elle yazılmış CSS token'ları | UI framework | Tek tema, beş tür blok |
| Gerçek test veritabanı | Mock'lanmış Prisma | Önemsediğim hatalar yalnızca gerçek veritabanında |
| Realtime yok | WebSocket | İkinci protokol, bağlantı durumu, mesaj başına yetki — MVP'nin ihtiyacı yok |

### S113. 100.000 kullanıcı için ne değişirdi?
- **Güçlü cevap:** Sırayla: (1) rate limiter paylaşılan bir depoya taşınır
  (Redis), çünkü şu an süreç içi; (2) birden fazla instance için oturumlar zaten
  veritabanında olduğu için sorun yok, ama bağlantı havuzu için PgBouncer
  gerekir; (3) issue listesi ve aktivite akışı cursor tabanlı sayfalamaya geçer,
  çünkü `OFFSET` büyük tablolarda pahalı; (4) dashboard sayımları için
  önbellek ya da materialized view; (5) Kanban'da `Serializable` çakışması
  artacağı için kolon başına daha dar bir kilit stratejisi ya da kesirli pozisyon
  düşünülür; (6) gerçek gözlemlenebilirlik — yapılandırılmış log, metrik, hata
  takibi.
- **Kaçın:** "Mikroservise geçerdim" demek — problem tanımlanmadan çözüm.

### S114. Birden fazla backend instance olsa ne değişir?
- **Güçlü cevap:** Oturumlar veritabanında olduğu için kimlik doğrulama
  değişmez — bu tasarımın hediyesi. Değişecekler: bellek içi rate limiter
  paylaşılan olmalı; SPA fallback ve statik dosyalar her instance'ta aynı olmalı
  (aynı imaj olduğu için sorun değil); ve migration'lar deploy'da bir kez
  çalışmalı, her instance'ta değil.

### S115. Realtime nasıl eklerdin?
- **Güçlü cevap:** En basit hâli: pano ve akış için sunucu tarafı olayları (SSE),
  çünkü tek yönlü ve HTTP üstünde çalışıyor. Yayın kanalı workspace başına olur
  ve her mesaj için yetki kontrolü yapılır. Birden fazla instance olursa bir
  pub/sub (Redis) gerekir. WebSocket'e ancak istemciden sunucuya sürekli mesaj
  gerekirse geçerdim.

### S116. Dosya eklerini nasıl eklerdin?
- **Güçlü cevap:** Dosya veritabanına değil, nesne depolamaya (S3 benzeri)
  gider; veritabanında yalnızca metadata satırı olur (issue, yükleyen, ad, tip,
  boyut, anahtar). Yükleme presigned URL ile doğrudan depoya yapılır, böylece
  sunucu baytları taşımaz. Kontrol edilecekler: dosya tipi ve boyutu, virüs
  taraması, indirme yetkisi (yine workspace üyeliği) ve issue silinince
  temizlik.

### S117. E-posta davetlerini nasıl tasarlardın?
- **Güçlü cevap:** Ayrı bir `Invitation` modeli: workspace, e-posta, rol, tek
  kullanımlık token'ın **hash**'i, son kullanma tarihi, durum. E-posta bir
  sağlayıcı üzerinden kuyruğa alınır. Kabul akışı: token → hash → satır →
  süresi geçmemiş ve kullanılmamış → üyelik oluştur, davetiyeyi tüketilmiş
  işaretle. Token'ı hash'lemem oturum token'ıyla aynı sebeple.

### S118. Oturum temizliğini nasıl otomatikleştirirdin?
- **Güçlü cevap:** Süresi dolan satırlar zaten okunduğunda siliniyor, ama hiç
  okunmayanlar birikiyor. Günlük bir job `expiresAt < now` satırlarını silerdi —
  Render'da bir cron job ya da uygulama içi zamanlayıcı (tek instance'ta).
  `Session.expiresAt` üzerinde zaten index var.

### S119. Denetim geçmişini nasıl değiştirilemez yapardın?
- **Güçlü cevap:** Şu an tablo append-only ama **immutable değil** — veritabanına
  yazma erişimi olan biri satırı düzenleyebilir. Gerçek immutability için: ayrı
  bir yazma-bir-kez deposu ya da hash zinciri (her satır bir öncekinin hash'ini
  taşır), veritabanı seviyesinde `UPDATE`/`DELETE` yetkisi olmayan bir rol ve
  harici bir log kopyası.

### S120. Veritabanı performansını nasıl ölçerdin?
- **Güçlü cevap:** Önce ölç, sonra optimize et. `EXPLAIN ANALYZE` ile gerçek
  sorgu planı, `pg_stat_statements` ile en pahalı sorgular, Prisma'nın query
  log'u ile N+1 avı ve uygulama tarafında istek süresi metrikleri. Ancak
  ondan sonra index eklerdim.

### S121. Şu anki sınırlar neler?
- **Güçlü cevap:** Gerçek zamanlı güncelleme yok; e-posta akışı yok (doğrulama,
  parola sıfırlama, davet); MFA ve oturum yönetimi ekranı yok; rate limiter
  bellekte; origin kontrolü tam CSRF-token akışı değil; silme kalıcı; yorumlar
  düz metin ve sayfalanmıyor; tek koyu tema; E2E test yok; lint tooling yok.
  Hepsi `README.md` ve `docs/FINAL_QA.md` içinde yazılı.

### S122. Sırada ne var?
- **Güçlü cevap:** Parola sıfırlama — bugün parolasını unutan kullanıcı sıkışıp
  kalıyor. Sonra Playwright ile birkaç uçtan uca test ve lint tooling'in CI'ya
  eklenmesi. Realtime daha eğlenceli ama daha küçük bir problemi çözüyor.

### S123. Neyi farklı yapardın?
- **Güçlü cevap:** TanStack Query'yi daha erken getirirdim. Faz 4 ve 5'te
  `useEffect` ile fetch yazdım ve Faz 7'de değiştirdim; tekrarlama o noktada
  zaten öngörülebilirdi.

---

## 17. Davranışsal sorular

### S124. Kendinden bahset.
- **Güçlü cevap:** İki-üç cümle: kim olduğun, neye ilgi duyduğun, en somut
  kanıtın. "Full-stack tarafa yöneldim çünkü bir özelliğin veritabanından
  ekrana kadar tamamını görmek hoşuma gidiyor. Son projem DevFlow — çok
  kullanıcılı bir issue takip uygulaması; rol tabanlı yetkilendirme, transaction
  gerektiren sıralama ve gerçek bir PostgreSQL'e karşı çalışan 314 test var."
- **Kaçın:** CV'yi kronolojik okumak.

### S125. Neden full-stack?
- **Güçlü cevap:** Bir özelliğin nerede biteceğine karar verebilmek istiyorum.
  Kanban sıralamasında asıl kararı "bu iş istemcide mi sunucuda mı olmalı" diye
  vermek zorunda kaldım; iki tarafı da bilmesem bu soruyu soramazdım.

### S126. Neden bu staj?
- **Güçlü cevap:** Şirkete özel, somut bir sebep söyle: ürünün, yığınının ya da
  ekibin belirli bir yönü. Sonra kendi projenle bağla: "DevFlow'da tam olarak
  şu problemle uğraştım ve burada aynı problemin daha büyüğü var."
- **Kaçın:** Herhangi bir şirkete söylenebilecek genel cümleler.

### S127. Bu projede ne öğrendin?
- **Güçlü cevap:** Üç şey: (1) yetkilendirme arayüzde değil, her istekte
  sunucuda olur; (2) transaction ve izolasyon seviyeleri soyut değil, `count+1`
  ile çözülmeyen gerçek bir yarışı çözüyor; (3) production kendi başına bir konu
  — build çıktısı, platform değişkenleri, deploy sırasında migration, health
  check ve imajı gerçekten çalıştırarak doğrulamak.

### S128. Yapay zekâyı nasıl kullandın?
- **Güçlü cevap:** Dürüst ol: iskele kurma, gözden geçirme ve daha önce
  yapmadığım kısımlarda hızlandırıcı olarak kullandım. Kararları ben verdim,
  davranışı ben test ettim ve mimarinin tamamını gerekçesiyle anlatabiliyorum —
  91 kararın hepsi reddedilen alternatifleriyle depoda yazılı. Amacım
  okuyamadığım kod üretmek değildi.
- **Kaçın:** Kullanımı gizlemek ya da "her satırını elle yazdım" demek. İkisi de
  ilk teknik soruda çöker.

### S129. Bir zorluğu anlat.
- **Güçlü cevap (STAR):** *Durum:* Kanban taşımasında iki kullanıcı aynı kolonu
  aynı anda sıraladığında pozisyonlar bozulabiliyordu. *Görev:* Sıralamanın her
  koşulda tutarlı olması. *Eylem:* Sıralamanın sahipliğini sunucuya aldım,
  istemciyi yalnızca üç değer gönderir hâle getirdim ve tüm yeniden numaralamayı
  tek `Serializable` transaction'a koydum; `P2034` için sınırlı retry ekledim.
  *Sonuç:* Eşzamanlı taşımalar güvenli, başarısız taşıma tam bir no-op ve
  istemci onaylanmış panoyu çiziyor.

### S130. Bir hatandan bahset.
- **Güçlü cevap:** Query key'lerini o kadar doğal iç içe kurdum ki proje detayı
  key'i panonun, issue'ların ve akışların prefix'i oldu. Kanban taşımasından
  sonra projeyi invalidate edince pano refetch oldu ve cache'e az önce yazılmış
  onaylı cevap çöpe gitti. Düzeltme açık olmak: yalnızca detay değiştiğinde
  `exact: true`, yalnızca listeler değiştiğinde ayrı `…Lists` key'leri.
- **Kaçın:** "Fazla mükemmeliyetçiyim" tarzı sahte kusur.

### S131. Bilmediğin bir teknolojiyi nasıl öğrenirsin?
- **Güçlü cevap:** Önce resmî dokümantasyondan en küçük çalışan örneği kurarım,
  sonra onu gerçek bir probleme uygularım ve neyi neden yaptığımı yazarım.
  Prisma 7'nin driver adapter zorunluluğunu böyle öğrendim; öğrendiklerimi
  `docs/LEARNING_LOG.md` içine faz faz yazdım.

### S132. Geri bildirimle nasıl çalışırsın?
- **Güçlü cevap:** Önce anladığımdan emin olurum — geri bildirimi kendi
  cümlemle tekrar ederim. Katılmıyorsam gerekçemi söylerim ama kararı tartışmayı
  uzatmam; deneyip sonucu gösteririm. Bu projede kendi kendime yaptığım
  incelemelerde de aynı şey oldu: Phase 9A'da tarayıcıda bulduğum sorunlar kod
  incelemesiyle görülemeyecek şeylerdi.

### S133. Ekip içinde nasıl çalışırsın?
- **Güçlü cevap:** Yazılı iletişimi seviyorum: karar verdiğimde gerekçesini ve
  reddettiğim alternatifi yazıyorum, çünkü aynı tartışma iki ay sonra
  tekrarlanıyor. DevFlow'da bu `DECISIONS.md` ve `PROJECT_STATE.md` oldu; bir
  ekipte aynı şey PR açıklaması ve ADR olur.

### S134. Bilmediğin bir soru gelirse?
- **Güçlü cevap:** "Bilmiyorum" de, sonra nasıl bulacağını söyle. "Bunu
  denemedim ama beklentim şu; doğrulamak için şuraya bakardım." Bu cevap
  uydurulmuş bir cevaptan her zaman daha iyi puan alır.

---

## 18. Pratik alıştırmalar

> Her alıştırmayı **önce kendin çöz**, sonra referans çözüme bak. Amaç ezber
> değil; mülakatta beyaz tahtada aynı düşünceyi yürütebilmek.

### 18.1 JavaScript ve TypeScript (12 alıştırma)

---

**A1 — Issue'ları statüye göre grupla**

*Problem:* Bir issue dizisini statüye göre gruplayan fonksiyon yaz.

*Girdi:*
```ts
[{ id: 'a', status: 'TODO' }, { id: 'b', status: 'DONE' }, { id: 'c', status: 'TODO' }]
```
*Beklenen çıktı:* `{ TODO: [a, c], DONE: [b] }`

*Yaklaşım:* Tek geçişte `reduce`; anahtar yoksa boş dizi ile başlat.

```ts
type Issue = { id: string; status: string };

function groupByStatus(issues: Issue[]): Record<string, Issue[]> {
  return issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    (acc[issue.status] ??= []).push(issue);
    return acc;
  }, {});
}
```
*Karmaşıklık:* O(n) zaman, O(n) yer.
*Sık hata:* Her statü için diziyi `filter` ile ayrı ayrı taramak → O(n·k).
Ayrıca DevFlow'da boş kolonlar da görünmeli, o yüzden gerçek panoda beş statü
sıfırla tohumlanıyor (`BOARD_STATUSES`).

---

**A2 — Geciken issue'ları filtrele**

*Problem:* `dueDate` geçmiş **ve** statüsü `DONE` olmayan issue'ları döndür.

*Girdi:* `[{id:'a',dueDate:'2026-01-01',status:'TODO'}, {id:'b',dueDate:null,status:'TODO'}, {id:'c',dueDate:'2026-01-01',status:'DONE'}]`, `now = 2026-07-29`
*Beklenen çıktı:* yalnızca `a`

```ts
function overdue(issues: Issue2[], now: Date): Issue2[] {
  return issues.filter(
    (i) => i.dueDate !== null && new Date(i.dueDate) < now && i.status !== 'DONE',
  );
}
```
*Karmaşıklık:* O(n).
*Sık hata:* `null` kontrolünü atlamak (`new Date(null)` → 1970, her zaman
geçmiş). Bir diğeri: `now` yerine `new Date()` kullanmak — test edilemez olur ve
DevFlow bunu bilerek **sunucu** saatinden alıyor.

---

**A3 — Yinelenen e-postaları bul**

*Problem:* Bir kullanıcı listesinde birden fazla geçen (büyük/küçük harf
duyarsız) e-postaları döndür.

*Girdi:* `['a@x.com','A@X.com','b@x.com']` → *Çıktı:* `['a@x.com']`

```ts
function duplicateEmails(emails: string[]): string[] {
  const seen = new Map<string, number>();
  for (const email of emails) {
    const key = email.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, count]) => count > 1).map(([key]) => key);
}
```
*Karmaşıklık:* O(n).
*Sık hata:* İç içe döngü (O(n²)) ve normalizasyonu unutmak. DevFlow e-postayı
Zod şemasında `trim` + `toLowerCase` ile normalize ediyor ve `User.email`
unique.

---

**A4 — Öncelikleri say**

*Problem:* Dört önceliğin hepsi anahtar olarak bulunan bir sayım nesnesi üret.

*Beklenen çıktı:* `{ LOW: 0, MEDIUM: 2, HIGH: 1, URGENT: 0 }`

```ts
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type Priority = (typeof PRIORITIES)[number];

function countPriorities(issues: { priority: Priority }[]): Record<Priority, number> {
  const result = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
  for (const issue of issues) result[issue.priority] += 1;
  return result;
}
```
*Sık hata:* Sıfırla tohumlamamak; o zaman hiç kullanılmayan öncelik anahtarı
eksik gelir ve istemci `undefined` çizer. DevFlow'un dashboard'u tam olarak bu
yüzden tohumluyor.

---

**A5 — Aktiviteleri sırala**

*Problem:* Aktiviteleri en yeniden eskiye sırala; eşitlikte `id` ile kır.

```ts
function sortActivities<T extends { createdAt: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}
```
*Sık hata:* `sort` diziyi **yerinde** değiştirir; kopyalamadan çağırmak
props'u mutasyona uğratır. İkinci hata: tie-breaker koymamak — sayfalama
kararsız olur ve aynı satır iki sayfada görünebilir. DevFlow sunucuda
`createdAt desc, id desc` kullanıyor.

---

**A6 — Proje anahtarını normalize et**

*Problem:* Kullanıcının yazdığı anahtarı geçerli forma çevir: boşlukları at,
büyük harfe çevir, yalnızca `A-Z` ve `0-9`, en fazla 10 karakter, boşsa hata.

*Girdi:* `" api-core "` → *Çıktı:* `"APICORE"`

```ts
function normalizeProjectKey(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  if (key.length === 0) throw new Error('Project key must contain letters or digits.');
  return key;
}
```
*Sık hata:* Normalizasyonu yalnızca istemcide yapmak. Sunucu her isteği kendi
normalize etmeli, yoksa `curl` istediğini gönderir.

---

**A7 — Rol iznini doğrula**

*Problem:* `canManageProject(role)` ve `canUpdateIssue(role, userId, issue)`
yaz.

```ts
type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

const canManageProject = (role: Role): boolean => role === 'OWNER' || role === 'ADMIN';

const canUpdateIssue = (
  role: Role,
  userId: string,
  issue: { reporterId: string; assigneeId: string | null },
): boolean =>
  canManageProject(role) || issue.reporterId === userId || issue.assigneeId === userId;
```
*Sık hata:* Rolü string olarak yazıp yazım hatasına açık bırakmak — birleşim
tipi bunu derleme zamanında yakalıyor. İkinci hata: bu fonksiyonu **yalnızca**
istemcide kullanmak.
*DevFlow karşılığı:* `server/src/modules/issues/issue.authorization.ts`

---

**A8 — Görüntülenen anahtarı üret ve ayrıştır**

*Problem:* `displayKey('API', 14) === 'API-14'` ve `parseDisplayKey('api-14')`
→ `{ key: 'API', number: 14 }`, geçersizse `null`.

```ts
const displayKey = (key: string, number: number): string => `${key}-${number}`;

function parseDisplayKey(input: string): { key: string; number: number } | null {
  const match = /^([A-Za-z0-9]{1,10})-(\d{1,9})$/.exec(input.trim());
  if (!match) return null;
  return { key: match[1]!.toUpperCase(), number: Number(match[2]) };
}
```
*Sık hata:* `split('-')` kullanmak — anahtarda tire olsaydı bozulurdu; ayrıca
sayı doğrulaması olmaz.

---

**A9 — Sayfalama matematiği**

*Problem:* `total`, `page`, `limit` verildiğinde `skip`, `totalPages`,
`hasNextPage`, `hasPreviousPage` hesapla.

*Girdi:* `total=137, page=3, limit=20` → *Çıktı:*
`{ skip: 40, totalPages: 7, hasPreviousPage: true, hasNextPage: true }`

```ts
function paginate(total: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    skip: (page - 1) * limit,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
```
*Sık hata:* `total = 0` iken `totalPages = 0` dönmek — UI "0 / 0. sayfa" çizer.
`Math.max(1, …)` bunu çözüyor; DevFlow da böyle yapıyor.

---

**A10 — Diziyi değiştirmeden yeniden sırala**

*Problem:* `reorder(list, from, to)` — elemanı taşı, orijinali bozma.

*Girdi:* `['a','b','c','d'], from=0, to=2` → *Çıktı:* `['b','c','a','d']`

```ts
function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(Math.min(Math.max(to, 0), next.length), 0, moved);
  return next;
}
```
*Sık hata:* Orijinal diziyi `splice` ile değiştirmek — React'te state
mutasyonudur ve yeniden render tetiklemez. İkinci hata: hedef indeksi
kırpmamak. DevFlow'un istemcisi tam olarak bunu `withMovedCard` içinde yapıyor,
**ama** son sözü sunucu söylüyor.

---

**A11 — Hatayı güvenli daralt**

*Problem:* Bilinmeyen bir `catch` değerinden okunabilir bir mesaj üret.

```ts
class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
}

function isPrismaConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error &&
    (error as { code?: unknown }).code === 'P2034';
}
```
*Sık hata:* `catch (error: any)` yazıp `error.message` okumak — `throw "string"`
ile çöker. İkinci hata: ham hata mesajını kullanıcıya göstermek.

---

**A12 — API yanıtını eşle**

*Problem:* Sunucu yanıtındaki tarih dizelerini `Date`'e çevirip UI tipine eşle;
`assignee` null olabilir.

```ts
interface IssueResponse {
  id: string; number: number; title: string;
  dueDate: string | null; updatedAt: string;
  assignee: { id: string; name: string } | null;
}
interface IssueView {
  id: string; displayKey: string; title: string;
  dueDate: Date | null; updatedAt: Date; assigneeName: string;
}

const toView = (projectKey: string) => (row: IssueResponse): IssueView => ({
  id: row.id,
  displayKey: `${projectKey}-${row.number}`,
  title: row.title,
  dueDate: row.dueDate === null ? null : new Date(row.dueDate),
  updatedAt: new Date(row.updatedAt),
  assigneeName: row.assignee?.name ?? 'Unassigned',
});
```
*Sık hata:* `new Date(null)` (→ 1970) ve `row.assignee.name` (→ çökme).
Opsiyonel zincir + nullish coalescing ikisini de çözüyor.

---

### 18.2 SQL (10 soru)

> Şema adları gerçek: `users`, `workspaces`, `workspace_members`, `projects`,
> `sprints`, `issues`, `comments`, `activity_logs`
> (`server/prisma/schema.prisma` içindeki `@@map` değerleri).

**Q1 — Bir workspace'in üyelerini rolüyle listele**
```sql
SELECT u.id, u.name, u.email, m.role, m."joinedAt"
FROM workspace_members m
JOIN users u ON u.id = m."userId"
WHERE m."workspaceId" = $1
ORDER BY m.role, u.name;
```

**Q2 — Bir projedeki issue'ları statüye göre say**
```sql
SELECT status, COUNT(*) AS total
FROM issues
WHERE "projectId" = $1
GROUP BY status
ORDER BY status;
```
*Not:* Hiç kullanılmayan statü satır olarak **gelmez**; DevFlow bu yüzden
dağılımı uygulamada sıfırla tohumluyor.

**Q3 — Bir workspace'teki geciken issue'lar**
```sql
SELECT i.id, i.number, i.title, i."dueDate", p.key
FROM issues i
JOIN projects p ON p.id = i."projectId"
WHERE p."workspaceId" = $1
  AND i."dueDate" < NOW()
  AND i.status <> 'DONE'
ORDER BY i."dueDate";
```

**Q4 — Bir kullanıcıya atanmış açık issue'lar**
```sql
SELECT p.key || '-' || i.number AS display_key, i.title, i.status, i.priority
FROM issues i
JOIN projects p ON p.id = i."projectId"
WHERE i."assigneeId" = $1
  AND i.status <> 'DONE'
ORDER BY i."updatedAt" DESC;
```

**Q5 — Projeler ve açık issue sayıları (issue'suz projeler dahil)**
```sql
SELECT p.id, p.key, p.name,
       COUNT(i.id) FILTER (WHERE i.status <> 'DONE') AS open_issues
FROM projects p
LEFT JOIN issues i ON i."projectId" = p.id
WHERE p."workspaceId" = $1
GROUP BY p.id, p.key, p.name
ORDER BY open_issues DESC;
```
*Anahtar nokta:* `LEFT JOIN` olmasaydı hiç issue'su olmayan proje listeden
düşerdi. Bu klasik bir mülakat tuzağı.

**Q6 — Birden fazla workspace'te olan kullanıcılar**
```sql
SELECT u.id, u.email, COUNT(*) AS workspace_count
FROM workspace_members m
JOIN users u ON u.id = m."userId"
GROUP BY u.id, u.email
HAVING COUNT(*) > 1
ORDER BY workspace_count DESC;
```
*Anahtar nokta:* Gruplama sonrası filtre `WHERE` değil `HAVING`.

**Q7 — Yinelenmeye karşı koruma**
```sql
-- Prisma bunları migration olarak üretti:
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspaceId_userId_key
  UNIQUE ("workspaceId", "userId");
ALTER TABLE issues ADD CONSTRAINT issues_projectId_number_key
  UNIQUE ("projectId", "number");
ALTER TABLE projects ADD CONSTRAINT projects_workspaceId_key_key
  UNIQUE ("workspaceId", "key");
```
*Soru:* "Uygulamada kontrol etsen olmaz mı?" *Cevap:* Aynı milisaniyede gelen
iki istek ikisi de "yok" görür. Kısıt veritabanında olmalı.

**Q8 — Bir projenin son aktiviteleri**
```sql
SELECT a.id, a.type, a.metadata, a."createdAt", u.name AS actor
FROM activity_logs a
LEFT JOIN users u ON u.id = a."actorId"
WHERE a."projectId" = $1
ORDER BY a."createdAt" DESC, a.id DESC
LIMIT 20 OFFSET $2;
```
*Anahtar nokta:* `LEFT JOIN` çünkü `actorId` nullable (sistem eylemleri) ve
`id` tie-breaker sayfalamayı kararlı yapıyor.

**Q9 — Atanmamış acil issue'lar**
```sql
SELECT p.key || '-' || i.number AS display_key, i.title, i."createdAt"
FROM issues i
JOIN projects p ON p.id = i."projectId"
WHERE p."workspaceId" = $1
  AND i."assigneeId" IS NULL
  AND i.priority = 'URGENT'
  AND i.status <> 'DONE'
ORDER BY i."createdAt";
```
*Sık hata:* `assigneeId = NULL` yazmak. `NULL` ile eşitlik her zaman `NULL`
döner; doğrusu `IS NULL`.

**Q10 — Son 30 günün en aktif projesi**
```sql
SELECT p.id, p.key, COUNT(a.id) AS events
FROM projects p
JOIN activity_logs a ON a."projectId" = p.id
WHERE p."workspaceId" = $1
  AND a."createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.key
ORDER BY events DESC
LIMIT 1;
```

---

### 18.3 REST tasarım alıştırmaları (8)

Her biri için: uç nokta, metot, gövde, başarı yanıtı, hata kodları ve yetki
kuralı yaz. Sonra DevFlow'un gerçek çözümüyle karşılaştır.

**R1.** Bir issue'yu başka bir projeye taşımak.
*İpucu:* Numara proje kapsamlı, yani taşınan issue **yeni bir numara** almalı ve
eski `KEY-n` bağlantısı kırılır. Bu, DevFlow'da bilerek yok — bunu bir mülakatta
"neden yapmadım" olarak anlatabilirsin.

**R2.** Bir workspace'in tüm projelerindeki issue'ları tek listede aramak.
*İpucu:* `GET /api/workspaces/:workspaceId/issues?search=…`; yetki
`requireWorkspaceMember`; sayfalama zorunlu. DevFlow'da yok ve dashboard
kartlarının hiçbir yere link vermemesinin sebebi bu.

**R3.** Bir issue'ya birden fazla etiket (label) eklemek.
*İpucu:* `Label` ve `IssueLabel` join tablosu; `POST .../issues/:id/labels`
gövdesinde `labelId`; benzersizlik `@@unique([issueId, labelId])`.

**R4.** Bir kullanıcının kendi oturumlarını listelemesi ve iptal etmesi.
*İpucu:* `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:sessionId`;
yalnızca kendi satırları; mevcut oturumu işaretle; token asla dönme.

**R5.** Toplu issue güncellemesi (birden çok issue'ya aynı sprint).
*İpucu:* `PATCH .../issues` gövdesinde `{ issueIds: [...], sprintId }`;
kısmi başarı problemi — ya hepsi transaction içinde ya da `207` benzeri bir
sonuç listesi. Basit çözüm: transaction ve hepsi-ya-hiçbiri.

**R6.** Yorumlar için sayfalama.
*İpucu:* `GET .../comments?page=&limit=`; sıralama `createdAt asc, id asc`;
DevFlow şu an tüm yorumları dönüyor — bu bilinen bir sınır.

**R7.** Workspace sahipliğini devretmek.
*İpucu:* `POST /api/workspaces/:id/transfer-ownership` gövdesinde `userId`;
yalnızca OWNER; transaction içinde eski OWNER `ADMIN` olur, hedef `OWNER` olur;
hedef zaten üye olmalı.

**R8.** Issue'ya dosya eki.
*İpucu:* İki adım — `POST .../issues/:id/attachments` presigned URL döner,
istemci doğrudan depoya yükler, sonra `PATCH` ile tamamlandı işaretlenir.
Boyut/tip doğrulaması sunucuda; indirme yine workspace üyeliğiyle korunur.

---

### 18.4 React alıştırmaları (8)

**C1 — Kontrollü form.** `IssueCreatePage` gibi bir form yaz: başlık zorunlu,
gönderim sırasında düğme devre dışı, sunucu `fieldErrors` döndüğünde alanın
altında göster.
*Kontrol listesi:* her input'un `label`'ı var mı; hata mesajı `aria-describedby`
ile bağlı mı; başarıda form temizleniyor mu.

**C2 — Korumalı rota.** Oturum yüklenirken bekleme, yoksa `/login`'e yönlendirme
yapan bir `RequireAuth` yaz. Sonra "bu neden güvenlik değil?" sorusuna cevap ver.

**C3 — Dört durum.** Bir listeyi `isPending`, `isError`, boş ve veri
durumlarıyla render et. Boş durum bir **sonraki eylemi** adlandırmalı;
hata durumu stack trace göstermemeli.

**C4 — Query key tasarımı.** Şu ekranlar için key ağacı çiz: workspace listesi,
workspace detayı, üyeler, dashboard, proje listesi (filtreli), proje detayı,
issue listesi (filtreli), issue detayı, yorumlar, pano.
*Kontrol:* Hangi key hangisinin prefix'i? Bir proje silindiğinde neyi invalidate
edersin?

**C5 — Mutation invalidation.** Yorum ekleyen bir mutation yaz ve tam olarak
neyin invalidate edileceğini gerekçelendir. (DevFlow: yorumlar + issue
aktivitesi + proje aktivitesi + dashboard.)

**C6 — URL filtreleri.** Statü ve öncelik filtresini query string'de tutan bir
hook yaz. Sonsuz döngüye düşmemesi için kural: URL'yi yalnızca kullanıcı eylemi
yazar, effect yalnızca okur.

**C7 — İzin tabanlı kontroller.** Sunucudan gelen `permissions` nesnesine göre
düğmeleri gizleyen bir bileşen yaz. Testte hem OWNER hem MEMBER için render et.

**C8 — Erişilebilir dialog.** `role="dialog" aria-modal="true"`, odağı
güvenli seçeneğe koyan, Tab'ı hapseden, Escape ile kapanan ve odağı geri veren
bir dialog yaz. Testte `userEvent.keyboard('{Escape}')` ile kapanışı doğrula.

---

### 18.5 Hata ayıklama / kod inceleme alıştırmaları (8)

**D1.**
```ts
const number = (await prisma.issue.count({ where: { projectId } })) + 1;
await prisma.issue.create({ data: { projectId, number, ... } });
```
*Hata nerede?* Yarış durumu: iki istek aynı sayımı okuyup aynı numarayı yazar.
*Düzeltme:* Sayacı proje satırında tut ve transaction içinde `increment` et.

**D2.**
```ts
app.use(errorHandler);
app.use('/api', authRouter);
```
*Hata nerede?* Hata yakalayıcı router'lardan önce takılı; hiçbir hata ona
ulaşmaz. *Düzeltme:* En sona al.

**D3.**
```ts
res.cookie('devflow_session', token, { sameSite: 'lax', path: '/' });
```
*Hata nerede?* `httpOnly` ve `secure` yok — token JavaScript'ten okunabilir ve
HTTP üzerinden gider. *Düzeltme:* `httpOnly: true`, `secure: isProduction`.

**D4.**
```ts
const project = await prisma.project.findUnique({ where: { id: projectId } });
if (!project) throw ApiError.projectNotFound();
```
*Hata nerede?* `workspaceId` filtrede yok; başka bir workspace'in projesi
okunabilir. *Düzeltme:* `findFirst({ where: { id: projectId, workspaceId } })`.

**D5.**
```ts
if (req.body.role === 'OWNER') { /* izin ver */ }
```
*Hata nerede?* Rol istemciden okunuyor. *Düzeltme:* Rol her istekte
veritabanından (`requireWorkspaceMember`).

**D6.**
```tsx
useEffect(() => { load(); }, []);
```
*Hata nerede?* `load` bağımlılık listesinde yok; prop değişince eski closure
çalışır. *Düzeltme:* `load`'u `useCallback` ile sabitle ve listeye ekle.

**D7.**
```ts
onSuccess: () => queryClient.invalidateQueries()
```
*Hata nerede?* Tüm cache geçersizleşiyor; bir yazma on isteğe dönüyor ve az önce
yazılan onaylı pano çöpe gidiyor. *Düzeltme:* Hedefli key'ler, gerektiğinde
`exact: true`.

**D8.**
```ts
app.use(clientRouter);
app.use('/api', notFound);
```
*Hata nerede?* SPA fallback API'den önce; `/api/does-not-exist` HTML döner.
*Düzeltme:* `/api` 404'ü client router'dan önce takılmalı.

---

## Ek — Bir mülakattan önce 10 dakikada gözden geçir

1. Proje bir cümlede ne? (S1)
2. En güçlü üç teknik nokta? (S4)
3. Issue numaralandırmasındaki yarış ve çözümü? (S48)
4. Kanban sıralamasının sahibi kim, neden? (S46, S73)
5. Neden JWT değil, neden HTTP-only cookie? (S58, S59)
6. 401 vs 403? (S34)
7. Buton gizlemek neden güvenlik değil? (S70)
8. Neden gerçek test veritabanı? (S84)
9. Tek origin dağıtımı ne kazandırıyor? (S103)
10. Bilinen sınırların neler? (S121)

Devamı: [MOCK_INTERVIEWS.md](MOCK_INTERVIEWS.md) ·
[DEMO_SCRIPT.md](DEMO_SCRIPT.md) · [STUDY_PLAN.md](STUDY_PLAN.md)
