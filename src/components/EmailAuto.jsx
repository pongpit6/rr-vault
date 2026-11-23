import { useMemo, useState } from 'react'
import { Copy, Check, Mail, KeyRound, ExternalLink } from 'lucide-react'
import { Sheet, Button, Money } from './ui'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { makeToken } from '../lib/notify'
import { emailCfg, bankCheck } from '../lib/bankcheck'

const LABEL = 'gmail-kplus'

export const appsScript = (token) => `// LifeQuest · บันทึกรายการอัตโนมัติจากอีเมล K PLUS
// ทำงานในบัญชี Google ของคุณเอง ทุก 5 นาที แล้วส่งเฉพาะอีเมลจาก K PLUS เข้าแอป
const TOKEN = '${token}';
const HOOK = '${SUPABASE_URL}/functions/v1/vault-inbox';

// กด Run ฟังก์ชันนี้ครั้งเดียว แล้วกดอนุญาตสิทธิ์
function setup() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('since')) {
    const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    p.setProperty('since', String(new Date(today + 'T00:00:00+07:00').getTime())); // เริ่มตั้งแต่วันนี้
  }
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('check').timeBased().everyMinutes(5).create();
  check();
}

function check() {
  const p = PropertiesService.getScriptProperties();
  const since = Number(p.getProperty('since') || Date.now());
  const done = JSON.parse(p.getProperty('done') || '[]');
  const msgs = [];
  GmailApp.search('from:KPLUS@kasikornbank.com newer_than:3d', 0, 50).forEach((th) => th.getMessages().forEach((m) => msgs.push(m)));
  msgs.sort((a, b) => a.getDate() - b.getDate());
  for (const m of msgs) {
    const id = m.getId();
    if (m.getDate().getTime() < since || done.indexOf(id) >= 0) continue;
    const res = UrlFetchApp.fetch(HOOK, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-vault-token': TOKEN },
      payload: JSON.stringify({ source: 'email', mailId: id, title: m.getSubject(), text: m.getPlainBody() }),
    });
    if (res.getResponseCode() === 200) done.push(id);
    console.log(m.getSubject(), res.getContentText());
  }
  p.setProperty('done', JSON.stringify(done.slice(-300)));
}
`

