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

### 머지 후 Production 검증 (2026-09-10)

PR #1 을 `main` 에 머지(`014909e`, merge commit). `main` 파일 수 0 → 59.
Production 주소는 **https://homepage-template-ivory.vercel.app** 이다.

> ⚠️ `homepage-template.vercel.app` 은 **다른 계정의 프로젝트**(제목 `DIGITLEX`)다.
> 프로젝트 이름이 전역 선점되어 있어 짧은 도메인을 받지 못했다. 상태 코드 200 만 보고
> 성공으로 판단했다가 내용 확인에서 틀린 것을 발견했다 — **응답 코드가 아니라 내용을
> 확인해야 한다.**

**검증 결과 (읽기 전용)**

| 항목 | 결과 |
|---|---|
| 제목 | `넥스트챈스 — 결제 인프라의 처음부터 끝까지` |
| 라우트 12개 (`/` · 서비스 5 · about · contact · privacy · sitemap · robots) | 전부 200 |
| 없는 경로 | 404 |
| 개발용 안내 배너 | 미노출 (ADR-010 동작 확인) |
| **비밀값 유출 스캔** | JS/CSS 13개 자산 + 페이지 HTML 800KB 전수 검사 — `sb_secret_` · `service_role` · `SUPABASE_SECRET_KEY` · `INQUIRY_IP_HASH_SALT` · JWT 서명 패턴 **모두 0건**. `supabase.co` 조차 클라이언트에 없다(서버에서만 사용) |

**발견한 문제**: `sitemap.xml` · `robots.txt` 의 절대 URL 이 플레이스홀더
`https://www.example.co.kr` 로 나갔다. ADR-012 는 빌드 깨짐만 막았고 **조용히 틀린 SEO
데이터**는 그대로였다. → ADR-013 으로 `lib/site-url.ts`(server-only) 분리 +
`VERCEL_PROJECT_PRODUCTION_URL` 자동 사용으로 해결.

**폼 제출(D-2·D-3·D-5)은 사용자가 직접 완료**했다. 프로덕션 DB 에 쓰는 동작이라 내가
임의로 실행하지 않았다.

### 컴플라이언스 리스크 정리 — 폼·방침 비활성, 수치 치환 (2026-09-10)

사용자 지시: 근거 없는 수치는 플레이스홀더로, 방침은 비공개(기록은 보존), 상담 접수는
내리고 전화·이메일로만, Slack 알림은 구성만.

**삭제가 아니라 기능 플래그**로 구성했다 (`content/features.ts`). 재활성화가 한 줄이다.

| 변경 | 내용 |
|---|---|
| `content/features.ts` | 신규. `inquiryForm` / `privacyPolicy`. 코드 상수 + `boolean` 타입 명시 |
| `content/site.ts`, `app/page.tsx`, `app/about/page.tsx` | 실적 수치·연혁을 `XXX+` `X,XXX대` `OO` `OOOO` 로 치환 |
| `app/contact/page.tsx` | 폼 대신 전화·이메일 안내 + "이렇게 알려주시면 빠릅니다" 3항목 |
| `app/actions/inquiry.ts` | **첫 줄에서 플래그 검사해 차단** (UI 우회 POST 방어) + 접수 알림 호출 |
| `app/privacy/page.tsx` | 플래그 꺼지면 `notFound()`. 내용은 보존 |
| `components/site-footer.tsx`, `app/sitemap.ts`, `app/robots.ts` | 비공개 페이지를 링크·색인에서 제외 |
| `lib/notify/slack.ts` | 신규. 웹훅 미설정 시 무동작, 실패해도 throw 안 함, **개인정보 미포함** |

**시행착오 2건**
1. `prettier --write` 를 무심코 돌려 파일이 저장소 스타일(단일 인용부호·세미콜론 없음)과
   다르게 재포맷됐다. 저장소에 prettier 설정이 없어 기본값이 적용된 것. `git checkout` 으로
   복원하고 수동 편집했다. → **설정 없는 포매터를 돌리지 않는다.**
