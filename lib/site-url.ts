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
 *  1. `NEXT_PUBLIC_SITE_URL`          — 명시 설정(실도메인). 항상 이긴다.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel 이 프리뷰 배포에도 항상 주입하는
 *     프로덕션 도메인. 스킴이 없으므로 `https://` 를 붙인다.
 *     이것이 없으면 1번을 잊었을 때 sitemap·OG 가 조용히 플레이스홀더로 나간다.
 *  3. 플레이스홀더 — 로컬 개발용.
 *
 * ⚠️ 빈 문자열을 반드시 걸러야 한다. `??` 는 null/undefined 만 폴백하므로 빈 값이
 *    그대로 통과하면 `new URL('')` 이 TypeError 를 던져 **빌드가 깨진다**.
 *    Vercel 은 미설정 `NEXT_PUBLIC_*` 를 빈 값으로 주입한다 (ADR-012).
 */

/** 실서비스 전 교체 대상. `doc/05-content-guide.md` 체크리스트 참고. */
const PLACEHOLDER_SITE_URL = 'https://www.example.co.kr'

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
  PLACEHOLDER_SITE_URL

/** 플레이스홀더가 그대로 쓰이고 있는가. 실주소 설정 누락을 감지하는 용도. */
export const isPlaceholderSiteUrl = siteUrl === PLACEHOLDER_SITE_URL
