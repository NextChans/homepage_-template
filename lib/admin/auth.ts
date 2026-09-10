import 'server-only'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * 관리자 인증. ID/PW → 서명된 세션 쿠키.
 *
 * ⚠️ 이 설계가 주는 것과 주지 않는 것 (doc/10-admin.md 참고)
 *   주는 것   : 단일 관리자 자격증명, 서버 전용 검증, 브루트포스 차단, 감사 로그
 *   주지 않는 것: MFA, 사용자별 계정·권한, 비밀번호 변경 UI, 세션 강제 만료(원격 로그아웃)
 *
 * 개인정보를 다루는 화면을 **공유 ID/PW 하나로만** 지키는 구성이다. 운영 인원이
 * 늘거나 접근 빈도가 높아지면 Supabase Auth + MFA 로 옮기는 것을 권한다.
 * 그 판단 근거는 doc/04-decisions.md ADR-015 에 정리했다.
 *
 * ⚠️ 왜 Supabase Auth 를 쓰지 않았나 —
 *   현재 설계는 `inquiries` 에 RLS 를 켜고 **정책을 만들지 않는다**(service_role 전용).
 *   Supabase Auth 를 도입하면 클라이언트에 publishable 키가 나가고, 로그인 사용자가
 *   데이터에 접근하려면 정책을 열어야 한다. 그 불변식을 깨지 않기 위해
 *   인증만 자체 구현하고 데이터 접근은 계속 서버에서만 한다.
 */

const SESSION_COOKIE = 'admin_session'
/** 세션 유효기간. 짧게 둔다 — 개인정보 조회 화면이다. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8시간

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = { N: 16384, r: 8, p: 1 }

/**
 * 관리자 페이지가 활성화되어 있는가.
 *
 * **자격증명이 하나라도 없으면 `/admin` 전체가 404 가 된다.** 별도 기능 플래그를
 * 두지 않은 이유가 이것이다 — 설정하지 않으면 존재하지 않는다. 실수로 노출될
 * 경로가 없다.
 */
export function isAdminConfigured(): boolean {
  return Boolean(adminEnv('ADMIN_USERNAME') && adminEnv('ADMIN_PASSWORD_HASH') && adminEnv('ADMIN_SESSION_SECRET'))
}

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

/** 길이가 달라도 조기 반환하지 않는 비교. 타이밍으로 정보가 새지 않게 한다. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // timingSafeEqual 은 길이가 다르면 throw 한다. 길이 자체도 숨기려면
  // 고정 길이로 해시한 뒤 비교한다.
  const hashA = createHmac('sha256', 'len-normalize').update(bufA).digest()
  const hashB = createHmac('sha256', 'len-normalize').update(bufB).digest()
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

/** 비밀번호 해시를 만든다. 스크립트에서만 쓴다. */
export function hashPassword(password: string): string {
  const salt = randomBytes(32)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_COST)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

// ── 세션 토큰 ───────────────────────────────────────────────────────────────
//
// `<payload-base64url>.<hmac-base64url>` 형식. 서버만 서명·검증한다.
// JWT 를 쓰지 않은 이유: 알고리즘 협상(alg=none 등) 같은 함정이 없고,
// 필요한 것이 "만료 시각이 든 서명된 문자열" 하나뿐이다.

type SessionPayload = {
  /** 사용자명 */
  u: string
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

function createToken(username: string, secret: string): string {
  const now = Date.now()
  const payload: SessionPayload = { u: username, iat: now, exp: now + SESSION_TTL_MS }
  const encoded = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  return `${encoded}.${sign(encoded, secret)}`
}

function readToken(token: string, secret: string): SessionPayload | null {
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
    if (Date.now() >= parsed.exp) return null
    // 자격증명 사용자명이 바뀌면 기존 세션은 무효가 된다.
    // ⚠️ 여기도 adminEnv 로 읽어야 한다. startSession 이 정규화된 값을 넣으므로
    //    한쪽만 trim 하면 발급 직후 세션이 무효가 되어 **로그인 → 리다이렉트 무한
    //    루프**가 된다.
    const expectedUser = adminEnv('ADMIN_USERNAME')
    if (!expectedUser || parsed.u !== expectedUser) return null
    return parsed
  } catch {
    return null
  }
}

