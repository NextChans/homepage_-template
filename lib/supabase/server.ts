import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * service_role(또는 신형 secret) 키를 쓰는 서버 전용 Supabase 클라이언트.
 *
 * ⚠️ 이 모듈은 절대 클라이언트 컴포넌트에서 import 하지 않는다.
 *    'server-only' 로 빌드 타임에 차단된다.
 * ⚠️ 이 키는 RLS 를 우회한다. 사용 지점을 Server Action 으로 한정한다.
 */

/**
 * 프로젝트 URL 을 찾는 순서.
 *  - NEXT_PUBLIC_SUPABASE_URL : 수동 설정 / 우리 .env.example 기준
 *  - SUPABASE_URL             : Vercel Supabase 연동이 주입하는 이름
 */
const URL_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const

/**
 * 비밀 키를 찾는 순서.
 *  - SUPABASE_SECRET_KEY       : 신형 키(sb_secret_...). Vercel Supabase 연동이 주입하는 이름
 *  - SUPABASE_SERVICE_ROLE_KEY : 레거시 service_role JWT. 2026년 말 지원 종료 예정
 *
 * 신형을 먼저 본다. 둘 다 있으면 신형을 쓴다.
 */
const SECRET_ENV_KEYS = ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const

function firstEnv(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]
    if (value) return value
  }
  return undefined
}

let cached: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient | null {
  if (cached) return cached

  const url = firstEnv(URL_ENV_KEYS)
  const secret = firstEnv(SECRET_ENV_KEYS)

  if (!url || !secret) {
    // 미설정 환경에서 빌드를 깨뜨리지 않고, 호출 지점에서 명시적으로 처리한다.
    return null
  }

  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'homepage-template/inquiry' } },
  })

  return cached
}

export function isSupabaseConfigured(): boolean {
  return Boolean(firstEnv(URL_ENV_KEYS) && firstEnv(SECRET_ENV_KEYS))
}

/**
 * 설정 누락 시 서버 로그에 남길 안내. 어떤 이름이든 하나만 있으면 된다는 점을 알린다.
 * 키 값 자체는 절대 출력하지 않는다.
 */
export function supabaseConfigHint(): string {
  return `[inquiry] Supabase 환경변수가 없습니다. URL(${URL_ENV_KEYS.join(' 또는 ')})과 비밀키(${SECRET_ENV_KEYS.join(' 또는 ')})를 설정하세요.`
}
