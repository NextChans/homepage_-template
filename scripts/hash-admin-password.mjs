/**
 * 관리자 자격증명 생성·검증기.
 *
 * 사용법
 *   생성: node scripts/hash-admin-password.mjs
 *         → 비밀번호를 **두 번** 입력받아(화면에 안 보임) 일치할 때만 해시를 만든다.
 *   검증: node scripts/hash-admin-password.mjs --verify 'scrypt$...$...'
 *         → 이미 등록한 해시에 어떤 비밀번호가 맞는지 로컬에서 확인한다.
 *           (로그인이 안 될 때 배포 없이 원인을 좁히는 용도)
 *
 * ⚠️ 비밀번호를 인자로 받지 않는다. 인자로 주면 `ps` 로 보이고 셸 히스토리에 남는다.
 *    stdin(숨김 입력)으로만 받는다.
 *
 * ⚠️ 왜 두 번 묻는가 — 실제로 겪은 사고다. 한 번만 묻는 방식으로 해시를 만들면
 *    숨겨진 입력에서 오타가 나도 알 수 없고, 배포 후 "아이디 또는 비밀번호가
 *    올바르지 않습니다" 만 보게 된다. 그 시점에는 오타인지 붙여넣기 사고인지
 *    구분할 방법이 없다. 생성 시점에 막는 것이 유일하게 확실한 방법이다.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64
const COST = { N: 16384, r: 8, p: 1 }
const MIN_LENGTH = 12

const CTRL_C = ''
const BACKSPACE = ''

/**
 * 파이프 입력을 줄 단위로 꺼내 쓰기 위한 큐.
 *
 * ⚠️ `readline` 을 호출마다 새로 만들면 두 번째 호출이 빈 문자열을 받는다
 *    (첫 인터페이스가 스트림을 이미 소비·종료한다). 테스트에서 실제로
 *    0자로 읽혀 확인했다. stdin 을 **한 번만** 통째로 읽어 나눠 쓴다.
 */
let pipedLines = null

async function readAllStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** 화면에 표시하지 않고 한 줄을 읽는다. */
async function readHidden(prompt) {
  if (!process.stdin.isTTY) {
    // 파이프로 들어온 경우(테스트·자동화). 숨길 대상이 없다.
    if (pipedLines === null) {
      pipedLines = (await readAllStdin()).split('\n')
      // 마지막 개행 뒤의 빈 원소는 입력이 아니다.
      if (pipedLines.at(-1) === '') pipedLines.pop()
    }
    return pipedLines.shift() ?? ''
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(prompt)
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let buf = ''
    const cleanup = () => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(wasRaw ?? false)
      stdin.pause()
    }
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        cleanup()
        process.stdout.write('\n')
        resolve(buf)
        return
      }
      if (ch === CTRL_C) {
        cleanup()
        process.stdout.write('\n')
        reject(new Error('취소됨'))
        return
      }
      if (ch === BACKSPACE || ch === '\b') {
        buf = buf.slice(0, -1)
        return
      }
      // 그 외 제어문자는 무시한다 (방향키 등)
      if (ch < ' ') return
      buf += ch
    }
    stdin.on('data', onData)
  })
}

function hash(password) {
  const salt = randomBytes(32)
  const digest = scryptSync(password, salt, KEYLEN, COST)
  return `scrypt$${salt.toString('hex')}$${digest.toString('hex')}`
}

/** 저장된 해시의 형태를 설명한다. 값 자체는 출력하지 않는다. */
function describeShape(stored) {
  const parts = stored.split('$')
  if (parts.length !== 3) {
    return `✗ 필드수 ${parts.length} (3이어야 함) — 값이 잘렸거나 합쳐졌습니다`
  }
  if (parts[0] !== 'scrypt') return "✗ 접두어가 'scrypt' 가 아닙니다"
  const saltHex = parts[1] ?? ''
  const hashHex = parts[2] ?? ''
  if (saltHex.length !== 64) return `✗ salt hex 길이 ${saltHex.length} (64여야 함)`
  if (hashHex.length !== 128) return `✗ hash hex 길이 ${hashHex.length} (128여야 함)`
  const bytes = Buffer.from(hashHex, 'hex').length
  if (bytes !== KEYLEN) {
    return `✗ hash 바이트 ${bytes} (${KEYLEN}여야 함) — hex 아닌 문자가 섞였습니다`
  }
  return '✓ 형식 정상'
}

