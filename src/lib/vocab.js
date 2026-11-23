/**
 * Vocabulary engine for 4 languages (English, Japanese, Chinese, Korean).
 *
 * Word banks live in src/data/vocab/<lang>.js and load only when that language is opened. One line per word:
 *   word | alt | reading | meaning | cat | level | example | example meaning
 *   alt = kana (ja) or pinyin (zh), empty for en/ko · reading = how to say it in Thai letters · level 1 easy, 2 mid, 3 hard
 *
 * Progress (item "vocab"): cards[id] = { box, due, last, seen, right, wrong }. Boxes 1–5 are review gaps of
 * 1 / 3 / 7 / 21 / 60 days; a word in box 3+ counts as learnt. Answering right moves a box up, wrong drops to box 1.
 * A word seen today never comes back the same day (wrong answers are repeated inside the round instead).
 */
import { todayISO } from './format'

export const LANGS = {
  en: { name: 'อังกฤษ', flag: '🇬🇧', voice: 'en-US', ready: true },
  ja: { name: 'ญี่ปุ่น', flag: '🇯🇵', voice: 'ja-JP', ready: true, course: true },
  zh: { name: 'จีน', flag: '🇨🇳', voice: 'zh-CN', ready: true, course: true },
  ko: { name: 'เกาหลี', flag: '🇰🇷', voice: 'ko-KR', ready: true, course: true },
}
export const CATS = {
  daily: { name: 'ชีวิตประจำวัน', emoji: '🌅' }, food: { name: 'อาหาร', emoji: '🍜' }, shop: { name: 'ช้อปปิ้ง', emoji: '🛍️' },
  travel: { name: 'การเดินทาง', emoji: '✈️' }, work: { name: 'งานและออฟฟิศ', emoji: '💼' }, money: { name: 'การเงินและการลงทุน', emoji: '💰' },
  health: { name: 'สุขภาพและร่างกาย', emoji: '💪' }, feel: { name: 'อารมณ์และความรู้สึก', emoji: '💗' }, home: { name: 'บ้าน', emoji: '🏠' },
  nature: { name: 'ธรรมชาติและอากาศ', emoji: '🌿' }, tech: { name: 'เทคโนโลยี', emoji: '📱' }, talk: { name: 'วลีสนทนา', emoji: '💬' },
}
export const LEVELS = { 1: 'ง่าย', 2: 'กลาง', 3: 'ยาก' }
export const MODES = {
  auto: { name: 'ผสมอัตโนมัติ', emoji: '✨', hint: 'ยากขึ้นตามที่จำได้' },
  choose: { name: 'เลือกคำแปล', emoji: '🔤', hint: 'เห็นคำ เลือกความหมาย' },
  reverse: { name: 'แปลกลับ', emoji: '🔁', hint: 'เห็นความหมาย เลือกคำ' },
  listen: { name: 'ฟังแล้วตอบ', emoji: '🔊', hint: 'ฟังเสียง เลือกความหมาย' },
  spell: { name: 'สะกดคำ', emoji: '⌨️', hint: 'เห็นความหมาย พิมพ์คำเอง' },
  flash: { name: 'แฟลชการ์ด', emoji: '🃏', hint: 'พลิกดูคำตอบ แล้วบอกว่าจำได้ไหม' },
  sentence: { name: 'เติมประโยค', emoji: '🧩', hint: 'เลือกคำที่หายไปจากประโยค' },
}
// typing the word only makes sense with a Latin keyboard
export const modesFor = (lang) => Object.keys(MODES).filter((m) => lang === 'en' || m !== 'spell')

const BOX_DAYS = [0, 1, 3, 7, 21, 60]
export const LEARNT_BOX = 3
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE') }
export const nextDue = (box, from = todayISO()) => addDays(from, BOX_DAYS[Math.min(5, Math.max(1, box))])
export const isWordId = (id) => !id.includes(':char:')

/* ---------- banks ---------- */
const loaders = {
  en: () => import('../data/vocab/en.js'),
  ja: () => import('../data/vocab/ja.js'),
  zh: () => import('../data/vocab/zh.js'),
  ko: () => import('../data/vocab/ko.js'),
}
const banks = {}
const courseLoaders = {
  ja: () => import('../data/vocab/ja-course.js'),
  zh: () => import('../data/vocab/zh-course.js'),
  ko: () => import('../data/vocab/ko-course.js'),
}
const courses = {}
export async function loadCourse(lang) {
  if (courses[lang]) return courses[lang]
  if (!courseLoaders[lang]) return { COURSE: [], SETS: {} }
  return (courses[lang] = await courseLoaders[lang]())
}
export function parseBank(lang, raw) {
  return raw.trim().split('\n').map((line) => line.trim()).filter((l) => l && !l.startsWith('#')).map((line) => {
    const [w, alt, read, th, cat, lv, ex, exTh] = line.split('|').map((x) => (x || '').trim())
    return { id: `${lang}:${w}`, lang, w, alt, read, th, cat: CATS[cat] ? cat : 'daily', lv: +lv || 1, ex, exTh }
  })
}
export async function loadBank(lang) {
  if (banks[lang]) return banks[lang]
  if (!LANGS[lang]?.ready) return (banks[lang] = [])
  const m = await loaders[lang]()
  return (banks[lang] = parseBank(lang, m.default))
}
export const bankNow = (lang) => banks[lang] || null

