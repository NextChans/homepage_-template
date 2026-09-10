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
```

검증 스키마는 `lib/inquiry-schema.ts` 한 곳에만 있다. 클라이언트와 서버가 같은 스키마를 쓴다.

## 2. 절대 어기지 않는 원칙

1. **`SUPABASE_SERVICE_ROLE_KEY` 에 `NEXT_PUBLIC_` 접두어를 붙이지 않는다.** 붙이면 클라이언트
   번들에 포함되어 RLS 가 완전히 무력화된다.
2. `lib/supabase/server.ts` 는 `'server-only'` 를 선언한다. 클라이언트 컴포넌트에서 import 금지.
3. `public.inquiries` 는 **RLS 를 켜고 정책을 만들지 않는다.** anon/authenticated 는 접근 불가.
   조회가 필요하면 Supabase 대시보드나 별도 사내 도구(서버 권한)에서 한다.
   → 공개 페이지에서 문의 목록을 읽는 기능은 만들지 않는다.
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

| 변수 | 노출 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | 현재 코드에서는 미사용(향후 클라이언트 조회용) |
| `SUPABASE_SERVICE_ROLE_KEY` | **비공개** | Server Action 전용. RLS 우회 |
| `INQUIRY_IP_HASH_SALT` | **비공개** | `openssl rand -hex 32` |

미설정 시 빌드는 성공하고, 문의 페이지에 개발용 경고가 표시되며 접수는 에러 상태로 반환된다.
운영 배포 전 4개 모두 설정하고, `app/contact/page.tsx` 의 개발 안내 블록 제거를 검토한다.

## 6. 운영 시 남은 작업 (미구현)

- 보관기간 경과 데이터 자동 삭제 — `pg_cron` 잡 (SQL 은 마이그레이션 하단 주석 참고)
- 접수 알림 — Slack/이메일 웹훅 (Supabase Database Webhooks 또는 Server Action 내 발송)
- 레이트리밋 강화 — 현재는 `ip_hash` 기준 10분 3건. 대량 유입 시 Upstash 등 외부 저장소 검토
- 관리자 조회 화면 — 만들 경우 반드시 인증 + 감사 로그를 함께 설계한다
