import { useEffect } from 'react'
import { useStore } from '../../store'

/** once a day per alert: a phone notification (when allowed) or an in-app toast. The heavy fortune code loads only here, lazily. */
const LS = 'vault:fortune-alerted'
export default function FortuneAlerts() {
  const ready = useStore((s) => s.ready)
  const rev = useStore((s) => s.items.fortune?.rev)
  useEffect(() => {
    if (!ready) return
    const run = async () => {
      const f = useStore.getState().items.fortune?.data
      if (!f || f.alerts === false) return
      const { fortuneAlerts } = await import('../../lib/fortune/alerts')
      let seen = []
      try { seen = JSON.parse(localStorage.getItem(LS) || '[]') } catch { /* */ }
      for (const a of fortuneAlerts(f)) {
        if (seen.includes(a.key)) continue
        seen.push(a.key)
        let native = false
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            native = true
            navigator.serviceWorker?.ready.then((reg) => reg.showNotification(a.title, { body: a.body, tag: a.key, icon: './icon-192.png', data: { url: './#fortune' } })).catch(() => { try { new Notification(a.title, { body: a.body, icon: './icon-192.png' }) } catch { /* */ } })
          }
        } catch { /* */ }
        if (!native) useStore.getState().showToast(`${a.title} · ${a.body}`)
      }
      try { localStorage.setItem(LS, JSON.stringify(seen.slice(-60))) } catch { /* */ }
    }
    const t = setTimeout(run, 2500)
    const vis = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', vis) }
  }, [ready, rev])
  return null
}
