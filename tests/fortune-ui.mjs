import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { GOD_TEXT } from '../src/lib/fortune/baziText.js'
import { PAIR_TEXT } from '../src/lib/fortune/taksaText.js'
const tarotCards = JSON.parse(await readFile(new URL('../src/lib/fortune/tarotCards.json', import.meta.url), 'utf8'))
const { chromium } = await import(process.env.LORE_PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
let assertions = 0
const check = (value, message) => { assert.ok(value, message); assertions++ }
await mkdir('test-results', { recursive: true })
for (const width of [320, 390, 768, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 768, hasTouch: width < 768 })
  await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const load = async panel => {
    await page.goto('http://127.0.0.1:4173/tests/lore-preview.html?panel=' + panel)
    await page.getByTestId('lore-preview').waitFor()
    if (width === 390) await page.evaluate(() => { document.documentElement.dataset.theme = 'pixel-night' })
  }
  const fits = async () => {
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `page overflow at ${width}`)
    check(await page.evaluate(() => window.__mutations === 0), 'reading changed saved data')
  }
  const chipsFit = async selector => check(await page.locator(selector).evaluateAll(cards => cards.every(card => {
    const chip = card.querySelector('.fortune-status'), box = card.getBoundingClientRect(), badge = chip?.getBoundingClientRect()
    return !chip || (badge.left >= box.left && badge.right <= box.right && chip.scrollWidth <= chip.clientWidth + 1)
  })), `badge exceeds card at ${width}`)

  await load('statuses')
  check(await page.locator('.fortune-status').count() === 5, 'all five ratings covered')
  check(await page.locator('.fortune-status').first().textContent() === 'ใส่ใจ', 'compact worst-level wording')
  check(await page.locator('.fortune-status').first().getAttribute('title') === 'ควรใส่ใจมาก', 'full wording retained')
  await chipsFit('[data-testid="status-card"]'); await fits()

  for (const birth of ['1992-03-11&sex=m', '1990-01-01&sex=f', '2000-12-31&sex=m']) {
    await load('bazi&date=' + birth)
    const cards = page.getByTestId('bazi-luck-cards').locator('button')
    check(await cards.count() >= 8, 'luck pillars render')
    await chipsFit('[data-testid="bazi-luck-cards"] > button'); await fits()
    await cards.last().click()
    await page.locator('.ui-sheet').waitFor()
    await fits(); await page.keyboard.press('Escape')
    if (birth.startsWith('1992')) {
      await page.getByTestId('bazi-luck').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/bazi-luck-${width}.png` })
      await page.getByTestId('cal-1').click()
      const dayReading = page.getByTestId('bazi-day-reading')
      check(await dayReading.textContent().then(text => GOD_TEXT.some(role => text.includes(role.period))), 'day reading shows the full role explanation and advice')
      check(await dayReading.evaluate(el => getComputedStyle(el).whiteSpace === 'pre-line'), 'day reading keeps paragraph breaks')
      const summary = page.getByTestId('hour-0').locator('summary')
      await summary.click()
      check(await page.getByTestId('hour-0').getAttribute('open') !== null, 'hour reading opens')
      check(await summary.locator('.px-disclosure-icon').isVisible(), 'hour uses pixel disclosure')
      check(await page.getByTestId('hour-0').locator('p').textContent().then(text => GOD_TEXT.some(role => text === role.period)), 'hour detail shows the role advice')
      await fits(); await page.keyboard.press('Escape')
    }
  }
  await load('bazi&unknown=1')
  check(await page.getByTestId('bazi-luck').textContent().then(text => text.includes('ต้องทราบเวลาเกิด')), 'unknown time still explained')
  await fits()

  await load('taksa')
  const pairReading = page.getByTestId('taksa-tab').locator('.px-inner.whitespace-pre-line').first()
  check(await pairReading.textContent().then(text => Object.values(PAIR_TEXT).some(row => Object.values(row).includes(text))), 'main/sub-period explanation is complete')
  check(await page.getByTestId('taksa-now').textContent().then(text => text.includes('ภาพรวมช่วงยาว') && text.includes('เรื่องที่เด่นในช่วงย่อย')), 'main and sub-period roles are explained up front')
  check(await pairReading.evaluate(el => getComputedStyle(el).whiteSpace === 'pre-line' && Number(getComputedStyle(el).fontWeight) < 600), 'pair reading is spaced and not an all-bold paragraph')
  for (const text of await page.locator('[data-testid="taksa-c10"] svg text').all()) {
    check(await text.evaluate(el => el.getBBox().x >= -1), `chart axis label clipped at ${width}`)
  }
  await fits()
  await page.getByTestId('taksa-c10').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `test-results/taksa-chart-${width}.png` })
  await page.getByTestId('taksa-current').click()
  await page.locator('.ui-sheet').waitFor(); await fits()
  await page.keyboard.press('Escape')

  await load('tarot')
  const tarotSheet = page.getByTestId('tarot-sheet')
  const reading = tarotSheet.getByTestId('tarot-reading')
  const upright = tarotSheet.getByRole('button', { name: 'ตั้งตรง', exact: true })
  const reversed = tarotSheet.getByRole('button', { name: 'กลับหัว', exact: true })
  const cases = width === 390 ? tarotCards : tarotCards.slice(0, 1)
  for (const [index, card] of cases.entries()) {
    await upright.click()
    check(await reading.textContent().then(text => [card.theme, card.light, card.shadow, card.action, card.q].every(part => text.includes(part))), 'complete upright reading: ' + card.id)
    await reversed.click()
    check(await reading.textContent().then(text => text.includes(card.rev) && text.includes(card.q) && !text.includes(card.action)), 'reversed advice is specific to its orientation: ' + card.id)
    await fits()
    if (index < cases.length - 1) await tarotSheet.getByTestId('tarot-next').click()
  }
  check(await tarotSheet.getByTestId('tarot-effect').isVisible(), 'game bonus remains available')
  check(await tarotSheet.getByTestId('tarot-lore').isVisible(), 'card lore remains available')
  await page.screenshot({ path: `test-results/tarot-reading-${width}.png` })

  await load('atlas')
  const disclosure = page.getByTestId('island-atlas').locator(':scope > summary')
  check(await disclosure.evaluate(el => getComputedStyle(el).listStyleType === 'none'), 'native triangle removed')
  check(await disclosure.locator('.px-disclosure-icon').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(251, 113, 133)'), 'existing pink pixel button style')
  check(await disclosure.locator('.px-disclosure-icon > span').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(el).clipPath.startsWith('polygon(') && el.textContent === ''), 'white triangle cannot render as emoji')
  check(await disclosure.evaluate(el => el.getBoundingClientRect().height >= 40), 'touch target remains usable')
  await disclosure.focus(); await page.keyboard.press('Enter')
  check(await page.getByTestId('atlas-town').isVisible(), 'Enter expands disclosure')
  check(await disclosure.locator('.px-disclosure-icon > span').evaluate(el => getComputedStyle(el).transform === 'matrix(0, 1, -1, 0, 0, 0)'), 'arrow points down when expanded')
  await page.keyboard.press('Space')
  check(!await page.getByTestId('atlas-town').isVisible(), 'Space collapses disclosure')
  await disclosure.click(); await disclosure.blur(); await fits()
  await page.screenshot({ path: `test-results/pixel-disclosure-${width}.png`, fullPage: true })
  check(errors.length === 0, errors.join('\n'))
  await context.close()
}
await browser.close()
console.log(`Fortune/disclosure checks passed: ${assertions} assertions at 320/390/768/1280 px`)