export default function EmailAuto({ open, onClose }) {
  const { accounts, txns, settings, accById } = useVault()
  const session = useStore((s) => s.session)
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const cfg = emailCfg(settings)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const mails = useMemo(() => txns.filter((t) => t.src === 'email'), [txns])
  const check = useMemo(() => bankCheck(accounts, txns, settings), [accounts, txns, settings])
  const pockets = accounts.filter((a) => !a.archived && ['cash', 'reserve', 'saving', 'invest'].includes(a.type))
  const save = (patch) => {
    const cur = useStore.getState().items.settings?.data || settings
    put('settings', { ...cur, emailAuto: { ...emailCfg(cur), ...patch } })
  }

  const createKey = async () => {
    setBusy(true)
    try {
      const { token: t, hash } = await makeToken()
      await supabase.from('vault_tokens').delete().eq('label', LABEL) // one active key for the script
      const { error } = await supabase.from('vault_tokens').insert({ token_hash: hash, label: LABEL })
      if (error) throw error
      setToken(t)
    } catch (e) { showToast('สร้างรหัสไม่สำเร็จ: ' + (e.message || e)) }
    setBusy(false)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(appsScript(token)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { showToast('คัดลอกไม่ได้ ลองกดค้างที่ข้อความแล้วคัดลอกเอง') }
  }
  const last = mails.reduce((a, b) => (!a || `${b.date}${b.time}` > `${a.date}${a.time}` ? b : a), null)

  return (
    <Sheet open={open} onClose={onClose} title="บันทึกอัตโนมัติจากอีเมล K PLUS">
      <div className="space-y-4 text-sm">
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold"><Mail size={16} className="text-emerald-600" /> สถานะ</div>
          {mails.length ? (
            <div className="text-slate-600">รับจากอีเมลแล้ว {mails.length} รายการ · ล่าสุด {last.date.split('-').reverse().join('/')} {last.time || ''}</div>
          ) : <div className="text-slate-500">ยังไม่มีรายการจากอีเมล ทำ 3 ขั้นด้านล่างครั้งเดียว</div>}
          {check && (
            <div className={`rounded-xl px-3 py-2 text-xs ${check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {check.ok ? <>✓ ยอดในแอปตรงกับธนาคาร (<Money value={check.bank} />)</> : <>ยอดธนาคาร <Money value={check.bank} /> · ในแอป <Money value={check.app} /> · ต่าง <Money value={check.diff} sign /></>}
            </div>
          )}
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={!cfg.off} onChange={(e) => save({ off: !e.target.checked })} />
            <span>เปิดบันทึกอัตโนมัติ</span>
          </label>
        </div>

        <div className="card p-4 space-y-3">
          <div className="font-semibold">บัญชีกสิกร (x6776)</div>
          <div>
            <div className="text-xs text-slate-500 mb-1">รายการจากอีเมลหักจากกระเป๋า</div>
            <select className="field" value={cfg.account} onChange={(e) => save({ account: e.target.value })}>
              {pockets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">กระเป๋าที่อยู่ในบัญชีนี้ (ใช้เทียบ “ยอดถอนได้”)</div>
            <div className="flex flex-wrap gap-1.5">
              {pockets.map((a) => {
                const on = cfg.bankAccs.includes(a.id)
                return (
                  <button key={a.id} onClick={() => save({ bankAccs: on ? cfg.bankAccs.filter((x) => x !== a.id) : [...cfg.bankAccs, a.id] })}
                    className={`px-3 py-1 rounded-full border text-xs ${on ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200'}`}>{on ? '✓ ' : ''}{a.name}</button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <div className="font-semibold">ตั้งค่าครั้งเดียว (ประมาณ 5 นาที)</div>
          {!session ? <div className="text-amber-700">ต้องเข้าสู่ระบบก่อน ระบบนี้ทำงานผ่านการซิงก์</div> : (
            <>
              <div><b>1.</b> สร้างรหัสส่วนตัวและสคริปต์ (รหัสใหม่จะแทนรหัสเดิมของสคริปต์ทันที)</div>
              {!token ? (
                <Button className="w-full" onClick={createKey} disabled={busy}><KeyRound size={16} /> {busy ? 'กำลังสร้าง…' : 'สร้างรหัสและสคริปต์'}</Button>
              ) : (
                <>
                  <pre className="text-[10px] leading-snug bg-slate-900 text-slate-100 rounded-xl p-3 max-h-40 overflow-auto whitespace-pre-wrap break-all">{appsScript(token)}</pre>
                  <Button className="w-full" onClick={copy}>{copied ? <><Check size={16} /> คัดลอกแล้ว</> : <><Copy size={16} /> คัดลอกสคริปต์</>}</Button>
                  <div className="text-xs text-rose-600">รหัสนี้แสดงครั้งเดียว อย่าส่งให้ใคร ถ้าหลุด กดสร้างใหม่ได้เลย รหัสเก่าจะใช้ไม่ได้ทันที</div>
                </>
              )}
              <div><b>2.</b> เปิด <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer" className="text-sky-600 underline inline-flex items-center gap-0.5">script.google.com <ExternalLink size={12} /></a> ด้วยบัญชี Gmail เดียวกับที่ใช้เข้าแอป ลบโค้ดเดิมทั้งหมด แล้ววางสคริปต์ กดบันทึก</div>
              <div><b>3.</b> เลือกฟังก์ชัน <code className="px-1 bg-slate-100 rounded">setup</code> ด้านบน แล้วกด <b>Run</b> → กดอนุญาตสิทธิ์ (ถ้าขึ้นว่าแอปยังไม่ได้รับการยืนยัน ให้กด “Advanced” → “Go to …”) เป็นอันเสร็จ</div>
              <div className="text-xs text-slate-500">สคริปต์อยู่ในบัญชี Google ของคุณเอง อ่านเฉพาะอีเมลจาก KPLUS@kasikornbank.com ตั้งแต่วันนี้เป็นต้นไป รายการที่นำเข้าสลิปหรือบันทึกเองไว้แล้วจะไม่ซ้ำ ระบบจับคู่ด้วยเลขที่รายการและยอดเงิน</div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
