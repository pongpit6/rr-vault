import { useEffect } from 'react'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { upcoming } from '../lib/subs'
import { useSubs } from '../screens/Subscriptions'
import { budgetStatus } from '../lib/plan'
import { selectList } from '../store'
import { money, todayISO } from '../lib/format'

/**
 * The only two reminders the app sends on its own:
 *  - a subscription / card bill due within 2 days
 *  - a budget category that just crossed 80% (or went over)
 * Each fires once per day per item, only when browser notifications are allowed; otherwise just an in-app toast once.
 */
const LS = 'vault:reminded'
const seen = () => { try { const j = JSON.parse(localStorage.getItem(LS) || '{}'); return j.day === todayISO() ? j : { day: todayISO(), keys: [] } } catch { return { day: todayISO(), keys: [] } } }
const remember = (j) => { try { localStorage.setItem(LS, JSON.stringify(j)) } catch { /* */ } }

export default function Reminders() {
  const { accounts, balances, cycles, txns, categories, receivables, people } = useVault()
  const subs = useSubs()
  const items = useStore((s) => s.items)
  const showToast = useStore((s) => s.showToast)
  const ready = useStore((s) => s.ready)
  useEffect(() => {
    if (!ready) return
    const j = seen()
    const fire = (key, title, body) => {
      if (j.keys.includes(key)) return
      j.keys.push(key)
      let native = false
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          native = true
          navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body, tag: key, icon: './icon-192.png', data: { url: './#home' } })).catch(() => { try { new Notification(title, { body, icon: './icon-192.png' }) } catch { /* */ } })
        }
      } catch { /* */ }
      if (!native) showToast(`🔔 ${title} · ${body}`)
    }
    for (const u of upcoming(subs, accounts, balances, 2, cycles)) {
      if (u.kind === 'sub') fire(`sub:${u.sub.id}:${u.date}`, `${u.sub.name} จะตัด${u.days <= 0 ? 'วันนี้' : u.days === 1 ? 'พรุ่งนี้' : 'ในอีก 2 วัน'}`, `${money(u.sub.amount, { decimals: false })} · ${u.sub.account ? 'เช็กยอดในบัญชีให้พอ' : ''}`)
      else if (u.kind === 'debt') {
        fire(`due:${u.account.id}:${u.date}`, `${u.account.name} ครบกำหนด${u.days <= 0 ? 'วันนี้' : u.days === 1 ? 'พรุ่งนี้' : 'ในอีก 2 วัน'}`, `ยอดที่ต้องจ่าย ${money(u.amount, { decimals: false })}`)
        for (const p of receivables.list) {
          const onCard = p.open.filter((it) => it.card && it.account === u.account.id).reduce((s, it) => s + it.open, 0)
          if (onCard > 0) fire(`recv:${p.who}:${u.date}`, `อย่าลืมเก็บเงินจาก${people.find((x) => x.id === p.who)?.name || 'คนที่ค้าง'}`, `${money(onCard, { decimals: false })} ที่รูด${u.account.name}ไว้ · บัตรครบกำหนดเร็วๆ นี้`)
        }
      }
    }
    for (const b of budgetStatus(selectList(items, 'budget'), txns)) {
      if (b.status !== 'warn' && b.status !== 'over') continue
      const name = categories.find((c) => c.id === b.category)?.name || 'หมวดนี้'
      fire(`budget:${b.category}:${b.status}`, b.status === 'over' ? `งบ${name}เกินแล้ว` : `งบ${name}ใช้ไป ${Math.round(b.ratio * 100)}%`, b.status === 'over' ? `เกิน ${money(-b.left, { decimals: false })}` : `เหลือ ${money(b.left, { decimals: false })} ถึงสิ้นเดือน`)
    }
    remember(j)
  }, [ready, txns.length, subs.length]) // eslint-disable-line
  return null
}
