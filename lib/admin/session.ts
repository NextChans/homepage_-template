import 'server-only'

import { bootstrapUsername, readSessionCookie, writeSessionCookie } from './auth'
import type { AdminRole } from './roles'
import { getSessionUser } from './users'

/**
 * "현재 요청의 관리자 세션" 판정. 토큰 계층(`auth.ts`)과 DB 계층(`users.ts`)을 합친다.
 *
 * ⚠️ 서명이 유효한 토큰만으로는 부족하다. **매 요청마다 DB 를 확인한다.**
 *    - 계정이 삭제·비활성화되었는지
 *    - `session_epoch` 가 토큰 발급 이후 바뀌었는지(비밀번호 변경·초기화·강제 만료)
 *    이 확인이 없으면 "관리자가 계정을 껐는데 최대 8시간 동안 계속 쓸 수 있는"
 *    상태가 된다. 쿼리 한 번의 비용으로 원격 무효화를 얻는다.
 *
 * ⚠️ 비상 복구(환경변수) 계정은 DB 를 보지 않는다 — Supabase 가 죽어도 들어갈 수
 *    있어야 하는 것이 그 계정의 존재 이유다. 대신 `auth.ts` 가 환경변수와 대조한다.
 */

export type AdminSession = {
  username: string
  role: AdminRole
  /** `admin_users.id`. 비상 복구 계정은 `null`. */
  userId: string | null
  /** 환경변수 비상 복구 계정으로 로그인했는가. 화면·감사 로그에 표시한다. */
  isBootstrap: boolean
  /** 초기화된 비밀번호 상태. 비밀번호 변경 외의 화면을 막는다. */
  mustChangePassword: boolean
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const payload = await readSessionCookie()
  if (!payload) return null

  // 비상 복구 계정
  if (payload.uid === null) {
    const expected = bootstrapUsername()
    if (!expected || payload.u !== expected) return null
    return {
      username: payload.u,
      role: 'admin',
      userId: null,
      isBootstrap: true,
      mustChangePassword: false,
    }
  }

  const user = await getSessionUser(payload.uid)
  if (!user) return null
  if (user.status !== 'active') return null
  // epoch 불일치 = 비밀번호가 바뀌었거나 세션이 강제 만료됐다.
  if (user.epoch !== payload.e) return null

  return {
    username: user.username,
    role: user.role,
    userId: payload.uid,
    isBootstrap: false,
    mustChangePassword: user.mustChangePassword,
  }
}

export async function startSession(input: {
  username: string
  role: AdminRole
  userId: string | null
  epoch: number
}): Promise<void> {
  await writeSessionCookie(input)
}
