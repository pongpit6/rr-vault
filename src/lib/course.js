/**
 * Language curriculum ("หลักสูตร"): 32 lessons per language in 4 sections, checkpoints after 8/16/24/32.
 * Built from the owner's curriculum files (CEFR / JF / HSK / King Sejong based outlines, Thai-language guide).
 *
 * A lesson body (src/data/course/<lang>.js) has:
 *   words   [word, thai reading, meaning, example, example meaning, collocation?]
 *   dialog  { lines: [who, text, th], qs: [question] }      listen first, then the text opens
 *   grammar [{ h, body, ex: [[text, th]] }]
 *   drills  [question]                                       controlled practice, answer before the key
 *   tasks   [{ brief, data?, qs: [question] }]               variants with new data; one is picked per try
 *   speak   { repeat: [text], prompt, model }                record + compare; never graded as "correct pronunciation"
 *   write   { prompt, model, check: [string] }
 * A question: { k: 'choose' | 'listen' | 'type' | 'order', q?, say?, o?, a, why? }
 *   choose/listen: a = index of the right option · type/order: a = accepted answers (strings, or '/regex/i')
 *
 * Progress lives in the vocab item: path[lang][lessonId] = { s1, s2, s3, rub: {c, f, t, i}, re: {date, score}, passed, skip }
 * Steps: s1 รับรู้ (dialog + words) → s2 ฝึกมีตัวช่วย (grammar + drills) → s3 ใช้เอง (task + speak + write + rubric)
 * → recheck on a later day with new questions. Pass = every rubric side ≥ 2 and the recheck ≥ 70%.
 */
import { todayISO } from './format'

export const COURSE_LANGS = ['en', 'ja', 'zh', 'ko']
export const SECTION_NAME = ['', 'ช่วง 1', 'ช่วง 2', 'ช่วง 3', 'ช่วง 4']
export const STEPS = [
  { id: 's1', name: 'รับรู้', hint: 'ฟังบทสนทนา + คำศัพท์ใหม่', min: 10 },
  { id: 's2', name: 'ฝึกมีตัวช่วย', hint: 'รูปประโยค + แบบฝึก 5 ข้อ', min: 12 },
  { id: 's3', name: 'ใช้เอง', hint: 'ภารกิจ ฟัง พูด อ่าน เขียน + ประเมิน', min: 15 },
  { id: 're', name: 'ทบทวนวันถัดไป', hint: 'โจทย์ใหม่สั้น ๆ ยืนยันว่าทำได้จริง', min: 5 },
]
export const RUBRIC = [
  { k: 'c', name: 'เข้าใจสิ่งที่ฟัง/อ่าน', auto: true, lv: ['ยังจับความหมายไม่ได้', 'ต้องแปลหรือบอกคำตอบเกือบหมด', 'เข้าใจสารหลัก มีซ้ำหรือคำใบ้เล็กน้อย', 'เข้าใจสารหลักและข้อมูลสำคัญเอง'] },
  { k: 'f', name: 'รูปภาษา/ตัวเขียน', auto: true, lv: ['ทำให้เข้าใจผิดบ่อย', 'เข้าใจได้เป็นบางช่วง', 'เข้าใจได้โดยรวม แม้ยังผิดบ้าง', 'ชัดเจนพอสำหรับงานระดับนี้'] },
  { k: 't', name: 'ทำภารกิจสื่อสาร', auto: false, lv: ['ยังทำไม่ได้', 'ใช้วลีตามแบบได้บางส่วน', 'ทำภารกิจได้ แม้มีข้อผิดพลาด', 'ทำได้และเปลี่ยนข้อมูลหรือถามต่อได้'] },
  { k: 'i', name: 'ใช้เองและแก้การติดขัด', auto: false, lv: ['รอเฉลยทั้งหมด', 'ต้องมีแบบเต็ม', 'ใช้คำใบ้เล็กน้อย ขอให้ซ้ำหรือแก้ตัวเองได้', 'ใช้เองและรับมือคำถามใหม่ใกล้เคียงได้'] },
]
export const PASS_SIDE = 2
export const RECHECK_PASS = 0.7
export const LESSON_XP = 20
export const CHECKPOINT_XP = 100

/** score 0..1 → rubric level 0..3 */
export const levelOf = (r) => (r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0)

/* ---------- data ---------- */
const loaders = {
  en: () => import('../data/course/en.js'),
  ja: () => import('../data/course/ja.js'),
  zh: () => import('../data/course/zh.js'),
  ko: () => import('../data/course/ko.js'),
}
const cache = {}
export async function loadPath(lang) {
  if (!cache[lang]) cache[lang] = (await loaders[lang]()).default
  return cache[lang]
}
export const pathNow = (lang) => cache[lang] || null

