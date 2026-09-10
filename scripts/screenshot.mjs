/**
 * 디자인 회귀 확인용 스크린샷 캡처.
 *
 * 사용법:
 *   npm run build && npm run start -- -p 3100 &
 *   node scripts/screenshot.mjs [출력디렉터리] [베이스URL]
 *
 * 라이트/다크 × 주요 페이지 + 모바일 홈을 캡처한다.
 * 스크롤 리빌(.reveal)이 발화된 뒤 촬영하기 위해 smooth scroll 을 끄고 순차 스크롤한다.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? '.screenshots'
const base = process.argv[3] ?? 'http://localhost:3100'

const pages = [
  ['home', '/', true],
  ['services', '/services', true],
  ['service-detail', '/services/efin-license', true],
  ['about', '/about', true],
  ['contact', '/contact', true],
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()

async function settle(page) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1200)
}

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  })
  const page = await ctx.newPage()
  for (const [name, path, fullPage] of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await settle(page)
    await page.screenshot({ path: `${outDir}/${scheme}-${name}.png`, fullPage })
  }
  await ctx.close()
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})
const mp = await mobile.newPage()
for (const [name, path] of pages) {
  await mp.goto(base + path, { waitUntil: 'networkidle' })
  await settle(mp)
  await mp.screenshot({ path: `${outDir}/mobile-${name}.png`, fullPage: true })
}
await mobile.close()

await browser.close()
console.log(`screenshots → ${outDir}`)
