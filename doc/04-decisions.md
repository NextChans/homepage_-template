# 04. 의사결정 기록 (ADR)

각 항목: 맥락 → 결정 → 근거 → 대안 → 남는 위험

---

## ADR-001. `apple-design` 스킬을 프로젝트 레벨로 설치

- **맥락** 사용자가 "apple-design 스킬을 설치한 후 사용"을 요구. 사내/마켓플레이스 카탈로그에
  동명 스킬이 없었다.
- **결정** `schhaohao/apple-design` 의 `SKILL.md` 를 `.claude/skills/apple-design/` 에 그대로 복사.
  출처·설치일·대안 스킬을 `SOURCE.md` 에 기록.
- **근거** 후보 6개 중 frontmatter 규격이 올바르고(`name: apple-design`) 내용이 자체 완결적이며
  외부 참조 파일이 없는 유일한 저장소. 프로젝트 레벨이면 저장소를 클론한 누구나 같은 규범을 받는다.
- **대안** `chaos-xxl/apple-design-skill` (토큰/레이아웃 레퍼런스가 더 상세하지만 `prompts/` 분산
  구조라 그대로 스킬로 동작하지 않음), `tristan-mcinnis/apple-hig-designer-skill-2026` (HIG/네이티브 중심).
- **남는 위험** 원본 frontmatter 가 `LICENSE.txt` 를 참조하지만 저장소에 라이선스 파일이 없다.
  **사내 배포·재배포 전 원저작자에게 라이선스를 확인해야 한다.** 서브모듈이 아니라 복사이므로
  업스트림 변경은 자동 반영되지 않는다.

---

## ADR-002. 웹폰트를 쓰지 않고 시스템 폰트 스택 사용

- **결정** `-apple-system` → `SF Pro` → `Pretendard` → `Apple SD Gothic Neo` → `system-ui`
- **근거** apple-design 스킬이 시스템 폰트 스택을 최우선으로 요구한다. 부수 효과로 웹폰트 요청이
  0건이 되어 LCP 가 개선되고 CLS 가 발생하지 않는다.
- **남는 위험** Windows/Android 에서는 SF Pro 가 없어 `Malgun Gothic` / 기본 산세리프로 떨어진다.
  브랜드 일관성이 중요해지면 Pretendard 를 self-host 하는 방안을 재검토한다(폰트 용량 트레이드오프).

---

## ADR-003. Server Component 우선, 클라이언트는 3개 컴포넌트로 제한

- **결정** `site-header`, `reveal`, `contact-form` 만 `'use client'`.
- **근거** 마케팅 사이트는 상호작용이 적다. 정적 프리렌더로 공유 청크 약 102 kB 수준을 유지.
- **남는 위험** 향후 애널리틱스·챗 위젯을 붙이면 이 수치가 무의미해진다. 서드파티 스크립트는
  `next/script` 의 `lazyOnload` 로 넣고 번들 영향을 매번 측정한다.

---

## ADR-004. 문의 저장은 Server Action + `service_role`, RLS 정책 없음

- **맥락** 문의 데이터에는 개인정보(이름·이메일·연락처)가 들어간다.
- **결정** `inquiries` 테이블에 RLS 를 켜고 **정책을 만들지 않는다.** anon 키로는 어떤 작업도
  불가하고, 삽입은 `service_role` 을 쓰는 Server Action 에서만 수행한다.
- **근거** anon insert 정책을 열면 anon 키만으로 임의 데이터 삽입이 가능해진다(키는 공개된다).
  금융 도메인에서 개인정보 테이블에 공개 쓰기 경로를 두는 것은 허용하지 않는다.
- **대안** anon insert 정책 + Turnstile/reCAPTCHA. 서버를 거치지 않아 간단하지만,
  검증 로직이 클라이언트로 나가고 스팸 대응이 외부 서비스 의존이 된다.
- **남는 위험** `service_role` 키 유출 시 전체 DB 가 노출된다. `'server-only'` 로 클라이언트
  번들 유입을 막았고 `NEXT_PUBLIC_` 접두어를 금지했지만, **배포 플랫폼의 환경변수 관리와
  키 로테이션 정책이 별도로 필요하다.**

---

## ADR-005. IP 는 원문 대신 salt 적용 해시만 저장

- **결정** `INQUIRY_IP_HASH_SALT` + SHA-256 → `ip_hash`. salt 가 없으면 해시조차 저장하지 않는다.
- **근거** 어뷰징 억제에는 동일성 판별만 필요하고 원문은 불필요하다. IPv4 공간은 작아
  salt 없는 해시는 전수 대조로 재식별이 가능하므로, salt 부재 시 저장을 포기하는 쪽을 택했다.
- **남는 위험** salt 를 교체하면 기존 해시와 매칭이 끊겨 레이트리밋 이력이 초기화된다.
  의도된 동작이다.

---

## ADR-006. 레이트리밋을 DB 카운트 기반으로 구현

