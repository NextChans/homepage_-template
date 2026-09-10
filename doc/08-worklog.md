# 08. 작업 기록

## 2026-09-10 — 초기 구축

### 한 일

1. **`apple-design` 스킬 설치** — 사내/마켓플레이스 카탈로그에 없어 공개 저장소 6개를 비교한 뒤
   `schhaohao/apple-design` 을 `.claude/skills/apple-design/` 에 설치. 출처를 `SOURCE.md` 에 기록.
   (ADR-001)
2. **프로젝트 스캐폴딩** — Next.js 15 App Router + TypeScript strict + Tailwind v4 + zod + Supabase.
3. **디자인 시스템** — `app/globals.css` 에 `@theme` 토큰(색/타이포/모션/그림자)과
   타이포 스케일 6단계 정의. 라이트/다크는 변수 재정의로만 처리.
4. **컴포넌트 12개** — `ui`, `hero`, `reveal`, `site-header`, `site-footer`, `metrics-band`,
   `service-grid`, `feature-split`, `process-steps`, `faq`, `cta-band`, `logo-strip`, `contact-form`.
5. **페이지 8개** — 홈, 서비스 목록, 서비스 상세(SSG 5경로), 회사소개, 문의, 개인정보처리방침,
   404, sitemap/robots.
6. **콘텐츠** — 업종 5종(밴 단말기 / PG 영업대행 / 전자금융업 / 클라우드 이용등록 /
   금결원 오픈뱅킹)의 임시 문안을 `content/services.ts` 에 작성. 서비스별 문제·산출물·프로세스·FAQ 포함.
7. **문의 접수 파이프라인** — Server Action + zod + Supabase(`service_role`) + RLS 차단 +
   honeypot + 최소 작성시간 + IP 해시 레이트리밋. 마이그레이션 1개.
8. **검증 스크립트** — `scripts/screenshot.mjs` (라이트/다크/모바일).
9. **반복 작업 스킬 4개 생성** — `homepage-content`, `homepage-section`, `homepage-supabase`,
   `homepage-verify`.
10. **문서 9개** — `doc/` 전체.

### 겪은 문제와 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| 세션 중 설치한 `apple-design` 을 `Skill` 툴이 인식하지 못함 | 스킬 레지스트리가 세션 시작 시점에 고정 | `SKILL.md` 를 직접 읽어 규범 적용. 이후 턴에서 정상 로드됨 |
| 첫 스크린샷에서 본문이 전부 백지 | 캡처 스크립트가 `scroll-behavior: smooth` 상태로 스크롤해 `.reveal` 이 발화되지 않음 | 캡처 시 smooth scroll 을 끄고 순차 스크롤. **부수 발견**: JS 미실행 시 콘텐츠가 영구히 숨는 실제 결함 → `<noscript>` 폴백 추가 (ADR-007) |
| 하위 페이지 히어로 헤드라인이 3줄로 깨짐 | 한국어에 `.type-display`(최대 6rem)를 적용 | `Hero` 에 `size` 프롭 도입, 하위 페이지는 `headline` (ADR-008) |
| 모바일 390px 에서 지표 숫자가 화면에 닿음 | `clamp` 최소값 2rem | 최소값 1.75rem 으로 하향 |
| `next lint` 사용 중단 경고 | Next.js 16 에서 제거 예정 | `package.json` 의 `lint` 를 `eslint .` 로 변경 |
| `eslint .` 가 생성 파일에서 에러 | `next-env.d.ts` 의 triple-slash reference | `eslint.config.mjs` ignores 에 생성 파일·산출물 추가 |
| 두 번째 스크린샷이 CSS 없는 HTML 덩어리로 찍힘 | `next start` 실행 중에 `npm run build` 를 다시 돌려 정적 에셋 해시가 바뀌어 기존 서버가 404 | 서버 종료 → 재빌드 → 재시작 순서를 강제. 이 함정을 `homepage-verify` 스킬에 명시 |

### 검증 결과

- `npm run typecheck` 통과
- `npm run lint` 통과 (경고 0)
- `npm run build` 통과 — 15 페이지 생성, 공유 First Load JS 약 102 kB
- 라이트/다크/모바일 스크린샷 육안 확인 완료

### 브랜치 · PR 구성

저장소가 커밋 0개 상태였기 때문에 최초 푸시된 `claude/apple-style-homepage-iv3pxl` 이 GitHub 에서
**기본 브랜치로 자동 지정**되었다. base 로 삼을 브랜치가 없어 PR 을 열 수 없는 상태였다.

정리한 방법:

1. 빈 트리로 초기 커밋(`2f4f6a6 chore: 저장소 초기화`)을 만들어 `main` 브랜치로 푸시
   - `git commit-tree $(git hash-object -t tree /dev/null)` — 작업 트리를 건드리지 않는 plumbing 방식.
     `git switch --orphan` 은 추적 파일이 untracked 로 남아 되돌아올 때 충돌하므로 쓰지 않았다.
2. 피처 브랜치를 `main` 위로 재배치 — `git rebase --onto main --root`
3. rebase 전/후 **트리 해시가 동일함을 검증**(`0d1acf6…`)한 뒤 `--force-with-lease` 로 푸시
   - 이 브랜치는 같은 세션에서 우리가 푸시한 커밋만 담고 있어 히스토리 재작성이 안전했다
4. `main` ← 피처 브랜치 draft PR 생성 → [#1](https://github.com/NextChans/homepage_-template/pull/1)
   (57 파일, +10,268, `mergeable_state: clean`)

`main` 이 빈 커밋이므로 PR diff 가 곧 작업 전체다.

> **남은 수동 작업**: 저장소 기본 브랜치가 아직 피처 브랜치다. GitHub Settings → General →
> Default branch 에서 `main` 으로 변경해야 한다. API 로 바꿀 도구가 없어 처리하지 못했다.

### 다음에 할 일

1. `doc/05-content-guide.md` 의 **필수 교체** 항목 (실제 회사 정보)
2. `doc/06-security-compliance.md` 의 **높음** 리스크 4건
3. 접수 알림(Slack/이메일) 구현
4. 보관기간 경과 데이터 삭제 잡(`pg_cron`)
5. 파비콘 / OG 이미지
6. 저장소 기본 브랜치를 `main` 으로 변경 (수동)
