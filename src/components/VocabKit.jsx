import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, X, Plus } from 'lucide-react'
import { Button, Segmented } from './ui'
import CourseView from './CourseKit'
import { useStore } from '../store'
import { sfx } from '../lib/sfx'
import { LANGS, CATS, LEVELS, MODES, modesFor, loadBank, bankNow, pickRound, grade, sameWord, statsFor, customOf, speak, canSpeak, LEARNT_BOX } from '../lib/vocab'

const ROUND = 10

/** The vocabulary sheet: pick language / level / category / practice style, then rounds of 10. */
export default function VocabSheet({ H }) {
  const v = H.vocab || {}
  const prefs = { lang: 'en', lvs: [], cats: [], mode: 'auto', ...(v.prefs || {}) }
  const setPrefs = (p) => H.saveVocab({ prefs: { ...prefs, ...p } })
  const [tab, setTab] = useState('quiz')
  const [bank, setBank] = useState(() => bankNow(prefs.lang))
  const [round, setRound] = useState(null)
  useEffect(() => { let alive = true; setBank(bankNow(prefs.lang)); loadBank(prefs.lang).then((b) => alive && setBank(b)); return () => { alive = false } }, [prefs.lang])
  const lang = LANGS[prefs.lang]
  const st = useMemo(() => statsFor(v, prefs.lang, bank || []), [v, prefs.lang, bank])

  const start = () => {
    const qs = pickRound(useStore.getState().items.vocab?.data || {}, { lang: prefs.lang, bank: bank || [], lvs: prefs.lvs, cats: prefs.cats, mode: prefs.mode, n: ROUND })
    if (!qs.length) { useStore.getState().showToast('หมวดนี้ทำครบแล้ววันนี้ ลองเลือกหมวดหรือระดับอื่น'); return }
    setRound({ qs, i: 0, score: 0, graded: {}, again: 0 })
  }

  if (round) return <Quiz round={round} setRound={setRound} H={H} lang={prefs.lang} onAgain={start} />

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" data-testid="vocab-langs">
        {Object.entries(LANGS).map(([k, l]) => (
          <button key={k} onClick={() => setPrefs({ lang: k, cats: [] })} className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold ${prefs.lang === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'}`}>
            <div className="text-lg leading-none">{l.flag}</div>{l.name}
          </button>
        ))}
      </div>
      <Segmented value={lang.course ? tab : tab === 'script' ? 'quiz' : tab} onChange={setTab} options={[...(lang.course ? [{ value: 'script', label: 'ตัวอักษร' }] : []), { value: 'quiz', label: 'ฝึกคำศัพท์' }, { value: 'words', label: 'คำศัพท์' }]} />

      {lang.course && tab === 'script' && lang.ready ? <CourseView H={H} lang={prefs.lang} /> : !lang.ready ? (
        <div className="px-inner p-5 text-center text-sm text-slate-600">ภาษา{lang.name}กำลังจะมา พร้อมหลักสูตรตัวอักษร 🛠️</div>
      ) : !bank ? <div className="text-center text-sm text-slate-500 py-6">กำลังโหลดคำศัพท์…</div> : tab === 'quiz' ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="จำได้แล้ว" v={`${st.learnt} คำ`} /><Stat label="รอทบทวน" v={`${st.due} คำ`} /><Stat label="วันนี้" v={`${H.dayOf().vocab?.rounds || 0} รอบ`} />
          </div>
          <div className="px-hp"><div style={{ width: `${st.total ? (st.learnt / st.total) * 100 : 0}%` }} /></div>
          <div className="text-[11px] text-slate-500 -mt-1">จำได้ {st.learnt} จาก {st.total} คำ</div>

          <Chips label="ระดับ" all="ทุกระดับ" items={Object.entries(LEVELS).map(([k, n]) => [+k, n])} value={prefs.lvs} onChange={(lvs) => setPrefs({ lvs })} />
          <Chips label="หมวด" all="ทุกหมวด" items={[...Object.entries(CATS).map(([k, c]) => [k, `${c.emoji} ${c.name}`]), ...(customOf(v, prefs.lang).length ? [['mine', '⭐ คำของฉัน']] : []), ...(v.customCats || []).map((c) => [c.id, `🏷️ ${c.name}`])]} value={prefs.cats} onChange={(cats) => setPrefs({ cats })} />
          <div>
            <div className="text-xs text-slate-500 mb-1">แบบฝึก</div>
            <select className="field" value={prefs.mode} onChange={(e) => setPrefs({ mode: e.target.value })} data-testid="vocab-mode">
              {modesFor(prefs.lang).map((m) => <option key={m} value={m}>{MODES[m].emoji} {MODES[m].name} · {MODES[m].hint}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={start} data-testid="vocab-start">เริ่มรอบละ {ROUND} คำ</Button>
          <div className="text-[11px] text-slate-500">คำที่ตอบถูกจะเว้นไปทบทวน 1 → 3 → 7 → 21 → 60 วัน · ตอบผิดกลับไปเริ่มใหม่และวนกลับมาในรอบเดิมอีกได้ 2 ครั้ง · ถูกครบ {LEARNT_BOX} ครั้งนับว่าจำได้ · คำที่ทำแล้ววันนี้จะไม่ขึ้นซ้ำ</div>
        </>
      ) : <WordList H={H} lang={prefs.lang} bank={bank} />}
    </div>
  )
}

function Chips({ label, all, items, value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange([])} className={`px-2.5 py-1 rounded-full border text-xs ${!value.length ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 bg-white'}`}>{all}</button>
        {items.map(([k, n]) => <button key={k} onClick={() => toggle(k)} className={`px-2.5 py-1 rounded-full border text-xs ${value.includes(k) ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 bg-white'}`}>{n}</button>)}
      </div>
    </div>
  )
}

