import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { posix } from 'node:path'
const { chromium } = await import(process.env.LORE_PLAYWRIGHT_MODULE || 'playwright')

await mkdir('test-results', { recursive: true })
// Export the existing reader only in an ignored test copy. Production exports and UI stay unchanged.
const original = await readFile('src/components/FarmKit.jsx', 'utf8')
const reader = original.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
  (_, before, path, after) => before + posix.resolve('/src/components', path) + after)
const files = ['test-results/monster-reader-module.jsx', 'test-results/monster-reader-preview.jsx', 'test-results/monster-reader.html']
await writeFile(files[0], reader + '\nexport { MonSheet as MonsterReader }\n')
await writeFile(files[1], `
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '/src/index.css'
import '/src/themes.css'
import { MonsterReader } from './monster-reader-module.jsx'
import { MAPS } from '/src/lib/farmData'
import { MON_LORE } from '/src/lib/farmLore'
import { MON_GLOW_LORE } from '/src/lib/glowLore'
const monsters = MAPS.flatMap(map => map.mons)
window.monsterCases = monsters.map(mon => ({ id: mon.id, name: mon.name, map: mon.map, day: MON_LORE[mon.id], night: MON_GLOW_LORE[mon.id] }))
function Preview() {
  const [index, setIndex] = useState(0), [known, setKnown] = useState(true)
  window.qaMonster = (id, seen = true) => { setKnown(seen); setIndex(monsters.findIndex(mon => mon.id === id)) }
  const mon = monsters[index]
  return <main data-testid="monster-preview" data-monster-id={mon.id} data-known={known}>
    <MonsterReader mon={mon} seen={known ? 1 : 0} glow={known ? 1 : 0} onClose={() => {}}
      onNav={step => setIndex((index + step + monsters.length) % monsters.length)} pos={(index + 1) + ' / ' + monsters.length} />
  </main>
}
createRoot(document.getElementById('root')).render(<Preview />)
`)
await writeFile(files[2], '<!doctype html><html lang="th" data-theme="pixel-day"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Monster reader checks</title></head><body><div id="root"></div><script type="module" src="/test-results/monster-reader-preview.jsx"></script></body></html>')
const browser = await chromium.launch({ headless: true })
let assertions = 0, readings = 0
const check = (value, message) => { assert.ok(value, message); assertions++ }
try {
  for (const width of [390, 320, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 768, hasTouch: width < 768 })
    await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:4173/test-results/monster-reader.html')
    await page.getByTestId('mon-sheet').waitFor()
    if (width === 390) await page.evaluate(() => { document.documentElement.dataset.theme = 'pixel-night' })
    const all = await page.evaluate(() => window.monsterCases)
    check(all.length === 120, 'all creature IDs reach the existing reader')
    const cases = width === 390 ? all : [...new Set(all.map(mon => mon.map))].map(map =>
      all.filter(mon => mon.map === map).sort((a, b) => (b.day.length + b.night.length) - (a.day.length + a.night.length))[0])
    const fits = async id => {
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow: ' + id + ' at ' + width)
      check(await page.getByTestId('mon-sheet').locator('.px-inner').evaluateAll(blocks => blocks.every(el => el.scrollWidth <= el.clientWidth + 1)), 'reader text exceeds its frame: ' + id + ' at ' + width)
    }
    for (const mon of cases) {
      await page.evaluate(id => window.qaMonster(id), mon.id)
      await page.waitForFunction(id => document.querySelector('[data-testid="monster-preview"]').dataset.monsterId === id, mon.id)
      await page.getByRole('button', { name: 'ร่างปกติ', exact: true }).click()
      check(await page.getByTestId('mon-sheet').textContent().then(text => text.includes(mon.day)), 'complete normal lore: ' + mon.id)
      await fits(mon.id); readings++
      await page.getByTestId('mon-form-glow').click()
      check(await page.getByTestId('mon-sheet').textContent().then(text => text.includes(mon.night)), 'complete night lore: ' + mon.id)
      await fits(mon.id); readings++
    }
    const previousId = await page.getByTestId('monster-preview').getAttribute('data-monster-id')
    await page.getByTestId('mon-next').click()
    await page.waitForFunction(id => document.querySelector('[data-testid="monster-preview"]').dataset.monsterId !== id, previousId)
    await page.waitForFunction(() => document.querySelector('[data-testid="mon-form"] button').classList.contains('ring-2'))
    check(await page.getByRole('button', { name: 'ร่างปกติ', exact: true }).getAttribute('class').then(value => value.includes('ring-2')), 'navigation returns to normal form')
    await page.screenshot({ path: 'test-results/monsters-' + width + '.png', fullPage: true })
    await page.evaluate(id => window.qaMonster(id, false), all[0].id)
    await page.waitForFunction(() => document.querySelector('[data-testid="monster-preview"]').dataset.known === 'false')
    await page.getByRole('button', { name: 'ร่างปกติ', exact: true }).click()
    check(!await page.getByTestId('mon-sheet').textContent().then(text => text.includes(all[0].day)), 'unseen normal lore remains locked')
    await page.getByTestId('mon-form-glow').click()
    check(!await page.getByTestId('mon-sheet').textContent().then(text => text.includes(all[0].night)), 'unseen night lore remains locked')
    check(errors.length === 0, 'browser errors: ' + errors.join(' / '))
    await context.close()
  }
  check(await readFile('src/components/FarmKit.jsx', 'utf8') === original, 'production reader was not modified by the harness')
  console.log('Monster reader checks passed:', assertions, 'assertions,', readings, 'normal/night readings at 390/320/1280 px')
} finally {
  await browser.close()
  await Promise.all(files.map(file => unlink(file)))
}
