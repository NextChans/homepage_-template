# 관리자 페이지 (`/admin`) 운영 문서

상담 문의(`public.inquiries`)를 조회하는 사내 화면. **읽기 전용**이다.

설계 근거와 대안 검토는 [`04-decisions.md` ADR-015](./04-decisions.md) 에 있다.
이 문서는 **운영 절차**만 다룬다.

---

## 1. 한눈에

| 항목 | 값 |
|---|---|
| 경로 | `/admin` (목록) · `/admin/<inquiry-id>` (상세) · `/admin/login` |
| 인증 | 단일 ID/PW → HMAC 서명 쿠키 (`admin_session`) |
| 세션 유효기간 | 8시간 |
| 권한 | **읽기 전용.** 상태 변경·삭제 없음 |
| 색인 | `robots.txt` 에서 `/admin` disallow. `sitemap` 미포함 |
| 감사 로그 | `public.admin_audit_log` — 로그인 성공/실패, 목록 조회, 개별 조회 |
| 자격증명 미설정 시 | **3개 라우트 전부 404** (의도된 동작) |

```
app/admin/login/page.tsx ──► components/admin/login-form.tsx  (Client)
                                        │ FormData
                             app/admin/actions.ts  'use server'
                                        │  login / logout 만 export
                        lib/admin/auth.ts   scrypt 검증 → HMAC 세션 쿠키
                        lib/admin/audit.ts  로그인 실패 카운트(잠금) + 감사 기록
                                        ▼
app/admin/page.tsx ─ requireAdminSession() ─► lib/admin/inquiries.ts ─► service_role
app/admin/[id]/page.tsx ─┘   (lib/admin/guard.ts)                        (읽기 전용)
```

---

## 2. 활성화 절차

### 2-1. 감사 로그 테이블 생성 (먼저 한다)

Supabase → SQL Editor → `supabase/migrations/20260910000002_admin_audit_log.sql` 내용을
붙여넣고 실행한다.

확인:
- Table Editor 에 `admin_audit_log` 가 보인다
- 해당 테이블 **RLS enabled**, **Policies 0개**

> 이 테이블이 없으면 로그인은 되지만 감사 로그가 남지 않고,
> **브루트포스 잠금도 동작하지 않는다.** 반드시 먼저 만든다.

### 2-2. 자격증명 생성

로컬에서 (명령 앞에 **공백 한 칸**을 넣어 셸 히스토리에 남지 않게 한다):

```bash
node scripts/hash-admin-password.mjs
```

**인자로 비밀번호를 넘기지 않는다** — `ps` 로 보이고 셸 히스토리에 남는다.
실행하면 숨김 입력으로 **두 번** 물어보고, 일치할 때만 해시를 만든다.

> ⚠️ 두 번 묻는 이유: 한 번만 묻는 방식으로는 숨겨진 입력의 오타를 알 수 없고,
> 배포 후 "아이디 또는 비밀번호가 올바르지 않습니다" 로만 드러난다. 실제로 겪었다.

`ADMIN_PASSWORD_HASH` 와 `ADMIN_SESSION_SECRET` 두 값이 출력된다.
비밀번호 원문은 **어디에도 저장하지 않는다** (비밀번호 관리자에만 보관).

### 2-3. Vercel 환경변수 등록

Vercel → 프로젝트 → Settings → Environment Variables. **타입은 넷 다 Secret.**

| 이름 | 값 |
|---|---|
| `ADMIN_USERNAME` | 직접 정한 아이디 |
| `ADMIN_PASSWORD_HASH` | 2-2 출력값 (`scrypt$...$...`) |
| `ADMIN_SESSION_SECRET` | 2-2 출력값 (64자 hex) |
| `INQUIRY_IP_HASH_SALT` | 이미 설정되어 있어야 한다 — **없으면 로그인 잠금이 동작하지 않는다** |

`NEXT_PUBLIC_` 접두어를 붙이면 클라이언트 번들에 노출된다. **절대 붙이지 않는다.**

### 2-4. 재배포 후 확인

- [ ] `/admin` → `/admin/login` 으로 리다이렉트
- [ ] 틀린 비밀번호 → "아이디 또는 비밀번호가 올바르지 않습니다" (구분하지 않음)
- [ ] 정상 로그인 → 목록 화면
- [ ] 브라우저 개발자도구 → Application → Cookies:
      `admin_session` 이 `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin`
- [ ] Supabase → `admin_audit_log` 에 `login_success` / `list_viewed` 행이 쌓임
- [ ] `curl -s https://<도메인>/robots.txt | grep admin` → `Disallow: /admin`

---

## 3. 화면 동작

### 목록 (`/admin`)

최근 100건, `created_at` 내림차순. **이메일·연락처는 마스킹**된다
(`ho****@example.com`, `*******1234`). 전체 값은 상세에서만 보인다.

상담 폼이 플래그로 내려가 있으면(`content/features.ts` 의 `inquiryForm: false`)
새 문의가 들어오지 않으므로 목록이 비어 있는 것이 정상이다. 화면에도 그렇게 안내한다.

### 상세 (`/admin/<id>`)

문의자의 **개인정보 전체**를 표시한다. 진입 시 `record_viewed` 가 대상 id 와 함께
감사 로그에 기록된다. id 는 조회 전에 UUID 형식을 검사하며, 형식이 다르면 404.

### 로그아웃

세션 쿠키를 즉시 제거한다. 공용 PC 에서 사용했다면 반드시 누른다.

---

## 4. 하지 못하는 것 (그리고 대신 어떻게 하나)

