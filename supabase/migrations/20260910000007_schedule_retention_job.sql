-- ─────────────────────────────────────────────────────────────────────────────
-- 보관기간 파기 잡 스케줄 (pg_cron)
--
-- ⚠️ **이 파일은 20260910000006 과 별도로 실행한다.**
--    `pg_cron` 확장은 플랜·권한에 따라 생성이 거부될 수 있고, 그러면 트랜잭션
--    전체가 롤백된다. 파기 함수(20260910000006)까지 함께 날아가면 곤란하므로
--    파일을 나눴다. 함수만 있어도 수동 실행은 가능하다.
--
-- pg_cron 을 못 쓰는 경우의 대안은 doc/10-admin.md 를 참고한다.
-- ─────────────────────────────────────────────────────────────────────────────

-- Supabase 는 pg_cron 을 지원한다. 이미 켜져 있으면 아래는 no-op 이다.
-- 대시보드에서 켜려면: Database → Extensions → pg_cron 검색 → Enable
create extension if not exists pg_cron;

-- ── 기존 잡 제거 (재실행 안전) ──────────────────────────────────────────────
--
-- cron.schedule 은 같은 이름으로 다시 호출하면 갱신되지만, 이전 이름 규칙으로
-- 만든 잡이 남아 중복 실행되는 것을 막기 위해 명시적으로 지운다.

do $$
begin
  perform cron.unschedule('purge-expired-inquiries');
exception
  when others then null; -- 없으면 무시
end;
$$;

do $$
begin
  perform cron.unschedule('purge-expired-audit-log');
exception
  when others then null;
end;
$$;

-- ── 스케줄 ──────────────────────────────────────────────────────────────────
--
-- ⚠️ cron 표현식은 **UTC** 기준이다. Supabase 의 pg_cron 은 UTC 로 동작한다.
--    KST = UTC+9 이므로 새벽 03:10 KST = 18:10 UTC (전날).
--    트래픽이 가장 적은 시간대에 둔다.
--
-- 두 잡을 20분 벌려 둔다. 같은 시각에 돌면 잠금·부하가 겹치고, 실패했을 때
-- 어느 잡이 문제인지 로그에서 구분하기 어렵다.

select cron.schedule(
  'purge-expired-inquiries',
  '10 18 * * *',                              -- 매일 03:10 KST
  $$select public.purge_expired_inquiries('cron');$$
);

select cron.schedule(
  'purge-expired-audit-log',
  '30 18 * * *',                              -- 매일 03:30 KST
  $$select public.purge_expired_audit_log('cron');$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 확인
--
--   -- 등록된 잡
--   select jobid, jobname, schedule, active, command from cron.job order by jobname;
--
--   -- 최근 실행 결과 (pg_cron 자체 이력)
--   select jobid, status, return_message, start_time, end_time
--   from cron.job_run_details order by start_time desc limit 20;
--
--   -- 우리 파기 이력 (증빙용)
--   select executed_at, target_table, cutoff_at, deleted_count, retained_count, triggered_by
--   from public.data_retention_log order by executed_at desc limit 20;
--
-- ⚠️ **잡이 등록됐다고 파기가 동작하는 것은 아니다.** 등록 다음 날
--    `data_retention_log` 에 `triggered_by = 'cron'` 행이 생기는지 확인한다.
--    삭제 대상이 없으면 `deleted_count = 0` 인 행이 남는다 — 그 0 행이
--    "잡이 돌고 있다" 는 증거다.
-- ─────────────────────────────────────────────────────────────────────────────
