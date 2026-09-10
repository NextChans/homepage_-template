import { z } from 'zod'
import { ADMIN_ROLES } from './roles'

/**
 * 계정 관리 폼 검증.
 *
 * ⚠️ 비밀번호 규칙을 한 곳에 모은다. 계정 생성·초기화·본인 변경이 서로 다른 규칙을
 *    갖게 되면 가장 느슨한 경로가 실질 정책이 된다.
 */

/** 개인정보 조회 화면을 지키는 자격증명이다. 12자 이상. */
export const PASSWORD_MIN_LENGTH = 12

/**
 * ⚠️ 앞뒤 공백을 **거부**한다. 실제로 겪은 사고다 — 비밀번호 관리자에서 붙여넣으면
 *    공백이 따라오는 경우가 있고, 그 공백까지 해시에 들어가면 브라우저에 타이핑해서
 *    로그인할 때 영구히 실패한다(서버는 입력 비밀번호를 trim 하지 않는다).
 *    생성 시점에 막는 것이 유일하게 확실하다. (ADR-017)
 */
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`)
  .max(200, '비밀번호가 너무 깁니다.')
  .refine((v) => v === v.trim(), '비밀번호 앞뒤에 공백이 있습니다. 붙여넣기 과정에서 따라온 공백일 수 있습니다.')

/** 아이디는 소문자·숫자·`.`·`_`·`-` 만. 대소문자만 다른 계정이 생기면 운영자가 혼동한다. */
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, '아이디는 3자 이상이어야 합니다.')
  .max(40, '아이디가 너무 깁니다.')
  .regex(/^[a-z0-9._-]+$/, '아이디는 영문 소문자·숫자·마침표·밑줄·하이픈만 쓸 수 있습니다.')

const role = z.enum(ADMIN_ROLES, { message: '권한을 선택해 주세요.' })

export const createUserSchema = z
  .object({
    username,
    role,
    password,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '두 비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '두 비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
    password,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: '두 비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })
  .refine((v) => v.currentPassword !== v.password, {
    message: '현재 비밀번호와 다른 비밀번호를 쓰세요.',
    path: ['password'],
  })

export type UserFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors: Record<string, string>
}

export const initialUserFormState: UserFormState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
}

/** zod 이슈를 필드별 메시지로 옮긴다. ⚠️ 입력값을 로그·메시지에 담지 않는다. */
export function toFieldErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
