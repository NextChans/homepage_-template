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

### Supabase · Vercel 연동 준비

사용자가 Supabase 연결과 Vercel 배포를 요청. 비밀키를 받기 전에 **코드 쪽 선행 작업**을 먼저 했다.

확인 과정에서 나온 문제 하나: **Vercel 의 Supabase Marketplace 연동이 주입하는 변수명이
우리 코드와 달랐다.** 연동은 `SUPABASE_URL` / `SUPABASE_SECRET_KEY` 를 넣는데 우리는
`SUPABASE_SERVICE_ROLE_KEY` 를 읽고 있었다. 그대로 배포하면 연동을 켜도 앱이 "미설정" 상태로
조용히 동작한다. 또 Supabase 는 레거시 `anon`/`service_role` JWT 를 신형 `sb_secret_...` 로
대체하며 레거시는 2026년 말 종료 예정이다.

| 변경 | 내용 |
|---|---|
| `lib/supabase/server.ts` | URL·비밀키를 우선순위 배열로 조회해 **두 이름 체계 모두 지원**. 신형 우선 (ADR-009) |
| `lib/supabase/server.ts` | `supabaseConfigHint()` 추가 — 누락 시 허용 이름을 로그로 안내. 키 값은 출력하지 않는다 |
| `app/contact/page.tsx` | 개발 안내 배너를 `NODE_ENV === 'production'` 에서 차단 (ADR-010) |
| `.env.example` | 두 체계 설명, salt 는 Supabase 소관이 아님을 명시 |
| `doc/09-deployment.md` | **신규** — Supabase 프로젝트 생성 → SQL Editor 로 마이그레이션 → Vercel 임포트 → env → 검증 |
| `.claude/skills/homepage-supabase` | env 절 갱신 + "비밀키를 다룰 때" 절 추가 |

`vercel.json` 은 만들지 않았다. Next.js 는 Vercel 이 자동 감지하므로 불필요하고, 함수 리전
코드를 검증 없이 박으면 배포가 깨진다. 리전은 문서에서 대시보드로 설정하도록 안내했다.

마이그레이션 적용은 **대시보드 SQL Editor 를 권장**하기로 했다. CLI(`supabase db push`)는
Personal Access Token 과 DB 비밀번호가 추가로 필요해 노출면이 넓다. SQL Editor 는 키를
아무 곳으로도 내보내지 않는다. (이 컨테이너에는 supabase CLI 가 없고 psql 만 있다.)

### 리전 확정 (서울) 반영

사용자가 Supabase 리전을 **서울(`ap-northeast-2`)** 로 알려줬다. 반영하면서 두 가지가 나왔다.

**1. Vercel 함수 기본 리전이 `iad1`(버지니아)이다.** 그대로 두면 문의 제출마다 서울 DB ↔ 미국
함수를 왕복한다. `vercel.json` 에 `{"regions": ["icn1"]}` 을 고정했다. 앞서 리전 코드를 검증하지
못해 `vercel.json` 을 만들지 않았는데, Vercel 문서에서 `icn1` = Seoul (AWS `ap-northeast-2`)
을 확인한 뒤 추가했다. (ADR-011)

**2. "국외 이전 없음" 으로 단정하지 않았다.** 저장 리전이 국내라도 수탁자 Supabase Inc. 는
국외 법인이다. Supabase 공식 문서는 primary Postgres/Auth/Storage 가 선택 리전에 머문다고
하면서도 **백업·로그·외부 반출·Edge Function 실행·재위탁 업체가 data residency 와 국외이전
판단에 영향을 줄 수 있다**고 명시한다. 그래서 `app/privacy/page.tsx` 4항에는

- 보관 리전 = 서울, DB 는 국내 리전에 위치 → **사실로 기재**
- 국외 이전 해당 여부 → **"검토 진행 중"** 으로 표기하고 법무 확정 후 교체

로 남겼다. 검증되지 않은 법적 단정을 공개 페이지에 올리는 것이 금융 도메인에서는 그 자체로
리스크이기 때문이다. 확인해야 할 항목(재위탁 업체 목록, 백업·로그 위치, 기술지원 시 국외 접근
가능 여부)을 `doc/06-security-compliance.md` 에 적어 두었다.