function SpeakBtn({ text, lang, auto = false, big = false }) {
  useEffect(() => { if (auto) speak(text, lang) }, [auto, text, lang])
  if (!canSpeak()) return null
  return <button onClick={(e) => { e.stopPropagation(); speak(text, lang) }} className={`${big ? 'w-16 h-16' : 'w-8 h-8'} grid place-items-center rounded-full bg-sky-100 text-sky-700 shrink-0`} aria-label="ฟังเสียง" data-testid="vocab-speak"><Volume2 size={big ? 28 : 16} /></button>
}

/** the word with its reading (and kana / pinyin) */
function WordFace({ w, size = 'text-3xl' }) {
  return (
    <div className="text-center">
      <div className={`${size} font-bold tracking-wide`} data-testid="vocab-word">{w.w}</div>
      {w.alt && w.lang !== 'zh' && <div className="text-sm text-slate-600 mt-0.5">{w.alt}</div>}
      {w.read && <div className="text-sm text-sky-700 mt-0.5">อ่านว่า {w.read}</div>}
      {w.alt && w.lang === 'zh' && <div className="text-xs text-slate-500 mt-0.5 tracking-wide">{w.alt}</div>}
    </div>
  )
}

function Quiz({ round, setRound, H, lang, onAgain }) {
  const { qs, i, score } = round
  const w = qs[i]
  const [picked, setPicked] = useState(null) // the option tapped, or 'typed:<text>', or 'flash:yes|no'
  const [typed, setTyped] = useState('')
  const [flipped, setFlipped] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { setPicked(null); setTyped(''); setFlipped(false); if (w?.mode === 'spell') setTimeout(() => inputRef.current?.focus(), 50) }, [i]) // eslint-disable-line

  if (round.done) {
    return (
      <div className="text-center py-6 space-y-3" data-testid="vocab-done">
        <div className="text-4xl">🎓</div><div className="font-semibold">จบรอบ! ถูกตั้งแต่ครั้งแรก {score}/{round.total}</div>
        {round.again > 0 && <div className="text-xs text-slate-500">ทบทวนคำที่ผิดซ้ำในรอบแล้ว {round.again} ครั้ง</div>}
        <div className="text-xs text-slate-500">+10 FIAT</div>
        <div className="flex gap-2"><Button className="flex-1" onClick={onAgain}>อีกรอบ</Button><Button variant="ghost" className="flex-1" onClick={() => setRound(null)}>พอแล้ว</Button></div>
      </div>
    )
  }

  const correctKey = w.mode === 'reverse' || w.mode === 'sentence' ? 'w' : 'th'
  const finish = (ok) => {
    if (picked) return
    sfx(ok ? 'coin' : 'hit')
    const first = !round.graded[w.id]
    if (first) H.saveVocab(grade(useStore.getState().items.vocab?.data || {}, w.id, ok))
    setRound((r) => {
      const graded = { ...r.graded, [w.id]: true }
      // a wrong word comes back at the end of this round (up to 2 more times)
      const tries = (w.tries || 0) + 1
      const qs2 = ok || tries > 2 ? r.qs : [...r.qs, { ...w, again: true, tries, options: w.options ? [...w.options].sort(() => Math.random() - 0.5) : w.options }]
      return { ...r, qs: qs2, graded, score: r.score + (ok && first ? 1 : 0), again: r.again + (ok ? 0 : 1) }
    })
  }
  const pick = (o) => { if (picked) return; setPicked(o); finish(o === w[correctKey]) }
  const next = () => {
    if (i + 1 >= round.qs.length) { H.vocabRound(round.score, Object.keys(round.graded).length); setRound((r) => ({ ...r, done: true, total: Object.keys(r.graded).length })); return }
    setRound((r) => ({ ...r, i: r.i + 1 }))
  }
  const fixOptions = w.options?.length ? w.options : null

  return (
    <div className="space-y-3" data-testid="vocab-q">
      <div className="flex justify-between text-xs text-slate-500"><span>{w.again ? '🔁 ทบทวนคำที่ผิด' : `${MODES[w.mode].emoji} ${MODES[w.mode].name}`}</span><span>{i + 1}/{round.qs.length} · ถูก {score}</span></div>

      <div className="px-inner p-5 space-y-2">
        {(w.mode === 'choose' || w.mode === 'flash' || w.mode === 'spell' && picked) && <div className="flex items-center justify-center gap-3"><WordFace w={w} /><SpeakBtn text={w.w} lang={lang} /></div>}
        {w.mode === 'listen' && <div className="flex flex-col items-center gap-2"><SpeakBtn text={w.w} lang={lang} auto big /><div className="text-xs text-slate-500">{picked ? <WordFace w={w} size="text-2xl" /> : 'กดเพื่อฟังอีกครั้ง'}</div></div>}
        {(w.mode === 'reverse' || (w.mode === 'spell' && !picked)) && <div className="text-center"><div className="text-2xl font-bold">{w.th}</div><div className="text-[11px] text-slate-500 mt-1">{w.mode === 'spell' ? 'พิมพ์คำนี้เป็นภาษา' + LANGS[lang].name : 'เลือกคำที่มีความหมายนี้'}</div></div>}
        {w.mode === 'sentence' && <div className="text-center space-y-1"><div className="text-lg font-semibold leading-snug">{w.blank}</div>{w.exTh && <div className="text-xs text-slate-500">{w.exTh}</div>}</div>}
        {w.mode === 'flash' && (flipped ? <div className="text-center text-xl font-semibold text-emerald-700" data-testid="vocab-answer">{w.th}</div> : <div className="text-center text-xs text-slate-400">นึกความหมายในใจ แล้วพลิกดู</div>)}
        {picked && w.ex && w.mode !== 'sentence' && <div className="text-xs text-slate-500 text-center pt-1">“{w.ex}”{w.exTh ? ` · ${w.exTh}` : ''}</div>}
      </div>

      {['choose', 'listen', 'reverse', 'sentence'].includes(w.mode) && fixOptions && (
        <div className="grid grid-cols-1 gap-2">
          {fixOptions.map((o) => {
            const isRight = picked && o === w[correctKey], isWrong = picked === o && o !== w[correctKey]
            return <button key={o} onClick={() => pick(o)} className="text-left px-4 py-3 border-2 text-sm font-medium transition" style={{ borderColor: isRight ? '#16a34a' : isWrong ? '#e11d48' : 'rgba(148,163,184,.4)', background: isRight ? 'rgba(22,163,74,.1)' : isWrong ? 'rgba(225,29,72,.08)' : 'transparent' }} data-testid="vocab-opt">{o}</button>
          })}
        </div>
      )}

      {w.mode === 'spell' && (
        picked ? (
          <div className={`text-center text-sm font-semibold ${picked === 'typed:ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{picked === 'typed:ok' ? '✓ สะกดถูก' : `✗ ที่ถูกคือ “${w.w}” (คุณพิมพ์ “${typed}”)`}</div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (!typed.trim()) return; const ok = sameWord(typed, w.w); setPicked(ok ? 'typed:ok' : 'typed:no'); finish(ok) }} className="flex gap-2">
            <input ref={inputRef} className="field" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="พิมพ์คำตอบ" data-testid="vocab-type" />
            <Button type="submit">ตอบ</Button>
          </form>
        )
      )}

      {w.mode === 'flash' && !picked && (
        flipped ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => { setPicked('flash:no'); finish(false) }}>😅 ยังไม่ได้</Button>
            <Button onClick={() => { setPicked('flash:yes'); finish(true) }} data-testid="vocab-know">😎 จำได้</Button>
          </div>
        ) : <Button className="w-full" onClick={() => setFlipped(true)} data-testid="vocab-flip">พลิกดูคำตอบ</Button>
      )}

      {picked && <Button className="w-full" onClick={next} data-testid="vocab-next">{i + 1 >= round.qs.length ? 'ดูผล' : 'ต่อไป'}</Button>}
    </div>
  )
}

function WordList({ H, lang, bank }) {
  const v = H.vocab || {}
  const cards = v.cards || {}
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [form, setForm] = useState({ w: '', th: '', read: '', cat: 'mine' })
  const [newCat, setNewCat] = useState('')
  const myCats = v.customCats || []
  const addCat = () => {
    const name = newCat.trim()
    if (!name) return
    const id = `c:${name.toLowerCase()}`
    if (!myCats.some((c) => c.id === id)) H.saveVocab({ customCats: [...myCats, { id, name }] })
    setForm((f) => ({ ...f, cat: id })); setNewCat('')
  }
  const mine = customOf(v, lang)
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...mine, ...bank].filter((w) => (!cat || w.cat === cat) && (!s || w.w.toLowerCase().includes(s) || w.th.includes(s) || (w.read || '').includes(s)))
  }, [q, cat, bank, mine.length]) // eslint-disable-line
  const add = () => {
    const w = form.w.trim(), th = form.th.trim()
    if (!w || !th) return
    H.saveVocab({ custom: [...(v.custom || []), { id: `my:${lang}:${w.toLowerCase()}`, lang, w, th, read: form.read.trim(), cat: form.cat || 'mine', lv: 1 }] })
    setForm({ w: '', th: '', read: '', cat: form.cat }); sfx('save')
  }
  const boxDot = (id) => { const b = cards[id]?.box || 0; return b >= LEARNT_BOX ? '🟢' : b > 0 ? '🟡' : '⚪' }
  return (
    <div className="space-y-3">
      <div className="px-inner p-3 space-y-2">
        <div className="text-sm font-semibold">เพิ่มคำของฉัน</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder={LANGS[lang].name} value={form.w} onChange={(e) => setForm({ ...form, w: e.target.value })} />
          <input className="field" placeholder="ความหมาย" value={form.th} onChange={(e) => setForm({ ...form, th: e.target.value })} />
          <input className="field" placeholder="คำอ่าน (ไม่ใส่ก็ได้)" value={form.read} onChange={(e) => setForm({ ...form, read: e.target.value })} />
          <select className="field" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
            <option value="mine">⭐ คำของฉัน</option>
            {myCats.map((c) => <option key={c.id} value={c.id}>🏷️ {c.name}</option>)}
            {Object.entries(CATS).map(([k, c]) => <option key={k} value={k}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input className="field" placeholder="สร้างหมวดใหม่ เช่น คำจากซีรีส์" value={newCat} onChange={(e) => setNewCat(e.target.value)} data-testid="vocab-newcat" />
          <Button variant="ghost" className="!py-2 shrink-0" disabled={!newCat.trim()} onClick={addCat}>สร้างหมวด</Button>
        </div>
        <Button className="w-full !py-2" disabled={!form.w.trim() || !form.th.trim()} onClick={add}><Plus size={15} /> เพิ่มคำ</Button>
      </div>
      <div className="flex gap-2">
        <input className="field" placeholder="ค้นหาคำ" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">ทุกหมวด</option><option value="mine">⭐ คำของฉัน</option>
          {myCats.map((c) => <option key={c.id} value={c.id}>🏷️ {c.name}</option>)}
          {Object.entries(CATS).map(([k, c]) => <option key={k} value={k}>{c.emoji} {c.name}</option>)}
        </select>
      </div>
      <div className="text-[11px] text-slate-500">{list.length} คำ · 🟢 จำได้ 🟡 กำลังฝึก ⚪ ยังไม่เริ่ม</div>
      <div className="divide-y divide-slate-100 max-h-[50vh] overflow-auto -mx-1">
        {list.slice(0, 200).map((w) => (
          <div key={w.id} className="flex items-center gap-2 px-1 py-2 text-sm">
            <span className="text-[10px]">{boxDot(w.id)}</span>
            <div className="flex-1 min-w-0">
              <div><b>{w.w}</b>{w.alt && <span className="text-slate-500"> {w.alt}</span>}{w.read && <span className="text-sky-700 text-xs"> · {w.read}</span>}</div>
              <div className="text-xs text-slate-500 truncate">{w.th}{w.mine ? (myCats.find((c) => c.id === w.cat) ? ` · 🏷️ ${myCats.find((c) => c.id === w.cat).name}` : '') : ` · ${CATS[w.cat]?.emoji || ''} ${LEVELS[w.lv]}`}</div>
            </div>
            <SpeakBtn text={w.w} lang={lang} />
            {w.mine && <button onClick={() => H.saveVocab({ custom: (v.custom || []).filter((x) => x.id !== w.id) })} className="text-slate-400 hover:text-rose-600"><X size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, v }) {
  return <div className="px-inner px-2 py-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-sm font-semibold num">{v}</div></div>
}
