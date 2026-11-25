import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, Lock, Check } from './px'
import { PxIcon, FlagImg } from './px'
import { Button, Sheet } from './ui'
import { useStore } from '../store'
import { sfx } from '../lib/sfx'
import { LANGS, speak, canSpeak, grade, loadBank } from '../lib/vocab'
import { todayISO } from '../lib/format'
import {
  COURSE_LANGS, STEPS, RUBRIC, RECHECK_PASS, LESSON_XP, CHECKPOINT_XP, PASS_SIDE, loadPath, pathNow, progOf, lessonState, nextUp, rubricOk,
  isRight, keyOf, orderTokens, levelOf, recheckSet, logLine, sectionDone,
} from '../lib/course'

/* The curriculum: a daily plan, the 32-lesson map per language, and the lesson player (4 steps). */

const V = () => useStore.getState().items.vocab?.data || {}
const setPath = (H, lang, id, patch) => {
  const v = V(), path = v.path || {}, lp = path[lang] || {}
  H.saveVocab({ path: { ...path, [lang]: { ...lp, [id]: { ...(lp[id] || {}), ...patch } } } })
}
const addLog = (H, e) => { const v = V(); H.saveVocab({ pathLog: [{ d: todayISO(), ...e }, ...(v.pathLog || [])].slice(0, 300) }) }
const MIN = [15, 20, 40, 60]

function usePath(lang) {
  const [p, setP] = useState(() => pathNow(lang))
  useEffect(() => { let a = true; setP(pathNow(lang)); loadPath(lang).then((x) => a && setP(x)); return () => { a = false } }, [lang])
  return p
}

