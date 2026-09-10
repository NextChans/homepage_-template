/**
 * 관리자 콘솔 역할과 권한.
 *
 * ⚠️ 이 파일은 **서버·클라이언트 양쪽에서 import 한다.** `'server-only'` 를 붙이지
 *    않는다. 비밀값·DB 접근을 넣지 말 것.
 *
 * ⚠️ 역할을 추가하면 `supabase/migrations/` 의 `admin_users.role` check 제약도
 *    **함께** 고친다. 한쪽만 고치면 계정 생성이 DB 제약에서 터진다.
 */

export const ADMIN_ROLES = ['admin', 'agent'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ROLE_LABEL: Record<AdminRole, string> = {
  admin: '관리자',
  agent: '상담자',
}

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  admin: '문의 업무 전부 + 계정 관리 + 감사 로그 조회',
  agent: '문의 조회 · 직접 등록 · 상태 변경',
}

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value)
}

/**
 * 권한 단위.
 *
 * 역할 이름으로 직접 분기하지 않고 **권한으로 분기한다.** 역할이 늘어날 때
 * `role === 'admin'` 같은 조건을 코드 전체에서 찾아 고치는 일을 만들지 않는다.
 */
export const PERMISSIONS = [
  /** 문의 목록·상세 조회 */
  'inquiry.read',
  /** 전화·이메일 문의 직접 등록 */
  'inquiry.create',
  /** 처리 상태 변경 */
  'inquiry.status',
  /** 계정 등록·삭제·권한 변경·비밀번호 초기화 */
  'user.manage',
  /** 감사 로그 조회 */
  'audit.read',
] as const
export type Permission = (typeof PERMISSIONS)[number]

/**
 * 역할별 권한.
 *
 * **상담자에게 계정 관리와 감사 로그를 주지 않는다.**
 *  - 계정 관리: 스스로를 관리자로 승격할 수 있으면 역할 분리가 무의미해진다.
 *  - 감사 로그: 누가 무엇을 열람했는지가 담긴다. 감시 대상이 감시 기록을 볼 수
 *    있으면 감사의 의미가 없다.
 *
 * 반대로 **문의 상태 변경은 상담자에게 준다.** 상담 업무의 핵심이고, 변경 이력이
 * `inquiry_status_history` 에 남아 사후 추적이 가능하다.
 */
const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  admin: ['inquiry.read', 'inquiry.create', 'inquiry.status', 'user.manage', 'audit.read'],
  agent: ['inquiry.read', 'inquiry.create', 'inquiry.status'],
}

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function permissionsOf(role: AdminRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}
