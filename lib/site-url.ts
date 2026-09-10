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
 *  1. `NEXT_PUBLIC_SITE_URL` — 명시 설정. 항상 이긴다. 정규 도메인을 일시적으로
 *     바꿔야 할 때만 쓴다(예: 도메인 이전 중).
 *  2. `DEFAULT_SITE_URL`     — 정규 도메인. 평소 쓰이는 값이다.
 *
 * ## ⚠️ `VERCEL_PROJECT_PRODUCTION_URL` 을 **쓰지 않는다** — 실측으로 확인했다
 *
 * 원래는 2순위로 두고 "커스텀 도메인을 붙이면 이 값이 따라오므로 환경변수가
 * 불필요하다" 고 설계했다. **그 가정은 틀렸다.**
 *
 * `witus.kr` 을 Production 에 연결하고 인증서까지 발급되어 `https://witus.kr` 이
 * 정상 서빙되는 상태에서 **새 Production 배포를 만들어 확인했는데도** 이 변수는
 * 계속 `homepage-template-ivory.vercel.app` 을 반환했다. 그 결과 canonical 과
 * sitemap 이 **커스텀 도메인이 아니라 vercel.app 을 가리켰다** — canonical 로 막으려던
 * 중복 색인 문제를 canonical 자신이 만드는 상태다.
 *
 * 그래서 이 변수를 체인에서 **제거했다.** 도메인은 코드가 아는 사실이고, Vercel 이
 * 어떤 별칭을 프로덕션으로 보는지는 우리가 통제할 수 없다.
 *
 * ⚠️ **되살리지 말 것.** 되살리면 canonical·sitemap·OG 가 조용히 vercel.app 으로
 *    돌아가고, 화면에는 아무 증상이 없어 알아채지 못한다. (ADR-025 정정)
 *
 * ⚠️ 빈 문자열을 반드시 걸러야 한다. `??` 는 null/undefined 만 폴백하므로 빈 값이
 *    그대로 통과하면 `new URL('')` 이 TypeError 를 던져 **빌드가 깨진다**.
 *    Vercel 은 미설정 `NEXT_PUBLIC_*` 를 빈 값으로 주입한다 (ADR-012).
 */

/**
 * 정규(canonical) 도메인. **apex 를 정규로 삼는다** — `www` 와 `*.vercel.app` 은
 * 여기로 리다이렉트한다 (Vercel 대시보드 설정, ADR-025).
 *
 * 코드에 박아 두는 이유: 도메인은 환경별 비밀값이 아니라 **프로젝트의 사실**이다.
 * 대시보드에만 있으면 로컬·프리뷰에서 sitemap·OG 가 다른 주소를 내보내고, 설정
 * 누락을 아무도 못 본다. 코드에 두면 PR 로 검토되고 모든 환경에서 같다.
 *
 * 프리뷰 배포도 이 값을 쓴다 — **의도한 것이다.** 프리뷰는 인증으로 보호되어
 * 색인되지 않으므로, canonical 이 프로덕션을 가리키는 것이 맞다.
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

export const siteUrl: string = normalize(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL

// `isPlaceholderSiteUrl` 은 제거했다. 기본값이 실도메인이 된 뒤로는 **항상 false** 인
// 상수여서, 이름만 보고 "플레이스홀더 감지가 동작한다" 고 오해하게 만든다.
// 아무 곳에서도 쓰이지 않고 있었다.
