import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const data = JSON.parse(read('src/lib/worldLore.json'))
// Exercise the runtime lookup without requiring Vite's JSON import transform.
const lookup = vm.runInNewContext(read('src/lib/worldLore.js').replace(/^import entries[^\n]+\n/, '').replaceAll('export ', '') + '\n loreOf', { entries: data })
const required = {
  "npcs": [
    "farmer",
    "merchant",
    "guard",
    "fisher",
    "baker",
    "bard",
    "smith",
    "banker",
    "npc_alchemist",
    "npc_guild",
    "npc_shopgirl",
    "npc_teacher",
    "apprentice",
    "npc_smith",
    "npc_farmer"
  ],
  "shadows": [
    "sh_ninja",
    "sh_pirate",
    "sh_star",
    "sh_demon",
    "sh_crystal",
    "sh_rider",
    "sh_boxer",
    "sh_sun",
    "sh_samurai",
    "sh_cyborg",
    "sh_astro",
    "sh_dragon",
    "sh_assassin",
    "sh_monk",
    "sh_gun",
    "sh_frost",
    "sh_en",
    "sh_ja",
    "sh_zh",
    "sh_ko"
  ],
  "pets": [
    "pet_fox",
    "pet_owl",
    "pet_drake",
    "pet_cat",
    "pet_bunny",
    "pet_turtle",
    "pet_piggy",
    "pet_phoenix"
  ],
  "relics": [
    "rl_sword",
    "rl_shield",
    "rl_flask",
    "rl_dust",
    "rl_badge",
    "rl_map",
    "rl_bag",
    "rl_cloak",
    "rl_snack",
    "rl_glasses"
  ],
  "decor": [
    "tree",
    "bench",
    "lamp",
    "flowers",
    "well",
    "banner",
    "fountain",
    "statue",
    "dc_mailbox",
    "dc_haybale",
    "dc_bamboo",
    "dc_picnic",
    "dc_beehive",
    "dc_swing",
    "dc_board",
    "dc_gymbar",
    "dc_zen",
    "dc_sundial",
    "dc_bookstall",
    "dc_teastall",
    "dc_archway",
    "dc_koi",
    "dc_windmill",
    "dc_piggy",
    "cr_garden",
    "cr_totem",
    "cr_tapestry",
    "cr_lamp",
    "cr_hero",
    "cr_featherwind",
    "cr_cactusgarden",
    "cr_mushhut",
    "cr_spiderweb",
    "cr_scarecrow",
    "cr_beetlecart",
    "cr_hidetent",
    "cr_slimefountain",
    "cr_bonearch",
    "cr_wispcage",
    "cr_crystaltree",
    "cr_lavabrazier",
    "cr_goldbeetle",
    "cr_icestatue",
    "cr_phoenixnest",
    "cr_bookgolem",
    "ev_krathong",
    "ev_angpao",
    "ev_songkran",
    "ev_candle",
    "ev_fireworks",
    "ev_xmastree",
    "ev_stall",
    "ev_salesign"
  ],
  "skins": [
    "skin_royal",
    "skin_flame",
    "skin_ninja",
    "skin_ranger",
    "skin_samurai",
    "skin_scholar",
    "skin_pirate",
    "skin_thai",
    "skin_paladin",
    "skin_dark",
    "skin_nomad",
    "skin_aviator",
    "skin_arctic",
    "skin_hood",
    "skin_alchemist",
    "skin_hunter",
    "grad_en",
    "grad_ja",
    "grad_zh",
    "grad_ko",
    "grad_doctor",
    "birthday"
  ],
  "buildings": [
    "house",
    "farm",
    "market",
    "bank",
    "mine",
    "library",
    "tavern",
    "tower",
    "gym",
    "temple",
    "school",
    "kitchen",
    "hall"
  ],
  "party": [
    "knight",
    "healer",
    "mage",
    "ranger"
  ],
  "outfits": [
    "1",
    "5",
    "10",
    "20",
    "30",
    "50"
  ],
  "festivals": [
    "newyear",
    "cny",
    "songkran",
    "phansa",
    "loy",
    "xmas",
    "payday",
    "sale"
  ],
  "gear": [
    "weapon:0",
    "weapon:1",
    "weapon:2",
    "weapon:3",
    "weapon:4",
    "armor:0",
    "armor:1",
    "armor:2",
    "armor:3",
    "armor:4",
    "boots:0",
    "boots:1",
    "boots:2",
    "boots:3",
    "boots:4",
    "satchel:0",
    "satchel:1",
    "satchel:2",
    "satchel:3",
    "satchel:4",
    "ring:0",
    "ring:1",
    "ring:2",
    "ring:3",
    "ring:4"
  ],
  "skills": [
    "blade",
    "storm",
    "bless",
    "revive",
    "arcane",
    "meteor",
    "eye",
    "hawk"
  ],
  "lifeSkills": [
    "slash",
    "storm",
    "shield",
    "heal",
    "ward",
    "fireball",
    "meteor",
    "arrow",
    "eagle",
    "streak3",
    "streak30"
  ],
  "petStages": [
    "pet_fox:1",
    "pet_fox:2",
    "pet_fox:3",
    "pet_owl:1",
    "pet_owl:2",
    "pet_owl:3",
    "pet_drake:1",
    "pet_drake:2",
    "pet_drake:3",
    "pet_cat:1",
    "pet_cat:2",
    "pet_cat:3",
    "pet_bunny:1",
    "pet_bunny:2",
    "pet_bunny:3",
    "pet_turtle:1",
    "pet_turtle:2",
    "pet_turtle:3",
    "pet_piggy:1",
    "pet_piggy:2",
    "pet_piggy:3",
    "pet_phoenix:1",
    "pet_phoenix:2",
    "pet_phoenix:3"
  ],
  "places": [
    "meadow",
    "forest",
    "mine",
    "swamp",
    "desert",
    "snow",
    "volcano",
    "shadow",
    "town"
  ],
  "realms": [
    "0",
    "1",
    "2",
    "3",
    "4"
  ],
  "recipes": [
    "potion",
    "kit"
  ]
}
let checks = 0
for (const [category, ids] of Object.entries(required)) {
  assert.deepEqual(Object.keys(data[category]).sort(), [...ids].sort(), category)
  for (const id of ids) {
    assert.equal(typeof lookup(category, id), 'string', category + ':' + id)
    assert.ok(lookup(category, id).length > 20, category + ':' + id)
    checks++
  }
}
for (const id of ['bday_1', 'bday_30', 'bday_100']) assert.equal(lookup('skins', id), data.skins.birthday)
assert.equal(lookup('realms', 0), data.realms['0'])
assert.equal(lookup('pets', 'missing'), null)
assert.equal(lookup('pets', '__proto__'), null)
assert.equal(lookup('constructor', 'prototype'), null)
assert.equal(lookup('missing', 'missing'), null)
assert.equal(lookup('pets', null), null)
assert.ok(!/pixl_[a-f0-9]{32}/i.test(JSON.stringify(data)))
const tree = read('src/lib/farm.js').split('export const TREE = [')[1].split('\n]')[0]
for (const id of [...tree.matchAll(/id: '([^']+)'/g)].map(m => m[1])) assert.ok(data.skills[id], id)
const realSkills = read('src/lib/party.js').split('export const SKILLS = [')[1].split('\n]')[0]
for (const id of [...realSkills.matchAll(/id: '([^']+)'/g)].map(m => m[1])) assert.ok(data.lifeSkills[id], id)
console.log('Lore coverage and lookup passed:', checks, 'entries')
