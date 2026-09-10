import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * service_role 키를 쓰는 서버 전용 Supabase 클라이언트.
 *
 * ⚠️ 이 모듈은 절대 클라이언트 컴포넌트에서 import 하지 않는다.
 *    'server-only' 로 빌드 타임에 차단된다.
 * ⚠️ service_role 은 RLS 를 우회한다. 사용 지점을 Server Action 으로 한정한다.
 */
let cached: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient | null {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    // 로컬/미설정 환경에서 빌드를 깨뜨리지 않고, 호출 지점에서 명시적으로 처리한다.
    return null
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'homepage-template/inquiry' } },
  })

  return cached
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
