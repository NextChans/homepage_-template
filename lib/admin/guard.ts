import 'server-only'

import { notFound, redirect } from 'next/navigation'
import { isAdminConfigured } from './auth'
import { type Permission, can } from './roles'
import { type AdminSession, getAdminSession } from './session'

/**
 * 관리자 페이지 진입 가드. **각 페이지가 직접 호출한다.**
 *
 * 레이아웃에 두지 않은 이유: App Router 레이아웃은 클라이언트 네비게이션에서
 * 매번 재실행된다고 보장되지 않는다. 인가는 렌더되는 지점마다 확인해야 한다.
 *
 * - 자격증명 미설정 → `notFound()`. 관리자 기능이 "존재하지 않는" 것으로 보인다.
 *   로그인 화면조차 노출하지 않아 정찰 대상이 되지 않는다.
 * - 세션 없음 → 로그인으로.
 * - 비밀번호 초기화 상태 → 비밀번호 변경 화면으로. 초기 비밀번호로 업무를 보지
 *   못하게 한다.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await requireSessionAllowingPasswordChange()
  if (session.mustChangePassword) redirect('/admin/password')
  return session
}

/**
 * 비밀번호 변경 화면 전용 가드.
 *
 * ⚠️ 일반 가드를 쓰면 `mustChangePassword` 상태에서 **비밀번호 변경 화면 자신이
 *    자신으로 리다이렉트되어 무한 루프**가 된다.
 */
export async function requireSessionAllowingPasswordChange(): Promise<AdminSession> {
  if (!isAdminConfigured()) notFound()

  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return session
}

/**
 * 권한이 필요한 페이지의 가드.
 *
 * ⚠️ 권한 부족은 403 이 아니라 **`notFound()`** 다. "여기 관리자 전용 화면이
 *    있다" 는 사실 자체를 상담자에게 알려줄 이유가 없다.
 */
export async function requirePermission(permission: Permission): Promise<AdminSession> {
  const session = await requireAdminSession()
  if (!can(session.role, permission)) notFound()
  return session
}
