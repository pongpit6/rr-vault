import assert from 'node:assert/strict'
const { chromium } = await import(process.env.LORE_PLAYWRIGHT_MODULE || 'playwright')
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ headless: true })
const sizes = [320, 390, 1280]
let assertions = 0
await mkdir('test-results', { recursive: true })
const check = (value, message) => { assert.ok(value, message); assertions++ }
for (const width of sizes) {
  const context = await browser.newContext({ viewport: { width, height: 850 } })
  // Tests use isolated local fixtures; no authenticated data or external requests.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost' ? route.continue() : route.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const load = async panel => {
    await page.goto('http://127.0.0.1:4173/tests/lore-preview.html?panel=' + panel)
    await page.getByTestId('lore-preview').waitFor()
    if (width === 390) await page.evaluate(() => { document.documentElement.dataset.theme = 'pixel-night' })
  }
  const quiet = async () => check(await page.evaluate(() => window.__mutations) === 0, 'reading changed gameplay at ' + width)
  const fits = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at ' + width)
  const close = async () => { await page.keyboard.press('Escape'); await page.locator('.ui-sheet').waitFor({ state: 'detached' }) }

  await load('catalog')
  check(await page.locator('details[data-testid^="lore-"]').count() === 243, 'all lore entries rendered')
  for (const section of await page.locator('section[data-category]').all()) {
    const first = section.locator('details').first()
    await first.locator('summary').click()
    check(await first.locator('p').isVisible(), 'category readable')
  }
  await fits(); await quiet()

  await load('reader')
  await page.getByRole('button', { name: 'อ่านเรื่องราว: จิ้งจอกมิ้นต์', exact: true }).click()
  await page.getByTestId('lore-reader').waitFor()
  check(await page.getByTestId('lore-pets-pet_fox').locator('p').isVisible(), 'reader opens')
  await fits(); await quiet(); await close()
  check(await page.evaluate(() => document.body.style.overflow) !== 'hidden', 'reader releases scroll')

  await load('hero')
  for (const name of ['ชุดเดินทางผ้าฝ้าย', 'ชุดหนังนักผจญภัย', 'ชุดนักสะสม', 'ชุดพ่อค้าเดินทาง', 'ชุดขุนนางนักเดินทาง', 'ชุดเจ้าครองเกาะ']) {
    await page.getByRole('button', { name: 'อ่านเรื่องราว: ' + name, exact: true }).click()
    check(await page.locator('.ui-sheet details[open] p').isVisible(), 'outfit readable: ' + name)
    await fits(); await quiet(); await close()
  }

  await load('tree')
  for (const id of ['blade', 'storm', 'bless', 'revive', 'arcane', 'meteor', 'eye', 'hawk']) {
    await page.getByTestId('lore-open-skills-' + id).click()
    check(await page.getByTestId('lore-skills-' + id).locator('p').isVisible(), 'skill readable')
    await fits(); await quiet(); await close()
  }
  await page.getByTestId('skill-tree').getByRole('button').filter({ hasText: /^\+ \(/ }).first().click()
  check(await page.evaluate(() => window.__mutations) === 1, 'upgrade still works')

  await load('skills')
  await page.getByTestId('lore-open-lifeSkills-slash').click()
  check(await page.getByTestId('lore-lifeSkills-slash').locator('p').isVisible(), 'life skill readable on touch')
  await fits(); await quiet(); await close()

  await load('shadows')
  await page.getByTestId('shadow-sh_ninja').click()
  await page.getByTestId('lore-shadows-sh_ninja').locator('summary').click()
  check(await page.getByTestId('lore-shadows-sh_ninja').locator('p').isVisible(), 'shadow readable')
  check(await page.getByRole('button', { name: 'ส่งออกรบ', exact: true }).isVisible(), 'equip action remains separate')
  await fits(); await quiet()
  await page.getByRole('button', { name: 'ส่งออกรบ', exact: true }).click()
  check(await page.evaluate(() => window.__mutations) === 1, 'shadow equip still works')

  await load('party')
  for (const id of ['knight', 'healer', 'mage', 'ranger']) {
    await page.getByTestId('party-' + id).click()
    await page.getByTestId('lore-party-' + id).locator('summary').click()
    check(await page.getByTestId('lore-party-' + id).locator('p').isVisible(), 'party history readable')
    if (id === 'mage') check((await page.getByTestId('party-sheet').textContent()).includes('จะเข้าร่วมเมื่อ'), 'locked member stays locked')
    await fits(); await quiet(); await close()
  }
  await page.getByTestId('lore-pets-pet_fox').locator('summary').click()
  await page.getByTestId('lore-petStages-pet_fox:2').locator('summary').click()
  await fits(); await quiet()

  await load('gear')
  await page.getByTestId('enh-weapon').click()
  await page.getByTestId('lore-gear-weapon:1').locator('summary').click()
  await page.getByText('ที่มาของอุปกรณ์ขั้นอื่น', { exact: true }).click()
  await page.getByTestId('lore-gear-weapon:4').locator('summary').click()
  check(await page.getByTestId('lore-gear-weapon:4').locator('p').isVisible(), 'other gear tiers readable')
  await fits(); await quiet()
  await page.getByTestId('enh-go').click()
  check(await page.evaluate(() => window.__mutations) === 1, 'enhancement still works')
  await close()

  await load('shop')
  await page.getByTestId('shop-pet').locator('button').first().click()
  await page.getByTestId('lore-pets-pet_fox').locator('summary').click()
  await fits(); await quiet(); await close()
  await page.getByRole('button', { name: /นกฮูกหิมะ/ }).click()
  const buy = page.getByRole('button', { name: /^ซื้อ / })
  const priceBefore = await buy.textContent()
  check(priceBefore.includes('10'), 'purchase price is visible')
  await page.getByTestId('lore-pets-pet_owl').locator('summary').click()
  check(await buy.textContent() === priceBefore, 'reading keeps price unchanged')
  await fits(); await quiet(); await close()
  await page.getByRole('button', { name: /ชุดวันเกิดอายุ 30/ }).click()
  await page.getByTestId('lore-skins-bday_30').locator('summary').click()
  check(await page.getByTestId('lore-skins-bday_30').locator('p').isVisible(), 'birthday fallback readable')
  await fits(); await quiet(); await close()

  await load('map')
  await page.getByTestId('island-atlas').locator(':scope > summary').click()
  for (const id of ['town', 'meadow', 'forest', 'mine', 'swamp', 'desert', 'snow', 'volcano', 'shadow']) {
    await page.getByTestId('atlas-' + id).click()
    check(await page.getByTestId('lore-places-' + id).locator('p').isVisible(), 'place readable')
    await page.waitForFunction(() => [...document.querySelectorAll('.ui-sheet img')].every(img => img.complete && img.naturalWidth > 0))
    check(await page.locator('.ui-sheet img').evaluate(img => img.complete && img.naturalWidth > 0), 'existing map asset loads')
    await fits(); await quiet(); await close()
  }
  await page.screenshot({ path: 'test-results/atlas-' + width + '.png', fullPage: true })

  await load('festival')
  const rows = await page.getByTestId('festival-calendar').locator(':scope > details').all()
  check(rows.length === 8, 'all festivals present')
  for (const row of rows) {
    await row.locator(':scope > summary').click()
    const lore = row.locator('details')
    await lore.locator('summary').click()
    check(await lore.locator('p').isVisible(), 'festival lore readable')
  }
  await fits(); await quiet()

  await load('building')
  await page.getByRole('button', { name: 'เปิดศาลากลาง', exact: true }).click()
  await page.getByTestId('lore-buildings-hall').locator('summary').click()
  await fits(); await quiet(); await close()
  await page.getByRole('button', { name: 'เปิดฟาร์ม', exact: true }).click()
  await page.getByTestId('lore-buildings-farm').locator('summary').click()
  await fits(); await quiet(); await close()

  check(errors.length === 0, 'browser errors: ' + errors.join(' / '))
  await context.close()
}
await browser.close()
console.log('Lore UI checks passed:', assertions, 'assertions at', sizes.join('/'), 'px')
