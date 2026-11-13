import { todayISO, round2 } from './format'
import { useStore, selectList } from '../store'
import { usePrices, fxUSDTHB } from './prices'

/** Popular services — the logo is the service's own website icon. */
export const SUB_PRESETS = [
  ['Netflix', 'netflix.com'], ['Spotify', 'spotify.com'], ['YouTube Premium', 'youtube.com'], ['Disney+ Hotstar', 'hotstar.com'],
  ['Prime Video', 'primevideo.com'], ['HBO Max', 'max.com'], ['Apple Music', 'music.apple.com'], ['iCloud+', 'icloud.com'],
  ['Apple TV+', 'tv.apple.com'], ['Google One', 'one.google.com'], ['ChatGPT Plus', 'chatgpt.com'], ['Claude Pro', 'claude.ai'],
  ['Gemini', 'gemini.google.com'], ['Microsoft 365', 'microsoft.com'], ['Adobe Creative Cloud', 'adobe.com'], ['Canva Pro', 'canva.com'],
  ['Notion', 'notion.so'], ['GitHub', 'github.com'], ['Dropbox', 'dropbox.com'], ['Duolingo', 'duolingo.com'],
  ['LINE', 'line.me'], ['TrueID', 'trueid.net'], ['AIS', 'ais.th'], ['True Move H', 'truemoveh.com'], ['dtac', 'dtac.co.th'],
  ['Viu', 'viu.com'], ['WeTV', 'wetv.vip'], ['iQIYI', 'iq.com'], ['Bilibili', 'bilibili.tv'], ['Crunchyroll', 'crunchyroll.com'],
  ['PlayStation Plus', 'playstation.com'], ['Xbox Game Pass', 'xbox.com'], ['Nintendo Switch Online', 'nintendo.com'], ['Steam', 'steampowered.com'],
  ['Grab', 'grab.com'], ['LINE MAN', 'lineman.line.me'], ['Shopee', 'shopee.co.th'], ['Lazada', 'lazada.co.th'],
  ['Midjourney', 'midjourney.com'], ['Figma', 'figma.com'], ['Zoom', 'zoom.us'], ['Fitness First', 'fitnessfirst.co.th'],
].map(([name, domain]) => ({ name, domain }))

export const logoUrl = (domain) => domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null

export function addCycle(iso, cycle, n = 1) {
  const [y, m, d] = iso.split('-').map(Number)
  let dt
  if (cycle === 'weekly') dt = new Date(y, m - 1, d + 7 * n)
  else if (cycle === 'yearly') dt = new Date(y + n, m - 1, d)
  else {
    // monthly: keep the day, clamp to month end
    const target = new Date(y, m - 1 + n, 1)
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    dt = new Date(target.getFullYear(), target.getMonth(), Math.min(d, last))
  }
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export const monthlyOf = (s, fx) => {
  const thb = s.currency === 'USD' ? s.amount * fx : s.amount
  return s.cycle === 'yearly' ? thb / 12 : s.cycle === 'weekly' ? (thb * 52) / 12 : thb
}
export const thbOf = (s, fx) => round2(s.currency === 'USD' ? s.amount * fx : s.amount)

/**
 * Post every due subscription as an expense. Txn ids are deterministic ("sub-<id>-<date>")
 * so two devices never double-post, and a posting the user deleted is never recreated.
 */
export function processDueSubs() {
  const st = useStore.getState()
  const fx = fxUSDTHB(usePrices.getState().quotes)
  const subs = selectList(st.items, 'sub')
  const today = todayISO()
  let posted = 0
  for (const s of subs) {
    if (!s.active || !s.auto || !s.nextDate || !s.amount) continue
    let next = s.nextDate, guard = 0
    while (next <= today && guard++ < 60) {
      const id = `sub-${s.id}-${next}`
      if (!st.items[id]) {
        st.put('txn', {
          id, kind: 'expense', amount: thbOf(s, fx), date: next, category: s.category || 'cat-sub', account: s.account,
          note: s.name, subId: s.id, createdAt: new Date().toISOString(),
        })
        posted++
      }
      next = addCycle(next, s.cycle)
    }
    if (next !== s.nextDate) st.put('sub', { ...s, nextDate: next })
  }
  if (posted) st.showToast(`ตัดค่า Subscription อัตโนมัติ ${posted} รายการ`)
}

/** Upcoming money events in the next `days` days: subscriptions + debt due dates. */
export function upcoming(subs, accounts, balances, days = 10, cycles = {}) {
  const out = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const end = new Date(today); end.setDate(end.getDate() + days)
  for (const s of subs) {
    if (!s.active || !s.nextDate) continue
    const [y, m, d] = s.nextDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (dt <= end) out.push({ kind: 'sub', date: s.nextDate, days: Math.round((dt - today) / 864e5), sub: s })
  }
  for (const a of accounts) {
    if (a.archived || !(a.type === 'credit' || a.type === 'loan') || !a.dueDay || a.viaCard) continue
    const owed = -(balances[a.id] || 0)
    if (owed <= 0) continue
    const cy = cycles[a.id]
    if (cy) {
      if (cy.billDue <= 0) continue
      const [y, m, d] = cy.dueDate.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      if (dt <= end) out.push({ kind: 'debt', date: cy.dueDate, days: Math.round((dt - today) / 864e5), account: a, amount: cy.billDue, bill: true })
      continue
    }
    let dt = new Date(today.getFullYear(), today.getMonth(), Math.min(a.dueDay, 28))
    if (a.dueDay > 28) dt = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    if (dt < today) dt = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(a.dueDay, 28))
    if (dt <= end) out.push({ kind: 'debt', date: iso(dt), days: Math.round((dt - today) / 864e5), account: a, amount: a.type === 'loan' && a.installment ? Math.min(owed, a.installment) : owed })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date))
}