/** the curriculum tab inside the vocab sheet */
export default function CurriculumView({ H, lang, setLang, onScript }) {
  const v = H.vocab || {}
  const prefs = { main: 'en', second: '', minutes: 20, ...(v.pathPrefs || {}) }
  const setPrefs = (x) => H.saveVocab({ pathPrefs: { ...prefs, ...x } })
  const path = usePath(lang)
  const [open, setOpen] = useState(null)
  const [log, setLog] = useState(false)
  const [skip, setSkip] = useState(null)
  if (!path) return <div className="text-center text-sm text-slate-500 py-6">กำลังโหลดหลักสูตร…</div>
  const prog = progOf(v, lang)
  if (open) return <LessonView H={H} lang={lang} path={path} lesson={open} onClose={() => setOpen(null)} />
  const L = path.LESSONS
  return (
    <div className="space-y-3" data-testid="path-view">
      <DailyPlan H={H} prefs={prefs} setPrefs={setPrefs} onGo={(lg, l) => { if (lg !== lang) setLang(lg); else if (l) setOpen(l) }} />
      {!L[0].body && <div className="px-inner p-3 text-xs space-y-2" data-testid="path-soon">
        <div>เนื้อหาบทเรียน{LANGS[lang].name}กำลังทยอยเพิ่มครับ ดูแผนทั้ง 32 บทด้านล่างได้ก่อน{LANGS[lang].course ? ' ระหว่างนี้บทแรก ๆ (เสียงและตัวอักษร) ฝึกได้ที่หลักสูตรตัวอักษรที่มีอยู่แล้ว' : ''}</div>
        {LANGS[lang].course && onScript && <button className="px-btn !py-1 text-[11px]" onClick={onScript} data-testid="path-to-script">ไปฝึกตัวอักษร</button>}
      </div>}
      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-500 flex-1">หลักสูตร{LANGS[lang].name} 32 บท · ผ่านแล้ว {L.filter((l) => prog[l.id]?.passed || prog[l.id]?.skip).length}</div>
        <button className="px-btn !py-1 text-[11px]" onClick={() => setLog(true)} data-testid="path-log-open"><PxIcon name="ScrollText" size={14} /> สมุดบันทึก</button>
      </div>
      {[1, 2, 3, 4].map((sec) => {
        const ls = L.filter((l) => l.sec === sec), done = sectionDone(v, lang, sec)
        return (
          <section key={sec} className="px-card p-3 space-y-1.5" data-testid={`path-sec-${sec}`}>
            <div className="flex items-center gap-2"><b className="text-sm flex-1">ช่วง {sec}: {path.SECTIONS[sec]}</b><span className="text-[11px] text-slate-500">{done}/8</span></div>
            {ls.map((l) => {
              const st = lessonState(L, L.indexOf(l), prog)
              return (
                <button key={l.id} disabled={!st.open || !st.ready} onClick={() => setOpen(l)} data-testid={`lesson-${l.id}`}
                  className={`w-full px-inner p-2 flex items-center gap-2 text-left text-xs ${!st.open || !st.ready ? 'opacity-60' : ''} ${l.check ? 'border-amber-300 bg-amber-50' : ''}`}>
                  <span className="w-6 h-6 grid place-items-center shrink-0">{st.done ? <Check size={16} className="text-emerald-600" /> : !st.open ? <Lock size={14} /> : <PxIcon name={l.check ? 'Trophy' : 'BookOpen'} size={18} />}</span>
                  <div className="flex-1 min-w-0"><div className="font-semibold truncate">{l.id} · {l.title}</div><div className="text-slate-500 truncate">{l.goal}</div></div>
                  <span className="text-[10px] shrink-0 text-slate-500">{!st.ready ? 'กำลังมา' : st.done ? (st.p.skip ? 'ข้ามแล้ว' : 'ผ่าน') : st.open ? (st.wait ? 'ทบทวนพรุ่งนี้' : STEPS.find((s) => s.id === st.next)?.name) : ''}</span>
                </button>
              )
            })}
            {done < 8 && ls.every((l) => l.body) && <button className="ui-link text-[11px]" onClick={() => setSkip(sec)} data-testid={`path-skip-${sec}`}>มีพื้นฐานแล้ว? ทดสอบข้ามช่วงนี้</button>}
            {!ls.every((l) => l.body) && <div className="text-[10px] text-slate-500">เนื้อหาช่วงนี้กำลังทยอยเพิ่ม ดูเป้าหมายแต่ละบทได้ก่อน</div>}
          </section>
        )
      })}
      <div className="text-[10px] text-slate-500 leading-relaxed">หลักสูตรนี้เรียบเรียงจากกรอบ Can-do ไม่ใช่การรับรองระดับสอบ (CEFR/JLPT/HSK/TOPIK) · ฟังเสียงจริงเพิ่ม: {path.SOURCES.slice(0, 4).map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer" className="ui-link mr-1">{s.name.split('—')[0].trim()}</a>)}</div>
      {log && <LogSheet v={v} onClose={() => setLog(false)} />}
      {skip && <SkipTest H={H} lang={lang} path={path} sec={skip} onClose={() => setSkip(null)} />}
    </div>
  )
}

/* ---------- daily plan: main + second language, minutes a day ---------- */
function DailyPlan({ H, prefs, setPrefs, onGo }) {
  const v = H.vocab || {}
  const [, force] = useState(0)
  useEffect(() => { let a = true; Promise.all([prefs.main, prefs.second].filter(Boolean).map(loadPath)).then(() => a && force((x) => x + 1)); return () => { a = false } }, [prefs.main, prefs.second])
  const row = (lang, share) => {
    if (!lang) return null
    const p = pathNow(lang), n = p && nextUp(p, progOf(v, lang))
    const min = Math.round(prefs.minutes * share)
    const step = n?.step && STEPS.find((s) => s.id === n.step)
    return (
      <div className="flex items-center gap-2 text-xs" data-testid={`plan-${lang}`}>
        <FlagImg e={LANGS[lang].flag} size={18} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{LANGS[lang].name} · {min} นาที</div>
          <div className="text-slate-500 truncate">{!n ? 'กำลังโหลด…' : n.done ? 'จบหลักสูตรแล้ว ทบทวนคำศัพท์ต่อ' : n.soon ? `${n.lesson.id} เนื้อหากำลังมา · ฝึกตัวอักษร/คำศัพท์ไปก่อน` : n.wait ? `${n.lesson.id} ทบทวนพรุ่งนี้ · วันนี้ฝึกคำศัพท์` : `${n.lesson.id} ${n.lesson.title} · ${step?.name} (~${step?.min} นาที)`}</div>
        </div>
        {n && !n.done && !n.soon && !n.wait && <button className="px-btn !py-1 text-[11px]" onClick={() => onGo(lang, n.lesson)} data-testid={`plan-go-${lang}`}>เริ่ม</button>}
      </div>
    )
  }
  return (
    <div className="px-inner p-3 space-y-2" data-testid="daily-plan">
      <div className="flex items-center gap-2"><PxIcon name="CalendarDays" size={18} /><b className="text-sm flex-1">วันนี้เรียนอะไร</b>
        <select className="text-[11px] border rounded px-1 py-0.5" value={prefs.minutes} onChange={(e) => setPrefs({ minutes: +e.target.value })} data-testid="plan-min">{MIN.map((m) => <option key={m} value={m}>{m} นาที/วัน</option>)}</select></div>
      {row(prefs.main, prefs.second ? 0.75 : 1)}
      {row(prefs.second, 0.25)}
      <div className="flex gap-2 text-[11px] items-center flex-wrap">
        <span className="text-slate-500">ภาษาหลัก</span>
        <select className="border rounded px-1 py-0.5" value={prefs.main} onChange={(e) => setPrefs({ main: e.target.value, second: prefs.second === e.target.value ? '' : prefs.second })} data-testid="plan-main">{COURSE_LANGS.map((l) => <option key={l} value={l}>{LANGS[l].name}</option>)}</select>
        <span className="text-slate-500">ภาษารอง</span>
        <select className="border rounded px-1 py-0.5" value={prefs.second} onChange={(e) => setPrefs({ second: e.target.value })} data-testid="plan-second"><option value="">ไม่มี</option>{COURSE_LANGS.filter((l) => l !== prefs.main).map((l) => <option key={l} value={l}>{LANGS[l].name}</option>)}</select>
      </div>
      <div className="text-[10px] text-slate-500">หนึ่งบทไม่เท่ากับหนึ่งวัน แบ่งเป็น 3 ช่วงสั้น + ทบทวนวันถัดไป · เรียน 2 ภาษาแบ่งเวลาหลัก 75% รอง 25%</div>
    </div>
  )
}

/* ---------- one lesson: header + the 4 steps ---------- */
function LessonView({ H, lang, path, lesson: l, onClose }) {
  const v = H.vocab || {}
  const prog = progOf(v, lang), L = path.LESSONS, idx = L.indexOf(l)
  const st = lessonState(L, idx, prog)
  const [step, setStep] = useState(null)
  const p = prog[l.id] || {}
  if (step) {
    const back = () => setStep(null)
    if (step === 's1') return <StepOne H={H} lang={lang} l={l} onDone={(c0) => { setPath(H, lang, l.id, { s1: p.s1 || todayISO(), c0 }); back() }} onBack={back} />
    if (step === 's2') return <StepTwo H={H} lang={lang} l={l} onDone={(sc) => { setPath(H, lang, l.id, { s2: p.s2 || todayISO(), f: sc }); back() }} onBack={back} />
    if (step === 's3') return <StepThree H={H} lang={lang} l={l} p={p} onDone={(x) => { setPath(H, lang, l.id, { s3: todayISO(), ...x }); back() }} onBack={back} />
    if (step === 're') return <Recheck H={H} lang={lang} l={l} p={p} onDone={back} onBack={back} />
  }
  const doneOf = (s) => (s === 're' ? !!p.passed : !!p[s] && (s !== 's3' || !!p.rub))
  return (
    <div className="space-y-3" data-testid="lesson-view">
      <button className="ui-link text-xs" onClick={onClose}>‹ กลับไปหน้าหลักสูตร</button>
      <div className="px-card p-3 space-y-1">
        <div className="text-[11px] text-slate-500">{l.id} · ช่วง {l.sec}{l.check ? ' · จุดตรวจ' : ''}</div>
        <b className="text-base">{l.title}</b>
        <div className="text-xs"><b>เมื่อจบบทนี้:</b> {l.goal}</div>
        <div className="text-[11px] text-slate-500"><b>เนื้อหา:</b> {l.topics}</div>
        <div className="text-[11px] text-slate-500"><b>ภารกิจท้ายบท:</b> {l.task}</div>
        {p.passed && <div className="text-xs text-emerald-700 font-semibold">ผ่านบทนี้แล้ว · {p.passed}{p.skip ? ' (ทดสอบข้าม)' : ` · +${l.check ? LESSON_XP + CHECKPOINT_XP : LESSON_XP} XP`}</div>}
      </div>
      {!l.body ? <div className="px-inner p-4 text-sm text-center text-slate-600">เนื้อหาบทนี้กำลังทยอยเพิ่มครับ ระหว่างนี้ฝึกตัวอักษรและคำศัพท์ไปก่อนได้</div> : (
        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const prevOk = i === 0 || doneOf(STEPS[i - 1].id)
            const wait = s.id === 're' && p.s3 && p.s3 >= todayISO() && !p.passed
            const can = st.open && prevOk && !wait && !(s.id === 're' && (!p.rub || !rubricOk(p.rub)))
            return (
              <button key={s.id} disabled={!can} onClick={() => setStep(s.id)} data-testid={`step-${s.id}`}
                className={`w-full px-inner p-3 flex items-center gap-3 text-left ${can ? '' : 'opacity-50'}`}>
                <span className="w-7 h-7 grid place-items-center rounded-full border-2 border-slate-800 text-xs font-bold shrink-0">{doneOf(s.id) ? <Check size={14} /> : i + 1}</span>
                <div className="flex-1"><div className="text-sm font-semibold">{s.name} <span className="text-[10px] text-slate-500 font-normal">~{s.min} นาที</span></div>
                  <div className="text-[11px] text-slate-500">{wait ? 'มาทำวันพรุ่งนี้ด้วยโจทย์ใหม่ (เว้นระยะช่วยให้จำได้นานขึ้น)' : s.id === 're' && p.rub && !rubricOk(p.rub) ? 'คะแนนบางด้านยังไม่ถึง 2 ลองทำช่วง "ใช้เอง" ซ้ำก่อน' : s.hint}</div></div>
              </button>
            )
          })}
          {p.rub && <RubricView rub={p.rub} />}
          {(p.stuck || []).length > 0 && <div className="px-inner p-2 text-[11px]"><b>จุดที่ควรฝึกต่อ:</b> {p.stuck.join(' · ')}</div>}
        </div>
      )}
    </div>
  )
}

