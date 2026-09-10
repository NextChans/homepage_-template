# 관리자 페이지 (`/admin`) 운영 문서

상담 문의(`public.inquiries`)를 조회하는 사내 화면. **읽기 전용**이다.

설계 근거와 대안 검토는 [`04-decisions.md` ADR-015](./04-decisions.md) 에 있다.
이 문서는 **운영 절차**만 다룬다.

---

> **가동 상태: 운영 중** (2026-09-10 활성화 확인).
> 자격증명 3개 등록 + 마이그레이션 실행 + 로그인 성공까지 검증됨.
> 이 화면은 **실제 고객 개인정보**를 표시한다. 아래 5절(사고 대응)을 먼저 읽어둘 것.

## 1. 한눈에

| 항목 | 값 |
|---|---|
| 경로 | `/admin` 목록 · `/admin/new` 직접 등록 · `/admin/<id>` 상세 · `/admin/users` 계정 관리 · `/admin/audit` 감사 로그 · `/admin/password` 비밀번호 변경 · `/admin/login` |
| 인증 | **DB 계정**(`admin_users`) + **환경변수 비상 복구 계정** → HMAC 서명 쿠키 |
| 역할 | `관리자`(admin) / `상담자`(agent) |
| 세션 유효기간 | 8시간. **강제 만료 가능**(`session_epoch`) |
| 관리자 | 문의 업무 전부 + 계정 관리 + 감사 로그 조회 |
| 상담자 | 문의 조회 · 직접 등록 · 상태 변경 (계정·감사 로그 접근 불가) |
| 색인 | `robots.txt` 에서 `/admin` disallow. `sitemap` 미포함 |
| 감사 로그 | `public.admin_audit_log` — 로그인 성공/실패, 목록·개별 조회, 등록, 상태 변경 |
| 처리 이력 | `public.inquiry_status_history` — 상태 변경 append-only (화면 표시) |
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
| 문의 원문(이름·연락처·내용) 수정 | 없음 | 접수 원문을 바꾸면 처리 이력의 근거가 사라진다. Supabase 대시보드에서 사유를 남기고 처리 |
| 문의 삭제 | 없음 | 보관기간 삭제 잡으로 처리할 일이다 |
| 비밀번호 변경 | UI 없음 | 2-2 재실행 → `ADMIN_PASSWORD_HASH` 교체 → **Redeploy** |
| 로그인 실패 원인 확인 | 화면은 구분 안 함 | Vercel Runtime Logs 의 `[admin]` 로그 + `--verify` (아래) |
| 원격 강제 로그아웃 | 없음 (서명 쿠키라 서버 상태가 없다) | **`ADMIN_SESSION_SECRET` 교체 → 전체 세션 즉시 무효화** |
| 운영자별 계정·권한 | 없음 (공유 자격증명 1개) | 인원이 늘면 Supabase Auth + MFA 로 이전 (ADR-015) |
| MFA | 없음 | 동일 |
| 엑셀 내보내기 | 없음 | 의도적으로 만들지 않았다 — 개인정보를 파일로 반출하는 경로를 늘리지 않는다 |

---

## 5. 사고 대응

### 특정 담당자 계정이 유출된 것으로 의심될 때

1. **계정** → 해당 계정 → **세션 강제 만료** (모든 기기 즉시 로그아웃)
2. **비밀번호 초기화** (첫 로그인에서 변경 강제)
3. 필요하면 **비활성화**
4. `/admin/audit` 에서 해당 계정의 활동을 조사한다

화면을 쓸 수 없으면 SQL 로:

```sql
update public.admin_users
set session_epoch = extract(epoch from now())::bigint, status = 'disabled'
where username = 'hong';
```

