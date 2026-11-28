import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MAP_LORE, MON_LORE, STORY } from '../src/lib/farmLore.js'
import { MAP_NIGHT, MON_GLOW_LORE } from '../src/lib/glowLore.js'
import { MAT_LORE, TROPHY_LORE } from '../src/lib/itemLore.js'
import { TAROT_LORE } from '../src/lib/fortune/tarotLore.js'
import { DM_TEXT, GOD_TEXT, EL_ADVICE } from '../src/lib/fortune/baziText.js'
import { natal, rate } from '../src/lib/fortune/bazi.js'
import { eventsOf } from '../src/lib/fortune/baziReact.js'
import { baziTopics } from '../src/lib/fortune/baziTopics.js'
import { MAIN_TEXT, SUB_FOCUS, PAIR_TEXT } from '../src/lib/fortune/taksaText.js'
import { taksaMainTopics, taksaTopics } from '../src/lib/fortune/taksaTopics.js'
import { CYCLE } from '../src/lib/fortune/taksa.js'

const json = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
const world = json('src/lib/worldLore.json')
const cards = json('src/lib/fortune/tarotCards.json')
const tarotTopics = json('src/lib/fortune/tarotTopics.json')
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
assert.deepEqual(keys(tarotTopics), cards.map(card => card.id).sort())
for (const [id, { upright, reversed }] of Object.entries(tarotTopics)) {
  for (const orientation of [upright, reversed]) {
    assert.equal(orientation.length, 4, id + ' must have all four topics')
    for (const entry of orientation) assert.equal(entry.length, 2)
  }
  upright.forEach((entry, i) => assert.notDeepEqual(entry, reversed[i], id + ' orientation must change advice'))
}
assert.equal(DM_TEXT.length, 10)
assert.equal(GOD_TEXT.length, 10)
assert.equal(EL_ADVICE.length, 5)
for (const id of CYCLE) {
  assert.equal(typeof MAIN_TEXT[id], 'string')
  assert.deepEqual(keys(SUB_FOCUS[id]), ['love', 'money', 'work'])
  assert.deepEqual(keys(PAIR_TEXT[id]), CYCLE.map(String).sort(), 'missing pair for main planet ' + id)
}
const topicKeys = ['work', 'money', 'love', 'health']
for (const main of CYCLE) {
  assert.deepEqual(taksaMainTopics(main).map(row => row.id), topicKeys)
  for (const sub of CYCLE) {
    const rows = taksaTopics(main, sub, 4)
    assert.deepEqual(rows.map(row => row.id), topicKeys)
    assert.ok(rows.every(row => row.headline && row.advice && row.reason.includes('เสวย') && row.reason.includes('แทรก')))
  }
}
assert.notEqual(taksaTopics(1, 4, 4)[0].headline, taksaTopics(8, 4, 4)[0].headline, 'same sub planet must respond to a change in the pair')

const readings = []
for (const birth of [{ date: '1992-03-11', time: '09:30' }, { date: '1990-01-01', unknownTime: true }]) {
  const N = natal(birth)
  for (const period of ['วัน', 'ยาม', 'ปี', 'เสาโชค']) for (let c = 0; c < 60; c++) {
    const events = eventsOf(N, c, period)
    const rows = baziTopics(N, rate(N, c, { label: period }), c, events, period)
    assert.deepEqual(rows.map(row => row.id), topicKeys)
    assert.ok(rows.every(row => row.headline && row.advice))
    for (const row of rows) if (row.reason?.startsWith('จาก')) assert.ok(events.some(e => row.reason.includes(e.title)))
    readings.push({ events, rows })
  }
}
assert.ok(readings.some(({ rows }) => rows[2].reason?.includes('ชงกิ่งวันเกิด') && rows[2].headline.startsWith('ระวัง')))
assert.ok(readings.some(({ rows }) => rows[1].reason?.includes('คลังทรัพย์')))
assert.ok(readings.some(({ rows }) => rows[3].headline === 'ยังไม่มีประเด็นสุขภาพเด่น'))

const all = { world, MAP_LORE, MAP_NIGHT, MON_LORE, MON_GLOW_LORE, STORY, MAT_LORE, TROPHY_LORE, TAROT_LORE, tarotTopics, DM_TEXT, GOD_TEXT, EL_ADVICE, MAIN_TEXT, SUB_FOCUS, PAIR_TEXT }
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