function RubricView({ rub }) {
  return (
    <div className="px-inner p-2 text-[11px] space-y-0.5" data-testid="rubric-view">
      {RUBRIC.map((r) => <div key={r.k} className="flex justify-between"><span>{r.name}</span><b className={rub[r.k] >= PASS_SIDE ? 'text-emerald-700' : 'text-rose-600'}>{rub[r.k] ?? '-'}/3</b></div>)}
      <div className="flex justify-between text-slate-500"><span>การออกเสียง</span><span>ยังไม่ประเมิน (แอปไม่ได้ฟังเสียงจริง)</span></div>
    </div>
  )
}

/* ---------- step 1: listen first, then the words ---------- */
function StepOne({ H, lang, l, onDone, onBack }) {
  const b = l.body
  const [phase, setPhase] = useState('listen') // listen → qs → text → words → practice
  const [res, setRes] = useState(null)
  const playAll = () => playLines(b.dialog.lines, lang)
  return (
    <StepFrame title="ช่วง 1 · รับรู้" l={l} onBack={onBack}>
      {phase === 'listen' && <div className="space-y-3 text-center">
        <div className="text-sm">ฟังบทสนทนาก่อน <b>ยังไม่ต้องดูข้อความ</b> จับว่า ใคร อยู่ไหน ต้องการอะไร</div>
        <Button onClick={playAll} data-testid="s1-play"><Volume2 size={16} /> เปิดฟังบทสนทนา</Button>
        {!canSpeak() && <div className="text-[11px] text-rose-600">เครื่องนี้ไม่มีเสียงอ่าน ข้ามไปอ่านข้อความได้</div>}
        <Button variant="ghost" onClick={() => setPhase('qs')} data-testid="s1-toqs">ฟังแล้ว ไปตอบคำถาม</Button>
      </div>}
      {phase === 'qs' && <QuestionRunner lang={lang} qs={b.dialog.qs} intro="ตอบจากที่ได้ยิน (กดฟังซ้ำได้)" extra={<button className="ui-link text-xs" onClick={playAll}>ฟังอีกครั้ง</button>} onDone={(r) => { setRes(r); setPhase('text') }} />}
      {phase === 'text' && <div className="space-y-2">
        <div className="text-xs text-slate-500">ถูก {res?.right}/{res?.total} · เปิดข้อความตรวจได้แล้ว</div>
        <Dialog lines={b.dialog.lines} lang={lang} />
        <Button className="w-full" onClick={() => setPhase('words')} data-testid="s1-towords">ต่อ: คำศัพท์ของบท</Button>
      </div>}
      {phase === 'words' && <div className="space-y-2">
        <div className="text-xs text-slate-500">คำและวลีของบท (กดฟัง) จะเข้าระบบทบทวนให้อัตโนมัติ</div>
        {b.words.map(([w, read, th, ex, exTh, col]) => (
          <div key={w} className="px-inner p-2 text-xs space-y-0.5" data-testid="s1-word">
            <div className="flex items-center gap-2"><button onClick={() => speak(w.split(' / ')[0], lang)} aria-label="ฟัง"><Volume2 size={16} /></button><b className="text-sm">{w}</b><span className="text-slate-500">{read}</span><span className="ml-auto">{th}</span></div>
            {ex && <div className="text-slate-600"><button className="mr-1 align-middle" onClick={() => speak(ex, lang)} aria-label="ฟังประโยค"><Volume2 size={12} /></button>{ex} <span className="text-slate-400">· {exTh}</span></div>}
            {col && <div className="text-[10px] text-slate-500">มักใช้คู่กับ: {col}</div>}
          </div>
        ))}
        <Button className="w-full" onClick={() => setPhase('practice')} data-testid="s1-topractice">ฝึกคำของบท</Button>
      </div>}
      {phase === 'practice' && <WordPractice H={H} lang={lang} words={b.words} onDone={(r) => { H.vocabRound(r.right, r.total); addLog(H, { lang, id: l.id, task: 'รับรู้: ฟังบทสนทนา + คำศัพท์', evidence: `ฟังเข้าใจ ${res?.right}/${res?.total} · คำศัพท์ ${r.right}/${r.total}` }); onDone((res?.right || 0) / Math.max(1, res?.total || 1)) }} />}
    </StepFrame>
  )
}