### 비상 복구(환경변수) 자격증명이 유출된 것으로 의심될 때

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
| `로그인 실패 { usernameMatched: true, passwordMatched: false }` + `storedHashShape: 'ok'` | **해시를 만든 비밀번호와 입력하는 비밀번호가 다르다.** 가장 흔한 원인은 **비밀번호 앞뒤 공백** — 비밀번호 관리자에서 붙여넣을 때 딸려온 공백까지 해시에 들어가면, 브라우저에 타이핑해서는 절대 통과하지 못한다(서버는 폼 입력을 trim 하지 않는다) | 아래 `--verify` 로 확인 → 공백 없이 재생성 후 교체 → Redeploy |
| `storedHashShape: '✗ hash 바이트 …'` | **해시 값이 잘렸다** | 붙여넣기 사고. `scrypt$` 부터 끝까지 전체 재등록 |
| `로그인 차단 — Supabase 미설정…` | 실패 횟수를 조회할 수 없어 fail-closed | Supabase 환경변수 확인 |
| `로그인 차단 — 실패 횟수 조회 실패 { code: '42P01' }` | **`admin_audit_log` 테이블이 없다** | 2-1 마이그레이션 실행 |

**환경변수 값의 앞뒤 공백·줄바꿈은 서버가 `trim()` 한다.** 값 중간에 줄바꿈이 들어간
경우만 문제가 되며, 그때는 `storedHashShape` 에 드러난다.

배포하지 않고 로컬에서 비밀번호가 해시와 맞는지 확인할 수 있다:

```bash
node scripts/hash-admin-password.mjs --verify 'scrypt$...$...'
```

`--verify` 는 **공백 원인을 직접 지목한다.**

| verify 출력 | 뜻 |
|---|---|
| `✓ 맞습니다` + `⚠️ 방금 입력한 값에 앞뒤 공백이 있습니다` | **이 해시는 공백 포함 비밀번호로 만들어졌다.** 타이핑 로그인은 영구 실패 → 공백 없이 재생성 |
| `✗ 틀립니다` + `⚠️ 앞뒤 공백을 제거하면 맞습니다` | 해시는 정상. **입력에 공백이 딸려온 것** |
| `✓ 형식 정상` + `✗ 틀립니다` (공백 안내 없음) | 해시를 만든 비밀번호가 다르다(오타) → 재생성 |

재생성은 인자 없이 실행한다 — 비밀번호를 **두 번** 물어보고, **앞뒤 공백을 거부**하고,
만든 해시로 **자기검증**까지 한다.

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

## 6. 가동 직후 점검 (한 번만)

활성화한 날 확인할 것. 지금 안 보면 나중에 "안 쌓이고 있었다" 를 늦게 안다.

```sql
-- 감사 로그가 실제로 쌓이는가 (login_success 가 있어야 한다)
select created_at, action, actor from public.admin_audit_log
order by created_at desc limit 10;

-- 잠금이 동작할 수 있는 상태인가 (ip_hash 가 null 이면 잠금 미적용)
select action, (ip_hash is not null) as ip_해시있음, count(*)
from public.admin_audit_log group by 1, 2;
```

- [ ] `login_success` 행이 있다 → 감사 로그 정상
- [ ] `ip_해시있음 = true` → `INQUIRY_IP_HASH_SALT` 설정됨, 브루트포스 잠금 동작
      **false 면 잠금이 걸리지 않는다.** salt 를 등록하고 Redeploy 할 것
- [ ] 진단 과정에서 쌓인 `login_failed` 행 정리 (원하면)
- [ ] 자격증명을 비밀번호 관리자에 보관, **접근 권한자 명단**을 사내에 기록

## 7. 전화·이메일 문의 등록 (`/admin/new`)

목록 우측 상단 **직접 등록** 버튼.

- **유입 경로**: 전화 / 이메일 / 대면·기타. `홈페이지` 는 공개 폼 전용이라 고를 수 없다.
- **연락처와 이메일 중 하나만** 있어도 된다(전화 문의는 이메일이 없다).
- **처리 상태를 함께 고른다.** 이미 통화를 마친 건이면 `연락 완료` 로 등록한다 —
  그러면 처리 담당·처리일시가 그 시점으로 기록된다.
- **동의 확인 체크가 필수다.** 통화·메일에서 동의를 받은 경우에만 체크한다.
  동의 없이 개인정보를 등록하는 경로는 없다(DB check 제약 + 스키마 양쪽에서 막는다).
- 등록과 동시에 **처리 이력 첫 줄**이 남고 `created_by` 에 등록자가 기록된다.

