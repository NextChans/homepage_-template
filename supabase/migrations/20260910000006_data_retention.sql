-- ─────────────────────────────────────────────────────────────────────────────
-- 보관기간 경과 데이터 파기
--
-- 왜 필요한가 —
--  개인정보처리방침에 "수집일로부터 3년간 보유한 후 지체 없이 파기" 라고 적어 두고
--  삭제 수단이 없으면 **그 자체가 위반**이다. 문의 폼을 내려둔 동안에는 데이터가
--  쌓이지 않아 미뤄왔지만, 관리자 직접 등록(ADR-018)으로 개인정보가 다시 쌓이기
--  시작했으므로 더 미룰 수 없다.
--
-- 방침의 예외 조항도 함께 구현한다 —
--  "단, 계약이 체결된 경우 관련 법령이 정한 기간(예: 전자상거래법상 계약 및
--   청약철회 기록 5년) 동안 보관합니다."
--  일괄 3년 삭제만 두면 이 조항을 지킬 수 없다. `retain_until` 로 개별 보존
--  기한을 둘 수 있게 한다.
--
-- ⚠️ 파기 이력을 남긴다(`data_retention_log`). 전자금융 도메인에서 "지체 없이
--    파기했다" 는 주장은 증빙이 있어야 성립한다. 삭제된 개인정보는 남기지 않고
--    **건수와 기준일만** 기록한다.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── 1. 개별 보존 예외 ───────────────────────────────────────────────────────

alter table public.inquiries
  add column if not exists retain_until date,
  add column if not exists retain_reason text
    check (retain_reason is null or char_length(retain_reason) <= 200);

comment on column public.inquiries.retain_until is
  '이 날짜까지는 파기하지 않는다. 계약 체결 등 법령상 보존 의무가 있는 건에만 설정. null 이면 기본 보관기간(3년) 적용.';
comment on column public.inquiries.retain_reason is
  '보존 사유 (예: 계약 체결 — 전자상거래법 5년). ⚠️ 개인정보를 적지 않는다.';

-- 파기 대상 조회용
create index if not exists inquiries_retention_idx
  on public.inquiries (created_at)
  where retain_until is null;

-- ── 2. 파기 이력 ────────────────────────────────────────────────────────────

create table if not exists public.data_retention_log (
  id            uuid        primary key default gen_random_uuid(),
  executed_at   timestamptz not null default now(),

  -- 어떤 테이블을 정리했는가
  target_table  text        not null check (target_table in ('inquiries', 'admin_audit_log')),
  -- 이 시각 이전 데이터를 대상으로 했다
  cutoff_at     timestamptz not null,
  -- 실제 삭제된 행 수
  deleted_count integer     not null check (deleted_count >= 0),
  -- 보존 예외로 건너뛴 행 수 (inquiries 만 해당)
  retained_count integer    not null default 0 check (retained_count >= 0),
  -- 'cron' | 'manual'
  triggered_by  text        not null default 'cron'
                  check (triggered_by in ('cron', 'manual'))
);

comment on table public.data_retention_log is
  '보관기간 경과 데이터 파기 이력. ⚠️ 삭제된 개인정보는 남기지 않고 건수·기준일만 기록한다.';

create index if not exists data_retention_log_executed_at_idx
  on public.data_retention_log (executed_at desc);

alter table public.data_retention_log enable row level security;
revoke all on table public.data_retention_log from anon, authenticated;

-- ── 3. 파기 함수 ────────────────────────────────────────────────────────────
--
-- ⚠️ 보관기간을 함수 인자로 받지 않고 **상수로 박아 둔다.** 인자로 열어 두면
--    누군가 `interval '1 day'` 로 호출해 전체를 지울 수 있다. 기간을 바꾸려면
--    마이그레이션으로 이 함수를 교체하고, 그 변경이 PR 로 검토·기록되게 한다.
--    개인정보처리방침에 적힌 기간과 코드가 갈리지 않게 하는 장치다.

