-- ─────────────────────────────────────────────────────────────────────────────
-- 관리자 계정과 권한
--
-- 왜 필요한가 —
--  지금까지 관리자는 **환경변수에 담긴 공유 자격증명 1개**였다. 쓰기 기능이 붙은
--  뒤로는 created_by / changed_by / actor 가 전부 같은 이름이라 **누가 했는지
--  추적이 불가능**하다. 전자금융 도메인에서 개인정보를 다루는 계정이 공유되는 것은
--  그 자체로 결함이다.
--
-- 역할은 둘이다.
--  admin (관리자) : 문의 업무 전부 + 계정 관리 + 감사 로그 조회
--  agent (상담자) : 문의 조회·직접 등록·상태 변경까지만
--
-- ⚠️ 환경변수 자격증명(ADMIN_USERNAME/ADMIN_PASSWORD_HASH)은 **제거하지 않는다.**
--    이 테이블의 계정이 전부 잠기거나 Supabase 가 죽으면 아무도 들어갈 수 없다.
--    환경변수 계정은 **비상 복구(break-glass)** 경로로 남기고, 로그인 시
--    감사 로그에 그 사실을 표시한다.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- 소문자로만 저장한다. 대소문자만 다른 두 계정이 생기면 운영자가 혼동한다.
  username      text        not null unique
                  check (username = lower(username) and char_length(username) between 3 and 40),

  -- scrypt$<salt-hex>$<hash-hex>. ⚠️ 평문·복호화 가능한 형태로 저장하지 않는다.
  password_hash text        not null check (char_length(password_hash) between 20 and 400),

  role          text        not null check (role in ('admin', 'agent')),

  -- 삭제보다 비활성화를 기본으로 한다. 계정을 지우면 created_by/changed_by 가
  -- 가리키는 대상이 사라져 이력 해석이 어려워진다.
  status        text        not null default 'active' check (status in ('active', 'disabled')),

  -- 관리자가 초기화한 비밀번호로는 업무를 못 하게 한다. 첫 로그인에서 반드시 변경.
  must_change_password boolean not null default true,

  -- ⚠️ 세션 무효화의 핵심. 세션 토큰에 이 값을 담고, 검증 시 DB 값과 비교한다.
  --    비밀번호 변경·초기화·강제 로그아웃 시 값을 올리면 **기존 세션이 전부 무효**가
  --    된다. 서명 쿠키만으로는 원격 로그아웃이 불가능했던 약점(ADR-015)을 이것으로
  --    해소한다. 세션 테이블을 만들지 않고도 즉시 무효화가 된다.
  --
  --    ⚠️ 카운터가 아니라 **갱신 시각(Unix 초)** 을 넣는다. `epoch = epoch + 1` 은
  --       읽고-쓰는 두 단계라 동시 요청에서 증가가 유실될 수 있고, 유실되면
  --       무효화해야 할 세션이 살아남는다. 시각은 읽지 않고 바로 쓰므로 경쟁이 없다.
  --       bigint 인 이유는 2038년에 int4 를 넘기 때문이다.
  session_epoch bigint      not null default 1 check (session_epoch > 0),

  -- 계정 단위 로그인 잠금. IP 단위 잠금(admin_audit_log 기반)과 **함께** 쓴다.
  --  IP 잠금  : 한 곳에서 여러 계정을 훑는 시도를 막는다
  --  계정 잠금: 여러 곳에서 한 계정을 노리는 시도를 막는다
  failed_login_count integer not null default 0 check (failed_login_count >= 0),
  locked_until  timestamptz,

  last_login_at timestamptz,
  password_changed_at timestamptz,

  created_by    text        check (created_by is null or char_length(created_by) <= 40),
  disabled_at   timestamptz,
  disabled_by   text        check (disabled_by is null or char_length(disabled_by) <= 40)
);

comment on table public.admin_users is
  '관리자 콘솔 계정. 비밀번호는 scrypt 해시만 저장. 환경변수 계정은 별도의 비상 복구 경로.';
comment on column public.admin_users.session_epoch is
  '세션 무효화 값(갱신 시각의 Unix 초). 토큰에 담아 검증한다. 값을 올리면 기존 세션이 모두 무효.';
comment on column public.admin_users.must_change_password is
  '관리자가 초기화한 비밀번호. true 면 비밀번호 변경 화면 외에는 접근할 수 없다.';
comment on column public.admin_users.status is
  'disabled 는 로그인 불가. 삭제 대신 비활성화를 기본으로 한다(이력 해석 보존).';

create index if not exists admin_users_role_idx on public.admin_users (role, status);

-- updated_at 자동 갱신 (20260910000001 에서 만든 함수를 재사용)
drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- 접근 통제는 다른 테이블과 동일: RLS 켜고 정책 없음 → service_role 전용.
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 감사 로그 확장
--
-- ⚠️ `AdminAction` 타입(lib/admin/audit.ts)과 **반드시 함께** 바뀐다.
--    한쪽만 고치면 insert 가 조용히 실패해 감사 로그가 비어버린다.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log
  add constraint admin_audit_log_action_check check (
    action in (
      'login_success',
      'login_failed',
      'list_viewed',
      'record_viewed',
      'record_created',
      'status_changed',
      -- 계정 관리
      'user_created',
      'user_role_changed',
      'user_disabled',
      'user_enabled',
      'user_deleted',
      'user_password_reset',
      'user_unlocked',
      'sessions_revoked',
      'own_password_changed',
      -- 조회
      'user_list_viewed',
      'audit_viewed'
    )
  );

-- 무엇이 어떻게 바뀌었는지 한 줄로 남긴다 (예: 'agent → admin').
-- ⚠️ 개인정보를 적지 않는다. 계정명·역할·상태값만.
alter table public.admin_audit_log
  add column if not exists note text
    check (note is null or char_length(note) <= 200);

comment on column public.admin_audit_log.note is
  '변경 요약 (예: agent → admin). 개인정보 저장 금지.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 첫 관리자 계정 만들기
--
--  1) 환경변수 계정(비상 복구 경로)으로 /admin 에 로그인한다
--  2) 계정 관리 → 계정 추가 로 실제 관리자 계정을 만든다
--  3) 그 계정으로 로그인해 비밀번호를 변경한다
--  4) 이후 일상 업무는 개인 계정으로 한다. 환경변수 계정은 비상시에만 쓴다
--
-- SQL 로 직접 만들 필요가 있으면 해시를 먼저 생성해야 한다(평문을 넣을 수 없다):
--   node scripts/hash-admin-password.mjs
--
--   insert into public.admin_users (username, password_hash, role, created_by)
--   values ('hong', 'scrypt$...$...', 'admin', 'sql');
-- ─────────────────────────────────────────────────────────────────────────────