/** meaning questions over the lesson words; grades them into the review boxes */
function WordPractice({ H, lang, words, onDone }) {
  const qs = useMemo(() => words.map(([w, , th], i) => {
    const others = words.filter((x) => x[0] !== w).map((x) => x[2]).sort(() => Math.random() - 0.5).slice(0, 3)
    const o = [th, ...others].sort(() => Math.random() - 0.5)
    return i % 2 ? { k: 'listen', say: w.split(' / ')[0], q: 'ฟังแล้วเลือกความหมาย', o, a: o.indexOf(th), wid: `${lang}:${w}` } : { k: 'choose', q: w, o, a: o.indexOf(th), wid: `${lang}:${w}` }
  }), [words, lang])
  useEffect(() => { loadBank(lang) }, [lang])
  return <QuestionRunner lang={lang} qs={qs} intro="เลือกความหมาย" onAnswer={(q, ok) => H.saveVocab(grade(V(), q.wid, ok))} onDone={onDone} />
}

/* ---------- step 2: grammar cards + 5 controlled drills ---------- */
function StepTwo({ H, lang, l, onDone, onBack }) {
  const b = l.body
  const [phase, setPhase] = useState(0)
  const g = b.grammar
  return (
    <StepFrame title="ช่วง 2 · ฝึกมีตัวช่วย" l={l} onBack={onBack}>
      {phase < g.length ? (
        <div className="space-y-2" data-testid="s2-grammar">
          <div className="text-[11px] text-slate-500">รูปประโยค {phase + 1}/{g.length}</div>
          <div className="px-inner p-3 space-y-2">
            <b className="text-sm">{g[phase].h}</b>
            <div className="text-xs leading-relaxed">{g[phase].body}</div>
            {g[phase].ex.map(([t, th], i) => <div key={i} className="text-xs flex items-start gap-1.5"><button onClick={() => speak(t.replace(/[✓✗↗↘]/g, ''), lang)} aria-label="ฟัง"><Volume2 size={14} /></button><span><b>{t}</b>{th && <span className="text-slate-500"> · {th}</span>}</span></div>)}
          </div>
          <Button className="w-full" onClick={() => setPhase(phase + 1)} data-testid="s2-next">{phase + 1 < g.length ? 'ต่อ' : 'ไปทำแบบฝึก'}</Button>
        </div>
      ) : (
        <QuestionRunner lang={lang} qs={b.drills} intro="ลองตอบก่อน แล้วค่อยดูเฉลย" onDone={(r) => { H.vocabRound(r.right, r.total); addLog(H, { lang, id: l.id, task: 'ฝึกรูปประโยค', evidence: `แบบฝึก ${r.right}/${r.total}`, stuck: r.wrong.join(' / ') }); onDone(r.right / Math.max(1, r.total)) }} />
      )}
    </StepFrame>
  )
}

