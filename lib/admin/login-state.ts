/**
 * 로그인 폼 상태 타입과 초깃값.
 *
 * ⚠️ `'use server'` 파일(`app/admin/actions.ts`)에서 export 하면 안 된다 —
 *    Next 는 `'use server'` 모듈이 **async 함수만** export 하도록 강제한다
 *    (객체·상수를 내보내면 빌드가 깨진다: invalid-use-server-value).
 *    그래서 상태 타입·초깃값은 이 일반 모듈에 둔다.
 */
export type LoginState = { error: string }

export const initialLoginState: LoginState = { error: '' }
