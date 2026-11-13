import { useEffect } from 'react'
import { useStore, selectList } from '../store'
import { todayISO, money } from './format'

/**
 * Daily reminder (default 20:00) to import today's slips — once a day, skipped when slips were
 * already imported today. A web app can only do this while it is still open in the background.
 */
export function useSlipReminder(ready) {
  useEffect(() => {
    if (!ready) return
    const check = async () => {
      const st = useStore.getState()
      const time = st.items.settings?.data?.slipSummaryTime ?? '20:00'
      if (!time) return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = todayISO()
      if (hhmm < time || st.ui.slipSummaryDay === today || st.ui.slipImportDay === today) return
      st.setUi({ slipSummaryDay: today })
      const spent = selectList(st.items, 'txn').filter((t) => t.date === today && t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
      const title = 'นำเข้าสลิปวันนี้'
      const body = `แตะเพื่อเลือกสลิป K PLUS ของวันนี้ · ตอนนี้บันทึกไว้ ${money(spent, { decimals: false })}`
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker?.ready
          await reg?.showNotification(title, { body, tag: 'slip-reminder', icon: './icon-192.png', badge: './favicon.png', data: { url: './?slip=1' } })
        }
      } catch { /* notifications unavailable */ }
      st.showToast('ได้เวลานำเข้าสลิปวันนี้ — กดปุ่ม “นำเข้าสลิป” ที่หน้าแรก')
    }
    check()
    const iv = setInterval(check, 60_000)
    return () => clearInterval(iv)
  }, [ready])
}