/* ---------- answer checking ---------- */
const CONTRACT = [[/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'], [/\bhe's\b/g, 'he is'], [/\bshe's\b/g, 'she is'], [/\bit's\b/g, 'it is'],
  [/\bwhat's\b/g, 'what is'], [/\bwho's\b/g, 'who is'], [/\bwhere's\b/g, 'where is'], [/\bthat's\b/g, 'that is'], [/\bisn't\b/g, 'is not'], [/\baren't\b/g, 'are not'], [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'], [/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bi'd\b/g, 'i would'], [/\blet's\b/g, 'let us']]
export function norm(s = '') {
  let t = String(s).toLowerCase().normalize('NFKC').replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
  t = t.replace(/[.!?。！？、,，;:"]/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [re, to] of CONTRACT) t = t.replace(re, to)
  return t
}
/** true when the answer matches any accepted form */
export function accepts(ans, accepted = []) {
  const n = norm(ans)
  if (!n) return false
  return accepted.some((a) => {
    if (typeof a === 'string' && a.length > 2 && a.startsWith('/') && a.lastIndexOf('/') > 0) {
      const i = a.lastIndexOf('/'); try { return new RegExp(a.slice(1, i), a.slice(i + 1) || 'i').test(n) } catch { return false }
    }
    return norm(a) === n
  })
}
export const isRight = (q, ans) => (q.k === 'choose' || q.k === 'listen' ? ans === q.a : accepts(ans, q.a))
/** the answer to show under the question */
export const keyOf = (q) => (q.k === 'choose' || q.k === 'listen' ? q.o[q.a] : (q.a || []).filter((x) => !String(x).startsWith('/'))[0] || '')
/** words of an order question, shuffled (stable per seed) */
export function orderTokens(q, seed = 1) {
  const toks = keyOf(q).split(/\s+/).filter(Boolean)
  const out = [...toks]; let s = seed
  for (let i = out.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  if (out.join(' ') === toks.join(' ') && out.length > 1) out.push(out.shift())
  return out
}

/* ---------- progress ---------- */
export const progOf = (vocab, lang) => vocab?.path?.[lang] || {}
export const isPassed = (p) => !!(p && (p.passed || p.skip))
export function lessonState(L, idx, prog, today = todayISO()) {
  const l = L[idx], p = prog[l.id] || {}
  const open = idx === 0 || isPassed(prog[L[idx - 1].id])
  if (!l.body) return { open, ready: false, done: isPassed(p), p }
  if (isPassed(p)) return { open: true, ready: true, done: true, p, next: null }
  if (!open) return { open: false, ready: true, done: false, p }
  const next = !p.s1 ? 's1' : !p.s2 ? 's2' : !p.s3 || !p.rub ? 's3' : 're'
  const wait = next === 're' && p.s3 >= today // the recheck needs a later day
  return { open, ready: true, done: false, p, next, wait }
}
export const rubricOk = (rub) => !!rub && RUBRIC.every((r) => (rub[r.k] ?? 0) >= PASS_SIDE)

/** the next thing to do in a language: { lesson, idx, step, wait } or null when nothing is ready */
export function nextUp(path, prog, today = todayISO()) {
  if (!path) return null
  const L = path.LESSONS
  for (let i = 0; i < L.length; i++) {
    const st = lessonState(L, i, prog, today)
    if (st.done) continue
    if (!st.open || !st.ready) return { lesson: L[i], idx: i, step: null, locked: !st.open, soon: !st.ready }
    return { lesson: L[i], idx: i, step: st.next, wait: st.wait }
  }
  return { done: true }
}

/** passed lessons and checkpoints that count for XP / chests (skipped ones don't) */
export function pathStats(vocab) {
  const out = { lessons: 0, checkpoints: [], passedIds: {}, degree: {} }
  for (const lang of COURSE_LANGS) {
    const prog = progOf(vocab, lang)
    out.degree[lang] = degreeOf(vocab, lang)
    for (const [id, p] of Object.entries(prog)) {
      if (!isPassed(p)) continue
      out.passedIds[id] = true
      if (p.skip) continue
      out.lessons++
      const n = +id.split('-')[1]
      if (n % 8 === 0) out.checkpoints.push({ lang, id, n, at: p.passed })
    }
  }
  return out
}
/** how many lessons of a section are passed (skips count) */
export const sectionDone = (vocab, lang, sec) => {
  const prog = progOf(vocab, lang)
  let n = 0; for (let i = (sec - 1) * 8 + 1; i <= sec * 8; i++) if (isPassed(prog[`${lang.toUpperCase()}-${String(i).padStart(2, '0')}`])) n++
  return n
}

/** degree level 0..4 in a language: sections finished in order (a section passed by the skip test counts) */
export function degreeOf(vocab, lang) {
  let k = 0; while (k < 4 && sectionDone(vocab, lang, k + 1) >= 8) k++
  return k
}
export const DEGREES = ['', 'ประกาศนียบัตร', 'อนุปริญญา', 'ปริญญาตรี', 'ปริญญาโท']
export const DOCTOR = 'ปริญญาเอก'
export const LANG_TH = { en: 'อังกฤษ', ja: 'ญี่ปุ่น', zh: 'จีน', ko: 'เกาหลี' }

/* ---------- recheck: new questions from the lesson, avoiding the task variant used in s3 ---------- */
export function recheckSet(l, used = 0, seed = Date.now()) {
  const b = l.body, pool = [...b.drills]
  const t = b.tasks.length > 1 ? b.tasks[(used + 1) % b.tasks.length] : b.tasks[0]
  let s = seed % 100000
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const pick = pool.sort(() => rnd() - 0.5).slice(0, 3)
  return [...pick, ...(t?.qs || []).slice(0, 2)].map((q) => ({ ...q }))
}

/** plain-text learning log line, the format from the curriculum files */
export const logLine = (e) => [e.d, e.id, e.task || '', e.evidence || '', e.rub ? RUBRIC.map((r) => `${r.name.split('/')[0]} ${e.rub[r.k] ?? '-'}`).join(', ') + ', ออกเสียง ยังไม่ประเมิน' : '', e.stuck || '', e.review || '', e.next || ''].join(' | ')
