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
| 사이트 절대 URL | `NEXT_PUBLIC_SITE_URL` | 공개 |

- 신형 키(`sb_secret_...` / `sb_publishable_...`)를 먼저 본다.
  레거시 `anon` / `service_role` JWT 는 **2026년 말 지원 종료 예정**이므로 신형을 쓴다.
- Vercel 의 Supabase 연동은 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` /
  `NEXT_PUBLIC_SUPABASE_URL` 을 주입한다. 그래서 두 체계를 모두 받도록 만들었다 (ADR-009).
- `INQUIRY_IP_HASH_SALT` 는 **Supabase 에서 받는 값이 아니다.** 직접 만든다:
  `openssl rand -hex 32`

---

## 1. Supabase 프로젝트 준비

1. supabase.com → New project
   - **리전은 서울(ap-northeast-2) 권장.** 국외 리전을 쓰면 개인정보 국외이전 고지가 필요하고,
     `app/privacy/page.tsx` 4항을 그에 맞게 고쳐야 한다.
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
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (현재 코드 미사용) |
| **Secret key (`sb_secret_...`)** | `SUPABASE_SECRET_KEY` — **서버 전용** |

Secret key 는 여러 개 만들 수 있다. **환경별로 따로 발급**해 두면(운영/프리뷰) 사고 시
해당 환경만 폐기할 수 있다.

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

| 변수 | 값 | 대상 환경 |
|---|---|---|
| `INQUIRY_IP_HASH_SALT` | `openssl rand -hex 32` 결과 | Production, Preview (**서로 다른 값**) |
| `NEXT_PUBLIC_SITE_URL` | 실도메인 (`https://www.example.co.kr`) | Production |

**방법 B. 수동 입력**

Vercel → Settings → Environment Variables 에 직접 넣는다.

| 변수 | 값 | 환경 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Production, Preview |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Production, Preview (**환경별로 다른 키 권장**) |
| `INQUIRY_IP_HASH_SALT` | `openssl rand -hex 32` | Production, Preview (서로 다른 값) |
| `NEXT_PUBLIC_SITE_URL` | 실도메인 | Production |

- **Sensitive 토글을 켠다** (`SUPABASE_SECRET_KEY`, `INQUIRY_IP_HASH_SALT`).
  켜면 이후 대시보드에서 값을 다시 읽을 수 없어 유출 경로가 줄어든다.
- `NEXT_PUBLIC_` 접두어를 비밀키에 붙이면 **클라이언트 번들에 박혀 RLS 가 무력화된다.**

### 3-3. 함수 리전

문의 접수는 Server Action → Supabase 왕복이다. 함수 리전이 Supabase 리전과 멀면 지연이 커진다.
Vercel → Settings → Functions → **Function Region 을 Supabase 리전과 가까운 곳(서울)으로** 맞춘다.
리전 코드는 Vercel 문서의 현재 목록을 확인해 고른다 — 코드를 추측해서 `vercel.json` 에 박지 않는다.

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
- [ ] `app/privacy/page.tsx` 4항에 실제 Supabase 리전·국외이전 여부 반영
- [ ] `doc/05-content-guide.md` 의 **필수 교체** 항목 (실제 회사 정보)
