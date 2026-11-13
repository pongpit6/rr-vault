import { useMemo, useState } from 'react'
import { Check, Tag } from 'lucide-react'
import { IconBadge, Money, Empty, Button } from '../components/ui'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { learnKey } from '../lib/notify'
import { dateLabel } from '../lib/format'

/** Bulk "tap a category" screen for auto-recorded transactions. */
export default function Uncategorized({ onEdit }) {
  const { txns, categories, accById, settings } = useVault()
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const list = useMemo(() => txns.filter((t) => t.category === 'cat-uncat'), [txns])
  const [picked, setPicked] = useState({}) // txnId -> categoryId
  const cats = (kind) => categories.filter((c) => c.kind === (kind === 'income' ? 'income' : 'expense') && c.id !== 'cat-uncat')
  const [recent, setRecent] = useState(() => { try { return JSON.parse(localStorage.getItem('vault:recentCats')) || [] } catch { return [] } })
  const order = (kind) => cats(kind).slice().sort((a, b) => { const ra = recent.indexOf(a.id), rb = recent.indexOf(b.id); return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) })

  const apply = () => {
    const ids = Object.keys(picked)
    if (!ids.length) return
    const st = useStore.getState()
    const cur = st.items.settings?.data || settings
    const map = { ...(cur.merchantMap || {}) }
    for (const id of ids) {
      const t = txns.find((x) => x.id === id); if (!t) continue
      put('txn', { ...t, category: picked[id] })
      const k = t.counterparty ? learnKey({ counterparty: t.counterparty }) : null
      if (k) map[k] = { category: picked[id], account: t.account }
    }
    put('settings', { ...cur, merchantMap: map })
    const r = [...new Set([...Object.values(picked), ...recent])].slice(0, 8)
    setRecent(r); localStorage.setItem('vault:recentCats', JSON.stringify(r))
    setPicked({})
    showToast(`ใส่หมวดแล้ว ${ids.length} รายการ`)
  }

  if (!list.length) return <Empty icon="sparkles" title="ไม่มีรายการค้างใส่หมวด" text="รายการที่ระบบบันทึกให้อัตโนมัติจะมารอที่นี่" />
  const n = Object.keys(picked).length
  return (
    <div className="space-y-3 pb-24">
      <div className="text-sm text-slate-500 px-1">แตะหมวดใต้แต่ละรายการ แล้วกด “บันทึก {n ? n : ''}” ด้านล่าง ระบบจะจำร้านเดิมให้ครั้งต่อไป</div>
      {list.map((t) => (
        <div key={t.id} className="card p-3">
          <button onClick={() => onEdit(t)} className="w-full flex items-center gap-3 text-left">
            <IconBadge name={t.kind === 'income' ? 'handcoins' : 'tag'} color={t.kind === 'income' ? '#10b981' : '#f59e0b'} size={36} icon={17} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.note || t.counterparty || (t.kind === 'income' ? 'เงินเข้า' : 'เงินออก')}</div>
              <div className="text-xs text-slate-500">{dateLabel(t.date)} · {accById[t.account]?.name}</div>
            </div>
            <Money value={t.kind === 'income' ? t.amount : -t.amount} colored sign className="font-semibold" />
          </button>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 mt-2.5 pb-0.5">
            {order(t.kind).map((c) => (
              <button key={c.id} onClick={() => setPicked({ ...picked, [t.id]: c.id })}
                className={`shrink-0 flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-xs transition ${picked[t.id] === c.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white'}`}>
                <IconBadge name={c.icon} color={picked[t.id] === c.id ? '#ffffff' : c.color} size={20} icon={12} />{c.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {n > 0 && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:left-auto md:right-8 md:w-72 z-30">
          <Button className="w-full shadow-xl" onClick={apply}><Check size={18} /> บันทึก {n} รายการ</Button>
        </div>
      )}
    </div>
  )
}

export { Tag }
