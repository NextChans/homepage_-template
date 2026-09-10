'use server'

import { redirect } from 'next/navigation'
import {
  LOGIN_LOCK_WINDOW_MINUTES,
  auditContext,
  logAdminAction,
  loginGate,
} from '@/lib/admin/audit'
import {
  checkCredentials,
  endSession,
  isAdminConfigured,
  startSession,
} from '@/lib/admin/auth'
import type { LoginState } from '@/lib/admin/login-state'

// ⚠️ 이 파일은 'use server' 다. **async 함수만 export 할 수 있다.**
//    타입·상수를 내보내면 빌드가 깨진다(invalid-use-server-value).
//    LoginState / initialLoginState 는 lib/admin/login-state.ts 에 있다.

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // 자격증명이 설정되지 않았으면 관리자 기능 자체가 없다.
  if (!isAdminConfigured()) return { error: '관리자 기능이 설정되지 않았습니다.' }

  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  const context = await auditContext()

  // 브루트포스 차단을 자격증명 검증보다 먼저 한다.
  // 차단 이유를 구분해 알려준다 — 설정 실수를 브루트포스로 오인하면
  // 원인을 찾을 수 없다. 둘 다 자격증명 정보를 흘리지 않는다.
  const gate = await loginGate(context)
  if (gate === 'locked') {
    return {
      error: `로그인 시도가 너무 많습니다. ${LOGIN_LOCK_WINDOW_MINUTES}분 후 다시 시도해 주세요.`,
    }
  }
  if (gate === 'unavailable') {
    return {
      error:
        '감사 로그를 확인할 수 없어 로그인을 차단했습니다. Supabase 설정과 admin_audit_log 테이블을 확인하세요.',
    }
  }

  if (!checkCredentials(username, password)) {
    await logAdminAction({ action: 'login_failed', actor: username.slice(0, 80), context })
    // ⚠️ 아이디·비밀번호 중 무엇이 틀렸는지 구분해 알려주지 않는다.
    //    사용자명 존재 여부가 새는 것을 막는다.
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  await logAdminAction({ action: 'login_success', actor: username.trim(), context })
  await startSession()
  redirect('/admin')
}

export async function logout(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}
