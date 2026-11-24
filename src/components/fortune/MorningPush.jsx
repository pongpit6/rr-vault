import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabase'

// 06:00 Bangkok push from the server (vault-push edge function + pg_cron), shown even when the app is closed.
const FN = `${SUPABASE_URL}/functions/v1/vault-push`
const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined'
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)) }
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '')
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone

async function currentSub() { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription() }

export default function MorningPush() {
  const session = useStore((s) => s.session)
  const [st, setSt] = useState('check') // check | off | on | busy | denied | nosupport | ios
  const toast = (m) => useStore.getState().showToast(m)

  useEffect(() => {
    if (!supported()) { setSt(isIOS() && !standalone() ? 'ios' : 'nosupport'); return }
    if (Notification.permission === 'denied') { setSt('denied'); return }
    let live = true
    currentSub().then((s) => live && setSt(s ? 'on' : 'off')).catch(() => live && setSt('off'))
    return () => { live = false }
  }, [])

  const enable = async () => {
    if (!session) { toast('ต้องเข้าสู่ระบบก่อน เพื่อให้เซิร์ฟเวอร์รู้ว่าจะส่งดวงของใคร'); return }
    setSt('busy')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setSt(perm === 'denied' ? 'denied' : 'off'); return }
      const { key } = await (await fetch(`${FN}?pub=1`, { headers: { apikey: SUPABASE_KEY } })).json()
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) })
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 160) })
      if (error) throw error
      setSt('on'); toast('เปิดแจ้งเตือนดวง 06:00 แล้ว')
    } catch (e) { console.warn(e); setSt('off'); toast('เปิดแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง') }
  }
  const disable = async () => {
    setSt('busy')
    try { const s = await currentSub(); if (s) { await supabase.from('push_subs').delete().eq('endpoint', s.endpoint); await s.unsubscribe() } } catch { /* */ }
    setSt('off'); toast('ปิดแจ้งเตือน 06:00 บนเครื่องนี้แล้ว')
  }
  const test = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const r = await (await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json', apikey: SUPABASE_KEY, authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ action: 'test' }) })).json()
      toast(r.sent ? 'ส่งแล้ว รอสักครู่จะเด้งขึ้นมา' : 'ยังส่งไม่ได้ ลองปิดแล้วเปิดแจ้งเตือนใหม่')
    } catch { toast('ส่งทดสอบไม่สำเร็จ') }
  }

  const note = {
    ios: 'บน iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม" แล้วเปิดแอปจากไอคอนก่อน จึงจะรับแจ้งเตือนตอนแอปปิดได้',
    nosupport: 'เบราว์เซอร์นี้ไม่รองรับแจ้งเตือนแบบปิดแอป',
    denied: 'แจ้งเตือนถูกบล็อกไว้ ไปเปิดในตั้งค่าเบราว์เซอร์/แอปก่อน แล้วกลับมากดใหม่',
  }[st]
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-2" data-testid="push-box">
      <div className="text-xs"><b>ดวงเช้า 06:00 น.</b> ส่งจากเซิร์ฟเวอร์ ขึ้นแม้ปิดแอปอยู่ บอกเสาวันนี้ ระดับดวง เหตุการณ์ BaZi และคู่ดาวเสวยอายุ</div>
      {note ? <div className="text-xs text-amber-600">{note}</div> : (
        <div className="flex gap-2">
          {st === 'on'
            ? <><button className="px-btn flex-1 justify-center" onClick={test} data-testid="push-test">ส่งทดสอบ</button><button className="px-btn flex-1 justify-center opacity-70" onClick={disable} data-testid="push-off">ปิดบนเครื่องนี้</button></>
            : <button className="px-btn flex-1 justify-center" disabled={st !== 'off'} onClick={enable} data-testid="push-on">{st === 'busy' ? 'กำลังเปิด…' : st === 'check' ? '…' : 'เปิดแจ้งเตือน 06:00 บนเครื่องนี้'}</button>}
        </div>
      )}
    </div>
  )
}
