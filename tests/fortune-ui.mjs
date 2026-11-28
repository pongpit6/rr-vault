import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { PAIR_TEXT } from '../src/lib/fortune/taksaText.js'
const tarotCards = JSON.parse(await readFile(new URL('../src/lib/fortune/tarotCards.json', import.meta.url), 'utf8'))
const tarotTopics = JSON.parse(await readFile(new URL('../src/lib/fortune/tarotTopics.json', import.meta.url), 'utf8'))
const topics = ['work', 'money', 'love', 'health']
const { chromium } = await import(process.env.LORE_PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true })
let assertions = 0
const check = (value, message) => { assert.ok(value, message); assertions++ }
await mkdir('test-results', { recursive: true })
for (const width of [320, 390, 768, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 768, hasTouch: width < 768 })
  await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-11-28T10:12:00+07:00'))
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
  const hasTopics = async (reading, label) => {
    const rows = reading.locator('[data-topic]')
    check(await rows.count() === 4, label + ' includes all four topics')
    for (const [index, id] of topics.entries()) {
      check(await rows.nth(index).getAttribute('data-topic') === id && await rows.nth(index).locator('dt').isVisible(), label + ' shows ' + id)
    }
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
    await hasTopics(page.getByTestId('bazi-period-reading'), 'luck pillar')
    await fits(); await page.keyboard.press('Escape')
    if (birth.startsWith('1992')) {
      await page.getByTestId('bazi-luck').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/bazi-luck-${width}.png` })
      const overview = page.getByTestId('bazi-overview')
      const overviewReading = overview.getByTestId('bazi-overview-reading')
      const texts = []
      for (const [label, more] of [
        ['วันนี้', 'ดูปฏิกิริยาและยามของวันนี้'],
        ['ปีนี้', 'ดูปฏิกิริยาและช่วงวันที่ของปีนี้'],
        ['ยามนี้', 'ดูปฏิกิริยาของยามนี้'],
      ]) {
        await overview.getByRole('button', { name: label, exact: true }).click()
        await hasTopics(overviewReading, label)
        texts.push(await overviewReading.getByTestId('reading-topics').textContent())
        await overview.getByRole('button', { name: more }).click()
        const period = page.getByTestId(label === 'วันนี้' ? 'bazi-day-reading' : 'bazi-period-reading')
        await hasTopics(period, label + ' detail')
        check(await period.getByTestId('reading-topics').textContent() === texts.at(-1), label + ' agrees with its detail')
        await page.keyboard.press('Escape')
      }
      check(new Set(texts).size === 3, 'day, year and current hour use their own readings')
      await page.getByTestId('cal-1').click()
      const dayReading = page.getByTestId('bazi-day-reading')
      await hasTopics(dayReading, 'calendar day')
      const summary = page.getByTestId('hour-0').locator(':scope > summary')
      await summary.click()
      check(await page.getByTestId('hour-0').getAttribute('open') !== null, 'hour reading opens')
      check(await summary.locator('.px-disclosure-icon').isVisible(), 'hour uses pixel disclosure')
      await hasTopics(page.getByTestId('hour-0').getByTestId('bazi-hour-reading'), 'selected hour')
      const lateHour = page.getByTestId('hour-12')
      await lateHour.locator(':scope > summary').click()
      await hasTopics(lateHour.getByTestId('bazi-hour-reading'), 'last hour')
      await fits(); await page.keyboard.press('Escape')
    }
  }
  await load('bazi&unknown=1')
  check(await page.getByTestId('bazi-luck').textContent().then(text => text.includes('ต้องทราบเวลาเกิด')), 'unknown time still explained')
  await fits()

  await load('taksa')
  const current = page.getByTestId('taksa-current-reading')
  await hasTopics(current, 'current pair')
  check(await current.textContent().then(text => text.includes('เสวย') && text.includes('แทรก')), 'each area explains the role of the pair')
  for (const text of await page.locator('[data-testid="taksa-c10"] svg text').all()) {
    check(await text.evaluate(el => el.getBBox().x >= -1), `chart axis label clipped at ${width}`)
  }
  await fits()
  await page.getByTestId('taksa-c10').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `test-results/taksa-chart-${width}.png` })
  await page.getByTestId('taksa-current').click()
  await page.locator('.ui-sheet').waitFor(); await fits()
  const pair = page.getByTestId('taksa-pair-reading')
  await hasTopics(pair, 'pair detail')
  check(await current.textContent() === await pair.textContent(), 'current and full pair readings agree')
  await page.getByText('ที่มาของคำอ่านและคะแนน', { exact: true }).click()
  const explanation = page.getByTestId('pair-sheet').locator('p.whitespace-pre-line')
  check(await explanation.isVisible() && await explanation.textContent().then(text => Object.values(PAIR_TEXT).some(row => Object.values(row).includes(text))), 'pair explanation still available')
  await page.keyboard.press('Escape')

  await load('tarot')
  const tarotSheet = page.getByTestId('tarot-sheet')
  const reading = tarotSheet.getByTestId('tarot-reading')
  const areas = tarotSheet.getByTestId('tarot-topic-reading')
  const upright = tarotSheet.getByRole('button', { name: 'ตั้งตรง', exact: true })
  const reversed = tarotSheet.getByRole('button', { name: 'กลับหัว', exact: true })
  const cases = width === 390 ? tarotCards : tarotCards.slice(0, 1)
  for (const [index, card] of cases.entries()) {
    for (const [orientation, button] of [['upright', upright], ['reversed', reversed]]) {
      await button.click()
      const text = await areas.textContent()
      check(tarotTopics[card.id][orientation].flat().every(part => text.includes(part)), orientation + ' advice for all four topics: ' + card.id)
      check(await areas.locator('[data-topic]').count() === 4, orientation + ' has four topic rows')
    }
    await fits()
    if (index < cases.length - 1) await tarotSheet.getByTestId('tarot-next').click()
  }
  check(await tarotSheet.getByTestId('tarot-effect').isVisible(), 'game bonus remains available')
  check(await tarotSheet.getByTestId('tarot-lore').isVisible(), 'card lore remains available')
  await reading.getByText('ที่มาของคำอ่านและคำถามก่อนนอน', { exact: true }).click()
  check(await reading.getByText('ก่อนนอนลองถามตัวเอง', { exact: true }).isVisible(), 'reflection remains available')
  await page.screenshot({ path: `test-results/tarot-reading-${width}.png` })
  await load('tarot-today')
  const savedDraw = page.getByTestId('tarot-topic-reading')
  await hasTopics(savedDraw, 'saved daily draw')
  check(await savedDraw.textContent().then(text => tarotTopics.pentacles_02.reversed.flat().every(part => text.includes(part))), 'saved reversed draw uses the new advice')
  await fits()

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