function verify(password, stored) {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const saltHex = parts[1] ?? ''
  const hashHex = parts[2] ?? ''
  try {
    const expected = Buffer.from(hashHex, 'hex')
    if (expected.length !== KEYLEN) return false
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEYLEN, COST)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// ── --verify 모드 ────────────────────────────────────────────────────────────

if (process.argv[2] === '--verify') {
  const stored = (process.argv[3] ?? '').trim()
  if (!stored) {
    console.error("사용법: node scripts/hash-admin-password.mjs --verify 'scrypt$...$...'")
    process.exit(1)
  }
  console.log('')
  console.log(`해시 형식: ${describeShape(stored)}`)
  const candidate = await readHidden('확인할 비밀번호 (화면에 안 보임): ')
  const ok = verify(candidate, stored)
  console.log(`비밀번호 일치: ${ok ? '✓ 맞습니다' : '✗ 틀립니다'}`)

  // ⚠️ 여기가 이 모드의 핵심 진단이다.
  //    "붙여넣으면 맞는데 브라우저에서 타이핑하면 틀린" 사고의 원인은 거의 항상
  //    비밀번호 앞뒤의 공백이다. 서버는 폼 입력을 trim 하지 않으므로(공백도
  //    비밀번호의 일부) 공백이 포함된 해시는 타이핑으로는 절대 통과하지 못한다.
  const hasEdgeSpace = candidate !== candidate.trim()
  if (ok && hasEdgeSpace) {
    console.log('')
    console.log('⚠️ 방금 입력한 값에 **앞뒤 공백이 있습니다.**')
    console.log('   즉 이 해시는 공백이 포함된 비밀번호로 만들어졌습니다.')
    console.log('   브라우저에 타이핑해서 로그인하면 그 공백을 입력하지 않으므로')
    console.log('   **반드시 실패합니다.** 공백 없이 해시를 다시 만들어 교체하세요.')
  }
  if (!ok) {
    console.log('')
    if (verify(candidate.trim(), stored)) {
      console.log('⚠️ 앞뒤 공백을 제거하면 **맞습니다.**')
      console.log('   입력한 값에 공백이 딸려온 것입니다. 해시는 정상입니다.')
    } else {
      console.log('해시 형식이 정상인데 비밀번호가 틀리면, 해시를 만들 때 쓴 비밀번호가')
      console.log('지금 입력한 것과 다릅니다(오타 또는 앞뒤 공백).')
      console.log('인자 없이 다시 실행해 새로 만드세요 — 두 번 물어보고 공백도 거부합니다.')
    }
  }
  console.log('')
  process.exit(ok ? 0 : 1)
}

// ── 생성 모드 ────────────────────────────────────────────────────────────────

if (process.argv[2]) {
  console.error('⚠️ 비밀번호를 인자로 받지 않습니다 (ps·셸 히스토리에 남습니다).')
  console.error('   인자 없이 실행하면 숨김 입력으로 두 번 물어봅니다:')
  console.error('     node scripts/hash-admin-password.mjs')
  process.exit(1)
}

const password = await readHidden('비밀번호 (화면에 안 보임): ')

if (password.length < MIN_LENGTH) {
  console.error('')
  console.error(`✗ 비밀번호가 너무 짧습니다 (${password.length}자). ${MIN_LENGTH}자 이상을 쓰세요.`)
  console.error('  개인정보 조회 화면을 지키는 유일한 자격증명입니다.')
  console.error('')
  process.exit(1)
}

// ⚠️ 앞뒤 공백은 거부한다. 실제로 겪은 사고다 —
//    비밀번호 관리자에서 붙여넣으면 끝에 공백이 따라오는 경우가 있고, 그 공백까지
//    해시에 들어간다. 로컬에서 같은 값을 붙여넣어 검증하면 통과하지만, 브라우저에
//    **타이핑**해서 로그인할 때는 그 공백을 입력하지 않으므로 영원히 실패한다.
//    서버는 폼으로 들어온 비밀번호를 trim 하지 않기 때문에(공백도 비밀번호의 일부)
//    생성 시점에 막는 것이 맞다.
if (password !== password.trim()) {
  console.error('')
  console.error('✗ 비밀번호의 앞이나 뒤에 공백이 있습니다.')
  console.error('  붙여넣기 과정에서 따라온 공백일 가능성이 높습니다.')
  console.error('  이 상태로 해시를 만들면 브라우저에서 타이핑해 로그인할 때 반드시 실패합니다')
  console.error('  (서버는 입력된 비밀번호를 trim 하지 않습니다 — 공백도 비밀번호의 일부).')
  console.error('  공백 없이 다시 입력하세요.')
  console.error('')
  process.exit(1)
}

const confirm = await readHidden('한 번 더 입력: ')

if (password !== confirm) {
  console.error('')
  console.error('✗ 두 입력이 다릅니다. 오타가 있었습니다. 다시 실행하세요.')
  console.error('  (이 확인 단계가 없으면 오타가 그대로 해시로 굳어, 배포 후에야')
  console.error('   "아이디 또는 비밀번호가 올바르지 않습니다" 로만 드러납니다.)')
  console.error('')
  process.exit(1)
}

const stored = hash(password)

// 만든 해시가 실제로 그 비밀번호를 통과시키는지 즉시 자기검증한다.
if (!verify(password, stored)) {
  console.error('')
  console.error('✗ 자기검증 실패. 이 환경의 crypto 구현을 확인하세요.')
  console.error('')
  process.exit(1)
}

console.log('')
console.log('✓ 두 입력 일치, 자기검증 통과')
console.log('')
console.log('Vercel → Settings → Environment Variables 에 아래를 등록하세요.')
console.log('타입은 셋 다 Secret, 환경은 Production (필요하면 Preview 도).')
console.log('')
console.log('ADMIN_USERNAME')
console.log('  (원하는 아이디를 직접 정하세요. 예: admin)')
console.log('')
console.log('ADMIN_PASSWORD_HASH')
console.log(`  ${stored}`)
console.log('')
console.log('ADMIN_SESSION_SECRET')
console.log(`  ${randomBytes(32).toString('hex')}`)
console.log('')
console.log('⚠️ 붙여넣을 때 줄바꿈이 섞이지 않게 하세요. 값 앞뒤 공백은 서버가 trim 합니다.')
console.log('⚠️ 셋 중 하나라도 없으면 /admin 은 404 가 됩니다(의도된 동작).')
console.log('⚠️ 환경변수 저장 후 반드시 Redeploy 해야 반영됩니다.')
console.log('⚠️ ADMIN_SESSION_SECRET 을 교체하면 기존 로그인 세션이 모두 무효화됩니다.')
console.log('')
console.log('로그인이 안 되면 배포 없이 이렇게 확인할 수 있습니다:')
console.log("  node scripts/hash-admin-password.mjs --verify 'scrypt$...$...'")
console.log('')
