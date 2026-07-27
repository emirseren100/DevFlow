# DevFlow — Portfolio Copy

Ready-to-paste text in Turkish and English. Written for a software **internship**
application: honest about scope, specific about what was built and understood.

Replace `<live-url>` and `<github-url>` before using anything. Do not claim a
live demo until one exists.

---

## 1. One-sentence description

**TR**
DevFlow, küçük yazılım ekipleri için workspace, proje, sprint, issue, Kanban
panosu, yorum ve aktivite akışı içeren, rol tabanlı yetkilendirmeye sahip
full-stack bir issue takip uygulaması.

**EN**
DevFlow is a full-stack issue tracker for small software teams — workspaces,
projects, sprints, issues, a Kanban board, comments and an activity feed, all
behind role-based permissions.

---

## 2. CV bullets

**TR**

- React, TypeScript, Express ve PostgreSQL ile çok kullanıcılı bir issue takip
  uygulaması (DevFlow) geliştirdim; Prisma migration'ları, Zod doğrulaması ve
  HTTP-only cookie tabanlı oturum yönetimi kullandım.
- OWNER / ADMIN / MEMBER rolleriyle workspace düzeyinde yetkilendirme kurdum;
  her istekte rol veritabanından okunuyor, arayüzdeki gizleme güvenlik olarak
  sayılmıyor.
- Kanban sıralamasını sunucu tarafında, tek bir `Serializable` transaction ve
  sınırlı retry ile yazdım; issue numaralandırması da transaction içindeki
  sayaç ve composite unique index ile yarış durumuna karşı korumalı.
- Vitest, React Testing Library ve Supertest ile ~300 test yazdım; sunucu
  testleri gerçek bir PostgreSQL test veritabanına karşı çalışıyor.
- Çok aşamalı Docker imajı, Docker Compose ve GitHub Actions CI kurdum;
  production için tek origin üzerinden çalışan bir Render dağıtımı hazırladım.

**EN**

- Built DevFlow, a multi-user issue tracker, with React, TypeScript, Express and
  PostgreSQL, using Prisma migrations, Zod validation and HTTP-only cookie
  sessions.
- Implemented workspace-level authorization with OWNER / ADMIN / MEMBER roles,
  read from the database on every request — hidden UI controls are treated as
  UX, never as security.
- Made Kanban ordering server-owned inside one `Serializable` transaction with a
  bounded retry, and made per-project issue numbers race-safe with a
  transactional counter plus a composite unique index.
- Wrote ~300 tests with Vitest, React Testing Library and Supertest; the server
  suite runs against a real PostgreSQL test database.
- Set up multi-stage Docker builds, Docker Compose and GitHub Actions CI, and
  prepared a same-origin production deployment on Render.

---

## 3. LinkedIn project description

**TR**

DevFlow — küçük ekipler için full-stack issue ve sprint takip uygulaması.

Bir ekip workspace açıyor, üye ekliyor, proje ve sprint oluşturuyor, issue
açıyor, bunları Kanban panosunda taşıyor, yorumluyor ve neyin değiştiğini
aktivite akışından izliyor.

Teknik olarak öğrenmek istediğim şeyler netti: gerçek bir ilişkisel veri modeli,
sunucu tarafında ciddi bir yetkilendirme katmanı ve tahmin etmeden çalıştığını
gösterebildiğim testler.

