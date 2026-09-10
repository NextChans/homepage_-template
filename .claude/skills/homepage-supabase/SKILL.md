---
name: homepage-supabase
description: 이 홈페이지의 Supabase 스키마와 문의 폼 파이프라인(마이그레이션, RLS, 검증 스키마, Server Action, 폼 필드)을 변경한다. 사용자가 "문의 폼에 필드 추가", "DB 테이블 만들어줘", "마이그레이션 추가", "RLS 정책 확인", "문의 데이터 조회", "Supabase 연결 설정" 등을 말할 때 사용한다. 개인정보와 감사 요건이 걸린 경로이므로 임의로 컬럼을 늘리기 전에 반드시 이 스킬의 원칙을 확인한다.
---

# Supabase 변경 절차

## 1. 데이터 경로 전체 구조

```
components/contact-form.tsx   (Client)  폼 UI · honeypot · 최소 작성시간
        ↓ FormData
app/actions/inquiry.ts        (Server)  봇 차단 → zod 검증 → 레이트리밋 → insert
        ↓ service_role
lib/supabase/server.ts        (Server)  service_role 클라이언트 ('server-only')
        ↓
supabase/migrations/*.sql               public.inquiries (RLS on, 정책 없음)
        ↑ service_role (읽기 전용)
lib/admin/inquiries.ts        (Server)  목록·상세 조회 (목록은 이메일·연락처 마스킹)
        ↑
app/admin/**                  (Server)  requireAdminSession() 가드 + admin_audit_log 기록
```

검증 스키마는 `lib/inquiry-schema.ts` 한 곳에만 있다. 클라이언트와 서버가 같은 스키마를 쓴다.

## 2. 절대 어기지 않는 원칙

1. **`SUPABASE_SERVICE_ROLE_KEY` 에 `NEXT_PUBLIC_` 접두어를 붙이지 않는다.** 붙이면 클라이언트
   번들에 포함되어 RLS 가 완전히 무력화된다.
2. `lib/supabase/server.ts` 는 `'server-only'` 를 선언한다. 클라이언트 컴포넌트에서 import 금지.
3. `public.inquiries` 는 **RLS 를 켜고 정책을 만들지 않는다.** anon/authenticated 는 접근 불가.
   조회는 `/admin` (서버에서 service_role) 또는 Supabase 대시보드에서만 한다.
   → 공개 페이지에서 문의 목록을 읽는 기능은 만들지 않는다.
   → **Supabase Auth 를 도입해 `authenticated` 롤에 정책을 열지 않는다.** 그 순간
     브라우저에서 도달 가능한 읽기 경로가 생긴다 (ADR-015). 관리자 인증은
     `lib/admin/auth.ts` 가 자체 처리하고 데이터 접근은 계속 서버에서만 한다.
7. `public.admin_audit_log` 도 같다 — RLS on, 정책 0개, service_role 전용.
   **비밀번호를 어떤 형태로도(해시 포함) 이 테이블에 넣지 않는다.**
4. **원문 IP 를 저장하지 않는다.** `INQUIRY_IP_HASH_SALT` + SHA-256 해시만 남긴다.
   salt 가 없으면 해시도 남기지 않는다(salt 없는 IP 해시는 사실상 재식별 가능).
5. **민감정보 컬럼을 추가하지 않는다.** 주민등록번호, 계좌번호, 카드번호, 여권번호는
   이 테이블에 저장하지 않는다. 필요해지면 별도 설계(암호화·분리보관·접근통제)를 먼저 문서화한다.
6. 에러 로그에 입력값을 출력하지 않는다. `console.error` 에는 `error.code`/`error.message` 만.

## 3. 컬럼(폼 필드)을 추가할 때 — 5개 파일을 함께 고친다

빠뜨리면 조용히 저장이 누락되거나 DB 제약에서 터진다.

1. `supabase/migrations/<타임스탬프>_<설명>.sql` — **새 파일**을 만든다. 기존 파일을 수정하지 않는다.
   ```sql
   alter table public.inquiries
     add column if not exists budget_range text
       check (budget_range is null or char_length(budget_range) <= 40);
   comment on column public.inquiries.budget_range is '예상 예산 구간. 선택 입력.';
   ```
2. `lib/inquiry-schema.ts` — `inquirySchema` 에 필드와 한국어 에러 메시지를 추가한다.
3. `app/actions/inquiry.ts` — `safeParse` 입력 객체와 `insert` 페이로드에 매핑을 추가한다.
   (DB 는 snake_case, 스키마는 camelCase)
4. `components/contact-form.tsx` — 입력 요소 + `label` + `FieldError` + `aria-describedby` 추가.
5. `doc/03-supabase.md` — 스키마 표를 갱신한다.

개인정보 항목이 늘어나면 **`app/privacy/page.tsx` 의 수집 항목도 반드시 함께 갱신한다.**
동의 없이 수집 항목을 늘리는 것은 개인정보 보호법 위반이다.

## 4. 마이그레이션 적용

로컬/원격 모두 Supabase CLI 를 쓴다.

```bash
supabase link --project-ref <project-ref>
supabase db push                      # supabase/migrations/*.sql 순차 적용
supabase migration list               # 적용 상태 확인
```

CLI 를 쓸 수 없으면 Supabase 대시보드 → SQL Editor 에 파일 내용을 **순서대로** 붙여 실행한다.
실행 후 `Table Editor → inquiries → RLS enabled` 표시를 눈으로 확인한다.

## 5. 환경변수

`.env.example` 을 복사해 `.env.local` 을 만든다. `.env.local` 은 커밋하지 않는다(`.gitignore` 처리됨).
배포·연동 절차 전체는 `doc/09-deployment.md` 에 있다.

