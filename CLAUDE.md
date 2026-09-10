# 프로젝트 규칙

전자금융 인프라 사업자(밴 단말기 / PG 영업대행 / 전자금융업·클라우드 이용등록·금결원 오픈뱅킹
컨설팅) 기업 홈페이지 템플릿. Next.js App Router + TypeScript + Tailwind v4 + Supabase.

## 시작하기 전에 읽을 것

1. `doc/07-handoff.md` — 다른 환경에서 이어가는 방법
2. `doc/04-decisions.md` — **왜 그렇게 되어 있는지.** 읽지 않으면 결정을 되돌리게 된다
3. `doc/06-security-compliance.md` — 남은 리스크

## 스킬을 먼저 확인한다

`.claude/skills/` 에 이 프로젝트의 반복 작업 절차가 들어 있다. 해당 작업이면 **먼저 읽는다.**

| 작업 | 스킬 |
|---|---|
| Apple 스타일 UI 제작 | `apple-design` |
| 서비스·회사정보·문안 수정 | `homepage-content` |
| 새 페이지·섹션 추가 | `homepage-section` |
| DB 스키마·문의 폼 필드 변경 | `homepage-supabase` |
| 변경 후 검증 | `homepage-verify` |

## 코드 규칙

- **Server Component 우선.** `'use client'` 는 상호작용이 반드시 필요한 컴포넌트만
  (현재 `site-header`, `reveal`, `contact-form` 3개).
- **사용자 노출 문안은 `content/` 하위 데이터 모듈에만** 둔다. 페이지에 하드코딩하지 않는다.
- **색상 리터럴(`#hex`, `rgb()`) 금지.** `app/globals.css` 의 `@theme` 토큰만 사용한다.
  `accent` 는 링크·버튼·포커스·에러 텍스트에만 쓴다.
- **하위 페이지 히어로는 `<Hero size="headline">`.** `display` 스케일은 홈 전용
  (한국어가 3줄로 깨진다).
- 타입은 strict + `noUncheckedIndexedAccess`. 인덱스 접근 결과는 `undefined` 가능성을 처리한다.

## 보안 규칙 (금융 도메인)

- `SUPABASE_SERVICE_ROLE_KEY`, `INQUIRY_IP_HASH_SALT` 에 **`NEXT_PUBLIC_` 접두어 금지.**
- `lib/supabase/server.ts` 는 `'server-only'`. 클라이언트에서 import 금지.
- `public.inquiries` 는 **RLS on + 정책 없음.** anon 접근 정책을 열지 않는다.
- **원문 IP 를 저장하지 않는다.** salt + SHA-256 해시만.
- **주민등록번호·계좌번호·카드번호를 `inquiries` 에 저장하지 않는다.**
- 로그·에러 메시지에 입력값(개인정보)을 출력하지 않는다.
- 개인정보 수집 항목을 늘리면 `app/privacy/page.tsx` 를 **반드시 함께** 갱신한다.
- 문안에 `100% 승인`, `반드시 통과`, `최저 수수료 보장` 류의 단정·최상급 표현을 쓰지 않는다.

## 작업 마무리 규칙

1. `npm run typecheck && npm run lint && npm run build`
2. UI 변경이면 `homepage-verify` 스킬로 스크린샷 확인
3. **중요한 판단은 `doc/04-decisions.md` 에, 진행 내역은 `doc/08-worklog.md` 에 기록한다.**
   나중에 몰아 쓰지 않는다.
4. **반복될 작업이라면 문서가 아니라 스킬로 만든다** (`.claude/skills/`).
5. 브랜치 `claude/apple-style-homepage-iv3pxl` 에 커밋·푸시하고 **draft PR** 을 연다.
   컨테이너는 세션 종료 후 회수되므로 커밋하지 않은 것은 사라진다.
6. **CI(typecheck·lint·build)가 통과하면 확인을 받지 않고 바로 `main` 에 머지한다.**
   (사용자 지시, 2026-09-10: "CI 통과했으면 머지 항상 해 그냥")
   - draft 를 해제하고 **merge commit** 으로 머지한다. 머지 커밋 본문에 판단 요약을 남긴다.
   - 머지 후 작업 브랜치를 `origin/main` 기준으로 **로컬에서만** 다시 만든다
     (`git fetch origin main && git checkout -B <branch> origin/main`).
     **이미 머지된 PR 에 새 커밋을 쌓지 않는다.**
   - ⚠️ **이때 브랜치를 push 하지 않는다.** 작업 브랜치를 `main` 과 같은 커밋으로
     force-push 하면 Vercel 이 **같은 SHA 를 Preview 로 먼저 잡아** Production 배포가
     생성되지 않는다(같은 커밋을 두 번 빌드하지 않는다). 실제로 PR #10 이 이 때문에
     프로덕션에 반영되지 않았다. push 는 **새 커밋이 생겼을 때** 한다.
   - 머지 후에는 **프로덕션 화면에서 변경이 반영됐는지 확인한다.** CI 통과와 배포는
     별개다. 반영이 안 됐으면 Vercel Deployments 에서 해당 배포가 `Preview` 로
     잡혔는지 보고, 그렇다면 **Promote to Production** 하거나 새 커밋을 올린다.
   - CI 가 **실패하면 머지하지 않는다.** 원인을 규명해 고치고 다시 푸시한다.
   - **DB 마이그레이션이 포함된 머지는 사용자에게 알린다** — Supabase SQL Editor
     실행은 사람이 해야 반영된다.