// ── 자격증명 확인 ───────────────────────────────────────────────────────────

/**
 * ID/PW 를 확인한다. **성공·실패 여부만 반환하고 이유는 구분하지 않는다.**
 * "그 아이디는 없습니다" 같은 응답은 사용자명 존재를 알려주는 정보 누출이다.
 *
 * 사용자명이 틀려도 비밀번호 검증을 건너뛰지 않는다 — 응답 시간 차이로
 * 사용자명 존재를 추측할 수 있기 때문이다.
 */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = adminEnv('ADMIN_USERNAME')
  const storedHash = adminEnv('ADMIN_PASSWORD_HASH')
  if (!expectedUser || !storedHash) return false

  // 아이디가 틀려도 비밀번호 검증을 **항상** 수행한다.
  // 건너뛰면 응답 시간 차이로 아이디 존재 여부가 드러난다.
  const userOk = safeEqual(username.trim(), expectedUser)
  const passOk = verifyPassword(password, storedHash)

  // 화면에는 어느 쪽이 틀렸는지 알려주지 않지만(사용자명 존재 여부 은닉),
  // **서버 로그에는 남긴다.** 그렇지 않으면 설정 실수와 침입 시도가
  // 똑같이 보여서 운영자가 원인을 찾을 수 없다. 비밀값은 출력하지 않는다.
  if (!userOk || !passOk) {
    console.error('[admin] 로그인 실패', {
      usernameMatched: userOk,
      passwordMatched: passOk,
      storedHashShape: describeHashShape(storedHash),
    })
  }

  return userOk && passOk
}

/**
 * 저장된 해시의 **형태만** 설명한다. 값은 절대 출력하지 않는다.
 *
 * 붙여넣기 사고(값 잘림, 줄바꿈 삽입)를 로그만 보고 판별할 수 있게 한다.
 * `ok` 가 아니면 비밀번호가 맞아도 로그인은 실패한다.
 */
function describeHashShape(stored: string): string {
  const parts = stored.split('$')
  if (parts.length !== 3) return `잘못된 필드수(${parts.length}, 3이어야 함)`
  if (parts[0] !== 'scrypt') return `알 수 없는 접두어`
  const saltHex = parts[1] ?? ''
  const hashHex = parts[2] ?? ''
  const hashBytes = Buffer.from(hashHex, 'hex').length
  if (saltHex.length !== 64) return `salt hex 길이 ${saltHex.length} (64여야 함)`
  if (hashBytes !== SCRYPT_KEYLEN) {
    return `hash 바이트 ${hashBytes} (${SCRYPT_KEYLEN}여야 함 — 값이 잘렸을 수 있음)`
  }
  return 'ok'
}

// ── 쿠키 ────────────────────────────────────────────────────────────────────

/**
 * 세션을 발급한다.
 *
 * ⚠️ **폼으로 들어온 문자열이 아니라 설정값(`ADMIN_USERNAME`)을 토큰에 담는다.**
 *    유효한 사용자는 하나뿐이고, 사용자가 앞뒤 공백을 붙여 입력했더라도
 *    토큰에는 정규화된 값이 들어가야 한다. 제출값을 그대로 담으면
 *    `readToken` 의 사용자명 비교에서 걸려 발급 직후 세션이 무효가 된다.
 */
export async function startSession(): Promise<void> {
  const secret = adminEnv('ADMIN_SESSION_SECRET')
  const username = adminEnv('ADMIN_USERNAME')
  if (!secret) throw new Error('ADMIN_SESSION_SECRET 이 없습니다.')
  if (!username) throw new Error('ADMIN_USERNAME 이 없습니다.')

  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(username, secret), {
    httpOnly: true, // JS 로 읽을 수 없다 → XSS 로 세션 탈취 불가
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // CSRF 완화. 외부 사이트발 요청에 쿠키가 붙지 않는다
    path: '/admin', // 다른 경로 요청에는 아예 전송되지 않는다
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete({ name: SESSION_COOKIE, path: '/admin' })
}

/** 현재 요청의 관리자 세션. 없거나 무효면 `null`. */
export async function getAdminSession(): Promise<{ username: string } | null> {
  const secret = adminEnv('ADMIN_SESSION_SECRET')
  if (!secret) return null

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = readToken(token, secret)
  return payload ? { username: payload.u } : null
}