/* ---------- step 3: the task (new data), speak, write, then the rubric ---------- */
function StepThree({ H, lang, l, p, onDone, onBack }) {
  const b = l.body
  const variant = useMemo(() => (p.tv == null ? 0 : (p.tv + 1) % b.tasks.length), []) // eslint-disable-line
  const task = b.tasks[variant]
  const qs = useMemo(() => (task.gen === 'letters' ? [...letterQs(6), ...task.qs] : task.qs), [task])
  const [phase, setPhase] = useState('task')
  const [res, setRes] = useState(null)
  const [self, setSelf] = useState({ t: null, i: null })
  const [written, setWritten] = useState('')
  const finish = () => {
    const tr = res ? res.right / Math.max(1, res.total) : 0
    const lr = res?.listenTotal ? res.listenRight / res.listenTotal : tr
    const rub = { c: levelOf(((p.c0 ?? lr) + lr) / 2), f: levelOf(((p.f ?? tr) + tr) / 2), t: self.t, i: self.i }
    const stuck = [...(res?.wrong || [])].slice(0, 3)
    addLog(H, { lang, id: l.id, task: task.brief, evidence: `ภารกิจ ${res?.right}/${res?.total}${written ? ` · เขียน: "${written.slice(0, 80)}"` : ''}`, rub, stuck: stuck.join(' / '), review: 'พรุ่งนี้' })
    H.vocabRound(res?.right || 0, res?.total || 0)
    onDone({ rub, tv: variant, stuck, written })
  }
  return (
    <StepFrame title="ช่วง 3 · ใช้เอง" l={l} onBack={onBack}>
      {phase === 'task' && <div className="space-y-2">
        <div className="px-inner p-2 text-xs"><b>ภารกิจ:</b> {task.brief}{task.data && <div className="mt-1 text-slate-600 whitespace-pre-line" data-testid="task-data">{task.data}</div>}</div>
        <QuestionRunner lang={lang} qs={qs} intro="ทำภารกิจด้วยข้อมูลชุดนี้ (ทุกครั้งที่ทำซ้ำจะได้ชุดใหม่)" onDone={(r) => { setRes(r); setPhase('speak') }} />
      </div>}
      {phase === 'speak' && <SpeakPart lang={lang} speak={b.speak} onDone={() => setPhase('write')} />}
      {phase === 'write' && <div className="space-y-2" data-testid="s3-write">
        <div className="px-inner p-2 text-xs"><b>เขียน:</b> {b.write.prompt}</div>
        <textarea className="field min-h-[90px]" value={written} onChange={(e) => setWritten(e.target.value)} placeholder="พิมพ์เป็นภาษาเป้าหมาย" data-testid="s3-text" />
        <details className="px-inner p-2 text-xs"><summary className="cursor-pointer">ดูตัวอย่างและเช็กลิสต์ (หลังเขียนเสร็จ)</summary><div className="mt-1 whitespace-pre-line"><b>ตัวอย่าง:</b> {b.write.model}</div><ul className="list-disc ml-4 mt-1">{b.write.check.map((c) => <li key={c}>{c}</li>)}</ul></details>
        <Button className="w-full" onClick={() => setPhase('rub')} disabled={written.trim().length < 3} data-testid="s3-towrub">ต่อ: ประเมินตัวเอง</Button>
      </div>}
      {phase === 'rub' && <div className="space-y-2" data-testid="s3-rubric">
        <div className="text-xs">แอปให้คะแนน <b>ความเข้าใจ</b> และ <b>รูปภาษา</b> จากคำตอบจริง อีก 2 ด้านให้คุณเลือกเองโดยเทียบกับตัวอย่าง (ซื่อตรงกับตัวเองนะครับ)</div>
        {RUBRIC.filter((r) => !r.auto).map((r) => (
          <div key={r.k} className="px-inner p-2 space-y-1">
            <b className="text-xs">{r.name}</b>
            {r.lv.map((t, n) => <button key={n} onClick={() => setSelf((s) => ({ ...s, [r.k]: n }))} data-testid={`rub-${r.k}-${n}`} className={`w-full text-left text-[11px] px-2 py-1 rounded border ${self[r.k] === n ? 'border-slate-900 bg-slate-100 font-semibold' : 'border-slate-200'}`}>{n} · {t}</button>)}
          </div>
        ))}
        <div className="text-[11px] text-slate-500">การออกเสียง: ยังไม่ประเมิน (ฟังเสียงที่อัดไว้เทียบกับตัวอย่างเอง)</div>
        <Button className="w-full" disabled={self.t == null || self.i == null} onClick={finish} data-testid="s3-finish">บันทึกผล</Button>
      </div>}
    </StepFrame>
  )
}