## 8. 상태 변경과 처리 이력

상세 화면 하단에서 상태를 바꾼다. 바꿀 때마다 `inquiry_status_history` 에
**누가·언제·무엇에서 무엇으로** 남고 화면에 시간순으로 표시된다.

- `연락 완료`·`종결`·`스팸` 으로 바꾸면 **처리 담당·처리일시가 기록**된다.
- `접수`·`검토 중` 으로 되돌리면 **처리 정보가 비워진다** — 사실과 어긋나면 안 된다.
- 이력 기록이 실패해도 상태 변경은 되돌리지 않는다. 서버 로그의
  `[admin] 상태 변경 이력 기록 실패 — 상태는 변경됨` 을 확인할 것.

```sql
-- 특정 문의의 처리 이력
select changed_at, from_status, to_status, changed_by, note
from public.inquiry_status_history
where inquiry_id = '<inquiry-id>' order by changed_at desc;
```

> ⚠️ 이력은 문의 삭제 시 **함께 삭제**된다(`on delete cascade`). 보관기간 정책을
> 무의미하게 만들지 않기 위한 의도적 설계다. 반면 `admin_audit_log` 는 남는다.

## 9. 계정과 권한

### 역할

| | 관리자 (admin) | 상담자 (agent) |
|---|---|---|
| 문의 조회 | ○ | ○ |
| 직접 등록 | ○ | ○ |
| 상태 변경 | ○ | ○ |
| 계정 관리 | ○ | **×** |
| 감사 로그 | ○ | **×** |

상담자에게 계정 관리를 주지 않는 이유는 **스스로 관리자로 승격할 수 있으면 역할 분리가
무의미**해지기 때문이고, 감사 로그를 주지 않는 이유는 **감시 대상이 감시 기록을 볼 수
있으면 감사의 의미가 없기** 때문이다.

권한 부족은 403 이 아니라 **404** 다 — 관리자 전용 화면이 존재한다는 사실 자체를
알려주지 않는다.

### 두 가지 로그인 경로

| | DB 계정 | 환경변수 비상 복구 계정 |
|---|---|---|
| 용도 | **일상 업무** | DB 계정이 전부 잠기거나 Supabase 장애 시 |
| 저장 | `admin_users` | `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` |
| 역할 | admin 또는 agent | 항상 admin |
| 비밀번호 변경 | 화면에서 | Vercel 환경변수 교체 + 재배포 |
| 세션 강제 만료 | 가능 | 불가 (`ADMIN_SESSION_SECRET` 교체로 전체 무효화) |
| 잠금·이력 | 있음 | **없음** |

> ⚠️ 비상 복구 계정으로 로그인하면 헤더에 **빨간 배지**가 계속 표시되고 감사 로그에
> `bootstrap` 이 남는다. **일상 업무에 쓰지 말 것.** 이 계정은 MFA·잠금·이력이 없는
> 상시 관리자 경로이므로 비밀번호를 강하게 두고 아는 사람을 최소화한다.

### 첫 계정 만들기 (마이그레이션 직후 한 번)

- [ ] 1. 비상 복구 계정으로 `/admin` 로그인
- [ ] 2. **계정** → **계정 추가** → 아이디·권한(관리자)·초기 비밀번호 입력
- [ ] 3. 로그아웃 → 새 계정으로 로그인 → **비밀번호 변경 화면이 강제로 뜬다** → 변경
- [ ] 4. 이후 일상 업무는 개인 계정으로. 담당자별 계정을 각각 만든다
- [ ] 5. 비상 복구 계정 비밀번호를 비밀번호 관리자에 보관하고 접근자를 최소화

### 계정 관리 화면에서 할 수 있는 것

| 기능 | 효과 |
|---|---|
| 계정 추가 | 초기 비밀번호로 생성. **첫 로그인에서 변경 강제** |
| 권한 변경 | admin ↔ agent. **세션 즉시 만료**(토큰의 역할이 낡은 값이 되므로) |
| 비밀번호 초기화 | 세션 만료 + 첫 로그인에서 변경 강제 |
| 세션 강제 만료 | 해당 계정의 모든 기기에서 즉시 로그아웃 |
| 잠금 해제 | 로그인 실패 누적으로 잠긴 계정을 해제 |
| 비활성화 | 로그인 차단 + 세션 즉시 만료. **삭제보다 이것을 먼저 쓴다** |
| 삭제 | 되돌릴 수 없음. 아이디를 정확히 입력해야 실행 |

