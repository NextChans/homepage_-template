-- ─────────────────────────────────────────────────────────────────────────────
-- 관리자 접근 감사 로그
--
-- 왜 필요한가 —
--  관리자 페이지는 문의자의 개인정보(이름·이메일·연락처·문의 내용)를 조회한다.
--  전자금융 도메인에서 **개인정보 접근에 감사 추적이 없는 것 자체가 결함**이다.
--  누가 언제 어떤 레코드를 열었는지 남겨야 사고 시 영향 범위를 판단할 수 있다.
--
-- 이 테이블은 두 가지 역할을 겸한다.
--  1) 감사 추적 (login_success / list_viewed / record_viewed)
--  2) 로그인 브루트포스 차단 (login_failed 를 ip_hash 기준으로 카운트)
--     별도 테이블을 만들지 않고 inquiries 의 레이트리밋과 같은 방식을 쓴다.
--
-- 접근 통제는 inquiries 와 동일하다: RLS 를 켜고 정책을 만들지 않는다.
-- 읽기·쓰기 모두 service_role(서버 전용)로만 일어난다.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.admin_audit_log (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  action      text        not null
                check (action in ('login_success', 'login_failed', 'list_viewed', 'record_viewed')),

  -- 로그인 시도에 사용된 사용자명. 실패 시에도 남긴다(누가 노리는지 파악).
  -- ⚠️ 비밀번호는 어떤 형태로도 저장하지 않는다.
  actor       text        check (actor is null or char_length(actor) <= 80),

  -- record_viewed 일 때 조회 대상 inquiries.id.
  -- FK 를 걸지 않는다: 문의가 보관기간 경과로 삭제돼도 접근 이력은 남아야 한다.
  target_id   uuid,

  -- 원문 IP 대신 salt + SHA-256 해시. inquiries 와 같은 정책.
  ip_hash     text,
  user_agent  text        check (user_agent is null or char_length(user_agent) <= 512)
);

comment on table public.admin_audit_log is
  '관리자 페이지 접근 감사 로그. 개인정보 접근 추적 + 로그인 브루트포스 차단용.';
comment on column public.admin_audit_log.actor is
  '로그인에 사용된 사용자명. 비밀번호는 저장하지 않는다.';
comment on column public.admin_audit_log.target_id is
  '조회한 inquiries.id. FK 없음 — 문의가 삭제돼도 접근 이력은 보존한다.';

-- 감사 로그 조회용
create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
-- 로그인 실패 카운트용 (브루트포스 차단)
create index if not exists admin_audit_log_ip_action_idx
  on public.admin_audit_log (ip_hash, action, created_at desc);
-- 특정 문의에 누가 접근했는지 역추적용
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_id, created_at desc);

-- RLS: 켜고 정책을 만들지 않는다 → anon/authenticated 전면 차단.
alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 참고: 감사 로그 보관
--
--  감사 로그는 문의 데이터보다 오래 보관하는 것이 일반적이다(사고 조사 목적).
--  개인정보를 담지 않으므로(ip_hash 만) 보관 기간을 길게 둘 수 있다.
--  운영 정책이 정해지면 pg_cron 으로 정리 잡을 구성할 것.
--
--    delete from public.admin_audit_log
--    where created_at < now() - interval '5 years';
-- ─────────────────────────────────────────────────────────────────────────────
