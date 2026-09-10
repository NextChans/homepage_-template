/**
 * 관리자 비밀번호 해시 생성기.
 *
 * 사용법:
 *   node scripts/hash-admin-password.mjs '실제-비밀번호'
 *
 * 출력된 문자열을 Vercel 환경변수 ADMIN_PASSWORD_HASH 에 넣는다(타입: Secret).
 * ADMIN_SESSION_SECRET 도 함께 출력한다.
 *
 * ⚠️ 비밀번호 원문은 어디에도 저장하지 않는다. 이 명령의 셸 히스토리도 지울 것:
 *      history -d $(history 1)   (bash)
 *    또는 명령 앞에 공백을 넣어 실행하면 히스토리에 남지 않는다(HISTCONTROL=ignorespace).
 */
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('사용법: node scripts/hash-admin-password.mjs \'비밀번호\'')
  process.exit(1)
}

if (password.length < 12) {
  console.error(`비밀번호가 너무 짧습니다 (${password.length}자). 12자 이상을 쓰세요.`)
  console.error('개인정보 조회 화면을 지키는 유일한 자격증명입니다.')
  process.exit(1)
}

const salt = randomBytes(32)
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })

console.log('')
console.log('Vercel → Settings → Environment Variables 에 아래를 등록하세요.')
console.log('타입은 셋 다 Secret, 환경은 Production (필요하면 Preview 도).')
console.log('')
console.log('ADMIN_USERNAME')
console.log('  (원하는 아이디를 직접 정하세요. 예: admin)')
console.log('')
console.log('ADMIN_PASSWORD_HASH')
console.log(`  scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
console.log('')
console.log('ADMIN_SESSION_SECRET')
console.log(`  ${randomBytes(32).toString('hex')}`)
console.log('')
console.log('⚠️ 셋 중 하나라도 없으면 /admin 은 404 가 됩니다(의도된 동작).')
console.log('⚠️ ADMIN_SESSION_SECRET 을 교체하면 기존 로그인 세션이 모두 무효화됩니다.')
console.log('')