/** listen → repeat (record and compare) → answer the open prompt. Pronunciation is never auto-graded. */
function SpeakPart({ lang, speak: sp, onDone }) {
  const [rec, setRec] = useState(null)
  const [url, setUrl] = useState(null)
  const [heard, setHeard] = useState('')
  const mr = useRef(null)
  const canRec = typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const start = async () => {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true })
      const m = new MediaRecorder(st), chunks = []
      m.ondataavailable = (e) => chunks.push(e.data)
      m.onstop = () => { setUrl(URL.createObjectURL(new Blob(chunks, { type: m.mimeType }))); st.getTracks().forEach((t) => t.stop()) }
      m.start(); mr.current = m; setRec(true)
    } catch { useStore.getState().showToast('เปิดไมค์ไม่ได้ ข้ามส่วนอัดเสียงได้') }
  }
  const stop = () => { mr.current?.stop(); setRec(false) }
  const listen = () => {
    try {
      const r = new SR(); r.lang = LANGS[lang]?.voice || 'en-US'; r.interimResults = false
      r.onresult = (e) => setHeard(e.results[0][0].transcript); r.onerror = () => setHeard('(ฟังไม่ได้ ลองใหม่)'); r.start()
    } catch { setHeard('(เครื่องนี้ไม่รองรับ)') }
  }
  return (
    <div className="space-y-2" data-testid="s3-speak">
      <div className="px-inner p-2 text-xs"><b>พูดตาม:</b> กดฟังทีละประโยคแล้วพูดตามช้า ๆ</div>
      {sp.repeat.map((t) => <div key={t} className="flex items-center gap-2 text-sm"><button onClick={() => speak(t, lang)} aria-label="ฟัง"><Volume2 size={16} /></button>{t}</div>)}
      <div className="px-inner p-2 text-xs"><b>พูดเอง:</b> {sp.prompt}</div>
      <div className="flex gap-2 flex-wrap">
        {canRec && (rec ? <Button onClick={stop} data-testid="rec-stop">หยุดอัด</Button> : <Button variant="ghost" onClick={start} data-testid="rec-start">อัดเสียงตัวเอง</Button>)}
        {url && <audio src={url} controls className="h-8" />}
        {SR && <Button variant="ghost" onClick={listen}>ให้เครื่องลองฟัง</Button>}
      </div>
      {heard && <div className="text-[11px]">เครื่องได้ยินว่า: <b>{heard}</b> <span className="text-slate-500">(ใช้เช็กว่าพูดคำครบ ไม่ใช่คะแนนสำเนียง)</span></div>}
      <details className="text-xs"><summary className="cursor-pointer">ดูตัวอย่างคำตอบ</summary><div className="mt-1 flex items-start gap-1"><button onClick={() => speak(sp.model, lang)}><Volume2 size={14} /></button>{sp.model}</div></details>
      <Button className="w-full" onClick={onDone} data-testid="s3-tospeakdone">พูดแล้ว ต่อ: เขียน</Button>
    </div>
  )
}

/* ---------- recheck on a later day ---------- */
function Recheck({ H, lang, l, p, onDone, onBack }) {
  const qs = useMemo(() => recheckSet(l, p.tv || 0), [l]) // eslint-disable-line
  const [res, setRes] = useState(null)
  const save = (r) => {
    setRes(r)
    const ok = r.right / Math.max(1, r.total) >= RECHECK_PASS
    setPath(H, lang, l.id, ok ? { re: { date: todayISO(), score: r.right }, passed: todayISO() } : { re: { date: todayISO(), score: r.right }, s3: null, rub: null })
    addLog(H, { lang, id: l.id, task: 'ทบทวนวันถัดไป', evidence: `โจทย์ใหม่ ${r.right}/${r.total}`, rub: p.rub, stuck: r.wrong.join(' / '), next: ok ? 'บทถัดไป' : 'ทำช่วงใช้เองซ้ำ' })
    H.vocabRound(r.right, r.total)
    if (ok) sfx('levelup')
  }
  return (
    <StepFrame title="ทบทวนวันถัดไป" l={l} onBack={onBack}>
      {!res ? <QuestionRunner lang={lang} qs={qs} intro="โจทย์ใหม่ 5 ข้อ ต้องถูก 70% ขึ้นไป" onDone={save} /> : (
        <div className="text-center space-y-3 py-4" data-testid="recheck-result">
          <div className="flex justify-center"><PxIcon name={res.right / res.total >= RECHECK_PASS ? 'GraduationCap' : 'BookOpen'} size={48} /></div>
          <div className="font-semibold">{res.right / res.total >= RECHECK_PASS ? `ผ่านบท ${l.id}! +${l.check ? LESSON_XP + CHECKPOINT_XP : LESSON_XP} XP${l.check ? ' + หีบวินัย' : ''}` : 'ยังไม่ผ่าน ลองทำช่วง "ใช้เอง" ซ้ำด้วยข้อมูลชุดใหม่ แล้วกลับมาทบทวนพรุ่งนี้'}</div>
          <div className="text-xs text-slate-500">ถูก {res.right}/{res.total}</div>
          <Button onClick={onDone}>กลับไปที่บท</Button>
        </div>
      )}
    </StepFrame>
  )
}

