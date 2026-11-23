import { computeBalances } from './ledger'
import { round2 } from './format'

export const EMAIL_DEFAULT = { account: 'acc-cash', bankAccs: ['acc-cash', 'acc-reserve', 'acc-invest'], off: false }
export const emailCfg = (settings) => ({ ...EMAIL_DEFAULT, ...(settings?.emailAuto || {}) })

const stamp = (t) => `${t.date}T${t.time || '23:59'}`

/**
 * Compares the "ยอดถอนได้" of the latest K PLUS email with the app's balance of the wallets that live
 * in that bank account, at the moment of that email. Returns null when there is no email yet.
 */
export function bankCheck(accounts, txns, settings) {
  const cfg = emailCfg(settings)
  const mails = txns.filter((t) => t.src === 'email' && Number.isFinite(t.bankBal))
  if (!mails.length) return null
  const last = mails.reduce((a, b) => (stamp(b) > stamp(a) ? b : a))
  const at = stamp(last)
  // entries without a time count if they were typed before the email arrived
  const mailMs = Date.parse(`${last.date}T${last.time || '23:59'}:00+07:00`)
  const upto = txns.filter((t) => t.date < last.date || (t.date === last.date && (t.time ? stamp(t) <= at : Date.parse(t.createdAt || 0) <= mailMs)))
  const bal = computeBalances(accounts, upto, settings)
  const app = round2(cfg.bankAccs.reduce((s, id) => s + (bal[id] || 0), 0))
  const diff = round2(last.bankBal - app)
  return { bank: last.bankBal, app, diff, ok: Math.abs(diff) < 0.5, date: last.date, time: last.time, count: mails.length, account: cfg.account }
}