**막혀 있는 것 (의도적)**
- 본인 계정의 권한 변경·비활성화·삭제 — 실수로 자기 권한을 잃으면 되돌릴 수 없다
- **마지막 활성 관리자**의 강등·비활성화·삭제 — 관리자 0명 상태를 만들지 않는다
- 활성 관리자 수를 확인할 수 없으면(DB 오류) 진행 자체를 중단한다(fail-closed)

### 세션 강제 만료가 동작하는 방식

계정 행의 `session_epoch` 를 토큰에 담고 **매 요청마다 DB 값과 비교**한다. 다르면
세션을 거부한다. 비밀번호 변경·초기화·강제 만료·비활성화·권한 변경이 이 값을 갱신한다.

```sql
-- 특정 계정의 모든 세션을 SQL 로 즉시 끊기 (화면을 못 쓸 때)
update public.admin_users
set session_epoch = extract(epoch from now())::bigint
where username = 'hong';
```

> ⚠️ 값은 **카운터가 아니라 갱신 시각(Unix 초)** 이다. `epoch + 1` 은 동시 요청에서
> 증가가 유실될 수 있고, 유실되면 무효화해야 할 세션이 살아남는다.

### 로그인 잠금 (두 겹)

| | 기준 | 임계값 | 해제 |
|---|---|---|---|
| IP 단위 | `admin_audit_log.ip_hash` | 15분 내 5회 실패 | 15분 경과 또는 실패 행 삭제 |
| 계정 단위 | `admin_users.failed_login_count` | 5회 실패 → 15분 잠금 | 관리자가 **잠금 해제**, 또는 15분 경과 |

두 겹인 이유: IP 잠금은 **한 곳에서 여러 계정을 훑는** 시도를, 계정 잠금은
**여러 곳에서 한 계정을 노리는** 시도를 막는다.

### 감사 로그 화면 (`/admin/audit`)

최근 200건. 액션별 필터 제공. **이 화면을 연 것도 기록된다.**

문의 한 건의 처리 경과는 문의 상세의 **처리 이력**에서 보고, 여기는
**누가 무엇을 했는지**를 본다.

## 10. 보관기간 파기 (개인정보 3년 / 감사 로그 5년)

개인정보처리방침 4항에 적은 보관기간을 **실제로 집행하는 장치**다. 적어 두고 하지
않으면 그 자체가 위반이다. 설계 근거는 ADR-021.

### 적용 (마이그레이션 2개, **따로** 실행)

- [ ] 1. `20260910000006_data_retention.sql` — 파기 함수 · 이력 테이블 · 보존 예외 컬럼
- [ ] 2. `20260910000007_schedule_retention_job.sql` — `pg_cron` 스케줄

> ⚠️ **두 파일을 한 번에 붙여넣지 말 것.** `create extension pg_cron` 이 플랜·권한에
> 따라 거부되면 트랜잭션 전체가 롤백되어 **함수까지 함께 사라진다.**
> 1번을 먼저 적용해 성공을 확인한 뒤 2번을 실행한다.
> `pg_cron` 이 없으면 Database → Extensions 에서 검색해 Enable 한다.

### 스케줄

| 잡 | 시각(KST) | 대상 | 기간 |
|---|---|---|---|
| `purge-expired-inquiries` | 매일 03:10 | `inquiries` (+이력 cascade) | **3년** |
| `purge-expired-audit-log` | 매일 03:30 | `admin_audit_log` | **5년** |

감사 로그를 더 길게 두는 이유는 **개인정보를 담지 않기 때문**이다(`ip_hash` 만).
사고 조사 목적이라 오래 남기는 편이 낫다.

### ⚠️ 잡이 등록됐다고 도는 것은 아니다

**등록 다음 날 반드시 확인한다.**

