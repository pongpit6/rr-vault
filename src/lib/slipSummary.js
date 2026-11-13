import { useEffect } from 'react'
import { useStore, selectList } from '../store'
import { todayISO, money } from './format'

/** Daily slip summary at the time set in settings (default 20:00): notification + toast, once per day. */
export function useSlipSummary(ready) {
  useEffect(() => {
    if (!ready) return
    const check = async () => {
      const st = useStore.getState()
      const time = st.items.settings?.data?.slipSummaryTime ?? '20:00'
      if (!time) return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = todayISO()
      if (hhmm < time || st.ui.slipSummaryDay === today) return
      st.setUi({ slipSummaryDay: today })
      const inbox = selectList(st.items, 'inbox').filter((x) => x.slip || x.image)
      const spent = selectList(st.items, 'txn').filter((t) => t.date === today && t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
      const outSlips = inbox.filter((x) => x.slip && x.slip.direction !== 'in').reduce((s, x) => s + x.slip.amount, 0)
      const title = inbox.length ? `สลิปวันนี้ ${inbox.length} รายการ รอยืนยัน` : 'สรุปวันนี้'
      const body = inbox.length ? `ยอดโอนออก ${money(outSlips)} · แตะเพื่อยืนยัน` : `วันนี้ใช้ไป ${money(spent)} · ไม่มีสลิปค้าง`
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker?.ready
          await reg?.showNotification(title, { body, tag: 'slip-summary', icon: './icon-192.png', badge: './favicon.png', data: { url: './?view=inbox' } })
        }
      } catch { /* notifications unavailable */ }
      st.showToast(`${title} · ${body.replace(' · แตะเพื่อยืนยัน', '')}`)
    }
    check()
    const iv = setInterval(check, 60_000)
    return () => clearInterval(iv)
  }, [ready])
}
