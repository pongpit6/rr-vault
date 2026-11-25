import { createServer } from 'vite'
const v = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const C = await v.ssrLoadModule('/src/lib/course.js')
const lang = process.argv[2] || 'en'
const P = await C.loadPath(lang)
let bad = 0
const err = (id, m) => { bad++; console.log('✗', id, m) }
for (const l of P.LESSONS) {
  const b = l.body; if (!b) continue
  const qq = (where, q) => {
    if (!['choose', 'listen', 'type', 'order'].includes(q.k)) return err(l.id, `${where} bad kind`)
    if (q.k === 'choose' || q.k === 'listen') { if (!(q.o && q.a >= 0 && q.a < q.o.length)) err(l.id, `${where} answer index`); if (q.k === 'listen' && !q.say) err(l.id, `${where} no say`) ; if (new Set(q.o).size !== q.o.length) err(l.id, `${where} dup options`) }
    else {
      if (!q.a?.length) return err(l.id, `${where} no answers`)
      const key = C.keyOf(q); if (!key) { if (!q.a.some((a) => a.startsWith('/'))) err(l.id, `${where} no key`) }
      else if (!C.isRight(q, key)) err(l.id, `${where} key not accepted: ${key}`)
      for (const a of q.a) if (typeof a === 'string' && a.startsWith('/')) { try { const i = a.lastIndexOf('/'); new RegExp(a.slice(1, i)) } catch { err(l.id, `${where} bad regex`) } }
      if (q.k === 'order' && C.keyOf(q).split(/\s+/).length < 2) err(l.id, `${where} order too short`)
      if (false) { const t = C.orderTokens(q, 3); if (!C.isRight(q, t.slice().sort((x, y) => C.keyOf(q).split(' ').indexOf(x) - C.keyOf(q).split(' ').indexOf(y)).join(' '))) err(l.id, `${where} order rebuild`) }
    }
  }
  if ((b.words || []).length < 4) err(l.id, 'few words')
  for (const w of b.words) if (w.length < 5) err(l.id, `word tuple ${w[0]}`)
  b.dialog.qs.forEach((q, i) => qq(`dialog${i}`, q))
  if (b.drills.length < 5) err(l.id, 'few drills')
  b.drills.forEach((q, i) => qq(`drill${i}`, q))
  if (b.tasks.length < 2) err(l.id, 'need 2 task variants')
  b.tasks.forEach((t, j) => { if (t.qs.length < 2) err(l.id, 'task few qs'); t.qs.forEach((q, i) => qq(`task${j}.${i}`, q)) })
  if (!b.speak?.repeat?.length || !b.speak.model) err(l.id, 'speak')
  if (!b.write?.model || !b.write.check?.length) err(l.id, 'write')
  if (!!b.check !== l.check) err(l.id, 'check flag mismatch')
}
console.log(lang, 'lessons with body:', P.LESSONS.filter((l) => l.body).length, 'problems:', bad)
// spot checks of free answers
const t = (q, s) => console.log(C.isRight(q, s) ? 'ok ' : 'NO ', s)
await v.close()