/** the user's own words for a language (older entries used `en` for the word) */
export const customOf = (vocab, lang) => (vocab.custom || []).filter((c) => (c.lang || 'en') === lang)
  .map((c) => ({ id: c.id, lang: c.lang || 'en', w: c.w || c.en, alt: c.alt || '', read: c.read || '', th: c.th, cat: c.cat || 'mine', lv: c.lv || 1, mine: true }))

/* ---------- picking a round ---------- */
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }

function modeFor(card, pref, w) {
  if (pref !== 'auto') return pref === 'sentence' && !w.ex ? 'choose' : pref
  const box = card?.box || 0
  const pool = box <= 1 ? ['choose'] : box === 2 ? ['reverse', 'listen'] : box === 3 ? ['listen', 'reverse', w.ex ? 'sentence' : 'choose'] : [w.lang === 'en' ? 'spell' : 'reverse', w.ex ? 'sentence' : 'listen', 'flash']
  return pool[Math.floor(Math.random() * pool.length)]
}

function optionsFor(w, all, key) {
  const same = all.filter((x) => x.id !== w.id && x[key] && x[key] !== w[key])
  const near = same.filter((x) => x.cat === w.cat)
  const pool = near.length >= 6 ? near : same
  const opts = new Set([w[key]])
  for (const x of shuffle(pool)) { if (opts.size >= 4) break; opts.add(x[key]) }
  return shuffle([...opts])
}

/**
 * 10 questions: due reviews first (lowest box first), then new words from the easiest level.
 * Filters: lvs (levels), cats (categories, 'mine' = own words). Words answered today are skipped.
 */
export function pickRound(vocab, { lang = 'en', bank = [], lvs = [], cats = [], mode = 'auto', n = 10, today = todayISO() } = {}) {
  const cards = vocab.cards || {}
  const all = [...bank, ...customOf(vocab, lang)]
  const fits = (w) => (!lvs.length || lvs.includes(w.lv) || w.mine) && (!cats.length || cats.includes(w.cat))
  const list = all.filter(fits)
  const due = list.filter((w) => cards[w.id] && cards[w.id].due <= today && cards[w.id].last !== today).sort((a, b) => (cards[a.id].box || 0) - (cards[b.id].box || 0))
  const fresh = shuffle(list.filter((w) => !cards[w.id])).sort((a, b) => a.lv - b.lv)
  const pick = [...due.slice(0, n), ...fresh].slice(0, n)
  return pick.map((w) => {
    const m = modeFor(cards[w.id], mode, w)
    const q = { ...w, mode: m }
    if (m === 'choose' || m === 'listen') q.options = optionsFor(w, all, 'th')
    if (m === 'reverse' || m === 'sentence') q.options = optionsFor(w, all, 'w')
    if (m === 'sentence') q.blank = blankOut(w.ex, w.w)
    return q
  })
}

/** "I ___ coffee every morning." (falls back to the whole sentence + the word if the form changed) */
export function blankOut(ex = '', word = '') {
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return re.test(ex) ? ex.replace(re, '_____') : `${ex}  (_____)`
}

/** first answer of the round decides the box; a repeat inside the same round only practises */
export function grade(vocab, id, ok, today = todayISO()) {
  const cards = { ...(vocab.cards || {}) }
  const c = cards[id] || { box: 0, seen: 0, right: 0, wrong: 0 }
  const box = ok ? Math.min(5, (c.box || 0) + 1) : 1
  cards[id] = { box, seen: (c.seen || 0) + 1, right: (c.right || 0) + (ok ? 1 : 0), wrong: (c.wrong || 0) + (ok ? 0 : 1), due: nextDue(box, today), last: today }
  return { ...vocab, cards }
}

/** spelling check that forgives case, extra spaces and a missing "to " */
export const sameWord = (a = '', b = '') => {
  const n = (s) => s.toLowerCase().replace(/^to\s+/, '').replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim()
  return n(a) === n(b)
}

export function statsFor(vocab, lang, bank = []) {
  const cards = vocab.cards || {}
  const ids = [...bank, ...customOf(vocab, lang)].map((w) => w.id)
  const today = todayISO()
  let learnt = 0, due = 0, started = 0
  for (const id of ids) { const c = cards[id]; if (!c) continue; started++; if ((c.box || 0) >= LEARNT_BOX) learnt++; if (c.due <= today && c.last !== today) due++ }
  return { total: ids.length, learnt, due, started }
}

/* ---------- speech (the phone's own voices, works offline) ---------- */
export function speak(text, lang = 'en') {
  try {
    const s = window.speechSynthesis
    if (!s || !text) return false
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LANGS[lang]?.voice || 'en-US'
    const v = s.getVoices().find((x) => x.lang?.replace('_', '-').startsWith(u.lang)) || s.getVoices().find((x) => x.lang?.startsWith(u.lang.slice(0, 2)))
    if (v) u.voice = v
    u.rate = lang === 'en' ? 0.9 : 0.8
    s.speak(u)
    return true
  } catch { return false }
}
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window
