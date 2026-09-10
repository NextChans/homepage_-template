import 'server-only'

/**
 * 사이트의 절대 URL. `metadataBase` · `sitemap.xml` · `robots.txt` 에만 쓰인다.
 *
 * ⚠️ 왜 `content/site.ts` 가 아니라 여기인가 —
 *    `content/site.ts` 는 클라이언트 컴포넌트(`components/site-header.tsx`)도 import 한다.
 *    `NEXT_PUBLIC_` 접두어가 없는 환경변수는 클라이언트 번들에서 사라지므로, 그곳에
 *    URL 해석을 두면 **같은 `site.url` 이 서버에선 실주소, 클라이언트에선 플레이스홀더**가
 *    된다. 지금은 클라이언트에서 이 값을 렌더링하지 않지만, 누군가 쓰는 순간 조용한
 *    hydration 불일치가 된다. `'server-only'` 로 그 경계를 빌드 타임에 강제한다.
 *
 * 우선순위:
 *  1. `NEXT_PUBLIC_SITE_URL`          — 명시 설정. 항상 이긴다. 정규 도메인을
 *     강제해야 할 때만 쓴다(예: apex 가 아닌 `www` 를 정규로 삼는 경우).
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel 이 프리뷰 배포에도 항상 주입하는
 *     **프로젝트의 프로덕션 도메인.** 스킴이 없으므로 `https://` 를 붙인다.
 *     ⚠️ **이것이 도메인 전환을 자동으로 처리한다.** Vercel 에 `witus.kr` 을
 *        프로덕션 도메인으로 붙이면 이 값이 `witus.kr` 로 바뀌고 sitemap·OG·
 *        canonical 이 따라온다. 환경변수를 따로 설정할 필요가 없다.
 *        도메인을 붙이기 전에는 `*.vercel.app` 이 들어오는데, 그 시점에는 그게
 *        **사실이므로** 오히려 맞다 — 아직 뜨지 않는 도메인을 canonical 로
 *        내보내는 것보다 안전하다.
 *  3. `DEFAULT_SITE_URL` — 로컬 개발 등 위 둘이 없을 때.
 *
 * ⚠️ 빈 문자열을 반드시 걸러야 한다. `??` 는 null/undefined 만 폴백하므로 빈 값이
 *    그대로 통과하면 `new URL('')` 이 TypeError 를 던져 **빌드가 깨진다**.
 *    Vercel 은 미설정 `NEXT_PUBLIC_*` 를 빈 값으로 주입한다 (ADR-012).
 */

/**
 * 정규(canonical) 도메인. **apex 를 정규로 삼는다** — `www` 는 여기로 301 한다
 * (Vercel 대시보드 설정, ADR-025).
 *
 * 코드에 박아 두는 이유: 도메인은 환경별 비밀값이 아니라 **프로젝트의 사실**이다.
 * 대시보드에만 있으면 로컬·프리뷰에서 sitemap·OG 가 다른 주소를 내보내고, 설정
 * 누락을 아무도 못 본다. 코드에 두면 PR 로 검토되고 모든 환경에서 같다.
 */
const DEFAULT_SITE_URL = 'https://witus.kr'

/**
 * 절대 URL 로 정규화한다. 유효하지 않으면 `null` — **절대 throw 하지 않는다.**
 * 스킴이 없으면 `https://` 를 붙인다(Vercel 시스템 변수가 스킴 없이 온다).
 * 끝 슬래시는 제거한다. `${siteUrl}${path}` 로 이어붙일 때 `//` 를 막는다.
 */
function normalize(raw: string | undefined): string | null {
  const candidate = raw?.trim()
  if (!candidate) return null

  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`

  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    return null
  }
}

export const siteUrl: string =
  normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  DEFAULT_SITE_URL

// `isPlaceholderSiteUrl` 은 제거했다. 기본값이 실도메인이 된 뒤로는 **항상 false** 인
// 상수여서, 이름만 보고 "플레이스홀더 감지가 동작한다" 고 오해하게 만든다.
// 아무 곳에서도 쓰이지 않고 있었다.
