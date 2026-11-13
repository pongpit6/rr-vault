import { Component } from 'react'

/** Shows what went wrong (instead of a blank white page) and offers safe recovery. */
export default class ErrorBoundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) {
    try { localStorage.setItem('vault:lastError', JSON.stringify({ at: new Date().toISOString(), msg: String(err?.stack || err).slice(0, 1500), comp: String(info?.componentStack || '').slice(0, 800) })) } catch { /* ignore */ }
  }
  render() {
    const { err } = this.state
    if (!err) return this.props.children
    const text = `${String(err?.message || err)}\n\n${String(err?.stack || '').split('\n').slice(0, 6).join('\n')}`
    return (
      <div style={{ minHeight: '100dvh', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#f5f7fa', color: '#0f172a' }}>
        <div style={{ maxWidth: 520, margin: '8vh auto 0' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>ขอโทษครับ หน้านี้มีปัญหา</div>
          <div style={{ marginTop: 8, color: '#475569', fontSize: 15 }}>ข้อมูลของคุณยังอยู่ครบ ไม่ได้หาย · กรุณาแคปหน้าจอนี้ส่งมาให้ผู้พัฒนา</div>
          <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, maxHeight: '40vh', overflow: 'auto' }}>{text}</pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => { location.hash = '#home'; location.reload() }} style={btn('#10b981')}>กลับหน้าแรก</button>
            <button onClick={async () => {
              try { const regs = await navigator.serviceWorker?.getRegistrations(); await Promise.all((regs || []).map((r) => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.filter((k) => k !== 'vault-share').map((k) => caches.delete(k))) } catch { /* ignore */ }
              location.reload()
            }} style={btn('#0ea5e9')}>โหลดแอปเวอร์ชันล่าสุด</button>
          </div>
        </div>
      </div>
    )
  }
}
const btn = (bg) => ({ background: bg, color: '#fff', border: 0, borderRadius: 14, padding: '12px 16px', fontSize: 15, fontWeight: 600 })