/* ---------- skip test: 10 questions from the section, 80% ---------- */
function SkipTest({ H, lang, path, sec, onClose }) {
  const ls = path.LESSONS.filter((l) => l.sec === sec && l.body)
  const qs = useMemo(() => ls.flatMap((l) => l.body.drills.slice(0, 2)).sort(() => Math.random() - 0.5).slice(0, 10), []) // eslint-disable-line
  const [res, setRes] = useState(null)
  const done = (r) => {
    setRes(r)
    if (r.right / r.total >= 0.8) {
      const v = V(), pth = v.path || {}, lp = { ...(pth[lang] || {}) }
      for (const l of ls) if (!lp[l.id]?.passed) lp[l.id] = { ...(lp[l.id] || {}), skip: todayISO() }
      H.saveVocab({ path: { ...pth, [lang]: lp } })
      addLog(H, { lang, id: `${lang.toUpperCase()} ช่วง ${sec}`, task: 'ทดสอบข้ามช่วง', evidence: `${r.right}/${r.total}`, next: 'ช่วงถัดไป' })
    }
  }
  return (
    <Sheet open onClose={onClose} title={`ทดสอบข้ามช่วง ${sec}`}>
      {!res ? <QuestionRunner lang={lang} qs={qs} intro="10 ข้อจากทุกบทในช่วงนี้ ต้องถูก 80% · ข้ามแล้วไม่ได้ XP/หีบของบทที่ข้าม" onDone={done} /> :
        <div className="text-center py-4 space-y-2"><div className="font-semibold">{res.right / res.total >= 0.8 ? 'ผ่าน ข้ามช่วงนี้แล้ว' : 'ยังไม่ถึง 80% เรียนตามบทไปก่อนดีกว่า'}</div><div className="text-xs">ถูก {res.right}/{res.total}</div><Button onClick={onClose}>ปิด</Button></div>}
    </Sheet>
  )
}

