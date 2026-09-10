---
name: homepage-section
description: 이 홈페이지 템플릿에 새 페이지나 새 섹션을 Apple 디자인 규범에 맞게 추가한다. 사용자가 "채용 페이지 추가", "고객사례 섹션 넣어줘", "새 랜딩 페이지 만들어줘", "이 섹션 레이아웃 바꿔줘" 등을 말할 때 사용한다. 기존 컴포넌트와 토큰을 재사용하도록 강제해 디자인 일관성이 깨지는 것을 막는다.
---

# 새 페이지·섹션 추가 절차

새 컴포넌트를 만들기 전에 **기존 것을 먼저 쓴다.** 아래 목록에 있는 것을 새로 만들면 리뷰에서 반려한다.

## 1. 재사용 가능한 컴포넌트

| 용도 | 컴포넌트 |
|---|---|
| 페이지 폭 컨테이너 (max 1120px) | `Container` (`components/ui.tsx`) |
| 섹션 수직 여백 | `Section` |
| 버튼 (내부 링크 / 외부 스킴) | `ButtonLink` / `ButtonAnchor` |
| 텍스트 링크 + 셰브런 | `ArrowLink` |
| 페이지 히어로 | `Hero` — 홈은 `size="display"`, **하위 페이지는 반드시 `size="headline"`** |
| 스크롤 등장 | `Reveal` — `delay` 는 60~80ms 간격, 최대 220ms |
| 좌우 교차 소개 블록 | `FeatureSplit` + `PanelStats` |
| 4단계 프로세스 | `ProcessSteps` |
| 아코디언 FAQ | `Faq` (`<details>` 기반, JS 불필요) |
| 지표 밴드 | `MetricsBand` |
| 하단 전환 밴드 | `CtaBand` |

## 2. 디자인 토큰만 사용한다

`app/globals.css` 의 `@theme` 에 정의된 값만 쓴다. **임의 색상 리터럴(`#hex`, `rgb()`) 금지.**

- 색: `canvas` / `surface` / `surface-2` / `ink` / `ink-muted` / `hairline` / `accent` / `accent-hover`
- 타이포: `.type-display` `.type-headline` `.type-title` `.type-lede` `.type-body` `.type-eyebrow`
- 라운드: `rounded-squircle` / `rounded-squircle-lg`
- 그림자: `shadow-lift` / `shadow-lift-lg`
- 이징: `ease-[var(--ease-silk)]`

`accent` 는 **상호작용 요소(링크·버튼·포커스링·에러 텍스트)에만** 쓴다. 장식용 강조색으로 쓰지 않는다.

## 3. 섹션 구조 템플릿

```tsx
<Section className="border-t border-hairline">
  <Container>
    <div className="max-w-2xl">
      <Reveal as="p" className="type-eyebrow">섹션 라벨</Reveal>
      <Reveal as="h2" className="type-headline mt-4" delay={60}>
        짧은 주장.
      </Reveal>
      <Reveal as="p" className="type-body mt-6" delay={120}>보조 설명 한두 문장.</Reveal>
    </div>
    <div className="mt-14">{/* 본문 */}</div>
  </Container>
</Section>
```

섹션 경계는 **`border-t border-hairline` 한 줄로만** 구분한다. 배경을 번갈아 칠할 때는
`bg-surface` 하나만 쓴다. 그라디언트·장식 도형·이모지 아이콘을 넣지 않는다.

## 4. 새 페이지를 만들 때

1. `app/<route>/page.tsx` 생성. 기본은 **Server Component** (`'use client'` 금지).
   상호작용이 필요한 부분만 `components/` 에 별도 클라이언트 컴포넌트로 분리한다.
2. `export const metadata: Metadata` 에 `title`, `description` 을 넣는다.
   `title` 은 layout 의 template(`%s — W.I.T`)이 자동 적용된다.
3. 문안은 `content/` 로 빼거나 페이지 상단 상수로 선언한다 (`homepage-content` 스킬 참고).
4. `app/sitemap.ts` 의 `staticRoutes` 에 경로를 추가한다. **누락 시 SEO 에서 사라진다.**
5. 상단 메뉴에 노출할 경우 `content/site.ts` 의 `nav` 에 추가한다.
6. 비공개/법적 고지 페이지는 `metadata.robots = { index: false }` 를 검토한다.

## 5. 접근성·반응형 체크리스트

- [ ] 모든 인터랙티브 요소가 키보드 포커스를 받고 포커스 링이 보인다
- [ ] `Reveal` 로 감싼 콘텐츠가 JS 없이도 보인다 (`app/layout.tsx` 의 `<noscript>` 규칙 유지)
- [ ] 390px 폭에서 가로 스크롤이 생기지 않는다
- [ ] 다크 모드에서 대비가 충분하다 (`prefers-color-scheme: dark`)
- [ ] `prefers-reduced-motion` 에서 애니메이션이 제거된다 (globals.css 처리)
- [ ] 아이콘성 요소에 `aria-hidden`, 스크린리더 전용 문구에 `sr-only`

## 6. 마무리

`npm run typecheck && npm run lint && npm run build` → `homepage-verify` 스킬로 스크린샷 확인.
구조적 결정은 `doc/04-decisions.md`, 디자인 규칙 변경은 `doc/02-design-system.md` 에 반영한다.
