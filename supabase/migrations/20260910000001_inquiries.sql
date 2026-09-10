-- ─────────────────────────────────────────────────────────────────────────────
-- 상담 문의 접수 테이블
--
-- 설계 원칙
--  1) 개인정보 최소 수집: 담당자 이름/회사/연락처만 받는다. 주민번호·계좌·카드번호는
--     어떤 경우에도 이 테이블에 저장하지 않는다(체크 제약으로 방어하지 않으니 폼에서 차단).
--  2) IP 는 원문 저장하지 않고 salt 를 섞은 SHA-256 해시만 남긴다(ip_hash).
--     → 어뷰징 차단(레이트리밋)에는 충분하고, 유출 시 재식별 위험은 낮춘다.
--  3) RLS 를 켜고 정책을 만들지 않는다. anon/authenticated 는 읽기·쓰기 모두 불가.
--     삽입은 Server Action 에서 service_role 키로만 수행한다(RLS 우회).
--  4) 감사 추적: created_at / updated_at / status / handled_by 를 남긴다.
--  5) 보관기간: 개인정보처리방침에 명시한 기간(기본 3년) 경과 시 삭제한다.
--     운영에서는 pg_cron 등으로 주기 삭제 잡을 구성할 것(아래 참고 쿼리).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.inquiries (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- 문의 내용
  name             text        not null check (char_length(name) between 1 and 40),
  company          text        not null check (char_length(company) between 1 and 80),
  email            text        not null check (char_length(email) between 5 and 160),
  phone            text        not null check (char_length(phone) between 8 and 24),
  service_slug     text        not null,
  message          text        not null check (char_length(message) between 10 and 2000),

  -- 동의 이력 (전자금융 도메인: 동의 시점 증빙이 중요)
  privacy_consent  boolean     not null check (privacy_consent),
  marketing_consent boolean    not null default false,

  -- 유입/어뷰징 추적
  source_path      text,
  ip_hash          text,
  user_agent       text        check (user_agent is null or char_length(user_agent) <= 512),

  -- 처리 상태
  status           text        not null default 'received'
                     check (status in ('received', 'in_review', 'contacted', 'closed', 'spam')),
  handled_at       timestamptz,
  handled_by       text,

  constraint inquiries_service_slug_check check (
    service_slug in (
      'van-terminal',
      'pg-agency',
      'efin-license',
      'cloud-registration',
      'open-banking',
      'other'
    )
  )
);

comment on table public.inquiries is '홈페이지 상담 문의. 개인정보 포함 → service_role 만 접근.';
comment on column public.inquiries.ip_hash is 'salt + SHA-256(client IP). 원문 IP 저장 금지.';
comment on column public.inquiries.privacy_consent is '개인정보 수집·이용 동의. false 는 저장 불가.';

-- 신규 문의 조회용
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
-- 상태별 처리 대시보드용
create index if not exists inquiries_status_created_at_idx on public.inquiries (status, created_at desc);
-- 레이트리밋 조회용 (동일 ip_hash 최근 N분 카운트)
create index if not exists inquiries_ip_hash_created_at_idx on public.inquiries (ip_hash, created_at desc);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- RLS: 켜고 정책을 만들지 않는다 → anon/authenticated 전면 차단.
alter table public.inquiries enable row level security;

-- 혹시 남아 있는 광범위 권한 회수 (Supabase 기본 grant 방어)
revoke all on table public.inquiries from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 참고: 보관기간 경과 데이터 삭제 (운영에서 pg_cron 으로 일 1회 실행 권장)
--
--   delete from public.inquiries
--   where created_at < now() - interval '3 years';
-- ─────────────────────────────────────────────────────────────────────────────