/* ---------- learning log (copyable) ---------- */
function LogSheet({ v, onClose }) {
  const log = v.pathLog || []
  const text = ['วันที่ | บท | ภารกิจที่ทำได้ | หลักฐาน | คะแนนรายด้าน | สิ่งที่ติด | วันทบทวน | บทถัดไป', ...log.map(logLine)].join('\n')
  return (
    <Sheet open onClose={onClose} title="สมุดบันทึกการเรียน">
      <div className="space-y-2" data-testid="path-log">
        <Button onClick={() => { navigator.clipboard?.writeText(text); useStore.getState().showToast('คัดลอกแล้ว ส่งให้ครูหรือ Claude ตรวจต่อได้') }}>คัดลอกทั้งหมด</Button>
        {!log.length && <div className="text-sm text-slate-500">ยังไม่มีบันทึก เริ่มบทแรกได้เลย</div>}
        {log.slice(0, 60).map((e, i) => (
          <div key={i} className="px-inner p-2 text-[11px] space-y-0.5">
            <div className="flex justify-between"><b>{e.id}</b><span className="text-slate-500">{e.d}</span></div>
            <div>{e.task}</div>{e.evidence && <div className="text-slate-500">{e.evidence}</div>}
            {e.rub && <div className="text-slate-500">{RUBRIC.map((r) => `${r.name.split('/')[0]} ${e.rub[r.k] ?? '-'}`).join(' · ')} · ออกเสียง ยังไม่ประเมิน</div>}
            {e.stuck && <div className="text-rose-600">ติด: {e.stuck}</div>}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ---------- shared pieces ---------- */
function StepFrame({ title, l, onBack, children }) {
  return (
    <div className="space-y-3" data-testid="step-frame">
      <div className="flex items-center gap-2"><button className="ui-link text-xs" onClick={onBack}>‹ {l.id}</button><b className="text-sm flex-1 text-right">{title}</b></div>
      {children}
    </div>
  )
}
function Dialog({ lines, lang }) {
  return (
    <div className="px-inner p-2 space-y-1.5" data-testid="dialog-text">
      {lines.map(([who, t, th], i) => <div key={i} className="text-xs flex gap-1.5"><b className="w-4 shrink-0">{who}</b><button onClick={() => speak(t, lang)} aria-label="ฟัง"><Volume2 size={14} /></button><div><div>{t}</div><div className="text-slate-500">{th}</div></div></div>)}
    </div>
  )
}
/** read a dialog aloud line by line */
function playLines(lines, lang) {
  try {
    const s = window.speechSynthesis; if (!s) return
    s.cancel()
    const voices = s.getVoices().filter((v) => v.lang?.replace('_', '-').startsWith((LANGS[lang]?.voice || 'en-US').slice(0, 2)))
    lines.forEach(([who, t]) => {
      const u = new SpeechSynthesisUtterance(t); u.lang = LANGS[lang]?.voice || 'en-US'; u.rate = 0.85
      const vv = voices[who === 'B' && voices.length > 1 ? 1 : 0]; if (vv) u.voice = vv
      u.pitch = who === 'B' ? 1.15 : 0.95
      s.speak(u)
    })
  } catch { /* no voice */ }
}
const LETTERS = 'ABDEFGHIJLMNQRTY'
function letterQs(n) {
  const pick = [...LETTERS].sort(() => Math.random() - 0.5).slice(0, n)
  return pick.map((ch, i) => {
    const up = i % 2 === 0, right = up ? ch.toLowerCase() : ch
    const pool = [...LETTERS].filter((x) => x !== ch).sort(() => Math.random() - 0.5).slice(0, 3).map((x) => (up ? x.toLowerCase() : x))
    const o = [right, ...pool].sort(() => Math.random() - 0.5)
    return { k: 'choose', q: up ? `ตัวเล็กของ ${ch}` : `ตัวใหญ่ของ ${ch.toLowerCase()}`, o, a: o.indexOf(right) }
  })
}

/**
 * Runs a list of questions one by one: answer first, then the key (and why).
 * onDone({ right, total, wrong: [question text], listenRight, listenTotal })
 */
export function QuestionRunner({ lang, qs, intro, extra, onDone, onAnswer }) {
  const [i, setI] = useState(0)
  const [ans, setAns] = useState(null)
  const [typed, setTyped] = useState('')
  const [built, setBuilt] = useState([])
  const [acc, setAcc] = useState({ right: 0, total: 0, wrong: [], listenRight: 0, listenTotal: 0 })
  const q = qs[i]
  useEffect(() => { setAns(null); setTyped(''); setBuilt([]); if (q?.k === 'listen' && q.say) setTimeout(() => speak(q.say, lang), 250) }, [i]) // eslint-disable-line
  const toks = useMemo(() => (q?.k === 'order' ? orderTokens(q, i + 7) : []), [q, i])
  if (!q) return null
  const answered = ans !== null
  const ok = answered && isRight(q, ans)
  const submit = (a) => {
    if (answered) return
    const right = isRight(q, a)
    setAns(a); sfx(right ? 'coin' : 'hit')
    onAnswer?.(q, right)
    const isL = q.k === 'listen'
    setAcc((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1, wrong: right ? s.wrong : [...s.wrong, q.q || q.say], listenRight: s.listenRight + (isL && right ? 1 : 0), listenTotal: s.listenTotal + (isL ? 1 : 0) }))
  }
  const next = () => { if (i + 1 >= qs.length) onDone(acc); else setI(i + 1) }
  return (
    <div className="space-y-2" data-testid="qrunner">
      <div className="flex items-center text-[11px] text-slate-500"><span className="flex-1">{intro}</span><span>{i + 1}/{qs.length}</span></div>
      {extra}
      <div className="px-inner p-3 space-y-2">
        {q.k === 'listen' && <button className="px-btn !py-1 text-xs" onClick={() => speak(q.say, lang)} data-testid="q-play"><Volume2 size={14} /> ฟัง</button>}
        {q.q && <div className="text-sm font-semibold whitespace-pre-line" data-testid="q-text">{q.q}</div>}
        {(q.k === 'choose' || q.k === 'listen') && <div className="grid gap-1.5">{q.o.map((o, n) => (
          <button key={n} onClick={() => submit(n)} data-testid={`q-opt-${n}`}
            className={`text-left text-sm px-3 py-2 rounded border-2 ${!answered ? 'border-slate-200' : n === q.a ? 'border-emerald-500 bg-emerald-50' : n === ans ? 'border-rose-400 bg-rose-50' : 'border-slate-100 opacity-60'}`}>{o}</button>))}</div>}
        {q.k === 'type' && <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) submit(typed) }} className="flex gap-2">
          <input className="field flex-1" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={answered} autoCapitalize="off" autoCorrect="off" spellCheck={false} data-testid="q-input" placeholder="พิมพ์คำตอบ" />
          {!answered && <Button type="submit" data-testid="q-submit">ตอบ</Button>}
        </form>}
        {q.k === 'order' && <div className="space-y-2">
          <div className="min-h-[38px] px-2 py-1.5 rounded border-2 border-dashed border-slate-300 flex flex-wrap gap-1" data-testid="q-built">{built.map((n, k) => <button key={k} disabled={answered} onClick={() => setBuilt(built.filter((_, j) => j !== k))} className="px-2 py-0.5 rounded bg-slate-800 text-white text-sm">{toks[n]}</button>)}</div>
          <div className="flex flex-wrap gap-1">{toks.map((t, n) => built.includes(n) ? null : <button key={n} disabled={answered} onClick={() => setBuilt([...built, n])} className="px-2 py-0.5 rounded border-2 border-slate-300 text-sm" data-testid={`q-tok-${n}`}>{t}</button>)}</div>
          {!answered && <Button disabled={built.length !== toks.length} onClick={() => submit(built.map((n) => toks[n]).join(' '))} data-testid="q-submit">ตอบ</Button>}
        </div>}
        {answered && <div className={`text-xs rounded p-2 ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`} data-testid="q-feedback">
          {ok ? 'ถูกต้อง' : 'ยังไม่ถูก'}{(q.k === 'type' || q.k === 'order') && (keyOf(q) ? <> · คำตอบตัวอย่าง: <b>{keyOf(q)}</b>{q.k === 'type' && !ok && <span> (คำตอบอื่นที่ความหมายและรูปถูกก็ใช้ได้)</span>}</> : <> · ข้อนี้ตอบได้หลายแบบตามข้อมูลของคุณ</>)}
          {q.why && <div className="mt-0.5">{q.why}</div>}
          {q.k === 'listen' && <div className="mt-0.5 text-slate-600">ประโยคที่ได้ยิน: {q.say}</div>}
        </div>}
      </div>
      {answered && <Button className="w-full" onClick={next} data-testid="q-next">{i + 1 >= qs.length ? 'เสร็จ' : 'ข้อต่อไป'}</Button>}
    </div>
  )
}
