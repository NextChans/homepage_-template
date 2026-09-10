/**
 * 기능 플래그.
 *
 * 왜 환경변수가 아니라 코드 상수인가 —
 *  - 켜고 끄는 판단이 **컴플라이언스 결정**이다. 대시보드에서 조용히 바뀌면 안 되고
 *    PR 로 검토·기록되어야 한다.
 *  - `false` 면 관련 코드가 트리셰이킹되어 배포물에서 사라진다. 환경변수는
 *    빌드 시점에 값이 없으면 켜진 채로 빌드될 수 있다.
 *  - 재활성화는 이 파일 한 줄 변경이다.
 *
 * ⚠️ 플래그를 켤 때 함께 해야 하는 일이 있다. 각 항목 주석을 반드시 읽을 것.
 *
 * 타입을 `boolean` 으로 명시한 이유: `as const` 로 두면 리터럴 타입 `false` 로 좁혀져
 * **비활성 분기가 죽은 코드가 되고 타입 검사·린트에서 빠진다.** 나중에 켤 코드가
 * 검사받지 못하는 상태로 방치되면 켜는 순간 깨진다.
 */
type Features = {
  inquiryForm: boolean
  privacyPolicy: boolean
}

export const features: Features = {
  /**
   * 상담 문의 폼 (`/contact` 의 입력 폼 + Server Action + Supabase 저장).
   *
   * 현재 `false` — 개인정보를 수집하지 않고 전화·이메일로만 문의를 받는다.
   *
   * ⚠️ `true` 로 켜기 전에 반드시:
   *   1. `features.privacyPolicy` 를 함께 `true` 로 켠다.
   *      개인정보를 수집하면서 처리방침을 공개하지 않는 것은 위반이다.
   *   2. `app/privacy/page.tsx` 의 초안 문구를 확정한다 (특히 4항 국외이전, 8항 시행일).
   *   3. 보관기간 파기 잡이 **실제로 돌고 있는지** 확인한다.
   *      함수·스케줄은 구현되어 있다 (마이그레이션 20260910000006/7, ADR-021).
   *      확인 방법: `public.data_retention_log` 에 `triggered_by = 'cron'` 행이
   *      매일 쌓이는지 본다. 삭제 대상이 없으면 `deleted_count = 0` 행이 남는데,
   *      **그 0 행이 잡이 돌고 있다는 증거다.** 행이 없으면 잡이 안 도는 것이다.
   *   4. 접수 알림을 활성화한다 (`SLACK_INQUIRY_WEBHOOK_URL`).
   *      사이트에 "1영업일 내 회신" 을 명시하므로 알림 없이는 약속을 지킬 수 없다.
   *   5. Supabase 환경변수 4개가 설정되어 있는지 확인한다 (`doc/09-deployment.md`).
   */
  inquiryForm: false,

  /**
   * 개인정보처리방침 페이지 (`/privacy`) 공개 여부.
   *
   * 현재 `false` — 초안 상태이고 확정된 내용이 없어 비공개로 둔다.
   * 폼을 내려 개인정보를 수집하지 않는 동안에만 성립하는 상태다.
   *
   * ⚠️ 페이지 소스는 삭제하지 않았다. 내용은 `app/privacy/page.tsx` 에 그대로 있고,
   *    확정해야 할 항목은 `doc/06-security-compliance.md` 에 정리되어 있다.
   *    `features.inquiryForm` 을 켜면 이 플래그도 반드시 함께 켠다.
   */
  privacyPolicy: false,
}