- Frontend: React, TypeScript, Vite, React Router, TanStack Query
- Backend: Node.js, Express, TypeScript, Zod
- Veritabanı: PostgreSQL + Prisma (versiyonlanmış migration'lar)
- Kimlik doğrulama: HTTP-only cookie oturumu, Argon2id parola hash'i, oturum
  token'ı yalnızca SHA-256 hash'i olarak saklanıyor
- Test: Vitest, React Testing Library, Supertest (~300 test)
- Altyapı: Docker, Docker Compose, GitHub Actions
- Production: tek origin üzerinde Express hem API'yi hem derlenmiş React
  uygulamasını sunuyor

Projeyi yapay zekâ desteğiyle geliştirdim; asıl hedefim mimarinin her kararını
gerekçesiyle birlikte anlatabilir olmaktı — kararların tamamı reddedilen
alternatifleriyle birlikte depoda yazılı.

Kod: `<github-url>`

**EN**

DevFlow — a full-stack issue and sprint tracker for small teams.

A team creates a workspace, adds members, opens projects and sprints, files
issues, moves them across a Kanban board, discusses them in comments and reviews
what changed in an activity feed.

What I wanted to learn was specific: a real relational data model, a serious
server-side authorization layer, and tests that show it works instead of
assuming it does.

- Frontend: React, TypeScript, Vite, React Router, TanStack Query
- Backend: Node.js, Express, TypeScript, Zod
- Database: PostgreSQL + Prisma with versioned migrations
- Auth: HTTP-only cookie sessions, Argon2id password hashing, session tokens
  stored only as SHA-256 hashes
- Testing: Vitest, React Testing Library, Supertest (~300 tests)
- Infrastructure: Docker, Docker Compose, GitHub Actions
- Production: one origin, where Express serves both the API and the built React
  client

I built it with AI assistance, and the goal throughout was to be able to explain
every architectural decision — each one is written down in the repository with
the alternatives I rejected.

Code: `<github-url>`

---

## 4. GitHub repository description

**TR**
Küçük ekipler için full-stack issue ve sprint takip uygulaması — React,
TypeScript, Express, PostgreSQL, Prisma, rol tabanlı yetkilendirme, Kanban,
Docker ve CI.

**EN**
Full-stack issue and sprint tracker for small teams — React, TypeScript,
Express, PostgreSQL, Prisma, role-based authorization, Kanban, Docker and CI.

Topics: `react` `typescript` `express` `postgresql` `prisma` `zod` `vitest`
`docker` `github-actions` `fullstack` `rest-api`

---

## 5. Technology list

React · TypeScript · Vite · React Router · TanStack Query · Node.js · Express ·
Zod · PostgreSQL · Prisma · Argon2id · Vitest · React Testing Library ·
Supertest · Docker · Docker Compose · GitHub Actions · npm workspaces · Render

---

## 6. Three technical highlights

**TR**

1. **Sunucunun sahip olduğu Kanban sıralaması.** İstemci yalnızca issue,
   hedef kolon ve hedef indeks gönderiyor. Sunucu gerçek sırayı okuyup kartı
   yerleştiriyor, etkilenen kolonları yeniden numaralandırıyor ve hepsini tek
   bir `Serializable` transaction içinde yazıyor; çakışmada sınırlı sayıda
   yeniden deniyor. Yanıt onaylanmış pano, yani ekranda sunucunun sonucu var.
2. **Yarış durumuna dayanıklı proje bazlı issue numaraları.** `API-1`, `WEB-1`
   gibi numaralar proje satırındaki sayaç transaction içinde artırılarak
   veriliyor; `(projectId, number)` composite unique index son güvence.
3. **Tek origin üzerinde çalışan production mimarisi.** Express hem `/api/*`
   isteklerini karşılıyor hem de derlenmiş React uygulamasını sunuyor; böylece
   oturum cookie'si first-party kalıyor ve `SameSite=Lax` anlamını koruyor.
   Bilinmeyen bir `/api` adresi asla HTML'e düşmüyor.

**EN**

1. **Server-owned Kanban ordering.** The client sends only the issue, the target
   column and the target index. The server reads the real order, inserts the
   card, renumbers the affected columns and writes everything in one
   `Serializable` transaction with a bounded retry on conflict. The response is
   the confirmed board, so the screen shows the server's result.
2. **Race-safe per-project issue numbers.** `API-1`, `WEB-1` come from a counter
   on the project row, incremented inside the creating transaction, with a
   composite unique index on `(projectId, number)` as the backstop.
3. **A same-origin production architecture.** Express answers `/api/*` and
   serves the built React client, so the session cookie stays first-party and
   `SameSite=Lax` keeps its meaning — and an unknown `/api` address never falls
   through to HTML.

---

## 7. Three challenges solved

**TR**

1. **Yerel geliştirme veritabanı paralel isteklerde bağlantı düşürüyordu.**
   Testlerde açıklanamayan `08P01` hataları ve sahte `403`'ler görüyordum.
   Sorun kodda değil, bağlantı havuzundaydı; `DATABASE_POOL_MAX` yapılandırılır
   hâle getirildi ve yerelde 2'ye çekildi.
2. **Production imajı Prisma `P1013` ile başlamadı.** `prisma.config.ts`
   içindeki boş `shadowDatabaseUrl` değeri `migrate deploy` tarafından
   reddediliyordu; yerelde değişken dolu olduğu için hiç görünmemişti. Anahtar,
   değişken yoksa tamamen atlanacak şekilde düzeltildi — ve bu hata ancak imaj
   gerçekten çalıştırıldığı için bulundu.
3. **Yedi ekran aynı veriyi ayrı ayrı çekiyordu.** Her sayfada `useEffect` ile
   fetch, kendi loading/error dalı ve mutasyon sonrası bayat ekranlar vardı.
   TanStack Query tek sunucu-state katmanı yapıldı, tüm query key'ler tek bir
   dosyada toplandı ve mutasyonlardan sonra yalnızca ilgili key'ler
   invalidate ediliyor.

**EN**

1. **The local development database dropped parallel connections.** Tests showed
   unexplained `08P01` errors and spurious `403`s. The cause was the connection
   pool, not the code: `DATABASE_POOL_MAX` became configurable and is 2 locally.
2. **The production image would not start — Prisma `P1013`.** An empty
   `shadowDatabaseUrl` in `prisma.config.ts` is not the same as no shadow URL,
   and `migrate deploy` rejects it. It never appeared locally because the
   variable was always set there. The key is now omitted entirely when unset —
   and the bug was only found because the image was actually run before being
   trusted.
3. **Seven screens fetched the same data independently.** Every page had its own
   `useEffect`, its own loading and error branch, and went stale after a
   mutation. TanStack Query became the one server-state layer, every query key
   moved into a single factory, and mutations now invalidate only what changed.

---

## 8. What I learned

**TR**

- Yetkilendirmenin arayüzde değil, her istekte sunucuda yapıldığını; butonu
  gizlemenin güvenlik olmadığını.
- İlişkisel modelleme: açık join tablosu, composite unique index, cascade
  davranışı ve enum'ların veritabanı seviyesinde ne işe yaradığı.
- Transaction ve izolasyon seviyelerinin gerçek bir yarış durumunu nasıl
  çözdüğü.
- Oturum yönetimi: neden veritabanı oturumu, neden HTTP-only cookie, neden
  parolada Argon2id ama token'da SHA-256.
- Testin ne zaman değerli olduğu: mock'lanmış bir veritabanı, önemsediğim
  hataların hiçbirini yakalamıyor.
- Production'ın kendi başına bir konu olduğu: build çıktısı, platform ortam
  değişkenleri, deploy sırasında migration, health check ve imajı gerçekten
  çalıştırarak doğrulamak.

**EN**

- Authorization belongs on the server, on every request. Hiding a button is UX,
  not security.
- Relational modelling: explicit join tables, composite unique indexes, cascade
  behaviour, and what database enums are actually for.
- How transactions and isolation levels solve a real race condition.
- Session design: why database sessions, why an HTTP-only cookie, why Argon2id
  for passwords but SHA-256 for tokens.
- When a test is worth writing: a mocked database would have caught none of the
  bugs I cared about.
- That production is its own subject — build output, platform environment
  variables, migrations at deploy time, health checks, and verifying an image by
  actually running it.

---

## 9. 30-second interview introduction

**TR**

DevFlow adında full-stack bir issue takip uygulaması geliştirdim; küçük ekipler
için workspace, proje, sprint, issue, Kanban panosu, yorum ve aktivite akışı
var. Frontend React ve TypeScript, backend Express ve TypeScript, veritabanı
Prisma ile PostgreSQL. Oturumlar veritabanında tutuluyor ve HTTP-only cookie ile
taşınıyor; yetkilendirme her istekte veritabanından okunan workspace rolüne göre
yapılıyor. Yaklaşık 300 test var ve sunucu testleri gerçek bir PostgreSQL'e
karşı çalışıyor. Docker ve GitHub Actions kurulu, production için tek origin
üzerinden çalışan bir dağıtım hazır. Yapay zekâ desteğiyle geliştirdim ama her
mimari kararı gerekçesiyle anlatabilirim; kararların tamamı reddedilen
alternatifleriyle birlikte depoda yazılı.

**EN**

I built a full-stack issue tracker called DevFlow: workspaces, projects,
sprints, issues, a Kanban board, comments and an activity feed for small teams.
React and TypeScript on the frontend, Express and TypeScript on the backend,
PostgreSQL through Prisma. Sessions live in the database and travel in an
HTTP-only cookie, and authorization is a workspace role read from the database on
every request. There are about 300 tests, and the server suite runs against a
real PostgreSQL. Docker and GitHub Actions are set up, and it is prepared for a
same-origin production deployment. I built it with AI assistance, but I can
explain every architectural decision — they are all written down in the
repository with the alternatives I rejected.

---

## 10. Two-minute project explanation

**TR**

DevFlow, Jira'nın küçük ve anlaşılır bir versiyonu gibi düşünülebilir. Bir ekip
workspace açıyor, üyelerini ekliyor, proje ve sprint oluşturuyor, issue açıyor,
bunları Kanban panosunda taşıyor, yorumluyor ve aktivite akışından neyin
değiştiğini görüyor.

Mimari tek repoda iki npm workspace: React istemci ve Express API. İstemci
sadece REST API ile konuşuyor; veritabanına dokunan tek yer sunucu. Her istek
girişi Zod ile doğrulanıyor, sonra kimlik doğrulama ve workspace yetkisi
kontrol ediliyor ve her yanıt aynı şekle sahip.

Veri modeli gerçekten ilişkisel. Kullanıcı ile workspace arasında rol taşıyan
açık bir üyelik tablosu var, çünkü aynı kişi bir workspace'te OWNER, başkasında
MEMBER olabiliyor. Yetkilendirme üç rol üstünde duruyor ama bazı kurallar
ilişkisel: bir MEMBER, kendi açtığı ya da kendisine atanmış issue'yu
düzenleyebiliyor.

En çok uğraştığım iki yer transaction gerektirdi. Issue numaraları proje bazlı —
`API-1`, `WEB-1` — ve sayaç, issue'yu oluşturan transaction içinde artırılıyor;
`count + 1` yaklaşımı gerçek bir yarış durumu olurdu. Kanban taşıması da
sunucuya ait: istemci sadece hedef kolon ve indeks gönderiyor, sunucu sırayı
okuyup yeniden numaralandırıyor ve hepsi tek bir `Serializable` transaction
içinde yazılıyor.

Kimlik doğrulamada oturum veritabanında; JWT yerine bunu seçtim çünkü çıkış
yapıldığında oturum anında ölüyor. Parolalar Argon2id ile hash'leniyor, oturum
token'ının ise yalnızca SHA-256 hash'i saklanıyor — token zaten 32 rastgele
bayt, tahmin edilecek bir şey yok.

Test tarafında Vitest, React Testing Library ve Supertest var. Sunucu testleri
gerçek bir PostgreSQL test veritabanına karşı çalışıyor, çünkü önemsediğim
hatalar — unique constraint, cascade, transaction, rol kontrolü — mock'ta zaten
görünmüyor.

Production tarafında Express hem API'yi hem derlenmiş React uygulamasını aynı
origin üzerinden sunuyor. Bunu bilinçli seçtim: tek origin, oturum cookie'sinin
first-party kalması demek. Migration'lar container başlarken çalışıyor ve
başarısız olursa sunucu hiç başlamıyor.

Eksikleri de biliyorum: gerçek zamanlı güncelleme yok, e-posta akışları yok,
rate limit bellekte tutuluyor ve silme işlemleri geri alınamıyor. Bunlar
dokümantasyonda bilinen sınırlar olarak yazılı.

**EN**

DevFlow is a small, readable version of something like Jira. A team creates a
workspace, adds members, opens projects and sprints, files issues, moves them
across a Kanban board, comments on them, and sees what changed in an activity
feed.

The architecture is two npm workspaces in one repository: a React client and an
Express API. The client only talks to the REST API; the server is the only thing
that touches the database. Every request is validated with Zod, then checked for
authentication and workspace authorization, and every response has the same
shape.

The data model is genuinely relational. Users and workspaces are joined by an
explicit membership table that carries the role, because the same person can be
OWNER in one workspace and MEMBER in another. Authorization rests on those three
roles, but some rules are relational: a MEMBER may edit an issue they reported or
are assigned to.

The two hardest parts both needed transactions. Issue numbers are per project —
`API-1`, `WEB-1` — and the counter is incremented inside the transaction that
creates the issue; `count + 1` would have been a real race. Kanban moves are
server-owned too: the client sends only a target column and index, the server
reads the order and renumbers, all inside one `Serializable` transaction.

For authentication, sessions live in the database rather than in a JWT, because
signing out then kills the session immediately. Passwords are hashed with
Argon2id, and only the SHA-256 hash of the session token is stored — the token
is already 32 random bytes, so there is nothing to guess.

Testing is Vitest, React Testing Library and Supertest. The server tests run
against a real PostgreSQL test database, because the bugs I cared about —
unique constraints, cascades, transactions, role checks — simply do not exist in
a mock.

In production, Express serves both the API and the built React client from one
origin. That was a deliberate choice: one origin keeps the session cookie
first-party. Migrations run as the container starts, and if one fails the server
never starts at all.

I also know what is missing: no realtime updates, no email flows, an in-memory
rate limiter, and deletions that cannot be undone. They are all written down as
known limitations.
