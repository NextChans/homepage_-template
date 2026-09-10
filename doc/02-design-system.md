# 02. 디자인 시스템

## 근거

`.claude/skills/apple-design/SKILL.md` (외부 스킬, 출처는 `SOURCE.md`) 의 규범을 그대로 따른다.
핵심 원칙 — **덜어낸 것이 우아함을 만든다. 모든 픽셀은 존재 이유를 증명해야 한다.**

## 토큰 (`app/globals.css` → `@theme`)

색은 라이트/다크 두 셋만 있고, 다크는 `@media (prefers-color-scheme: dark)` 에서 같은 변수를
덮어쓴다. 컴포넌트에는 다크 모드 분기 코드가 없다.

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `canvas` | `#ffffff` | `#000000` | 페이지 배경 |
| `surface` | `#fbfbfd` | `#0a0a0a` | 섹션·카드 배경 |
| `surface-2` | `#f5f5f7` | `#1d1d1f` | 한 단계 더 들어간 면 |
| `ink` | `#1d1d1f` | `#f5f5f7` | 본문 텍스트 (**순검정/순백을 쓰지 않는다**) |
| `ink-muted` | `#86868b` | `#86868b` | 보조 텍스트 |
| `hairline` | `#d2d2d7` | `#2a2a2c` | 경계선 (사이트 전체에서 유일한 선 색) |
| `accent` | `#0066cc` | `#2997ff` | **상호작용 전용** |
| `accent-hover` | `#0077ed` | `#52aeff` | hover |

기타: `--radius-squircle(-lg)`, `--shadow-lift(-lg)`, `--ease-silk: cubic-bezier(.32,.08,.24,1)`

### 강조색 사용 규칙

`accent` 는 **링크, 버튼, 포커스 링, 에러 텍스트, eyebrow 라벨**에만 쓴다.
배경 채우기·장식·그라디언트에 쓰지 않는다. 경쟁하는 두 번째 강조색을 도입하지 않는다.

## 타이포그래피

시스템 폰트 스택만 사용한다 (웹폰트 없음).

| 클래스 | 크기 | 굵기 | 트래킹 | 용도 |
|---|---|---|---|---|
| `.type-display` | `clamp(2.75rem, 8vw, 6rem)` | 700 | `-0.035em` | **홈 히어로 전용** |
| `.type-headline` | `clamp(2rem, 5vw, 3.5rem)` | 700 | `-0.028em` | 하위 페이지 히어로, 섹션 제목 |
| `.type-title` | `clamp(1.375rem, 2.6vw, 1.875rem)` | 600 | `-0.018em` | 카드 제목 |
| `.type-lede` | `clamp(1.125rem, 1.9vw, 1.4375rem)` | 400 | `-0.01em` | 히어로 보조 문장 |
| `.type-body` | `1.0625rem` | 400 | `-0.006em` | 본문 |
| `.type-eyebrow` | `0.8125rem` | 600 | `+0.02em` | 섹션 라벨 (accent 색) |

### 한국어 대응

- `word-break: keep-all` — 단어 중간에서 줄바꿈되지 않게 한다. 한국어 가독성에 필수.
- `.type-display` 는 **홈 히어로에만** 쓴다. 한국어는 자폭이 넓어 하위 페이지 제목에
  6rem 을 적용하면 3줄로 깨진다. 그래서 `Hero` 에 `size` 프롭을 두었다.
  → 하위 페이지는 반드시 `size="headline"`.

## 모션

- 이징은 `--ease-silk` 하나. 바운스·오버슈트를 쓰지 않는다.
- 스크롤 리빌: `opacity 0→1`, `translateY 24px→0`, 900ms. 순차 지연은 60~80ms, 최대 220ms.
- hover 이동은 `-translate-y-0.5` 수준까지만. 크게 움직이면 값싸 보인다.
- `prefers-reduced-motion: reduce` 에서 모든 transition/animation 을 0.001ms 로 제거한다.

### 리빌의 함정 (실제로 겪은 문제)

`.reveal` 은 초기 `opacity: 0` 이다. JS 가 실행되지 않으면 **본문이 영구히 보이지 않는다.**
방어 장치 두 개를 반드시 유지한다.

1. `app/layout.tsx` 의 `<head><noscript><style>` — JS 없을 때 `.reveal` 을 강제 표시
2. `components/reveal.tsx` — `IntersectionObserver` 가 없으면 즉시 `data-shown="true"`

HTML 자체에는 콘텐츠가 SSR 되어 있으므로 검색엔진 크롤링에는 영향이 없다.
스크린샷 캡처 시에는 `scroll-behavior: smooth` 를 끄고 순차 스크롤해야 리빌이 발화한다
(`scripts/screenshot.mjs`).

## 공간 구성

- 컨테이너 `max-width: 1120px`, 좌우 `px-6 sm:px-8`
- 섹션 수직 여백 `py-24 sm:py-32 lg:py-40` (`Section` 컴포넌트)
- 섹션 구분은 `border-t border-hairline` **한 줄만**. 배경 교차는 `bg-surface` 하나만 사용
- 벤토 그리드: `service-grid.tsx` 는 첫 카드만 `sm:col-span-2` → 3열에서 2+1 / 1+1+1 로 떨어져
  마지막 행에 빈칸이 남지 않는다. 서비스 개수를 바꾸면 이 배치를 다시 확인해야 한다

## 금지 목록

- 임의 색상 리터럴 (`#hex`, `rgb()`) — 토큰만 사용
- 그라디언트 배경, 장식 도형, 이모지 아이콘, 스톡 일러스트
- 두 번째 강조색
- 바운스/스프링 애니메이션
- 사용자 노출 문안의 전문용어 (`RLS`, `멱등성` 등은 이익 표현으로 번역)
