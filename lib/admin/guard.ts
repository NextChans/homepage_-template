import 'server-only'

import { notFound, redirect } from 'next/navigation'
import { getAdminSession, isAdminConfigured } from './auth'

/**
 * 관리자 페이지 진입 가드. **각 페이지가 직접 호출한다.**
 *
 * 레이아웃에 두지 않은 이유: App Router 레이아웃은 클라이언트 네비게이션에서
 * 매번 재실행된다고 보장되지 않는다. 인가는 렌더되는 지점마다 확인해야 한다.
 *
 * - 자격증명 미설정 → `notFound()`. 관리자 기능이 "존재하지 않는" 것으로 보인다.
 *   로그인 화면조차 노출하지 않아 정찰 대상이 되지 않는다.
 * - 세션 없음 → 로그인으로.
 */
export async function requireAdminSession(): Promise<{ username: string }> {
  if (!isAdminConfigured()) notFound()

  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return session
}