2. 폼 JS(31.8kB)를 번들에서 떼려고 서버 컴포넌트에서 `await import()` 로 바꿨으나
   **효과가 없었다**(Next 의 클라이언트 참조 그래프에 남는다). 실측으로 확인하고
   되돌렸다. 목적을 달성하지 못한 변경을 남기지 않는다. 알려진 비용으로 문서화(ADR-014).

**검증**: typecheck·lint·build 통과. 실제 서버 기동 후 `/contact` input/textarea 0개,
'전화 걸기' 노출, `/privacy` 404, sitemap 에서 `/privacy` 제외, robots disallow 제거,
빌드 산출물에 Server Action 차단 코드 포함 확인.

### 관리자 조회 화면 (`/admin`) 신설 (2026-09-10)

사용자 요청: 상담 요청이 들어오면 DB 내용을 조회할 수 있는 관리자 페이지, ID/PW 로그인.

`doc/06-security-compliance.md` 에 "관리자 조회 경로 없음 — 만들 경우 인증 + 접근 감사
로그를 함께 설계한다" 로 남겨둔 항목을 해소했다. 상세는 ADR-015 / `doc/10-admin.md`.

| 파일 | 내용 |
|---|---|
| `supabase/migrations/20260910000002_admin_audit_log.sql` | 신규. 감사 로그 + 로그인 실패 카운트 겸용. RLS on·정책 0개. `target_id` 에 FK 없음(문의 삭제 후에도 이력 보존) |
| `lib/admin/auth.ts` | scrypt 검증 + HMAC 서명 세션 쿠키(8시간). 타이밍 세이프 비교 |
| `lib/admin/audit.ts` | 감사 기록 + 브루트포스 잠금(15분/5회, **fail-closed**) |
| `lib/admin/inquiries.ts` | 읽기 전용 조회. 목록에서 이메일·연락처 마스킹 |
| `lib/admin/guard.ts` | `requireAdminSession()` — **페이지마다** 호출 |
| `lib/admin/login-state.ts` | `LoginState` 타입 분리 |
| `app/admin/**` | 로그인 / 목록 / 상세. 전부 `force-dynamic` |
| `components/admin/login-form.tsx` | `useActionState` |
| `scripts/hash-admin-password.mjs` | 해시 생성기. 12자 미만 거부 |
| `app/robots.ts` | `/admin` disallow 추가 |

**핵심 판단 3가지** (근거는 ADR-015)
1. **Supabase Auth 를 쓰지 않았다.** 도입하면 `authenticated` 롤에 RLS 정책을 열어야 하고,
   "브라우저에서 도달 가능한 읽기 경로가 없다" 는 이 프로젝트의 불변식이 깨진다.
2. **기능 플래그를 두지 않았다.** 자격증명 3개가 모두 있어야 활성화되고 하나라도 없으면
   3개 라우트 전부 404. 플래그를 켜고 자격증명을 잊는 조합이 구조적으로 불가능하다.
3. **가드를 레이아웃이 아니라 페이지마다 호출한다.** App Router 레이아웃은 클라이언트
   내비게이션에서 재실행이 보장되지 않는다.

**시행착오 2건**
1. `'use server'` 파일에서 `initialLoginState` **객체를 export** 해 빌드가 깨졌다
   (`A "use server" file can only export async functions`). `lib/admin/login-state.ts`
   로 분리했다.
2. `/admin/login` 이 **Static 으로 프리렌더**됐다. 빌드 시점에는 `ADMIN_*` 환경변수가
   없으므로 그때의 `notFound()` 가 산출물에 굳어 **영구 404** 가 될 수 있었다.
   `force-dynamic` 을 로그인 페이지와 admin 레이아웃에 추가했다.

**검증**: 자격증명 미설정 시 3개 라우트 404 확인. 실제 브라우저(Playwright)로 흐름
16개 항목 통과 — 미인증 리다이렉트 / 비밀번호 오류 / 아이디 오류 시 **같은 메시지** /
정상 로그인 / 쿠키 속성 4가지(HttpOnly·SameSite=Strict·path=/admin·만료 8시간) /
**위조 쿠키 거부** / 로그아웃 시 쿠키 제거. 12자 미만 비밀번호는 스크립트가 거부.
Supabase 미설정 상태에서 감사 로그 실패가 **서버 로그로 드러남**도 확인(조용히 넘기지 않음).

