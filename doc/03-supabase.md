# 03. Supabase

작업 절차는 `.claude/skills/homepage-supabase/SKILL.md` 에 있다. 이 문서는 **현재 상태**를 기록한다.

## 테이블: `public.inquiries`

마이그레이션: `supabase/migrations/20260910000001_inquiries.sql`

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `created_at` | timestamptz | not null, `now()` | |
| `updated_at` | timestamptz | not null | 트리거 자동 갱신 |
| `name` | text | 1–40자 | 담당자 이름 |
| `company` | text | 1–80자 | |
| `email` | text | 5–160자 | 소문자 정규화 후 저장 |
| `phone` | text | 8–24자 | |
| `service_slug` | text | enum 체크 | 서비스 5종 + `other` |
| `message` | text | 10–2000자 | |
| `privacy_consent` | boolean | **`check (privacy_consent)`** | false 는 저장 불가 |
| `marketing_consent` | boolean | default false | 선택 동의 |
| `source_path` | text | | `referer` 헤더 |
| `ip_hash` | text | | salt + SHA-256. **원문 IP 저장 안 함** |
| `user_agent` | text | ≤512자 | |
| `status` | text | `received`/`in_review`/`contacted`/`closed`/`spam` | 처리 상태 |
| `handled_at` | timestamptz | | |
| `handled_by` | text | | |

인덱스: `created_at desc` / `(status, created_at desc)` / `(ip_hash, created_at desc)`

## 보안 모델

- `alter table public.inquiries enable row level security;` — **정책을 만들지 않았다.**
  → `anon`, `authenticated` 는 select/insert/update/delete 전부 불가.
- `revoke all ... from anon, authenticated` 로 Supabase 기본 grant 도 회수했다.
- 삽입은 `SUPABASE_SERVICE_ROLE_KEY` 를 쓰는 Server Action 에서만 일어난다.
- 조회는 Supabase 대시보드 또는 별도 사내 도구(서버 권한)에서 한다.
  **공개 페이지에서 문의를 읽는 기능은 만들지 않는다.**

## 환경변수

`.env.example` 참고.

| 변수 | 클라이언트 노출 | 필수 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | O | metadata/sitemap 절대 URL |
| `NEXT_PUBLIC_SUPABASE_URL` | O | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | 현재 미사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | **X** | O |
| `INQUIRY_IP_HASH_SALT` | **X** | 권장 (없으면 IP 해시 미저장) |

미설정 시: 빌드 성공 → `/contact` 에 개발용 경고 배너 → 제출 시 에러 상태 반환 + 서버 로그.

## 적용 방법

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase migration list
```

CLI 없이 진행하는 경우 대시보드 SQL Editor 에 마이그레이션 파일을 순서대로 실행하고,
Table Editor 에서 **RLS enabled** 표시를 눈으로 확인한다.

## 미구현 (운영 전 결정 필요)

- [ ] 보관기간(3년) 경과 데이터 자동 삭제 — `pg_cron` 잡
- [ ] 접수 알림 (Slack / 이메일)
- [ ] 관리자 조회 화면 (만들 경우 인증 + 감사 로그 필수)
- [ ] Supabase 리전 확정 및 국외 이전 여부를 `app/privacy/page.tsx` 4항에 반영
- [ ] 백업/복구 정책 (Supabase PITR 사용 여부)