```sql
-- 파기 이력. triggered_by = 'cron' 행이 매일 쌓여야 한다.
select executed_at, target_table, cutoff_at, deleted_count, retained_count, triggered_by
from public.data_retention_log order by executed_at desc limit 20;
```

삭제 대상이 없으면 `deleted_count = 0` 인 행이 남는다 —
**그 0 행이 "잡이 돌고 있다" 는 유일한 증거다.** 행이 아예 없으면 잡이 죽은 것이다.

```sql
-- pg_cron 쪽 실행 이력 (실패 사유가 여기 남는다)
select jobid, status, return_message, start_time from cron.job_run_details
order by start_time desc limit 20;

-- 등록된 잡
select jobname, schedule, active from cron.job order by jobname;
```

### 계약이 체결된 문의는 보존한다

방침 4항의 예외 조항(**계약 체결 시 법령상 기간 보관 — 예: 전자상거래법 5년**)은
`retain_until` 로 구현했다. 이 값이 미래면 3년이 지나도 파기하지 않는다.

```sql
update public.inquiries
set retain_until = (created_at + interval '5 years')::date,
    retain_reason = '계약 체결 — 전자상거래법 5년'
where id = '<inquiry-id>';
```

> ⚠️ **설정은 수동이다.** 계약이 체결됐는데 아무도 설정하지 않으면 3년에 파기된다.
> 계약 체결 시 이 값을 설정하는 것을 **운영 절차로** 정해야 한다 — 계약 체결 사실이
> 이 시스템에 없어 코드로 강제할 수 없다.

### 파기 전 사전 점검 · 수동 실행

```sql
-- 지금 지워질 건수 미리 보기 (실제로 지우지 않는다)
select count(*) filter (where retain_until is null or retain_until < current_date) as 파기대상,
       count(*) filter (where retain_until is not null and retain_until >= current_date) as 보존예외
from public.inquiries
where created_at < now() - interval '3 years';

-- 수동 파기 (이력에 triggered_by = 'manual' 로 남는다)
select * from public.purge_expired_inquiries('manual');
select public.purge_expired_audit_log('manual');
```

> **보관기간은 함수 안에 상수로 박혀 있다.** 인자로 받지 않는 이유는 누군가
> `interval '1 day'` 로 호출해 전체를 지우는 것을 막기 위해서다. 기간을 바꾸려면
> 마이그레이션으로 함수를 교체한다 — 그러면 변경이 PR 로 검토·기록된다.

### pg_cron 을 쓸 수 없는 플랜이면

Vercel Cron + 보호된 라우트로 전환한다. 다만 **외부에서 호출 가능한 엔드포인트가
생기므로** 인증 설계(시크릿 헤더 검증, 실패 시 로깅, 레이트리밋)를 먼저 문서화한 뒤
구현한다. DB 안에서 끝나는 일을 밖으로 내는 것이므로 차선책이다.

## 11. 남은 작업

- [x] ~~`admin_audit_log` 보관기간 정책 + 정리 잡~~ — 5년, 구현 완료 (ADR-021)
- [ ] **마케팅 수신 동의 철회 창구** — 방침은 "철회 시 즉시 파기" 라고 적었지만
      철회를 받는 기능이 없다. 수동 처리 절차부터 문서화해야 한다
- [x] ~~문의 상태 변경 기능~~ — 이력 테이블과 함께 구현 (2026-09-10, ADR-018)
- [ ] **3년 보관기간 삭제 잡** — 직접 등록으로 개인정보가 다시 쌓이므로 더 미룰 수 없다
- [ ] **개인정보처리방침 확정·공개** — 같은 이유
- [x] ~~계정·권한 분리 (관리자 / 상담자)~~ — 구현 완료 (2026-09-10, ADR-019)
- [ ] **MFA** — 계정 분리로 책임 추적은 생겼지만 인증 강도는 ID/PW 그대로다. 다음 개선 대상
- [ ] 비밀번호 재사용·이력 검사 (현재는 같은 비밀번호로 되돌릴 수 있다)
- [ ] 비상 복구 계정 사용 시 알림(Slack) — 지금은 배지·감사 로그로만 드러난다
- [ ] 접근 권한자 명단 관리 (문서 밖, 사내 절차)
