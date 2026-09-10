/**
 * 문의 처리 상태와 유입 경로.
 *
 * ⚠️ 이 파일은 **서버·클라이언트 양쪽에서 import 한다.** `'server-only'` 를 붙이지
 *    않는다. 비밀값·DB 접근을 넣지 말 것.
 *
 * ⚠️ 값 목록을 늘리면 `supabase/migrations/` 의 check 제약도 **함께** 고친다.
 *    한쪽만 고치면 insert/update 가 DB 제약에서 터진다.
 *    (inquiries.status, inquiry_status_history.to_status, inquiries.intake_channel)
 */

export const INQUIRY_STATUSES = ['received', 'in_review', 'contacted', 'closed', 'spam'] as const
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  received: '접수',
  in_review: '검토 중',
  contacted: '연락 완료',
  closed: '종결',
  spam: '스팸',
}

/**
 * `contacted` 이후 상태로 바뀌면 처리 담당·처리일시를 기록한다.
 * `received` 로 되돌리면 처리 정보를 비운다 — "아직 처리 안 됨" 이 사실이 된다.
 */
export const HANDLED_STATUSES: readonly InquiryStatus[] = ['contacted', 'closed', 'spam']

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value)
}

/** 유입 경로. `web` 은 홈페이지 폼 전용이라 직접 등록 폼에서는 고를 수 없다. */
export const INTAKE_CHANNELS = ['web', 'phone', 'email', 'offline'] as const
export type IntakeChannel = (typeof INTAKE_CHANNELS)[number]

/** 관리자가 직접 등록할 수 있는 경로. `web` 은 제외한다. */
export const MANUAL_INTAKE_CHANNELS: readonly IntakeChannel[] = ['phone', 'email', 'offline']

export const CHANNEL_LABEL: Record<IntakeChannel, string> = {
  web: '홈페이지',
  phone: '전화',
  email: '이메일',
  offline: '대면·기타',
}

export function isIntakeChannel(value: string): value is IntakeChannel {
  return (INTAKE_CHANNELS as readonly string[]).includes(value)
}

export function isManualIntakeChannel(value: string): value is IntakeChannel {
  return (MANUAL_INTAKE_CHANNELS as readonly string[]).includes(value)
}
