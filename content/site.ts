/**
 * 사이트 전역 메타/회사 정보.
 *
 * ⚠️ 여기 담긴 모든 값은 템플릿용 임시(placeholder) 데이터다.
 *    실서비스 전에 법인 실제 정보(상호/대표/사업자등록번호/주소/연락처)로 교체할 것.
 *    전자금융 관련 광고성 표현은 교체 시 준법감시(컴플라이언스) 검토 필수.
 */

/** NEXT_PUBLIC_SITE_URL 미설정·오설정 시 사용할 기본값. */
const FALLBACK_SITE_URL = 'https://www.example.co.kr'

/**
 * 사이트 절대 URL 을 검증해 항상 유효한 값만 내보낸다.
 *
 * ⚠️ 빈 문자열을 반드시 걸러야 한다. `?? ` 는 null/undefined 만 폴백하므로
 *    NEXT_PUBLIC_SITE_URL="" 인 환경에서는 빈 문자열이 그대로 통과하고,
 *    app/layout.tsx 의 `new URL(site.url)` 이 TypeError: Invalid URL 을 던져
 *    **빌드가 깨진다**(Collecting page data 단계에서 /_not-found 실패).
 *
 *    로컬·CI 는 변수가 아예 없어서(undefined) 통과하지만 Vercel 은 빈 값을
 *    주입하므로, 이 차이가 "CI 통과 · Vercel 배포 실패" 로 나타났다.
 *    Vercel 배포 9회 연속 실패의 실제 원인이다. (ADR-012)
 */
function resolveSiteUrl(raw: string | undefined): string {
  const candidate = raw?.trim()
  if (!candidate) return FALLBACK_SITE_URL

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return FALLBACK_SITE_URL
    // 끝 슬래시를 제거한다. sitemap 등에서 `${site.url}${path}` 로 이어붙일 때 '//' 방지.
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    return FALLBACK_SITE_URL
  }
}

export const site = {
  name: '넥스트챈스',
  nameEn: 'NEXTCHANS',
  legalName: '주식회사 넥스트챈스', // TODO: 실제 법인명
  tagline: '결제 인프라의 처음부터 끝까지',
  description:
    '밴 단말기 공급, PG 영업대행, 전자금융업 등록, 금융 클라우드 이용등록, 금융결제원 오픈뱅킹 연동까지. 결제 사업에 필요한 모든 절차를 한 팀이 끝냅니다.',
  url: resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  locale: 'ko_KR',
} as const

export const company = {
  ceo: '홍길동', // TODO
  bizNo: '000-00-00000', // TODO: 사업자등록번호
  address: '서울특별시 강남구 테헤란로 000, 00층', // TODO
  tel: '02-0000-0000', // TODO
  fax: '02-0000-0001', // TODO
  email: 'contact@example.co.kr', // TODO
  privacyOfficer: '김철수 / privacy@example.co.kr', // TODO: 개인정보 보호책임자
  hours: '평일 09:00 – 18:00 (점심 12:00 – 13:00)',
} as const

export const nav = [
  { href: '/services', label: '서비스' },
  { href: '/about', label: '회사소개' },
  { href: '/contact', label: '문의' },
] as const

/** 홈 상단 신뢰 지표. 실제 수치로 교체 전까지 대외 공개 금지. */
export const metrics = [
  { value: '320+', label: '누적 구축 프로젝트' },
  { value: '12,000대', label: '단말기 설치·운영' },
  { value: '90일', label: '평균 등록 소요' },
  { value: '24/7', label: '장애 대응 체계' },
] as const

export const partnerLogos = [
  'VAN A',
  'VAN B',
  'PG C',
  'PG D',
  'BANK E',
  'CSP F',
] as const