create or replace function public.purge_expired_inquiries(p_triggered_by text default 'cron')
returns table (deleted_count integer, retained_count integer)
language plpgsql
as $$
declare
  v_cutoff    timestamptz := now() - interval '3 years';  -- 개인정보처리방침 4항
  v_deleted   integer;
  v_retained  integer;
begin
  if p_triggered_by not in ('cron', 'manual') then
    raise exception 'p_triggered_by 는 cron 또는 manual 이어야 합니다: %', p_triggered_by;
  end if;

  -- 보존 예외로 건너뛰는 건수를 먼저 센다 (증빙용).
  select count(*) into v_retained
  from public.inquiries
  where created_at < v_cutoff
    and retain_until is not null
    and retain_until >= current_date;

  -- 파기. inquiry_status_history 는 on delete cascade 로 함께 사라진다.
  with expired as (
    delete from public.inquiries
    where created_at < v_cutoff
      and (retain_until is null or retain_until < current_date)
    returning 1
  )
  select count(*) into v_deleted from expired;

  insert into public.data_retention_log
    (target_table, cutoff_at, deleted_count, retained_count, triggered_by)
  values ('inquiries', v_cutoff, v_deleted, v_retained, p_triggered_by);

  return query select v_deleted, v_retained;
end;
$$;

comment on function public.purge_expired_inquiries(text) is
  '3년 경과 문의를 파기하고 이력을 남긴다. retain_until 이 미래인 건은 건너뛴다. 보관기간은 함수 내 상수.';

-- 감사 로그는 개인정보를 담지 않아(ip_hash 만) 더 길게 보관한다.
-- 사고 조사 목적이므로 5년으로 둔다.
create or replace function public.purge_expired_audit_log(p_triggered_by text default 'cron')
returns integer
language plpgsql
as $$
declare
  v_cutoff  timestamptz := now() - interval '5 years';
  v_deleted integer;
begin
  if p_triggered_by not in ('cron', 'manual') then
    raise exception 'p_triggered_by 는 cron 또는 manual 이어야 합니다: %', p_triggered_by;
  end if;

  with expired as (
    delete from public.admin_audit_log
    where created_at < v_cutoff
    returning 1
  )
  select count(*) into v_deleted from expired;

  insert into public.data_retention_log
    (target_table, cutoff_at, deleted_count, triggered_by)
  values ('admin_audit_log', v_cutoff, v_deleted, p_triggered_by);

  return v_deleted;
end;
$$;

comment on function public.purge_expired_audit_log(text) is
  '5년 경과 감사 로그를 파기한다. 개인정보를 담지 않아(ip_hash 만) 문의보다 길게 보관.';

-- 함수 실행 권한도 service_role 전용으로 좁힌다.
revoke all on function public.purge_expired_inquiries(text) from public, anon, authenticated;
revoke all on function public.purge_expired_audit_log(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 수동 실행 / 사전 점검
--
--   -- 지금 지워질 건수 미리 보기 (실제로 지우지 않는다)
--   select count(*) filter (where retain_until is null or retain_until < current_date) as 파기대상,
--          count(*) filter (where retain_until is not null and retain_until >= current_date) as 보존예외
--   from public.inquiries
--   where created_at < now() - interval '3 years';
--
--   -- 수동 파기
--   select * from public.purge_expired_inquiries('manual');
--   select public.purge_expired_audit_log('manual');
--
--   -- 파기 이력
--   select executed_at, target_table, cutoff_at, deleted_count, retained_count, triggered_by
--   from public.data_retention_log order by executed_at desc limit 20;
--
--   -- 계약 체결 건에 보존 예외 설정 (전자상거래법 5년)
--   update public.inquiries
--   set retain_until = (created_at + interval '5 years')::date,
--       retain_reason = '계약 체결 — 전자상거래법 5년'
--   where id = '<inquiry-id>';
-- ─────────────────────────────────────────────────────────────────────────────
