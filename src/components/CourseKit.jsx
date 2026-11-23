import { WritePad } from './WriteKit'
import { useEffect, useMemo, useState } from 'react'
import { Lock, Check, Volume2 } from './px'
import { Button } from './ui'
import { useStore } from '../store'
import { sfx } from '../lib/sfx'
import { loadCourse, speak, canSpeak, grade } from '../lib/vocab'
import { todayISO } from '../lib/format'

export const PASS = 0.8
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] } return x }
const charId = (lang, ch) => `${lang}:char:${ch}`

/** questions over a set of characters: see → reading, reading → character, hear → character */
function makeQuiz(items, pool, n = 10) {
  const pick = shuffle(items).slice(0, Math.max(n, items.length > n ? n : items.length))
  while (pick.length < n && items.length) pick.push(items[Math.floor(Math.random() * items.length)])
  return pick.slice(0, n).map((it, i) => {
    const kind = ['see', 'read', 'hear'][i % 3]
    const key = kind === 'see' ? 'read' : 'ch'
    const others = shuffle(pool.filter((x) => x[key] !== it[key]))
    const opts = new Set([it[key]]); for (const o of others) { if (opts.size >= 4) break; opts.add(o[key]) }
    return { ...it, kind, key, options: shuffle([...opts]) }
  })
}

