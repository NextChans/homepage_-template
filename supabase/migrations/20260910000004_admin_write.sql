-- ─────────────────────────────────────────────────────────────────────────────
-- 관리자 화면에 쓰기 기능 추가
--   1) 전화·이메일로 들어온 문의를 직접 등록
--   2) 처리 상태 변경 + **변경 이력** 보존
--
-- 왜 이력 테이블을 따로 두는가 —
--  inquiries.status / handled_by / handled_at 는 **현재 상태**만 담는다.
--  덮어쓰면 "누가 언제 무엇을 어떻게 바꿨는지" 가 사라진다. 전자금융 도메인에서
--  처리 이력이 남지 않는 상태 변경은 그 자체로 결함이다. 현재 상태는 목록 정렬·
--  필터를 위해 그대로 두고(비정규화), 변경 이력은 append-only 테이블에 쌓는다.
--
-- admin_audit_log 와 무엇이 다른가 —
--  admin_audit_log : **관리자가 콘솔에서 무엇을 했는가** (조회 포함, 보안 감사용)
--  inquiry_status_history : **이 문의가 어떻게 처리되어 왔는가** (업무 이력, 화면 표시)
--  목적이 달라 합치지 않는다. 둘 다 남긴다.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── 1. 유입 경로와 등록자 ────────────────────────────────────────────────────

alter table public.inquiries
  add column if not exists intake_channel text not null default 'web'
    check (intake_channel in ('web', 'phone', 'email', 'offline')),
  add column if not exists created_by text
    check (created_by is null or char_length(created_by) <= 80);

comment on column public.inquiries.intake_channel is
  '유입 경로. web=홈페이지 폼, phone/email/offline=관리자가 직접 등록.';
comment on column public.inquiries.created_by is
  '직접 등록한 관리자. web 유입은 null.';

-- ── 2. 전화 문의는 이메일이, 이메일 문의는 전화가 없을 수 있다 ───────────────
--
-- 기존 not null 을 풀되 **연락 수단이 하나도 없는 행은 막는다.**
-- 길이 체크(char_length between …)는 null 에서 unknown → 통과하므로 그대로 둔다.

alter table public.inquiries alter column email drop not null;
alter table public.inquiries alter column phone drop not null;

alter table public.inquiries
  drop constraint if exists inquiries_contact_present_check;
alter table public.inquiries
  add constraint inquiries_contact_present_check
    check (email is not null or phone is not null);

-- ── 3. 상태 변경 이력 (append-only) ─────────────────────────────────────────

create table if not exists public.inquiry_status_history (
  id          uuid        primary key default gen_random_uuid(),
  changed_at  timestamptz not null default now(),

  -- ⚠️ on delete cascade — 보관기간(3년) 경과로 문의를 삭제하면 이 이력도 함께
  --    사라져야 한다. 특정 개인의 문의에 대한 업무 맥락이므로 남겨두면 보관기간
  --    정책이 무의미해진다. admin_audit_log 는 반대로 FK 를 걸지 않는다 —
  --    그쪽은 개인정보를 담지 않고(ip_hash 만) 접근 이력이 더 오래 남아야 한다.
  inquiry_id  uuid        not null references public.inquiries (id) on delete cascade,

  -- 최초 등록 시에는 from_status 가 없다.
  from_status text        check (from_status is null or from_status in
                ('received', 'in_review', 'contacted', 'closed', 'spam')),
  to_status   text        not null check (to_status in
                ('received', 'in_review', 'contacted', 'closed', 'spam')),

  changed_by  text        not null check (char_length(changed_by) between 1 and 80),

  -- 처리 메모. ⚠️ 주민등록번호·계좌번호·카드번호를 적지 않는다.
  note        text        check (note is null or char_length(note) <= 500)
);

comment on table public.inquiry_status_history is
  '문의 처리 상태 변경 이력. append-only. 문의 삭제 시 함께 삭제(cascade).';
comment on column public.inquiry_status_history.note is
  '처리 메모. 주민등록번호·계좌번호·카드번호 저장 금지.';

create index if not exists inquiry_status_history_inquiry_idx
  on public.inquiry_status_history (inquiry_id, changed_at desc);

-- 접근 통제는 다른 테이블과 동일: RLS 켜고 정책 없음 → service_role 전용.
alter table public.inquiry_status_history enable row level security;
revoke all on table public.inquiry_status_history from anon, authenticated;

-- ── 4. 감사 로그 액션 확장 ──────────────────────────────────────────────────
--
-- ⚠️ AdminAction 타입(lib/admin/audit.ts)과 **반드시 함께** 바뀐다.
--    한쪽만 고치면 insert 가 조용히 실패해 감사 로그가 비어버린다.

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
      'status_changed'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 참고: 보관기간 경과 데이터 삭제 (pg_cron)
--
--   delete from public.inquiries
--   where created_at < now() - interval '3 years';
--
--   → inquiry_status_history 는 cascade 로 함께 삭제된다.
--     admin_audit_log 는 FK 가 없어 남는다(별도 보관기간 정책 필요).
-- ─────────────────────────────────────────────────────────────────────────────
