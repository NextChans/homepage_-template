import { SHIELD_PATH, SHIELD_VIEWBOX } from '@/content/brand'

/**
 * 브랜드 심볼(방패).
 *
 * `'use client'` 를 붙이지 않는다 — 상호작용이 없다. 서버 컴포넌트에서 쓰면 서버에서
 * 렌더되고, 클라이언트 컴포넌트(`site-header`)에서 import 하면 그 번들에 포함된다.
 * **서버 전용 API 를 넣지 말 것** — 넣는 순간 헤더가 깨진다.
 *
 * ## 색은 `currentColor` 다 — 아이덴티티 색을 쓰지 않는다
 *
 * 팔레트 (A)안: 사이트는 화이트 + `accent` 단색 체계를 유지하고, 심볼은 부모의
 * 글자색을 물려받는다(`text-ink` 안에서는 잉크색). 골드·네이비는 파비콘·앱
 * 아이콘·OG 이미지 같은 **래스터 아이덴티티 자산에만** 쓴다. 이유는
 * `content/brand.ts` 주석에 있다 — 요약하면 골드는 흰 배경 대비 2.25:1 로
 * 접근성 기준에 미달한다.
 *
 * ## `aria-hidden` 이 기본이다
 *
 * 심볼은 거의 항상 워드마크(`WITUS`)와 **짝으로** 나오므로, 스크린리더에 두 번
 * 읽히지 않게 기본적으로 숨긴다. 심볼만 단독으로 쓰는 자리가 생기면 `label` 을
 * 넘겨 접근성 이름을 준다.
 */
export function BrandMark({
  className = 'h-[18px] w-auto',
  label,
}: {
  className?: string
  label?: string
}) {
  return (
    <svg
      viewBox={SHIELD_VIEWBOX}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {/* ⚠️ fillRule="evenodd" 가 사선을 구멍으로 만든다. 빼면 사선이 사라진다. */}
      <path d={SHIELD_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  )
}