`lib/supabase/server.ts` 가 **두 가지 이름 체계를 모두 지원한다.** 하나만 있으면 된다.

| 용도 | 찾는 순서 | 노출 |
|---|---|---|
| 프로젝트 URL | `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` | 공개 |
| 비밀키 | `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` | **비공개** |
| IP 해시 salt | `INQUIRY_IP_HASH_SALT` | **비공개** |
| 사이트 절대 URL | `NEXT_PUBLIC_SITE_URL` | 공개 |

- 신형 키(`sb_secret_...` / `sb_publishable_...`)를 먼저 본다.
  레거시 `anon` / `service_role` JWT 는 **2026년 말 지원 종료 예정**이므로 신형을 쓴다.
- **Vercel 의 Supabase Marketplace 연동은 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` /
  `NEXT_PUBLIC_SUPABASE_URL` 을 주입한다.** `SUPABASE_SERVICE_ROLE_KEY` 나
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` 는 주입하지 않는다. 그래서 두 체계를 모두 받는다.
- `INQUIRY_IP_HASH_SALT` 는 Supabase 에서 받는 값이 아니다 — `openssl rand -hex 32` 로 만든다.
- 이름을 추가·변경할 때는 `lib/supabase/server.ts` 의 `URL_ENV_KEYS` /
  `SECRET_ENV_KEYS` 배열만 고친다. 값을 읽는 곳을 늘리지 않는다.

### 비밀키를 다룰 때

- **채팅·이슈·PR·커밋에 비밀키를 붙여넣지 않는다.** Supabase 대시보드 → Vercel 대시보드
  사이에서만 오가게 한다. 마이그레이션은 대시보드 SQL Editor 로 적용하면 키가 전혀 필요 없다.
- Vercel 은 변수마다 **Config / Secret** 타입을 고르게 한다. 둘 다 빌드 타임에 읽히므로
  동작 차이는 없고 가시성만 다르다.
  - `NEXT_PUBLIC_*` → **Config**. 어차피 클라이언트 번들에 인라인되므로 Secret 으로 표시해도
    비밀이 되지 않고, 값을 다시 볼 수 없어 **오타 검증이 불가능해진다**.
  - 비밀값 → **Secret**. write-only 가 되고 빌드 로그에서 마스킹된다.
  - ⚠️ Secret 으로 저장한 변수는 Config 로 바꿀 수 없다. 삭제 후 재등록해야 한다.
- **`NEXT_PUBLIC_SUPABASE_URL` 에 `/rest/v1/` 를 붙이지 않는다.** supabase-js 가 자동으로
  붙이므로 경로가 두 번 들어가 404 가 되고 저장이 조용히 실패한다. 끝 슬래시도 제거한다.
- 운영/프리뷰는 **서로 다른 secret key 와 서로 다른 salt** 를 쓴다. 사고 시 해당 환경만 폐기한다.
- 실수로 노출됐다면 즉시 Supabase 에서 해당 secret key 를 폐기(revoke)하고 새로 발급한다.

## 6. 운영 시 남은 작업 (미구현)

- 보관기간 경과 데이터 자동 삭제 — `pg_cron` 잡 (SQL 은 마이그레이션 하단 주석 참고)
- 접수 알림 — Slack/이메일 웹훅 (Supabase Database Webhooks 또는 Server Action 내 발송)
- 레이트리밋 강화 — 현재는 `ip_hash` 기준 10분 3건. 대량 유입 시 Upstash 등 외부 저장소 검토
- ~~관리자 조회 화면~~ — `/admin` 구현 완료. 운영 절차는 `doc/10-admin.md`
- `admin_audit_log` 보관기간 정책 + 정리 잡 (마이그레이션 하단 주석 참고)

## 7. 관리자 화면(`/admin`)을 건드릴 때

운영 절차는 `doc/10-admin.md`, 설계 근거는 `doc/04-decisions.md` ADR-015. **읽기 전용이다.**

| 하려는 것 | 주의 |
|---|---|
| 조회 컬럼 추가 | `lib/admin/inquiries.ts` 의 `select()` 와 `InquiryListItem`/`InquiryDetail` 타입. **개인정보 항목이면 목록에는 마스킹해서 넣는다** |
| 새 감사 액션 추가 | `AdminAction` 타입 **과** 마이그레이션의 `check (action in (...))` 제약을 **함께** 고친다. 한쪽만 고치면 insert 가 조용히 실패하고 감사 로그가 비어 있게 된다 |
| 새 관리자 페이지 추가 | `requireAdminSession()` 을 **그 페이지에서 직접** 호출한다(레이아웃 가드는 접근 제어가 아니다). `export const dynamic = 'force-dynamic'` 도 반드시 붙인다 — 빠지면 빌드 시점 `notFound()` 가 굳어 영구 404 가 된다 |
| 쓰기 기능(상태 변경 등) 추가 | CSRF·변경 이력·권한을 함께 설계한다. 현재 읽기 전용인 것은 의도적 선택 |
| CSV·엑셀 내보내기 | 만들지 않았다. 요구가 생기면 **반출 기록을 감사 로그에 남기는 설계를 먼저** 한다 |

**절대 하지 않을 것**
- `lib/admin/*` 를 클라이언트 컴포넌트에서 import (`'server-only'` 로 막혀 있다)
- `ADMIN_*` 환경변수에 `NEXT_PUBLIC_` 접두어
- 로그인 에러 메시지에서 아이디 오류와 비밀번호 오류를 구분
- 감사 로그 기록을 조건부로 건너뛰기 — 조회했으면 반드시 남긴다