**활성화에 필요한 것 (사용자 작업)**
1. 마이그레이션 `20260910000002_admin_audit_log.sql` 실행
2. `node scripts/hash-admin-password.mjs '비밀번호'` → Vercel 에 `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` 등록 (**타입 Secret**)
3. `INQUIRY_IP_HASH_SALT` 설정 확인 — 없으면 로그인 잠금이 동작하지 않는다

### 키오스크 서비스 추가 — 일반형·베리어프리 (2026-09-10)

사용자 요청: "키오스크도 판매하니까 추가", "일반형, 베리어프리도 있다는 걸 같이 기재".
서비스 5종 → **6종**. 배치는 하드웨어끼리 묶어 2번(밴 단말기 다음). 상세는 ADR-016.

| 변경 | 내용 |
|---|---|
| `content/services.ts` | `kiosk` 추가(`mark: '02'`). 뒤쪽 4종 `mark` 를 `03`…`06` 으로 재번호. 밴 단말기 `intro` 에서 "무인 키오스크" 제거(중복 인상 제거). `serviceCountKo` 신설 |
| `supabase/migrations/20260910000003_inquiries_add_kiosk_slug.sql` | `inquiries_service_slug_check` 에 `kiosk` 추가 |
| `components/service-grid.tsx` | `cardSpan()` — 마지막 행 빈칸 자동 보정 |
| `app/services/page.tsx`, `app/page.tsx`, `content/site.ts` | 개수 문안을 `serviceCountKo` 로, 나열 문안·메타 설명에 키오스크 반영 |
| `scripts/screenshot.mjs` | `/services/kiosk` 캡처 대상 추가 |

**개수 하드코딩 2건이 조용히 틀어져 있었다** (5종 전제)
1. `"다섯 개의 일."` — `service-grid.tsx`, `app/services/page.tsx` 두 곳.
   → `serviceCountKo` 파생값으로 통일.
2. 벤토 그리드 — 첫 카드가 2칸을 먹으므로 3열 마지막 행이 **카드 1개 + 빈칸 2개**.
   → `cardSpan()` 이 `열 수 - (total % 열 수)` 로 남는 칸을 계산해 마지막 카드를 늘린다.
   span 클래스는 Tailwind 스캔 때문에 **정적 문자열 맵**으로 둔다.

**문안 판단**: 무인정보단말기 접근성 요건은 적용 대상·시점이 시설 유형·규모에 따라
단계적이므로 **시행일·규모 기준을 카피에 단정하지 않았다.** "설치 의무가 있습니다" 같은
단정도 쓰지 않고, 산출물에 `베리어프리 사양 검토` 항목으로 **무엇을 해주는지**를 적었다.

**검증**: typecheck·lint·build 통과, `/services/kiosk` SSG 생성. 라이트·다크·모바일
스크린샷으로 그리드 빈칸 없음, `"여섯 개의 일."` 반영, 히어로 1줄 유지, 모바일 가로
스크롤 없음 확인.

### 관리자 로그인 실패 원인 규명 및 진단 가능성 확보 (2026-09-10)

환경변수를 등록했는데 로그인이 안 됐다. 화면에는 `아이디 또는 비밀번호가 올바르지
않습니다` 만 나오도록 만들어 놨으니(의도된 동작) **원인을 좁힐 수단이 없었다.**
감사 로그의 `actor` 는 사용자가 입력한 값이라 `ADMIN_USERNAME` 설정값과 대조가 안 된다.

`--verify` 로 비밀번호가 해시와 맞는 것을 확인해 **아이디 쪽 문제**로 좁혔다.
상세는 ADR-017.

