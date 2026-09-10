import 'server-only'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { AdminRole } from './roles'

/**
 * 관리자 인증의 **암호·토큰·쿠키 계층**. DB 를 모른다.
 *
 *   lib/admin/auth.ts     ← 여기: scrypt 검증, HMAC 서명 토큰, 쿠키
 *   lib/admin/users.ts    ← DB 계정 CRUD + 계정 인증
 *   lib/admin/session.ts  ← 위 둘을 합쳐 "현재 세션" 을 판정
 *
 * 이렇게 나눈 이유: 토큰·쿠키 로직에 DB 접근이 섞이면 순환 import 가 생기고,
 * 어느 계층에서 실패했는지 구분이 어려워진다.
 *
 * ⚠️ 두 가지 로그인 경로가 있다.
 *   1) **DB 계정** (`admin_users`) — 일상 업무용. 역할·권한·세션 무효화가 붙는다.
 *   2) **환경변수 계정** (`ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`) —
 *      **비상 복구(break-glass)** 경로. DB 계정이 전부 잠기거나 Supabase 가
 *      죽어도 들어갈 수 있어야 한다. 항상 `admin` 역할이고 `userId` 가 없다.
 *      감사 로그에 비상 경로 사용임을 표시한다.
 *
 * ⚠️ 환경변수 셋 중 하나라도 없으면 `/admin` 전체가 404 다 — 설정하지 않으면
 *    관리자 기능이 "존재하지 않는다". DB 계정만으로 운영하려 해도 이 셋은 필요하다.
 */

const SESSION_COOKIE = 'admin_session'
/** 세션 유효기간. 짧게 둔다 — 개인정보 조회 화면이다. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8시간

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = { N: 16384, r: 8, p: 1 }

/**
 * 관리자 설정용 환경변수를 읽는다. **반드시 이 함수로만 읽는다.**
 *
 * ⚠️ `trim()` 하는 이유 — 실제로 겪은 실패다. 대시보드에 값을 붙여넣을 때
 *    앞뒤 공백이나 줄바꿈이 섞이면 비교가 조용히 실패하고, 화면에는
 *    "아이디 또는 비밀번호가 올바르지 않습니다" 만 나와 원인을 알 수 없다.
 *    이 값들은 **사용자 입력이 아니라 우리가 넣은 설정값**이므로 공백을
 *    의미 있는 문자로 취급할 이유가 없다.
 *
 *    반대로 **폼으로 들어온 비밀번호는 절대 trim 하지 않는다** — 그것은
 *    사용자가 정한 값이고, 공백도 비밀번호의 일부다.
 */
function adminEnv(key: 'ADMIN_USERNAME' | 'ADMIN_PASSWORD_HASH' | 'ADMIN_SESSION_SECRET'): string {
  return (process.env[key] ?? '').trim()
}

/**
 * 관리자 페이지가 활성화되어 있는가.
 *
 * **자격증명이 하나라도 없으면 `/admin` 전체가 404 가 된다.** 별도 기능 플래그를
 * 두지 않은 이유가 이것이다 — 설정하지 않으면 존재하지 않는다.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    adminEnv('ADMIN_USERNAME') && adminEnv('ADMIN_PASSWORD_HASH') && adminEnv('ADMIN_SESSION_SECRET'),
  )
}

/** 비상 복구 계정의 사용자명. 화면 표시·감사 로그 대조용. */
export function bootstrapUsername(): string {
  return adminEnv('ADMIN_USERNAME')
}

/** 길이가 달라도 조기 반환하지 않는 비교. 타이밍으로 정보가 새지 않게 한다. */
function safeEqual(a: string, b: string): boolean {
  // timingSafeEqual 은 길이가 다르면 throw 한다. 길이 자체도 숨기려면
  // 고정 길이로 해시한 뒤 비교한다.
  const hashA = createHmac('sha256', 'len-normalize').update(Buffer.from(a, 'utf8')).digest()
  const hashB = createHmac('sha256', 'len-normalize').update(Buffer.from(b, 'utf8')).digest()
  return timingSafeEqual(hashA, hashB)
}