### Vercel 첫 배포 실패 → `vercel.json` 철회

사용자가 Vercel 을 저장소에 연결. PR #1 의 Preview 배포가 커밋 `bdf8af7` 에서 **33초 만에 실패**했다.
`bdf8af7` 은 내가 `vercel.json` 을 추가한 커밋이다.

로그 접근 불가(Vercel 토큰 없음). 가설을 하나씩 배제했다.

| 가설 | 검증 | 결과 |
|---|---|---|
| 요금제가 리전 지정을 거부 | Vercel 체인지로그 확인 — Hobby 도 단일 리전 선택 가능, 우리는 `icn1` 하나만 지정 | 가능성 낮음 |
| `npm install` 실패 (playwright 브라우저 다운로드) | `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`/`PLAYWRIGHT_BROWSERS_PATH` 없이 깨끗한 디렉터리에서 `npm ci` 재현 | **배제** — 29초, exit 0 |
| `vercel.json` 자체 (스키마 검증 등) | 로그 없이 확정 불가 | 미확정 |
| vercel.json 과 무관 | 로그 없이 확정 불가 | 미확정 |

로그 없이 확정할 수 없으므로 **배포에 영향을 주는 유일한 변경을 되돌려 변수를 제거**했다.
함수 리전은 대시보드에서 설정하도록 문서를 바꿨다. 기능 영향 없음, 지연만 증가.

**교훈**: 배포 설정을 저장소에 두는 판단 자체는 유효하지만, **배포를 직접 검증할 수단이 없는
상태에서 배포 파이프라인 설정을 추가한 것이 실수였다.** 검증 수단(로그 접근 또는 CI)이 먼저다.
ADR-011 에 개정으로 남겼다.

### Vercel 배포 실패 — 계속 미해결 (2026-09-10)

`vercel.json` 을 제거한 뒤에도 배포가 실패했다. **가설이 틀렸다. `vercel.json` 은 원인이 아니다.**

지금까지 실패한 배포:

| 커밋 | 배포 ID | vercel.json | next |
|---|---|---|---|
| `bdf8af7` | `BrXUYEGgh5cog…` | 있음 | 15.5.4 |
| `bdf8af7` (재시도) | `AQWNjCUBoA88…` | 있음 | 15.5.4 |
| `e4ed7a1` | `EWKNGZvPoukc…` | 없음 | 15.5.25 |
| `9dfe061` | `FMo6TJQqK5PX…` | 없음 | 15.5.25 |

4회 연속 실패. 플레이크가 아니다.

**결정적 반증**: 같은 커밋(`9dfe061`)에서 **GitHub Actions CI 가 통과**했다
(`npm ci` → typecheck → lint → build, Node 22, 47초). 소스와 빌드는 정상이며 실패는
**Vercel 환경에 국한**된다.

**새 관찰**: 이 프로젝트는 **최초 배포부터 실패**했다(`bdf8af7`, 연동 직후). 성공한 배포가
한 번도 없다. 따라서 내 커밋 내용보다 **Vercel 프로젝트 수준 설정**이 더 의심스럽다.
확인 대상: Framework Preset, Root Directory, Node.js Version, Build Command 오버라이드,
무료 플랜 빌드 한도.

**남은 코드 쪽 후보**: `playwright` devDependency. Vercel 은 `npm ci` 로 devDependencies 까지
설치하고 playwright postinstall 이 Chromium(약 170MB)을 내려받는다. CI 는
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 로 이 경로를 타지 않지만 Vercel 에는 그 변수가 없다.

**결정적 추가 증거**: `eb5b636`(마크다운 문서 1개만 변경한 커밋)도 실패했다. **5회 연속**이며,
커밋 내용과 무관하게 실패한다는 뜻이다. 원인은 소스 diff 가 아니라 **빌드 환경**이다.
실패까지 매번 약 35초로 일정한데, CI 가 설치+검사+빌드에 47초 걸리는 것과 비교하면
**설치 직후 또는 빌드 초반에 즉시 죽는다**.

**모든 증거에 부합하는 단일 가설: Node 버전.**