| 변경 | 내용 |
|---|---|
| `lib/admin/auth.ts` | `adminEnv()` 로만 환경변수를 읽고 **`trim()`**. 실패 시 `{usernameMatched, passwordMatched, storedHashShape}` 를 서버 로그에 남김(비밀값 미출력) |
| `lib/admin/auth.ts` | `startSession()` 이 **제출값이 아니라 설정값**을 토큰에 담는다 — 한쪽만 trim 하면 발급 직후 세션 무효 → **리다이렉트 무한 루프** |
| `lib/admin/audit.ts` | `isLoginLocked(): boolean` → `loginGate(): 'ok'\|'locked'\|'unavailable'` |
| `app/admin/actions.ts` | `unavailable` 은 "감사 로그를 확인할 수 없어 차단" 으로 안내 |
| `scripts/hash-admin-password.mjs` | 인자 금지(ps·히스토리), 숨김 입력 **두 번**, 자기검증, `--verify` 모드 |
| `doc/10-admin.md` | "로그인이 안 될 때 (원인 진단)" 절 — 로그 패턴 5가지와 조치 |

**시행착오 2건**
1. 검증 스크립트에서 `readline` 을 호출마다 새로 만들어 **두 번째 입력이 항상 빈 문자열**
   이 됐다(첫 인터페이스가 스트림을 소비·종료). 테스트가 `0자` 로 잡아냈다.
   stdin 을 한 번만 통째로 읽어 줄 단위로 나눠 쓰는 방식으로 교체.
2. Playwright 테스트가 클릭 후 **303 리다이렉트를 기다리지 않아** 정상 동작을 실패로
   보고했다. `waitForLoadState('networkidle')` 만으로는 부족했다.
   → **코드가 아니라 테스트가 틀린 경우를 먼저 의심해야 했다.**

**검증**: 공백·줄바꿈 섞은 환경변수로 브라우저 10개 항목 통과(로그인 성공, 루프 없음,
세션 유지, 아이디 공백 허용, 비밀번호는 trim 안 함, 동일 에러 메시지, 위조 쿠키 거부).
`unavailable` 경로 화면 메시지 확인. 생성기 6개 경로 확인.

### 관리자 로그인 — 비밀번호 앞뒤 공백 차단 (2026-09-10)

trim 수정 배포 후 로그: `usernameMatched: true, passwordMatched: false,
storedHashShape: 'ok'`. 아이디는 해결, 비밀번호만 남았고 해시 형태는 정상.

원인 유형은 **해시 생성 시 비밀번호에 딸려온 앞뒤 공백**이다. 붙여넣기로 만든
해시는 로컬 검증(같은 값 붙여넣기)은 통과하지만 브라우저 타이핑으로는 영구 실패한다.
서버가 폼 입력을 trim 하지 않기 때문이며, 그 원칙은 유지한다(공백도 비밀번호의 일부).

| 변경 | 내용 |
|---|---|
| `scripts/hash-admin-password.mjs` | 생성 시 앞뒤 공백 **거부**(경고 아님). `--verify` 가 공백 원인을 직접 지목 — 일치해도 공백이 있으면 경고, 불일치 시 trim 값으로 재시도해 "공백을 제거하면 맞습니다" 안내 |
| `doc/10-admin.md` | 진단 표에 `storedHashShape: 'ok'` + `passwordMatched: false` 조합의 해석 추가, `--verify` 출력 3가지 해석표 |

**검증**: 네 조합 모두 실제 확인 — 공백해시+공백입력 / 공백해시+깨끗입력 /
정상해시+공백입력 / 양쪽 정상. 생성 거부 경로(앞 공백·뒤 공백) 확인.
기존 경로(두 입력 불일치·12자 미만·인자 거부) 회귀 없음.

### 관리자 페이지 가동 확인 — 원인 확정 (2026-09-10)

**로그인 성공. 관리자 페이지 운영 시작.**

확정된 원인은 **해시 생성 시 비밀번호에 딸려온 앞뒤 공백**이었다. 공백 없이
재생성해 `ADMIN_PASSWORD_HASH` 만 교체하고 Redeploy 하니 통과했다.