| 필요 | 현재 | 대응 |
|---|---|---|
| 문의 상태 변경 (`status`) | 없음 (읽기 전용) | Supabase 대시보드에서 직접 수정 |
| 비밀번호 변경 | UI 없음 | 2-2 재실행 → `ADMIN_PASSWORD_HASH` 교체 → **Redeploy** |
| 로그인 실패 원인 확인 | 화면은 구분 안 함 | Vercel Runtime Logs 의 `[admin]` 로그 + `--verify` (아래) |
| 원격 강제 로그아웃 | 없음 (서명 쿠키라 서버 상태가 없다) | **`ADMIN_SESSION_SECRET` 교체 → 전체 세션 즉시 무효화** |
| 운영자별 계정·권한 | 없음 (공유 자격증명 1개) | 인원이 늘면 Supabase Auth + MFA 로 이전 (ADR-015) |
| MFA | 없음 | 동일 |
| 엑셀 내보내기 | 없음 | 의도적으로 만들지 않았다 — 개인정보를 파일로 반출하는 경로를 늘리지 않는다 |

---

## 5. 사고 대응

### 자격증명이 유출된 것으로 의심될 때

1. `ADMIN_SESSION_SECRET` 을 새로 생성해 교체한다 → **모든 세션이 즉시 만료**된다.
2. `ADMIN_PASSWORD_HASH` 도 함께 교체한다.
3. 재배포.
4. `admin_audit_log` 를 조사한다:

```sql
-- 최근 7일 관리자 활동
select created_at, action, actor, target_id, ip_hash
from public.admin_audit_log
where created_at > now() - interval '7 days'
order by created_at desc;

-- 로그인 실패가 몰린 IP 해시
select ip_hash, count(*), max(created_at)
from public.admin_audit_log
where action = 'login_failed' and created_at > now() - interval '7 days'
group by ip_hash order by count(*) desc;

-- 특정 문의를 누가 열었나
select created_at, actor, ip_hash
from public.admin_audit_log
where action = 'record_viewed' and target_id = '<inquiry-id>'
order by created_at desc;
```

### 로그인이 안 될 때 (원인 진단)

화면 메시지는 **아이디·비밀번호 중 무엇이 틀렸는지 구분하지 않는다**(사용자명 존재 여부
은닉). 대신 **Vercel 런타임 로그**에 원인이 남는다.

Vercel → 프로젝트 → **Logs** (또는 해당 배포 → Runtime Logs) 에서 `[admin]` 검색:

| 로그 | 의미 | 조치 |
|---|---|---|
| `로그인 실패 { usernameMatched: false, passwordMatched: true }` | **`ADMIN_USERNAME` 값이 다르다** | Vercel 에서 해당 변수를 삭제하고 **직접 타이핑해** 재등록 → Redeploy |
| `로그인 실패 { usernameMatched: true, passwordMatched: false }` | **비밀번호/해시가 다르다** | 해시 생성 시 오타. 아래 `--verify` 로 확인 후 재생성 |
| `storedHashShape: '✗ hash 바이트 …'` | **해시 값이 잘렸다** | 붙여넣기 사고. `scrypt$` 부터 끝까지 전체 재등록 |
| `로그인 차단 — Supabase 미설정…` | 실패 횟수를 조회할 수 없어 fail-closed | Supabase 환경변수 확인 |
| `로그인 차단 — 실패 횟수 조회 실패 { code: '42P01' }` | **`admin_audit_log` 테이블이 없다** | 2-1 마이그레이션 실행 |

**환경변수 값의 앞뒤 공백·줄바꿈은 서버가 `trim()` 한다.** 값 중간에 줄바꿈이 들어간
경우만 문제가 되며, 그때는 `storedHashShape` 에 드러난다.

배포하지 않고 로컬에서 비밀번호가 해시와 맞는지 확인할 수 있다:

```bash
node scripts/hash-admin-password.mjs --verify 'scrypt$...$...'
```

`✓ 형식 정상` + `✗ 틀립니다` → 해시 생성 시 오타다. 인자 없이 다시 실행해 새로 만든다
(비밀번호를 **두 번** 물어보고 자기검증까지 한다).

> ⚠️ `ADMIN_USERNAME` 을 Secret 으로 저장하면 **대시보드에서 값을 다시 볼 수 없다.**
> 아이디 불일치가 의심되면 확인하려 하지 말고 **삭제 후 재등록**한다.

### 로그인이 잠겼을 때

같은 IP 해시에서 **15분 내 실패 5회** 면 잠긴다. 15분을 기다리거나,
본인 실수임이 확실하면 해당 `login_failed` 행을 삭제한다.

```sql
delete from public.admin_audit_log
where action = 'login_failed' and created_at > now() - interval '15 minutes';
```

> 잠금 카운트 조회가 실패하면 **잠그는 쪽으로 동작한다**(fail-closed).
> Supabase 장애 중에는 관리자 로그인이 안 되는 것이 정상이다. 의도된 선택이다.

### 관리자 기능을 완전히 내리고 싶을 때

Vercel 에서 `ADMIN_USERNAME` 하나만 지우고 재배포하면 `/admin` 전체가 404 가 된다.
코드 변경이 필요 없다.

---

## 6. 남은 작업

- [ ] `admin_audit_log` 보관기간 정책 결정 + `pg_cron` 정리 잡
      (마이그레이션 파일 하단에 예시 쿼리 있음)
- [ ] 문의 상태 변경 기능 — 넣을 경우 CSRF·변경 이력을 함께 설계한다
- [ ] 운영자 2명 이상이 되면 Supabase Auth + MFA 로 이전
- [ ] 접근 권한자 명단 관리 (문서 밖, 사내 절차)