/**
 * `scrypt$<salt-hex>$<hash-hex>` 형식의 비밀번호 해시를 검증한다.
 * 해시 생성은 `node scripts/hash-admin-password.mjs` 로 한다.
 */
export function verifyPassword(candidate: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  const [, saltHex, hashHex] = parts
  if (!saltHex || !hashHex) return false

  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    if (expected.length !== SCRYPT_KEYLEN) return false

    const actual = scryptSync(candidate, salt, SCRYPT_KEYLEN, SCRYPT_COST)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** 비밀번호 해시를 만든다. 계정 생성·비밀번호 변경에서 쓴다. */
export function hashPassword(password: string): string {
  const salt = randomBytes(32)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/**
 * 존재하지 않는 계정에 대해서도 **같은 시간**을 쓰게 하는 더미 검증.
 *
 * 계정이 없을 때 즉시 실패하면 응답 시간으로 계정 존재 여부가 드러난다.
 * scrypt 는 의도적으로 느리므로 이 한 번의 호출이 타이밍을 맞춰 준다.
 */
const DUMMY_HASH = hashPassword(randomBytes(24).toString('hex'))

export function burnPasswordTime(candidate: string): void {
  verifyPassword(candidate, DUMMY_HASH)
}

/**
 * 저장된 해시의 **형태만** 설명한다. 값은 절대 출력하지 않는다.
 *
 * 붙여넣기 사고(값 잘림, 줄바꿈 삽입)를 로그만 보고 판별할 수 있게 한다.
 */
export function describeHashShape(stored: string): string {
  const parts = stored.split('$')
  if (parts.length !== 3) return `잘못된 필드수(${parts.length}, 3이어야 함)`
  if (parts[0] !== 'scrypt') return '알 수 없는 접두어'
  const saltHex = parts[1] ?? ''
  const hashHex = parts[2] ?? ''
  const hashBytes = Buffer.from(hashHex, 'hex').length
  if (saltHex.length !== 64) return `salt hex 길이 ${saltHex.length} (64여야 함)`
  if (hashBytes !== SCRYPT_KEYLEN) {
    return `hash 바이트 ${hashBytes} (${SCRYPT_KEYLEN}여야 함 — 값이 잘렸을 수 있음)`
  }
  return 'ok'
}

// ── 비상 복구(환경변수) 계정 ────────────────────────────────────────────────

/**
 * 환경변수 자격증명을 확인한다. **비상 복구 경로다.**
 *
 * 아이디가 틀려도 비밀번호 검증을 **항상** 수행한다 — 건너뛰면 응답 시간
 * 차이로 아이디 존재 여부가 드러난다.
 *
 * 화면에는 어느 쪽이 틀렸는지 알려주지 않지만(사용자명 존재 여부 은닉),
 * **서버 로그에는 남긴다.** 그렇지 않으면 설정 실수와 침입 시도가 똑같이
 * 보여서 운영자가 원인을 찾을 수 없다. 비밀값은 출력하지 않는다.
 */
export function checkBootstrapCredentials(username: string, password: string): boolean {
  const expectedUser = adminEnv('ADMIN_USERNAME')
  const storedHash = adminEnv('ADMIN_PASSWORD_HASH')
  if (!expectedUser || !storedHash) return false

  const userOk = safeEqual(username.trim(), expectedUser)
  const passOk = verifyPassword(password, storedHash)

  if (!userOk || !passOk) {
    console.error('[admin] 비상 복구 계정 로그인 실패', {
      usernameMatched: userOk,
      passwordMatched: passOk,
      storedHashShape: describeHashShape(storedHash),
    })
  }

  return userOk && passOk
}

// ── 세션 토큰 ───────────────────────────────────────────────────────────────
//
// `<payload-base64url>.<hmac-base64url>` 형식. 서버만 서명·검증한다.
// JWT 를 쓰지 않은 이유: 알고리즘 협상(alg=none 등) 같은 함정이 없고,
// 필요한 것이 "만료 시각이 든 서명된 문자열" 하나뿐이다.

export type SessionPayload = {
  /** 사용자명 */
  u: string
  /** 역할 */
  r: AdminRole
  /** `admin_users.id`. 비상 복구 계정은 `null`. */
  uid: string | null
  /**
   * `admin_users.session_epoch` 스냅샷. 비상 복구 계정은 `0`.
   *
   * ⚠️ 세션 무효화의 핵심이다. DB 의 현재 값과 다르면 세션을 거부한다.
   *    비밀번호 변경·초기화·강제 로그아웃이 epoch 를 올려 **기존 세션을
   *    즉시 무효화**한다. 서명 쿠키만으로는 불가능했던 원격 로그아웃을
   *    세션 테이블 없이 구현하는 방법이다.
   */
  e: number
  /** 발급 시각 (ms) */
  iat: number
  /** 만료 시각 (ms) */
  exp: number
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest())
}

function createToken(
  input: { username: string; role: AdminRole; userId: string | null; epoch: number },
  secret: string,
): string {
  const now = Date.now()
  const payload: SessionPayload = {
    u: input.username,
    r: input.role,
    uid: input.userId,
    e: input.epoch,
    iat: now,
    exp: now + SESSION_TTL_MS,
  }
  const encoded = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  return `${encoded}.${sign(encoded, secret)}`
}

/**
 * 토큰을 검증해 payload 를 돌려준다. **DB 는 확인하지 않는다** —
 * 계정 상태·epoch 확인은 `lib/admin/session.ts` 가 한다.
 */
export function readToken(token: string, secret: string): SessionPayload | null {
  const dot = token.indexOf('.')
  if (dot < 1) return null

  const encoded = token.slice(0, dot)
  const provided = token.slice(dot + 1)

  // 서명을 먼저 검증한다. 검증 전 payload 를 신뢰해 파싱하지 않는다.
  const expected = sign(encoded, secret)
  if (!safeEqual(provided, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload
    if (typeof parsed.u !== 'string' || typeof parsed.exp !== 'number') return null
    if (parsed.r !== 'admin' && parsed.r !== 'agent') return null
    if (typeof parsed.e !== 'number') return null
    if (parsed.uid !== null && typeof parsed.uid !== 'string') return null
    if (Date.now() >= parsed.exp) return null

    // 비상 복구 계정은 DB 로 검증할 수 없으므로 환경변수와 대조한다.
    // 환경변수 사용자명을 바꾸면 기존 비상 세션이 무효가 된다.
    if (parsed.uid === null) {
      const expectedUser = adminEnv('ADMIN_USERNAME')
      if (!expectedUser || parsed.u !== expectedUser) return null
      if (parsed.r !== 'admin') return null
    }

    return parsed
  } catch {
    return null
  }
}

// ── 쿠키 ────────────────────────────────────────────────────────────────────

export function sessionSecret(): string {
  return adminEnv('ADMIN_SESSION_SECRET')
}

export async function writeSessionCookie(input: {
  username: string
  role: AdminRole
  userId: string | null
  epoch: number
}): Promise<void> {
  const secret = sessionSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET 이 없습니다.')

  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(input, secret), {
    httpOnly: true, // JS 로 읽을 수 없다 → XSS 로 세션 탈취 불가
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // CSRF 완화. 외부 사이트발 요청에 쿠키가 붙지 않는다
    path: '/admin', // 다른 경로 요청에는 아예 전송되지 않는다
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const secret = sessionSecret()
  if (!secret) return null

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  return readToken(token, secret)
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete({ name: SESSION_COOKIE, path: '/admin' })
}
