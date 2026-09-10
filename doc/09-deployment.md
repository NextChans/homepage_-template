# 09. 배포 — Supabase + Vercel 연동

**핵심 원칙: 비밀키는 채팅·이슈·PR·커밋 어디에도 붙여넣지 않는다.**
Supabase 대시보드와 Vercel 대시보드 사이에서만 오가게 한다. 아래 절차는 그렇게 설계했다.

---

## 0. 환경변수 이름 (두 체계 모두 지원)

`lib/supabase/server.ts` 가 아래 순서로 찾는다. **하나만 있으면 된다.**

| 용도 | 찾는 순서 | 노출 |
|---|---|---|
| 프로젝트 URL | `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` | 공개 |
| 비밀키 | `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` | **비공개** |
| IP 해시 salt | `INQUIRY_IP_HASH_SALT` | **비공개** |
| 사이트 절대 URL | `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL`(Vercel 자동) → 플레이스홀더 | 공개 |

- 신형 키(`sb_secret_...` / `sb_publishable_...`)를 먼저 본다.
  레거시 `anon` / `service_role` JWT 는 **2026년 말 지원 종료 예정**이므로 신형을 쓴다.
- Vercel 의 Supabase 연동은 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` /
  `NEXT_PUBLIC_SUPABASE_URL` 을 주입한다. 그래서 두 체계를 모두 받도록 만들었다 (ADR-009).
- `INQUIRY_IP_HASH_SALT` 는 **Supabase 에서 받는 값이 아니다.** 직접 만든다:
  `openssl rand -hex 32`
- `NEXT_PUBLIC_SITE_URL` 을 설정하지 않으면 `lib/site-url.ts` 가
  **Vercel 이 주입하는 `VERCEL_PROJECT_PRODUCTION_URL` 을 자동으로 쓴다**(ADR-013).
  실도메인이 생기면 `NEXT_PUBLIC_SITE_URL` 로 덮어쓰면 되고, 그것이 항상 우선한다.

---

## 1. Supabase 프로젝트 준비

1. supabase.com → New project
   - **리전은 서울(`ap-northeast-2`) 로 확정했다** (2026-09-10). 다른 리전으로 만들면
     `app/privacy/page.tsx` 4항과 `vercel.json` 의 함수 리전을 함께 고쳐야 한다.
   - DB 비밀번호는 생성 시 한 번만 보인다. 팀 비밀 저장소에 보관한다.
2. **스키마 적용 — 대시보드 SQL Editor 사용을 권장한다.**
   - `supabase/migrations/20260910000001_inquiries.sql` 내용을 복사해 SQL Editor 에 붙이고 Run
   - 마이그레이션이 여러 개면 **파일명 순서대로** 실행한다
   - 이 방법은 **어떤 키도 밖으로 내보내지 않는다.** CLI(`supabase db push`)는 Personal Access
     Token 과 DB 비밀번호가 추가로 필요해 노출면이 더 넓다
3. **확인 (반드시 눈으로)**
   - Table Editor → `inquiries` → **RLS enabled** 표시
   - Authentication → Policies → `inquiries` 에 **정책이 0개** (정책이 있으면 잘못된 것)

---

## 2. 키 발급

Supabase 대시보드 → **Settings → API Keys → Publishable and secret API keys** 탭

| 항목 | 어디에 쓰나 |
|---|---|
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` — **`/rest/v1/` 를 포함하지 않는다** |
| Publishable key (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (현재 코드 미사용) |
| **Secret key (`sb_secret_...`)** | `SUPABASE_SECRET_KEY` — **서버 전용** |

Secret key 는 여러 개 만들 수 있다. **환경별로 따로 발급**해 두면(운영/프리뷰) 사고 시
해당 환경만 폐기할 수 있다.

> ⚠️ **Project URL 에 `/rest/v1/` 를 붙이지 않는다.** 대시보드 화면에 따라 경로가 붙은 주소가
> 보이지만, `@supabase/supabase-js` 가 `/rest/v1` 을 자동으로 붙인다. 경로를 포함하면 요청이
> `/rest/v1/rest/v1/inquiries` 로 가서 404 가 나고 **문의가 조용히 저장되지 않는다.**
> 끝 슬래시도 제거한다.
>
> - O `https://abcd1234.supabase.co`
> - X `https://abcd1234.supabase.co/rest/v1/`

---

## 3. Vercel 연동

### 3-1. 프로젝트 임포트

1. vercel.com → Add New → Project → **Import Git Repository** → `NextChans/homepage_-template`
2. Framework Preset 은 **Next.js** 로 자동 감지된다. Build/Output 설정은 손대지 않는다
   (그래서 이 저장소에 `vercel.json` 을 두지 않았다).
3. Production Branch 를 `main` 으로 설정한다.
   → 저장소 기본 브랜치가 아직 피처 브랜치라면 GitHub Settings → General 에서 먼저 `main` 으로 바꾼다.

### 3-2. 환경변수 — 두 가지 방법

**방법 A. Supabase Marketplace 연동 (권장 — 키를 손으로 옮기지 않는다)**

Vercel → Integrations → Supabase 를 프로젝트에 연결하면
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 등이 자동 주입되고 Preview 브랜치까지 동기화된다.
우리 코드가 이 이름들을 그대로 받으므로 추가 설정이 없다.

이 방법을 쓰더라도 아래 두 개는 **직접 넣어야 한다** (Supabase 소관이 아니다):

| 변수 | 값 | 타입 | 대상 환경 |
|---|---|---|---|
| `INQUIRY_IP_HASH_SALT` | `openssl rand -hex 32` 결과 | **Secret** | Production, Preview (**서로 다른 값**) |
| `NEXT_PUBLIC_SITE_URL` | 실도메인 (`https://www.example.co.kr`) | **Config** | Production |

**방법 B. 수동 입력**

Vercel → Settings → Environment Variables 에 직접 넣는다.

| 변수 | 값 | 타입 | 환경 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (**경로·끝 슬래시 없이 도메인만**) | **Config** | Production, Preview |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | **Secret** | Production, Preview (**환경별로 다른 키 권장**) |
| `INQUIRY_IP_HASH_SALT` | `openssl rand -hex 32` | **Secret** | Production, Preview (서로 다른 값) |
| `NEXT_PUBLIC_SITE_URL` | 실도메인 | **Config** | Production |

### 타입 선택 (Config / Secret)

Vercel 은 변수마다 **Config** 또는 **Secret** 타입을 고르게 한다.
[둘 다 빌드 타임에 읽히므로 동작에는 차이가 없고, 가시성만 다르다](https://vercel.com/docs/environment-variables) —
Config 는 저장 후에도 값을 다시 볼 수 있고, Secret 은 write-only 가 되며 빌드 로그에서 마스킹된다.

- **`NEXT_PUBLIC_` 접두어가 붙은 변수는 Config 로 등록한다.**
  이 값들은 어차피 클라이언트 번들에 인라인되므로 Secret 으로 표시해도 실제로 비밀이 되지 않는다.
  오히려 **값을 다시 확인할 수 없게 되어 오타(예: URL 에 `/rest/v1/` 가 붙었는지) 검증이 불가능**해진다.
- **비밀값(`SUPABASE_SECRET_KEY`, `INQUIRY_IP_HASH_SALT`)은 Secret 으로 등록한다.**
- ⚠️ **Secret 으로 저장한 변수는 Config 로 변경할 수 없다.** 잘못 골랐으면 삭제하고 다시 추가한다.
- `NEXT_PUBLIC_` 접두어를 비밀키에 붙이면 **클라이언트 번들에 박혀 RLS 가 무력화된다.**

### 3-3. 함수 리전 — **대시보드에서 설정한다**

문의 접수는 Server Action → Supabase 왕복이다. **Vercel 함수의 기본 리전은 `iad1`(버지니아)** 이므로
그대로 두면 매 제출이 서울 DB ↔ 미국 함수를 왕복한다.

**Vercel → Settings → Functions → Function Region → Seoul (`icn1`)** 로 설정한다.
`icn1` = Seoul (AWS `ap-northeast-2`) — Supabase 리전과 동일하다.

> `vercel.json` 에 `{"regions": ["icn1"]}` 로 고정해 봤으나 해당 커밋의 배포가 실패했다.
> 원인을 로그로 확인하지 못한 상태에서 배포를 막아둘 수 없어 파일을 제거했다 (ADR-011 개정).
> 기능에는 영향이 없고 **지연만 늘어난다.** 대시보드 설정을 잊지 말 것.

---

### 3-4. 커스텀 도메인 (`witus.kr`)

**코드는 이미 준비되어 있다.** 남은 것은 **대시보드 + DNS 작업**이고, 그건 사람이 해야 한다.

#### 코드가 어떻게 따라오는가

`lib/site-url.ts` 의 우선순위 2번(`VERCEL_PROJECT_PRODUCTION_URL`)이 **Vercel 이 주입하는
프로젝트의 프로덕션 도메인**이다. 도메인을 프로덕션으로 붙이면 이 값이 바뀌고
`sitemap.xml` · `robots.txt` · `og:image` · `canonical` 이 **전부 자동으로** 따라온다.
**환경변수를 따로 설정하지 않아도 된다.**

> ⚠️ 단, 이 동작을 **확인은 해야 한다.** 도메인 연결 후 `/sitemap.xml` 이 여전히
> `*.vercel.app` 이면, `NEXT_PUBLIC_SITE_URL=https://witus.kr` 를 Vercel 환경변수
> (Production)에 명시하고 재배포한다. 우선순위 1번이라 항상 이긴다.

#### 정규 도메인은 **apex(`witus.kr`)** 다

`www.witus.kr` 은 apex 로 **301 리다이렉트**한다. 이유는 ADR-025 에 있다 — 요약하면
둘 다 응답하게 두면 같은 내용이 두 주소로 색인된다.

#### 1) Vercel 에 도메인 추가

**Settings → Domains → Add**

1. `witus.kr` 추가 → **Production** 브랜치(`main`)에 연결
2. `www.witus.kr` 추가 → **Redirect to `witus.kr`** (301) 선택

#### 2) DNS 설정 (도메인 등록업체)

**⚠️ 값은 반드시 Vercel 대시보드가 표시하는 것을 그대로 쓴다.** 프로젝트·리전에 따라
다르고 Vercel 이 바꾸기도 한다. 아래는 **형태**만 참고한다.

| 호스트 | 타입 | 값 |
|---|---|---|
| `witus.kr` (apex, `@`) | **A** | 대시보드가 표시하는 IP |
| `www` | **CNAME** | 대시보드가 표시하는 `*.vercel-dns.com` |

> **apex 는 CNAME 을 쓸 수 없다**(RFC 제약). 그래서 A 레코드다. 등록업체가 ALIAS/ANAME 을
> 지원하면 그걸 써도 된다 — Vercel IP 가 바뀌어도 따라간다.
>
> `.kr` 등록업체(가비아·후이즈·카페24 등) DNS 관리 화면에서 설정한다. 전파에 보통
> 수 분~수 시간이 걸린다. **TTL 을 낮춰 두면(300초) 되돌리기가 쉽다.**

#### 3) 연결 후 확인

```bash
# ⚠️ content_type 을 반드시 함께 본다 (homepage-verify 함정 7)
for p in / /sitemap.xml /robots.txt /icon.svg /opengraph-image.png; do
  curl -sS -o /dev/null -w "$p  %{http_code}  %{content_type}\n" "https://witus.kr$p"
done

# canonical 이 경로별로 맞는지 — 전부 홈을 가리키면 잘못된 것이다
for p in / /services /about; do
  curl -s "https://witus.kr$p" | grep -o '<link rel="canonical" href="[^"]*"'
done

# www 가 301 로 apex 로 가는지
curl -sS -o /dev/null -w "www → %{http_code} %{redirect_url}\n" https://www.witus.kr/
```

```
[ ] https://witus.kr 이 열린다 (인증서 자동 발급 — Vercel 이 처리)
[ ] https://www.witus.kr → 301 → https://witus.kr
[ ] /sitemap.xml 의 URL 이 witus.kr 이다
[ ] canonical 이 경로별로 다르다 (전부 홈이면 절대 URL 을 박은 것)
[ ] og:image 가 https://witus.kr/opengraph-image.png 다
[ ] 파비콘·OG 가 image/svg+xml · image/png 로 온다 (text/html 이면 잘못된 것)
```

#### ⚠️ 도메인 전환 시 주의 3가지

1. **HSTS preload 는 되돌리기 어렵다.** `next.config.ts` 가
   `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` 를 보낸다.
   - **헤더를 보내는 것만으로는 preload 목록에 등록되지 않는다** — hstspreload.org 에
     직접 제출해야 한다. **서브도메인 계획이 확정되기 전에는 제출하지 않는다.**
       제출 후 제거는 몇 달이 걸린다.
   - 다만 **`includeSubDomains` 는 지금도 효력이 있다.** 브라우저가 `witus.kr` 을 한 번
     방문하면 **모든 서브도메인에 HTTPS 를 강제**한다. HTTP 만 제공하는 서브도메인
     (예: 구형 메일·그룹웨어)을 붙일 계획이면 **먼저 확인**해야 한다.
2. **관리자 세션이 끊긴다.** 세션 쿠키는 호스트에 묶인다. 도메인이 바뀌면
   `*.vercel.app` 에서 로그인한 세션은 `witus.kr` 에서 인식되지 않는다.
   다시 로그인하면 된다 — 데이터에는 영향이 없다.
3. **`*.vercel.app` 은 계속 응답한다.** Vercel 자동 배정 주소는 제거할 수 없다.
   그래서 `canonical` 을 넣었다(ADR-025). 색인은 canonical 로 통합되지만,
   **주소 자체는 살아 있다** — 대외 문서·명함에는 `witus.kr` 만 쓴다.

---

## 4. 배포 후 검증

```
[ ] / 이 정상 렌더링되고 라이트/다크 모두 정상
[ ] /contact 에 "개발 안내" 배너가 보이지 않는다
      → 프로덕션에서는 NODE_ENV 로 차단되지만, 보이면 env 주입 실패 신호이므로 로그를 본다
[ ] /contact 에서 실제 제출 → "접수되었습니다" 성공 화면
[ ] Supabase Table Editor 에 행이 생겼다
[ ] 그 행의 ip_hash 가 64자 해시다 (원문 IP 가 아니다)
[ ] privacy_consent = true, marketing_consent 가 선택대로 저장됐다
[ ] 10분 내 4회 제출 시 레이트리밋 메시지가 나온다
[ ] /sitemap.xml 의 URL 이 실도메인이다 (NEXT_PUBLIC_SITE_URL 확인)
[ ] /robots.txt 에서 /privacy 가 disallow 다
```

브라우저 개발자도구 → Sources 에서 `sb_secret_` 을 검색해 **아무 것도 안 나오는지** 확인한다.
나오면 즉시 키를 폐기(rotate)하고 변수 이름을 점검한다.

---

## 5. 운영 전 남은 일

`doc/06-security-compliance.md` 의 **높음** 항목과 겹친다.

- [ ] 보관기간(3년) 경과 데이터 삭제 잡 — `pg_cron` (마이그레이션 하단 주석 참고)
- [ ] 접수 알림 (Slack / 이메일) — 사이트에 "1영업일 회신"을 명시했으므로 알림 없이는 이행 불가
- [ ] `SUPABASE_SECRET_KEY` 로테이션 주기와 접근권한자 명단 정의
- [ ] CSP 헤더 추가 (`next.config.ts`)
- [ ] `app/privacy/page.tsx` 4항의 **국외 이전 해당 여부 법무 확정** (리전은 반영 완료)
      - 저장 리전은 서울이지만 Supabase 는 국외 법인이고, [공식 문서가 백업·로그·외부 반출·
        Edge Function 실행·재위탁 업체가 데이터 residency 와 국외이전 판단에 영향을 줄 수 있다고
        명시](https://supabase.com/docs/guides/security/gdpr-compliance)한다.
        "국외 이전 없음" 으로 단정하지 않았다.
- [ ] `doc/05-content-guide.md` 의 **필수 교체** 항목 (실제 회사 정보)


---

## 현재 배포 상태 (2026-09-10)

| 항목 | 값 |
|---|---|
| Production URL | https://homepage-template-ivory.vercel.app |
| 커스텀 도메인 | `witus.kr` **구입 완료 · 연결 대기** (3-4절 절차) |
| 기본 브랜치 | `main` (머지 커밋 `014909e`) |
| 함수 리전 | Seoul (`icn1`) — 대시보드 설정 |
| Supabase 리전 | 서울 (`ap-northeast-2`) |
| CI | GitHub Actions `typecheck · lint · build` |

> ⚠️ `homepage-template.vercel.app`(팀 접미사 없는 짧은 주소)은 **다른 계정의 프로젝트**다.
> 프로젝트 이름이 전역 선점되어 있다. 이 주소를 우리 사이트로 착각하지 말 것.
