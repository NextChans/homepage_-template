#!/usr/bin/env node
/**
 * 파비콘 · 앱 아이콘 · OG 이미지를 `content/brand.ts` 의 심볼 도형에서 생성한다.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * ## 왜 런타임(`ImageResponse`)이 아니라 미리 생성해 커밋하는가
 *
 * Next.js 의 `app/opengraph-image.tsx` + `ImageResponse` 로도 만들 수 있지만,
 * **폰트 의존이 런타임으로 넘어간다.** 실패하면 배포 후에야 드러나고, OG 이미지는
 * 깨져도 화면상 아무 증상이 없어 **깨진 걸 모른 채 지나간다.** 미리 생성해 커밋하면
 * 결과물을 눈으로 확인하고 저장소에 고정할 수 있다.
 *
 * ## 왜 OG 이미지에 워드마크 텍스트가 없는가
 *
 * 이 컨테이너에는 **DejaVu Sans 밖에 없다** (브랜드 서체 Inter/Manrope 없음).
 * 잘못된 서체로 렌더한 워드마크를 PNG 에 구우면 **영구히 남는다.** 사명은 OG
 * 카드의 **제목 텍스트**(`app/layout.tsx` 의 `openGraph.title`)로 이미 노출되므로,
 * 이미지는 심볼만 둔다.
 *
 * → 이미지 안에 워드마크를 넣으려면 **브랜드 서체 파일을 저장소에 커밋**하고 이
 *   스크립트에 텍스트 렌더를 추가한다. 폰트 라이선스(웹/임베딩 허용)를 먼저 확인할 것.
 *
 * ## 도형은 이 파일에 복사하지 않는다
 *
 * `content/brand.ts` 에서 **읽어온다.** 복사해 두면 심볼을 다듬을 때 화면과 파비콘이
 * 갈린다. 추출이 실패하면 **조용히 넘어가지 않고 즉시 실패한다** — 잘못된 자산을
 * 만드는 것보다 낫다.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── content/brand.ts 에서 도형·색 추출 ───────────────────────────────────────

const source = readFileSync(join(root, 'content/brand.ts'), 'utf8')

/** 지정한 export 의 값 구간을 잘라낸다. 다음 `export` 또는 파일 끝까지. */
function sliceExport(name) {
  const start = source.indexOf(`export const ${name}`)
  if (start === -1) throw new Error(`content/brand.ts 에서 ${name} 를 찾지 못했습니다`)
  const rest = source.slice(start + `export const ${name}`.length)
  const next = rest.indexOf('\nexport const ')
  return next === -1 ? rest : rest.slice(0, next)
}

/**
 * 여러 줄 문자열 연결(`'a' + 'b'`)과 그 사이 주석을 견디도록,
 * 구간 안의 **모든 단일 인용 문자열을 이어붙인다.**
 */
function readConcatString(name) {
  const chunk = sliceExport(name)
  const parts = chunk.match(/'([^']*)'/g)
  if (!parts?.length) throw new Error(`${name} 의 문자열 리터럴을 찾지 못했습니다`)
  return parts.map((p) => p.slice(1, -1)).join('')
}

function readColor(key) {
  const chunk = sliceExport('brandColors')
  const m = chunk.match(new RegExp(`${key}:\\s*'(#[0-9A-Fa-f]{3,8})'`))
  if (!m?.[1]) throw new Error(`brandColors.${key} 를 찾지 못했습니다`)
  return m[1]
}

const SHIELD_PATH = readConcatString('SHIELD_PATH')
const SHIELD_VIEWBOX = readConcatString('SHIELD_VIEWBOX')
const navy = readColor('navy')
const navyDeep = readColor('navyDeep')
const gold = readColor('gold')

