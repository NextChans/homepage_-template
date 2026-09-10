-- ─────────────────────────────────────────────────────────────────────────────
-- 서비스 분야에 '키오스크'(kiosk) 추가
--
-- 왜 필요한가 —
--  content/services.ts 에 서비스를 추가해도 inquiries_service_slug_check 제약을
--  함께 넓히지 않으면, 그 분야로 들어온 문의 저장이 DB 제약에서 실패한다.
--  폼 select 는 services 배열을 순회하므로 UI 에는 즉시 나타난다 →
--  **선택은 되는데 접수는 실패하는** 조합이 되므로 반드시 함께 적용한다.
--
--  (현재 상담 폼은 content/features.ts 의 inquiryForm 플래그로 내려가 있어
--   실제 저장은 일어나지 않는다. 그래도 재활성화 시점에 빠뜨리지 않도록 지금 넣는다.)
--
-- 체크 제약은 alter 로 교체한다. drop → add 사이에 기존 행이 새 제약을 위반하면
-- add 가 실패하므로, 기존 값(5종 + other)을 모두 포함시켰다.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.inquiries
  drop constraint if exists inquiries_service_slug_check;

alter table public.inquiries
  add constraint inquiries_service_slug_check check (
    service_slug in (
      'van-terminal',
      'kiosk',
      'pg-agency',
      'efin-license',
      'cloud-registration',
      'open-banking',
      'other'
    )
  );
