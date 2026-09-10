/**
 * 사이트 전역 메타/회사 정보.
 *
 * ⚠️ 여기 담긴 모든 값은 템플릿용 임시(placeholder) 데이터다.
 *    실서비스 전에 법인 실제 정보(상호/대표/사업자등록번호/주소/연락처)로 교체할 것.
 *    전자금융 관련 광고성 표현은 교체 시 준법감시(컴플라이언스) 검토 필수.
 */

export const site = {
  name: '넥스트챈스',
  nameEn: 'NEXTCHANS',
  legalName: '주식회사 넥스트챈스', // TODO: 실제 법인명
  tagline: '결제 인프라의 처음부터 끝까지',
  description:
    '밴 단말기 공급, PG 영업대행, 전자금융업 등록, 금융 클라우드 이용등록, 금융결제원 오픈뱅킹 연동까지. 결제 사업에 필요한 모든 절차를 한 팀이 끝냅니다.',
  // 절대 URL 은 여기 두지 않는다 — 이 모듈은 클라이언트 컴포넌트도 import 한다.
  //   → lib/site-url.ts (server-only) 의 `siteUrl` 을 쓴다.
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

/**
 * 홈 상단 신뢰 지표.
 *
 * ⚠️ 값이 `XXX` / `OO` 인 것은 **근거 자료가 없어 플레이스홀더로 치환한 것**이다.
 *    구체적인 숫자를 근거 없이 게재하면 표시광고법 리스크가 된다(허위·과장 광고).
 *    근거(계약 건수 대장, 설치 대장, 실적 집계 등)를 확보한 항목만 실제 숫자로
 *    바꾸고, 확보하지 못한 항목은 **숫자를 만들지 말고 이 배열에서 제거**한다.
 */
export const metrics = [
  { value: 'XXX+', label: '누적 구축 프로젝트' },
  { value: 'X,XXX대', label: '단말기 설치·운영' },
  { value: 'XX일', label: '평균 등록 소요' },
  { value: 'OO', label: '장애 대응 체계' },
] as const

export const partnerLogos = [
  'VAN A',
  'VAN B',
  'PG C',
  'PG D',
  'BANK E',
  'CSP F',
] as const
