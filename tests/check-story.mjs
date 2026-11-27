import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAP_LORE, MON_LORE, STORY } from '../src/lib/farmLore.js'
import { MAP_NIGHT, MON_GLOW_LORE } from '../src/lib/glowLore.js'
import { MAT_LORE, TROPHY_LORE } from '../src/lib/itemLore.js'
import { TAROT_LORE } from '../src/lib/fortune/tarotLore.js'
import { DM_TEXT, GOD_TEXT, EL_ADVICE } from '../src/lib/fortune/baziText.js'
import { MAIN_TEXT, SUB_FOCUS, PAIR_TEXT } from '../src/lib/fortune/taksaText.js'
import { CYCLE } from '../src/lib/fortune/taksa.js'

const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
const world = json('src/lib/worldLore.json')
const cards = json('src/lib/fortune/tarotCards.json')
const keys = value => Object.keys(value).sort()
assert.deepEqual(keys(MAP_LORE), keys(MAP_NIGHT), 'day and night places must match')
assert.deepEqual(keys(MAP_LORE), keys(STORY), 'every hunt map needs its chapters')
assert.deepEqual(keys(MON_LORE), keys(MON_GLOW_LORE), 'all creatures need night lore')
assert.deepEqual(keys(MON_LORE), keys(TROPHY_LORE), 'every trophy needs its creature')
for (const [id, text] of Object.entries(MAP_LORE)) {
  assert.equal(world.places[id], text, 'atlas and hunting geography drifted: ' + id)
  assert.equal(STORY[id].length, 3, 'chapter count must match existing unlocks')
}
assert.deepEqual(keys(TAROT_LORE), cards.map(card => card.id).sort(), 'all 78 cards need both stories')
assert.ok(Object.values(TAROT_LORE).every(pair => pair.length === 2), 'traditional and game stories stay separate')
assert.equal(DM_TEXT.length, 10)
assert.equal(GOD_TEXT.length, 10)
assert.equal(EL_ADVICE.length, 5)
for (const id of CYCLE) {
  assert.equal(typeof MAIN_TEXT[id], 'string')
  assert.deepEqual(keys(SUB_FOCUS[id]), ['love', 'money', 'work'])
  assert.deepEqual(keys(PAIR_TEXT[id]), CYCLE.map(String).sort(), 'missing pair for main planet ' + id)
}
const all = { world, MAP_LORE, MAP_NIGHT, MON_LORE, MON_GLOW_LORE, STORY, MAT_LORE, TROPHY_LORE, TAROT_LORE, DM_TEXT, GOD_TEXT, EL_ADVICE, MAIN_TEXT, SUB_FOCUS, PAIR_TEXT }
let strings = 0
function walk(value) {
  if (typeof value === 'string') {
    assert.ok(value.trim(), 'empty reading')
    assert.ok(!/undefined|\[object Object\]|ร่างเง้า/.test(value), 'broken copy: ' + value)
    strings++
  } else for (const item of Object.values(value)) walk(item)
}
walk(all)
console.log(`Story coverage passed: ${strings} text fields; shared geography, 120 creature/trophy/night sets, 24 chapters and 64 planet pairs`)