// 추출 결과 검증. 도형이 뭉개진 자산을 만드는 것보다 여기서 죽는 게 낫다.
if (!SHIELD_PATH.startsWith('M') || SHIELD_PATH.length < 120) {
  throw new Error(`SHIELD_PATH 가 이상합니다 (길이 ${SHIELD_PATH.length})`)
}
// 사선 2개가 구멍으로 들어 있어야 한다 → 서브패스가 3개(방패 + 사선 2)
const subpaths = (SHIELD_PATH.match(/M/g) ?? []).length
if (subpaths !== 3) {
  throw new Error(`서브패스가 3개여야 합니다(방패 + 사선 2). 현재 ${subpaths}개`)
}
if (SHIELD_VIEWBOX !== '0 0 28 33') {
  throw new Error(`뷰박스가 바뀌었습니다: ${SHIELD_VIEWBOX} — 아래 배치 계산을 다시 할 것`)
}

// ── 심볼 배치 ───────────────────────────────────────────────────────────────
//
// 뷰박스는 28×33 이지만 **도형이 차지하는 실제 영역**은 x 2.5–25.5, y 2.6–30.4 다.
// 뷰박스 기준으로 중앙 정렬하면 심볼이 위로 치우친다. 실제 영역으로 계산한다.

const INK_X = 2.5
const INK_Y = 2.6
const INK_W = 23 // 25.5 - 2.5
const INK_H = 27.8 // 30.4 - 2.6

/** 캔버스 `size` 안에 심볼 높이 `targetH` 로 중앙 배치하는 transform 을 만든다. */
function place(canvasW, canvasH, targetH) {
  const scale = targetH / INK_H
  const x = (canvasW - INK_W * scale) / 2 - INK_X * scale
  const y = (canvasH - targetH) / 2 - INK_Y * scale
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})`
}

const shield = (transform, fill) =>
  `<g transform="${transform}"><path d="${SHIELD_PATH}" fill="${fill}" fill-rule="evenodd" clip-rule="evenodd"/></g>`

const gradient = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="${navy}"/><stop offset="1" stop-color="${navyDeep}"/>` +
  `</linearGradient>`

// ── 1. 파비콘 (app/icon.svg) ────────────────────────────────────────────────
//
// ⚠️ 배경을 넣는다. 투명 배경 + 네이비 심볼로 두면 **다크 모드 탭에서 안 보인다.**
//    네이비 라운드 사각형 + 골드 심볼이면 어느 탭 배경에서도 읽힌다.

const iconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
  `<defs>${gradient('bg')}</defs>` +
  `<rect width="32" height="32" rx="7" fill="url(#bg)"/>` +
  shield(place(32, 32, 23), gold) +
  `</svg>`

writeFileSync(join(root, 'app/icon.svg'), `${iconSvg}\n`)
console.log('app/icon.svg            32×32   (네이비 배경 + 골드 심볼)')

// ── 2. 앱 아이콘 (app/apple-icon.png) ───────────────────────────────────────
//
// ⚠️ iOS 는 아이콘에 **자체적으로 라운드를 적용**한다. 여기서 라운드를 주면 모서리가
//    이중으로 깎인다. 정사각 풀블리드로 둔다. 투명도도 쓰지 않는다(검게 나온다).

const appleSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">` +
  `<defs>${gradient('bg')}</defs>` +
  `<rect width="180" height="180" fill="url(#bg)"/>` +
  shield(place(180, 180, 112), gold) +
  `</svg>`

await sharp(Buffer.from(appleSvg)).png().toFile(join(root, 'app/apple-icon.png'))
console.log('app/apple-icon.png      180×180 (풀블리드 — iOS 가 라운드를 적용한다)')

// ── 3. OG 이미지 (app/opengraph-image.png) ──────────────────────────────────
//
// 1200×630 은 OG 권장비(1.91:1). 텍스트가 없으므로 심볼을 크게 두고 여백을 넓게 둔다.

const ogSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
  `<defs>${gradient('bg')}</defs>` +
  `<rect width="1200" height="630" fill="url(#bg)"/>` +
  shield(place(1200, 630, 300), gold) +
  `</svg>`

await sharp(Buffer.from(ogSvg)).png().toFile(join(root, 'app/opengraph-image.png'))
console.log('app/opengraph-image.png 1200×630 (심볼만 — 사명은 OG 제목 텍스트로 노출)')
