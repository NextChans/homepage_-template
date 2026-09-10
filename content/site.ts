/**
 * 사이트 전역 메타/회사 정보.
 *
 * ⚠️ **확정된 값과 임시 값이 섞여 있다.** `TODO` 주석이 붙은 것만 임시다.
 *    확정: 상호(Work In Trust / Wit), 대표자명.
 *    미확정: 정식 법인명(법인 형태 포함), 사업자등록번호, 주소, 연락처,
 *           개인정보 보호책임자.
 *    → 남은 항목은 `doc/05-content-guide.md` 체크리스트로 관리한다.
 *
 * ⚠️ 전자금융 관련 광고성 표현은 교체 시 준법감시(컴플라이언스) 검토 필수.
 */

export const site = {
  /** 브랜드 표기. 화면 전반과 <title> 템플릿에 쓰인다. */
  name: 'Wit',
  /** 정식 상호. `Wit` 는 이것의 약칭이다. */
  nameEn: 'WORK IN TRUST',
  // ⚠️ 법인 형태(주식회사/유한회사 등)를 포함한 **정식 법인명은 아직 미확정**이다.
  //    사업자등록증 상호를 그대로 넣어야 한다. 임의로 '주식회사' 를 붙이지 않는다 —
  //    푸터·개인정보처리방침에 표시되는 사업자 표시 정보라 틀리면 문제가 된다.
  legalName: 'Work In Trust', // TODO: 사업자등록증 상의 정식 법인명(법인 형태 포함)
  tagline: '결제 인프라의 처음부터 끝까지',
  description:
    '밴 단말기·키오스크 공급, PG 영업대행, 전자금융업 등록, 금융 클라우드 이용등록, 금융결제원 오픈뱅킹 연동까지. 결제 사업에 필요한 모든 절차를 한 팀이 끝냅니다.',
  // 절대 URL 은 여기 두지 않는다 — 이 모듈은 클라이언트 컴포넌트도 import 한다.
  //   → lib/site-url.ts (server-only) 의 `siteUrl` 을 쓴다.
  locale: 'ko_KR',
} as const

export const company = {
  ceo: '최봉균',
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