export default function CourseView({ H, lang }) {
  const [course, setCourse] = useState(null)
  const [open, setOpen] = useState(null) // lesson index | 'review'
  useEffect(() => { let a = true; loadCourse(lang).then((c) => a && setCourse(c)); return () => { a = false } }, [lang])
  const v = H.vocab || {}
  const prog = (v.course || {})[lang] || {}
  if (!course) return <div className="text-center text-sm text-slate-500 py-6">กำลังโหลดบทเรียน…</div>
  const L = course.COURSE
  const passed = (l) => (prog[l.id]?.best || 0) >= PASS
  const unlocked = (i) => i === 0 || passed(L[i - 1])
  const learnt = L.filter(passed).flatMap((l) => l.items)
  const due = learnt.filter((it) => { const c = v.cards?.[charId(lang, it.ch)]; return c && c.due <= todayISO() && c.last !== todayISO() })

  if (open === 'review') return <LessonQuiz H={H} lang={lang} items={due.slice(0, 12)} pool={learnt} title="ทบทวนตัวอักษร" onDone={() => setOpen(null)} review />
  if (open != null) return <Lesson H={H} lang={lang} course={course} index={open} onDone={() => setOpen(null)} />

  return (
    <div className="space-y-3" data-testid="course-map">
      <div className="flex gap-2">
        <div className="px-inner px-3 py-2 flex-1"><div className="text-[10px] text-slate-500">เรียนแล้ว</div><div className="text-sm font-semibold">{learnt.length} ตัว</div></div>
        <div className="px-inner px-3 py-2 flex-1"><div className="text-[10px] text-slate-500">ผ่านแล้ว</div><div className="text-sm font-semibold">{L.filter(passed).length}/{L.length} ด่าน</div></div>
      </div>
      {due.length > 0 && <Button className="w-full" onClick={() => setOpen('review')} data-testid="course-review">ทบทวนตัวอักษรที่ถึงรอบ ({due.length})</Button>}
      <div className="relative pl-6">
        <div className="absolute left-[18px] top-3 bottom-3 w-1 bg-slate-200" />
        {L.map((l, i) => {
          const ok = passed(l), can = unlocked(i), setStart = i === 0 || L[i - 1].set !== l.set
          return (
            <div key={l.id}>
              {setStart && <div className="text-xs font-bold text-slate-500 mt-3 mb-1 -ml-6">{course.SETS[l.set]?.name}</div>}
              <button disabled={!can} onClick={() => setOpen(i)} className={`relative w-full text-left flex items-center gap-3 my-1.5 p-2.5 border-2 ${can ? 'bg-white border-slate-800' : 'bg-slate-50 border-slate-200 opacity-60'}`} data-testid={`lesson-${l.id}`}>
                <span className={`absolute -left-[19px] w-7 h-7 grid place-items-center text-xs font-bold border-2 ${ok ? 'bg-emerald-500 text-white border-emerald-700' : can ? 'bg-amber-300 border-amber-600' : 'bg-slate-200 border-slate-300'}`}>{ok ? <Check size={14} /> : can ? i + 1 : <Lock size={12} />}</span>
                <div className="flex-1 min-w-0 pl-2">
                  <div className="text-sm font-semibold truncate">{l.title}</div>
                  <div className="text-lg tracking-wider truncate">{l.items.slice(0, 10).map((x) => x.ch).join(' ')}</div>
                </div>
                {prog[l.id]?.best != null && <span className={`text-xs font-bold ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(prog[l.id].best * 100)}%</span>}
              </button>
            </div>
          )
        })}
      </div>
      <div className="text-[11px] text-slate-500">เรียนทีละด่าน ดูภาพจำ ฟังเสียง แล้วทำแบบทดสอบ ได้ {Math.round(PASS * 100)}% ขึ้นไปจึงปลดด่านถัดไป · ตัวที่ผ่านแล้วจะกลับมาให้ทบทวนตามรอบ · จบแต่ละชุดรับ 1 GOLD</div>
    </div>
  )
}

function Lesson({ H, lang, course, index, onDone }) {
  const l = course.COURSE[index]
  const [step, setStep] = useState('learn') // learn | quiz | words
  const [i, setI] = useState(0)
  const [write, setWrite] = useState(false)
  const pool = useMemo(() => course.COURSE.slice(0, index + 1).flatMap((x) => x.items), [course, index])
  const it = l.items[i]
  if (step === 'quiz') return <LessonQuiz H={H} lang={lang} items={l.items} pool={pool} lesson={l} course={course} title={l.title} onDone={(ok) => (ok ? setStep('words') : onDone())} />
  if (step === 'words') return <Words l={l} lang={lang} onDone={onDone} />
  return (
    <div className="space-y-3" data-testid="lesson-learn">
      <div className="flex justify-between text-xs text-slate-500"><span>{l.title}</span><span>{i + 1}/{l.items.length}</span></div>
      {[...it.ch].length === 1 && <div className="flex gap-1.5"><button className={`px-tab ${write ? '' : 'on'}`} onClick={() => setWrite(false)}>ดูตัวอักษร</button><button className={`px-tab ${write ? 'on' : ''}`} onClick={() => setWrite(true)} data-testid="lesson-write">✍️ หัดเขียน</button></div>}
      {write && [...it.ch].length === 1 ? <div className="px-inner p-3"><WritePad lang={lang} it={it} onPass={() => H.vocabRound(1, 1)} /></div> : <div className="px-inner p-6 text-center space-y-2">
        <div className="text-7xl font-bold leading-none" data-testid="lesson-char">{it.ch}</div>
        <div className="text-lg text-sky-700 font-semibold">อ่านว่า {it.read} <span className="text-slate-400 text-sm">({it.ro})</span></div>
        {it.say && it.say !== it.ch && <div className="text-sm text-slate-500">ตัวอย่าง: <span className="text-xl">{it.say}</span></div>}
        {it.hook && <div className="text-sm text-slate-600">💡 {it.hook}</div>}
        {canSpeak() && <button onClick={() => speak(it.say || it.ch, lang)} className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-sky-100 text-sky-700"><Volume2 size={22} /></button>}
      </div>}
      <div className="flex gap-1 justify-center flex-wrap">{l.items.map((x, k) => <span key={k} className={`w-2 h-2 rounded-full ${k === i ? 'bg-slate-800' : k < i ? 'bg-emerald-400' : 'bg-slate-200'}`} />)}</div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" disabled={i === 0} onClick={() => setI(i - 1)}>ก่อนหน้า</Button>
        {i + 1 < l.items.length ? <Button className="flex-1" onClick={() => { setI(i + 1); speak(l.items[i + 1].say || l.items[i + 1].ch, lang) }} data-testid="lesson-next">ต่อไป</Button>
          : <Button className="flex-1" onClick={() => setStep('quiz')} data-testid="lesson-test">ทำแบบทดสอบ</Button>}
      </div>
      <button onClick={onDone} className="w-full text-xs text-slate-500 underline">กลับแผนที่</button>
    </div>
  )
}

function LessonQuiz({ H, lang, items, pool, lesson, course, title, onDone, review = false }) {
  const [qs] = useState(() => makeQuiz(items, pool, review ? Math.min(12, items.length) : Math.max(10, Math.min(15, items.length))))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = qs[i]
  useEffect(() => { if (q?.kind === 'hear') speak(q.say || q.ch, lang) }, [i]) // eslint-disable-line
  const pick = (o) => {
    if (picked) return
    setPicked(o)
    const ok = o === q[q.key]
    sfx(ok ? 'coin' : 'hit')
    if (ok) setScore((s) => s + 1)
    if (review) H.saveVocab(grade(useStore.getState().items.vocab?.data || {}, charId(lang, q.ch), ok))
  }
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); return }
    const pct = score / qs.length
    if (!review && lesson) {
      const cur = useStore.getState().items.vocab?.data || {}
      const course0 = cur.course || {}, mine = course0[lang] || {}
      const best = Math.max(pct, mine[lesson.id]?.best || 0)
      let next = { ...cur, course: { ...course0, [lang]: { ...mine, [lesson.id]: { best, at: todayISO() } } } }
      if (pct >= PASS) {
        // the characters join the review deck
        const cards = { ...(next.cards || {}) }
        for (const it of lesson.items) { const id = charId(lang, it.ch); if (!cards[id]) cards[id] = { box: 1, seen: 1, right: 1, wrong: 0, due: todayISO(), last: todayISO() } }
        next.cards = cards
        // finishing every lesson of a set pays its GOLD once
        const setId = lesson.set, all = course.COURSE.filter((x) => x.set === setId)
        const doneAll = all.every((x) => (x.id === lesson.id ? best : next.course[lang][x.id]?.best || 0) >= PASS)
        const key = `${lang}:${setId}`
        if (doneAll && !(next.courseSets || {})[key]) { next.courseSets = { ...(next.courseSets || {}), [key]: todayISO() }; useStore.getState().showToast(`🏅 จบชุด${course.SETS[setId]?.name} รับ 1 GOLD`) }
      }
      H.saveVocab(next)
      H.vocabRound(score, qs.length)
    } else if (review) H.vocabRound(score, qs.length)
    setDone(true)
  }
  if (!qs.length) return <div className="text-center text-sm text-slate-500 py-6">ไม่มีตัวที่ต้องทบทวน <button className="underline" onClick={() => onDone(false)}>กลับ</button></div>
  if (done) {
    const pct = score / qs.length, ok = review || pct >= PASS
    return (
      <div className="text-center py-6 space-y-3" data-testid="lesson-result">
        <div className="text-5xl">{ok ? '🎉' : '💪'}</div>
        <div className="font-semibold">{title}: ถูก {score}/{qs.length} ({Math.round(pct * 100)}%)</div>
        <div className="text-xs text-slate-500">{review ? 'ทบทวนเสร็จแล้ว' : ok ? 'ผ่านด่าน! ด่านถัดไปปลดล็อกแล้ว' : `ต้องได้ ${Math.round(PASS * 100)}% ขึ้นไป ลองดูภาพจำอีกรอบแล้วกลับมาใหม่`}</div>
        <Button className="w-full" onClick={() => onDone(ok && !review)} data-testid="lesson-continue">{ok && !review ? 'ลองอ่านคำจริง' : 'กลับแผนที่'}</Button>
      </div>
    )
  }
  const right = q[q.key]
  return (
    <div className="space-y-3" data-testid="lesson-quiz">
      <div className="flex justify-between text-xs text-slate-500"><span>{title}</span><span>{i + 1}/{qs.length} · ถูก {score}</span></div>
      <div className="px-inner p-6 text-center">
        {q.kind === 'see' && <div className="text-6xl font-bold">{q.ch}</div>}
        {q.kind === 'read' && <div><div className="text-2xl font-bold text-sky-700">{q.read}</div><div className="text-xs text-slate-500 mt-1">ตัวไหนอ่านแบบนี้</div></div>}
        {q.kind === 'hear' && <button onClick={() => speak(q.say || q.ch, lang)} className="mx-auto w-16 h-16 grid place-items-center rounded-full bg-sky-100 text-sky-700"><Volume2 size={28} /></button>}
        {picked && q.kind !== 'see' && <div className="text-3xl font-bold mt-2">{q.ch} <span className="text-base text-sky-700">{q.read}</span></div>}
        {picked && q.hook && <div className="text-xs text-slate-500 mt-1">💡 {q.hook}</div>}
      </div>
      <div className={`grid ${q.key === 'ch' ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
        {q.options.map((o) => {
          const isRight = picked && o === right, isWrong = picked === o && o !== right
          return <button key={o} onClick={() => pick(o)} className={`py-3 border-2 font-semibold ${q.key === 'ch' ? 'text-2xl' : 'text-base'}`} style={{ borderColor: isRight ? '#16a34a' : isWrong ? '#e11d48' : 'rgba(148,163,184,.4)', background: isRight ? 'rgba(22,163,74,.1)' : isWrong ? 'rgba(225,29,72,.08)' : 'transparent' }} data-testid="lesson-opt">{o}</button>
        })}
      </div>
      {picked && <Button className="w-full" onClick={next} data-testid="lesson-qnext">{i + 1 < qs.length ? 'ต่อไป' : 'ดูผล'}</Button>}
    </div>
  )
}

function Words({ l, lang, onDone }) {
  return (
    <div className="space-y-3" data-testid="lesson-words">
      <div className="text-sm font-semibold">อ่านคำจริงได้แล้ว! 🎌</div>
      <div className="text-xs text-slate-500">คำเหล่านี้ใช้เฉพาะตัวอักษรที่เรียนมาแล้ว ลองอ่านเองก่อน แล้วกดฟังเสียง</div>
      {(l.words || []).map(([w, read, th]) => (
        <button key={w} onClick={() => speak(w, lang)} className="w-full flex items-center gap-3 px-inner p-3 text-left">
          <span className="text-2xl font-bold">{w}</span>
          <span className="flex-1 text-sm"><span className="text-sky-700">{read}</span> · {th}</span>
          <Volume2 size={16} className="text-sky-600" />
        </button>
      ))}
      <Button className="w-full" onClick={onDone}>กลับแผนที่</Button>
    </div>
  )
}