- **결정** 동일 `ip_hash` 기준 10분 내 3건 초과 차단. 카운트 조회 실패 시에는 **접수를 막지 않고**
  로그만 남긴다.
- **근거** 외부 의존(Redis)을 늘리지 않고 어뷰징을 억제하는 최소 구성. 정합성보다 가용성을
  택한 것은 이 데이터가 결제 원장이 아니라 문의 접수이기 때문이다.
- **남는 위험** 동시 요청에서 원자적이지 않아 순간적으로 한도를 넘을 수 있다.
  트래픽이 커지면 Upstash Redis 등 외부 카운터로 이동한다.

---

## ADR-007. 스크롤 리빌에 `<noscript>` 폴백을 추가

- **맥락** 구현 직후 스크린샷에서 본문이 전부 빈 화면으로 나왔다. 원인은 캡처 스크립트의
  smooth scroll 이었으나, 이 과정에서 **JS 미실행 시 `.reveal` 이 콘텐츠를 영구히 숨긴다**는
  실제 결함이 드러났다.
- **결정** `app/layout.tsx` `<head>` 에 `<noscript>` 스타일을 넣어 `.reveal` 을 강제 표시.
  `reveal.tsx` 에도 `IntersectionObserver` 부재 시 즉시 표시 경로를 유지.
- **근거** 마케팅 사이트에서 본문이 안 보이는 것은 치명적이다. HTML 에는 SSR 되어 있으므로
  크롤러에는 영향이 없었지만, JS 차단 환경의 실사용자에게는 백지가 된다.

---

## ADR-008. `Hero` 에 `size` 프롭을 도입 (한국어 타이포 대응)

- **맥락** `.type-display`(최대 6rem)를 하위 페이지 히어로에 적용하니 한국어 헤드라인이
  3줄로 깨지고 여백 균형이 무너졌다(스크린샷으로 확인).
- **결정** `size: 'display' | 'headline'`. 홈만 `display`, 나머지는 `headline`.
- **근거** 한국어는 라틴 문자보다 자폭이 넓다. 스케일을 그대로 이식하면 Apple 원본의
  "한 문장이 화면을 지배하는" 효과가 오히려 깨진다.

---

## ADR-009. Supabase 환경변수 이름을 두 체계 모두 지원

- **맥락** Vercel 배포를 붙이려고 확인해 보니, Vercel 의 Supabase Marketplace 연동이 주입하는
  변수명이 우리 `.env.example` 과 달랐다. 연동은 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` 를
  넣고, 우리가 읽던 `SUPABASE_SERVICE_ROLE_KEY` 와 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 는
  넣지 않는다. 그대로 두면 **연동을 켜도 앱은 "미설정" 상태로 조용히 동작**한다.
- **또 하나** Supabase 는 레거시 `anon` / `service_role` JWT 를 신형
  `sb_publishable_...` / `sb_secret_...` 로 대체하며 레거시는 2026년 말 지원 종료 예정이다.
- **결정** `lib/supabase/server.ts` 가 우선순위 배열로 두 체계를 모두 찾는다.
  - URL: `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL`
  - 비밀키: `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY`
  신형을 먼저 본다. 읽는 지점은 여전히 이 파일 한 곳뿐이다.
- **근거** 이름을 한쪽으로 고정하면 (a) 연동 방식을 바꿀 때마다 코드를 고쳐야 하고
  (b) 레거시 키 종료 시 다시 고쳐야 한다. 배열 두 개로 양쪽을 흡수하는 비용이 훨씬 낮다.
- **대안** Vercel 쪽에서 변수명을 우리 이름으로 다시 매핑 — 대시보드에 숨은 설정이 늘어나고
  저장소만 봐서는 알 수 없게 된다. 채택하지 않았다.
- **남는 위험** 두 이름이 동시에 존재하고 값이 다르면 신형이 조용히 이긴다. 의도한 동작이지만,
  키를 교체할 때 옛 이름을 지우지 않으면 혼란이 생길 수 있다.

---

## ADR-010. 개발 안내 배너를 NODE_ENV 로 차단

- **맥락** `/contact` 에는 Supabase 미설정 시 "환경변수가 없다"는 개발용 배너가 있었고,
  제거는 `doc/05-content-guide.md` 의 수동 체크리스트에 맡겨져 있었다.
- **결정** `process.env.NODE_ENV === 'production'` 이면 렌더링하지 않는다.
- **근거** 수동 체크리스트는 잊힌다. env 주입이 실패한 채로 배포되면 방문자에게 내부 설정
  정보가 노출된다. 코드로 막는 편이 확실하다.
- **부수 효과** 프로덕션에서 배너가 안 보이는 것이 정상 동작이 되므로, env 주입 실패는
  배너가 아니라 **서버 로그(`supabaseConfigHint()`)와 실제 제출 테스트**로 확인해야 한다.
  `doc/09-deployment.md` 검증 체크리스트에 그렇게 적었다.