**진단이 3단계로 좁혀진 경위** (이 순서 자체가 자산이다)

| 단계 | 관측 | 원인 | 조치 |
|---|---|---|---|
| 1 | 로그 없음 | **진단 수단 자체가 없었다** | 서버 로그에 실패 원인 기록 (PR #6) |
| 2 | `usernameMatched: false` | 아이디 값에 공백 | 환경변수 `trim()` (PR #6) |
| 3 | `passwordMatched: false` + `storedHashShape: 'ok'` | 해시가 공백 포함 비밀번호로 생성됨 | 생성 단계에서 공백 거부 (PR #7) + 해시 재생성 |

**되돌아볼 점** — 저장소 스크립트를 쓸 수 없는 상황(로컬 클론 없음)에서 급하게
만들어 드린 인라인 해시 생성 명령에 **확인 입력과 공백 검사가 없었다.** 원본
스크립트의 안전장치를 빠뜨린 대체 수단이 사고의 출발점이었다.
→ **임시 대체 명령을 만들 때도 원본의 검증 단계를 빼지 않는다.**

또 1단계에서 알 수 있듯, **관측 수단이 없는 상태로 배포한 것**이 가장 큰 비용이었다.
"실패 이유를 사용자에게 숨긴다" 와 "운영자도 이유를 모른다" 는 별개다.
→ **의도적으로 정보를 숨기는 화면을 만들 때는 서버 쪽 관측 경로를 같은 커밋에 넣는다.**

**남은 점검**: `doc/10-admin.md` 6절 "가동 직후 점검" — 감사 로그 적재 확인과
`ip_hash` 존재 확인(없으면 브루트포스 잠금 미적용).

### 관리자 쓰기 기능 — 직접 등록 · 상태 변경 · 처리 이력 (2026-09-10)

가동 직후 들어온 요청 3건. **읽기 전용(ADR-015) 전제가 철회됐다.** 상세는 ADR-018.

| 요청 | 처리 |
|---|---|
| 상세 문의 본문이 한 줄로 화면을 넘어감 | `Row` 의 `<dd>` 에 `min-w-0 break-words`. 원인은 `whitespace-pre-wrap` 부재가 아니라 **flex 아이템의 `min-width: auto`** 였다 |
| 전화·이메일 문의 직접 등록 | `/admin/new` + `intake_channel`·`created_by` 컬럼. 이메일·연락처 중 하나만 있어도 등록 가능 |
| 상태 변경 | 상세 화면 `StatusForm`. `contacted`/`closed`/`spam` 으로 가면 `handled_by`·`handled_at` 기록, 되돌리면 비움 |
| 처리 담당·일시를 **이력**으로 | `inquiry_status_history` 신설 (append-only, `on delete cascade`) |

| 신규 파일 | 내용 |
|---|---|
| `supabase/migrations/20260910000004_admin_write.sql` | 유입 경로·등록자 컬럼, 연락처 nullable + 최소 하나 제약, 이력 테이블, 감사 액션 2개 추가 |
| `lib/admin/status.ts` | 상태·유입경로 상수와 한글 라벨. **서버·클라이언트 공용** |
| `lib/admin/inquiry-write.ts` | 쓰기 전용 모듈 (조회와 분리) |
| `lib/admin/manual-inquiry-schema.ts` | 직접 등록 검증 (공개 폼 스키마와 분리) |
| `app/admin/new/page.tsx`, `components/admin/manual-inquiry-form.tsx`, `components/admin/status-form.tsx` | UI |

**중복 제거**: `statusLabel` 이 목록·상세 두 페이지에 각각 하드코딩되어 있었고 표기가
갈리고 있었다(`종료` vs `종결`). `lib/admin/status.ts` 로 통일했다.

**시행착오 — 같은 함정을 3번 반복** 관리자 레이아웃 헤더에 로그아웃 폼이 있어 폼이 2개다.
테스트에서 `button[type="submit"]`.first() 를 눌러 **로그아웃을 누르고 있었다.**
그 결과 "Server Action 이 실행되지 않는다" 로 보여 가드·쿠키·`secure` 속성·라우트
충돌까지 의심하며 오래 헤맸다. 클릭 후 303 미대기, `type="email"` 을 `setAttribute` 로
벗기려 한 것(React 가 복원)도 같은 부류다. 가짜 Supabase 도메인이 프록시를 타 수 초씩
지연된 것도 타이밍을 망쳤다(→ `http://127.0.0.1:9` 로 즉시 거부시키는 게 맞다).
**네 함정 모두 `homepage-verify` 스킬에 기록.**
→ **실패가 코드 문제로 보일 때 테스트 하네스를 먼저 의심한다.**

**검증**: typecheck·lint·build 통과, 관리자 5개 라우트 모두 Dynamic. 브라우저 14개 항목
통과(Server Action 직접 검증 포함). 서버 로그에 입력값 미노출 확인.
**DB 연결 상태의 등록·상태변경·이력 적재는 미검증** — 마이그레이션 적용 후 스모크 필요.

**필수 후속**: 이 기능을 쓰기 시작하면 개인정보가 다시 쌓인다. **3년 보관기간 삭제 잡과
처리방침 확정을 더 미룰 수 없다.**

### 계정·권한 시스템 (2026-09-10)

사용자 요청: 관리자/상담자 권한 분리 + 아이디 등록·삭제·비밀번호 초기화·권한 변경
+ "있으면 좋을만한 것". 쓰기 기능이 붙은 뒤 **개인 책임 추적이 불가능**한 상태를 해소.
상세는 ADR-019, 운영 절차는 `doc/10-admin.md` 9절.

| 신규 파일 | 내용 |
|---|---|
| `supabase/migrations/20260910000005_admin_users.sql` | 계정 테이블, 감사 액션 11개 추가, `admin_audit_log.note` |
| `lib/admin/roles.ts` | 역할·권한(`Permission` 5개)·`can()`. **서버·클라이언트 공용** |
| `lib/admin/users.ts` | 계정 CRUD + 계정 인증 + 잠금 |
| `lib/admin/session.ts` | 토큰 + DB 를 합쳐 현재 세션 판정 |
| `lib/admin/user-schema.ts` | 비밀번호·아이디 규칙 (한 곳에 모음) |
| `lib/admin/audit-read.ts`, `lib/admin/format.ts` | 감사 로그 조회, 공통 날짜 표기 |
| `app/admin/users/**`, `app/admin/audit`, `app/admin/password` | 화면 5개 |
| `components/admin/user-forms.tsx` | 계정 관리 폼 7개 |

**인증을 3층으로 나눴다**: `auth.ts`(암호·토큰·쿠키, DB 모름) / `users.ts`(계정·인증) /
`session.ts`(합쳐서 판정). 토큰 로직에 DB 가 섞이면 순환 import 가 생긴다.

**핵심 판단**
1. **ENV 자격증명을 없애지 않았다** — 비상 복구(break-glass) 경로. DB 계정이 전부
   잠기거나 Supabase 가 죽으면 아무도 못 들어간다. 헤더 배지 + 감사 로그로 드러낸다.
2. **역할 이름이 아니라 권한으로 분기** — `can(role, permission)`. 역할이 늘 때
   `role === 'admin'` 을 전수 조사하지 않아도 된다.
3. **`session_epoch` 로 원격 세션 만료** — ADR-015 의 약점 해소. 카운터가 아니라
   **갱신 시각**을 넣는다(읽고-쓰기 경쟁으로 증가가 유실되면 세션이 살아남는다).
4. **삭제보다 비활성화** + 본인·마지막 관리자 보호(되돌릴 수 없는 실수를 구조적으로 차단).
5. **초기 비밀번호로는 업무 불가** (`must_change_password`). 비밀번호 변경 화면은
   별도 가드를 쓴다 — 일반 가드면 **자신으로 리다이렉트되는 무한 루프**가 된다.

**요청에 없었지만 넣은 것**: 본인 비밀번호 변경, 세션 강제 만료, 계정 잠금/해제,
감사 로그 조회 화면(액션 필터), 마지막 관리자·본인 보호, 비상 복구 계정 유지.

**검증**: typecheck·lint·build 통과, 관리자 **9개 라우트 모두 Dynamic**.
브라우저 23개 항목 통과(신규 라우트 미인증 차단, **DB 미연결 상태 비상 로그인**,
배지·내비게이션, 관리자 전용 화면, 비상 계정 비밀번호 변경 차단, UUID 아닌 id → 404,
로그아웃). 권한 매트릭스·비밀번호·아이디 규칙은 로직 단독 실행 19개 항목.
**DB 연결 상태의 계정 흐름(생성·권한 변경·초기화·잠금·세션 만료·상담자 제한)은 미검증**
— 마이그레이션 적용 후 스모크 필요.

### 첫 로그인 안내 + 회사 정보 확정 (2026-09-10)

**1) 첫 로그인 안내** (ADR-020) — `must_change_password` 강제는 있었지만 화면 안내가
한 줄뿐이었다. 이유 설명·변경 후 권한·초기 비밀번호 삭제 안내를 **변경 폼과 같은 화면**에
넣고, 강제 변경 중에는 **내비게이션을 숨겼다**(눌러도 되돌려보내져 고장으로 오해된다).
계정을 만든 관리자에게도 `?created=1` 로 **"담당자에게 전달할 내용"** 을 띄운다.

- 검증 중 **브랜드 링크(`/admin`)가 강제 변경 중에도 클릭 가능**한 것을 발견해 수정.
  → 텍스트만 확인하는 테스트로는 못 잡는다. **링크 `href` 를 세어 확인**해야 했다.
- 임시로 세션을 `mustChangePassword: true` 로 패치해 DB 계정 첫 로그인 화면을 렌더하고
  라이트·다크·모바일을 확인한 뒤 **원복**했다(`git diff --exit-code` 로 확인).

**2) 회사 정보 확정** — 사용자 확정: 상호 `Work In Trust`, 약어 표기 `W.I.T`
(이니셜 사이에 마침표), 대표자 `최봉균`.

| 필드 | 값 |
|---|---|
| `site.name` | `W.I.T` (화면 전반·`<title>` 템플릿) |
| `site.nameEn` | `WORK IN TRUST` |
| `company.ceo` | `최봉균` |
| `site.legalName` | `Work In Trust` — **임의로 '주식회사' 를 붙이지 않았다** |

`legalName` 은 푸터·개인정보처리방침에 표시되는 **사업자 표시 정보**다. 법인 형태를
포함한 정식 법인명은 사업자등록증을 확인해야 하므로 추측하지 않고 TODO 로 남겼다.
`homepage-section` 스킬의 `<title>` 템플릿 예시도 함께 갱신.

**검증**: typecheck·lint·build 통과. 브라우저 13개 항목 — 헤더 `W.I.T`, `WORK IN TRUST`,
푸터 대표 `최봉균`, `<title>` 반영, **이전 임시값(넥스트챈스·홍길동) 잔여 없음**
(홈·서비스·회사소개·문의·키오스크 5개 경로).

### 배포 사고 — 작업 브랜치 force-push 가 Production 배포를 삼켰다 (2026-09-10)

PR #10 을 머지하고 CI 도 통과했는데 **프로덕션에 반영되지 않았다.** 회사 정보가
그대로 `넥스트챈스`/`홍길동` 이었다.

**원인**: 머지 직후 관례대로 작업 브랜치를 `origin/main` 기준으로 재생성하고
**force-push** 했다. 그러면 같은 커밋(`a30ba1b`)이 Vercel 에 두 번 도착한다 —
`main` push(Production 대상)와 작업 브랜치 push(Preview 대상). **Vercel 은 같은
커밋을 두 번 빌드하지 않으므로** Preview 가 먼저 자리를 잡으면 Production 배포가
아예 생성되지 않는다. Vercel Deployments 에 세 건 모두 `Preview` /
브랜치 `claude/apple-style-homepage-iv3pxl` 로 잡혀 있었다.

PR #8·#9 는 타이밍이 달라 통과했다 — **조용히 실패할 수 있는 절차**였다.

**조치**
- `CLAUDE.md` 작업 마무리 규칙: 머지 후 브랜치 재생성은 **로컬에서만**,
  push 는 **새 커밋이 생겼을 때만**.
- 같은 규칙에 **"머지 후 프로덕션 화면에서 반영을 확인한다"** 를 추가했다.
  CI 통과와 배포는 별개다 — 이 세션에서 두 번째로 같은 교훈을 얻었다
  (첫 번째는 상태코드 200 만 보고 다른 계정의 프로젝트를 우리 것으로 오인한 건).

**즉시 복구**: Vercel 에서 해당 배포를 Promote to Production, 또는 새 커밋을 올려
main 에만 있는 SHA 로 배포를 다시 돌린다(이 커밋이 그 역할을 겸한다).

### 사명 변경 — WITUS (위투스) (2026-09-10)

사용자 확정: **`WITUS` / 한글 `위투스`**. `Work In Trust` + `us` 에서 온 이름으로,
"우리" 가 들어가 팀의 뉘앙스를 담는다. 몇 시간 전 확정했던 `W.I.T` / `WORK IN TRUST`
를 대체한다.

| 필드 | 이전 | 현재 |
|---|---|---|
| `site.name` | `W.I.T` | `WITUS` |
| `site.nameEn` → `site.nameKo` | `WORK IN TRUST` | `위투스` |
| `site.legalName` | `Work In Trust` | `WITUS` (여전히 TODO — 법인 형태 미확정) |

**필드 이름을 `nameEn` → `nameKo` 로 바꿨다.** 헤더는 브랜드 옆에 보조 표기를
노출하는 구조인데, 이제 그 자리에 들어가는 값이 한글(`위투스`)이다. `nameEn` 에
한글을 넣으면 다음 사람이 반드시 오해한다.

`homepage-section` 스킬의 `<title>` 템플릿 예시와 `doc/05-content-guide.md`
체크리스트도 함께 맞췄다. **콘텐츠·스킬에는 옛 표기가 남지 않게** 확인했고,
워크로그·ADR 의 옛 표기는 **당시 기록이므로 보존**했다.

**검증**: typecheck·lint·build 통과. 브라우저 10개 항목 — 헤더 `WITUS`+`위투스`,
`<title>` 반영, 푸터 `WITUS · 대표 최봉균`, 회사소개 `상호 WITUS`,
**옛 표기(`W.I.T`·`WORK IN TRUST`) 잔여 없음**, 모바일 가로 스크롤 없음.

> 테스트에서 `상호 WITUS` 정규식이 실패했는데 코드가 아니라 **단정이 틀린 것**이었다 —
> 표 셀 사이에 공백이 없어 `상호WITUS` 로 붙어 렌더된다. 이 세션에서 테스트 하네스가
> 원인인 경우가 반복되고 있다.

### 다음에 할 일

1. `doc/05-content-guide.md` 의 **필수 교체** 항목 (실제 회사 정보)
1-1. 키오스크 실제 취급 기종·리드타임·베리어프리 사양으로 임시값 교체 (ADR-016)
1-2. **MFA** — 계정 분리는 됐으나 인증 강도는 ID/PW 그대로 (ADR-019)
2. `doc/06-security-compliance.md` 의 **높음** 리스크 4건
3. 접수 알림(Slack/이메일) 구현
4. 보관기간 경과 데이터 삭제 잡(`pg_cron`)
5. 파비콘 / OG 이미지
6. ~~저장소 기본 브랜치를 `main` 으로 변경~~ — 완료 (2026-09-10)
7. **Vercel 배포 실패 원인 규명** — 로그 확보 후. 프로젝트 설정 우선 확인
8. `postcss` high 취약점 — Next 16 메이저 업그레이드 별도 작업
9. `admin_audit_log` 보관기간 정책 + `pg_cron` 정리 잡
10. 운영자 2명 이상이 되면 관리자 인증을 Supabase Auth + MFA 로 이전 (ADR-015)