| 증거 | Node 버전 가설과의 정합성 |
|---|---|
| 최초 배포부터 실패 | 프로젝트 생성 시 정해진 설정이므로 처음부터 적용 |
| 문서만 바꾼 커밋도 실패 | 소스와 무관 |
| 약 35초 후 즉시 실패 | `next build` 가 Node 버전을 확인하고 바로 종료 |
| CI(Node 22)는 통과 | Node 22 에서는 문제 없음 |

Vercel 은 Node 18 배포를 이미 거부하고, [Node 20 도 2026-10-01 지원 종료](https://vercel.com/changelog/node-js-20-is-being-deprecated)다.
프로젝트가 낮은 버전으로 잡혀 있으면 Next 15.5 빌드가 즉시 실패한다.

**조치**: `package.json` 에 `engines.node = "22.x"` 를 넣었다.
[Vercel 문서 기준 `engines.node` 는 Project Settings 를 덮어쓴다](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

이 변경은 배포 실패와 무관하게도 정당하다 — **로컬(22.22.2) · CI(22) · Vercel 의 런타임을
저장소에서 하나로 고정**해 빌드 재현성을 확보하고, 3주 뒤 Node 20 지원 종료에 미리 대응한다.
즉 "추측 기반 수정" 이 아니라 독립적 근거가 있는 하드닝이며, 동시에 위 가설을 검증한다.

**결과: 실패했다 (6회차, `7492f7c`, 42초).** Node 버전 가설도 반증됐다.
`engines.node` 는 Project Settings 를 덮어쓰므로, 프로젝트가 낮은 Node 로 잡혀 있었다면
이 커밋에서 통과해야 했다. 같은 커밋에서 CI 는 또 통과했다(43초).

**여기서 원격 진단을 중단한다.** 가설 두 개(`vercel.json`, Node 버전)를 각각 푸시로 검증했고
둘 다 틀렸다. 세 번째 추측을 밀어넣지 않는다.

### 실패 이력 정리

| # | 커밋 | 변경 내용 | 소요 | 결과 |
|---|---|---|---|---|
| 1 | `bdf8af7` | vercel.json 추가 | 33초 | 실패 |
| 2 | `bdf8af7` | (재시도) | — | 실패 |
| 3 | `e4ed7a1` | vercel.json 제거 + next 15.5.25 | — | 실패 |
| 4 | `9dfe061` | 문서 | 40초 | 실패 |
| 5 | `eb5b636` | **문서 1개만** | 35초 | 실패 |
| 6 | `7492f7c` | engines.node 22.x | 42초 | 실패 |

모든 커밋에서 GitHub Actions CI 는 통과. 소스는 정상이다.

### 재해석 — 실패 지점이 빌드 이후일 가능성

소요 시간이 35~42초인데, **CI 가 설치+타입체크+린트+빌드 전체를 43초에 끝낸다.** 즉 Vercel 의
35~42초는 빌드가 실패하기에 짧은 시간이 아니라 **빌드가 정상 완료된 뒤 배포 단계(함수 번들링,
출력 업로드 등)에서 실패했을 가능성**이 있다. 이 경우 소스나 Node 를 아무리 고쳐도 통과하지 않는다.

### 필요한 것 (사용자만 가능)

둘 중 하나.

1. **Building 로그의 마지막 에러 부분** — 대시보드에서 실패한 배포를 열고 붉은 줄 또는 마지막 20줄.
   로그에 `Build Completed` 가 있는지 여부가 위 재해석을 판별한다.
2. **Vercel 토큰을 세션 환경변수(`VERCEL_TOKEN`)로 제공** — 그러면
   `npx vercel inspect <id> --logs` 로 직접 읽어 스스로 진단한다. 토큰은 배포 권한을 포함하므로
   폐기 가능한 전용 토큰을 쓰고 작업 후 revoke 하는 것을 권한다. 채팅에 붙여넣지 말 것.

`engines.node = "22.x"` 는 되돌리지 않는다. 배포 실패와 무관하게 로컬·CI·Vercel 런타임을
저장소에서 고정하는 값으로서 정당하고, 3주 뒤 Node 20 지원 종료 대응도 된다.

### 원인 확정 — 환경변수 빈 문자열 (배포 9회 실패)

사용자가 Vercel Building 로그를 제공했다. 결정적 한 줄:

```
[Error: Failed to collect configuration for /_not-found]
  [cause]: TypeError: Invalid URL
```

`content/site.ts` 의 `process.env.NEXT_PUBLIC_SITE_URL ?? '...'` 가 원인.
**`??` 는 빈 문자열을 폴백하지 않는다.** Vercel 은 미설정 `NEXT_PUBLIC_*` 를 빈 값으로
주입하므로 `site.url === ''` → `app/layout.tsx` 의 `new URL('')` 이 TypeError.

로컬·CI 는 변수가 아예 없어서(undefined) 통과했다. 이 한 칸 차이가 "CI 통과 · Vercel 실패" 였다.

**재현**: `NEXT_PUBLIC_SITE_URL="" npm run build` → 동일 에러. 미설정으로는 재현 안 됨.

**수정**
- `content/site.ts`: `resolveSiteUrl()` — trim → 빈 값 검사 → `new URL` try/catch →
  프로토콜 검사 → 끝 슬래시 제거. 어떤 입력에도 throw 하지 않는다.
- `.github/workflows/ci.yml`: 빌드 스텝에 `NEXT_PUBLIC_SITE_URL: ''` 명시.
  Vercel 과 같은 엄격한 조건으로 검증해 같은 부류의 회귀를 CI 에서 잡는다.

**검증**: 미설정 / 빈 문자열 / 잘못된 형식 / 정상값(끝 슬래시 포함) 4가지 모두 빌드 통과,
sitemap 의 URL 에 `//` 없음. typecheck·lint 통과.

**결과 확인**: `b07ac71` 배포 **Ready (56초)**. 이전 9회는 32~42초에 죽었는데
`Collecting page data` 를 통과해 끝까지 갔다. PR #1 이 CI·Vercel·머지가능 모두 초록이 됐다.

**반성**: 가설 두 개를 각각 푸시로 검증했고 둘 다 틀렸다. 로그 한 줄이 그 모든 추측보다
결정적이었다. 로그 확보를 더 일찍·더 강하게 요구해야 했다. 자세한 교훈은 ADR-012.

### Production 도메인 404 — 원인과 해결

빌드가 고쳐진 뒤 사용자가 Production 주소에서 `404: DEPLOYMENT_NOT_FOUND` 를 만났다.
(에러 ID 가 `icn1::` 로 시작 → 요청이 서울에서 처리됨, 즉 함수 리전 설정은 정상 적용됐다.)

원인: **`main` 이 빈 초기 커밋**이라 파일이 하나도 없다. Vercel 은 `main` 으로 Production 을
빌드하는데 빌드할 것이 없어 Error 로 끝나고, 그래서 Production 도메인에 서비스 중인 배포가 없다.

| 배포 | 브랜치 | 환경 | 상태 |
|---|---|---|---|
| `b07ac71` | `claude/apple-style-homepage-iv3pxl` | Preview | Ready (56초) |
| — | `main` | Production | Error (빌드할 파일 없음) |

이는 ADR-011 의 부수 효과다. 저장소가 커밋 0개여서 PR base 를 만들기 위해 빈 커밋으로 `main` 을
만들었고, 그 상태로는 Production 이 성립하지 않는다.

**해결: PR #1 을 `main` 에 머지한다.** 머지 판단은 저장소 소유자 몫이므로 대기 중이다.
급할 때의 임시 방편은 Ready 배포를 Promote to Production 하는 것이지만, `main` 이 비어 있는
상태는 그대로라 다음 `main` 푸시에서 다시 실패한다.

### 다음에 할 일

1. `doc/05-content-guide.md` 의 **필수 교체** 항목 (실제 회사 정보)
2. `doc/06-security-compliance.md` 의 **높음** 리스크 4건
3. 접수 알림(Slack/이메일) 구현
4. 보관기간 경과 데이터 삭제 잡(`pg_cron`)
5. 파비콘 / OG 이미지
6. ~~저장소 기본 브랜치를 `main` 으로 변경~~ — 완료 (2026-09-10)
7. **Vercel 배포 실패 원인 규명** — 로그 확보 후. 프로젝트 설정 우선 확인
8. `postcss` high 취약점 — Next 16 메이저 업그레이드 별도 작업
