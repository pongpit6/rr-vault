import { create } from 'zustand'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { supabase } from './lib/supabase'
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_PROFILE } from './lib/defaults'
import { uid } from './lib/format'

/**
 * Local-first store. Everything is an "item": { id, kind, data, rev, deleted }.
 * Items live in IndexedDB and sync to Supabase table vault_items (last write wins by rev).
 */
const K_ITEMS = 'vault:items', K_DIRTY = 'vault:dirty', K_CURSOR = 'vault:cursor', K_UI = 'vault:ui'
const K_RESYNC = 'vault:resync-2026-11-23', K_BACKUP = 'vault:rpg-backup'

/** how "played" a game document is: a built town outweighs everything else */
const played = (d = {}) => (d.town?.plots?.some(Boolean) || d.town?.hall ? 1e6 : 0) + (d.econLog?.length || 0) * 10 + Object.keys(d.owned || {}).length * 50 + Object.keys(d.noSpend || {}).length * 20 + Object.keys(d).length
/**
 * Merge the game document: the more-played copy wins as a whole (a fresh install can never erase a town),
 * keys only the other copy has are kept, and chest progress takes the furthest of the two.
 * Ties fall back to last-write-wins by rev.
 */
export function mergeGame(local, remote) {
  const pl = played(local.data), pr = played(remote.data)
  const localWins = pl > pr + 100 || (Math.abs(pl - pr) <= 100 && local.rev > remote.rev)
  const [base, other] = localWins ? [local.data, remote.data] : [remote.data, local.data]
  const data = { ...other, ...base }
  const cc = Math.max(local.data.chestCount || 0, remote.data.chestCount || 0)
  if (cc) data.chestCount = cc
  const cl = [local.data.chestLast, remote.data.chestLast].filter(Boolean).sort().pop()
  if (cl) data.chestLast = cl
  const same = JSON.stringify(data) === JSON.stringify(remote.data)
  return {
    item: { id: 'rpg', kind: 'rpg', data, rev: same ? remote.rev : Math.max(local.rev, remote.rev) + 1, deleted: false },
    push: !same, backup: !localWins && pl > 1e5,
  }
}

const now = () => Date.now()
let saveTimer = null, syncTimer = null

export const useStore = create((set, get) => ({
  ready: false,
  items: {},
  dirty: {},
  cursor: null,
  pulled: false,
  session: null,
  sync: { state: 'idle', at: null, error: null }, // idle | syncing | ok | error | offline
  ui: { privacy: false, offlineMode: false },
  toast: null,

  // ---------- boot ----------
  async init() {
    if (get().__inited) return
    set({ __inited: true })
    const [items, dirty, cursor, ui] = await Promise.all([idbGet(K_ITEMS), idbGet(K_DIRTY), idbGet(K_CURSOR), idbGet(K_UI)])
    set({ items: items || {}, dirty: dirty || {}, cursor: cursor || null, ui: { ...get().ui, ...(ui || {}) } })
    get().seedDefaults()
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, ready: true })
    supabase.auth.onAuthStateChange((_e, session) => {
      const had = get().session?.user?.id
      set({ session })
      if (session && session.user.id !== had) get().syncNow()
    })
    if (data.session) get().syncNow()
    window.addEventListener('online', () => get().syncNow())
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') get().syncNow() })
    setInterval(() => get().syncNow(), 60_000)
  },

  seedDefaults() {
    const items = get().items
    const alive = Object.values(items).filter((i) => !i.deleted)
    const has = (id) => items[id] && !items[id].deleted
    const put = []
    if (!alive.some((i) => i.kind === 'account')) DEFAULT_ACCOUNTS.forEach((a) => put.push(['account', a]))
    if (!alive.some((i) => i.kind === 'category')) DEFAULT_CATEGORIES.forEach((c) => put.push(['category', c]))
    if (alive.some((i) => i.kind === 'category') && !has('cat-uncat')) put.push(['category', DEFAULT_CATEGORIES.find((c) => c.id === 'cat-uncat')])
    if (!has('settings')) put.push(['settings', DEFAULT_SETTINGS])
    if (!has('profile')) put.push(['profile', DEFAULT_PROFILE])
    // fresh seeds get rev 1 so any real edit from another device always wins;
    // re-seeding over a deleted item needs a newer rev than the tombstone.
    if (put.length) {
      const next = { ...items }, dirty = { ...get().dirty }
      put.forEach(([kind, data]) => {
        const old = next[data.id]
        next[data.id] = { id: data.id, kind, data, rev: old ? old.rev + 1 : 1, deleted: false }; dirty[data.id] = true
      })
      set({ items: next, dirty })
      get().persist()
    }
  },

  persist() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const { items, dirty, cursor } = get()
      idbSet(K_ITEMS, items); idbSet(K_DIRTY, dirty); idbSet(K_CURSOR, cursor)
    }, 150)
  },

  setUi(patch) {
    const ui = { ...get().ui, ...patch }
    set({ ui }); idbSet(K_UI, ui)
  },

  // ---------- CRUD ----------
  put(kind, data) {
    const id = data.id || uid(kind.slice(0, 3) + '-')
    const prev = get().items[id]
    const item = { id, kind, data: { ...data, id }, rev: Math.max(now(), (prev?.rev || 0) + 1), deleted: false }
    set({ items: { ...get().items, [id]: item }, dirty: { ...get().dirty, [id]: true } })
    get().persist(); get().scheduleSync()
    return id
  },
  remove(id, { undo = true, label = 'ลบรายการแล้ว' } = {}) {
    const prev = get().items[id]
    if (!prev) return
    const item = { ...prev, deleted: true, rev: Math.max(now(), prev.rev + 1) }
    set({ items: { ...get().items, [id]: item }, dirty: { ...get().dirty, [id]: true } })
    get().persist(); get().scheduleSync()
    if (undo) get().showToast(label, () => get().put(prev.kind, prev.data))
  },
  restoreMany(list) {
    const items = { ...get().items }, dirty = { ...get().dirty }
    for (const it of list) { items[it.id] = { ...it, rev: Math.max(now(), (items[it.id]?.rev || 0) + 1) }; dirty[it.id] = true }
    set({ items, dirty }); get().persist(); get().scheduleSync()
  },

  showToast(text, onUndo) {
    const id = now()
    set({ toast: { id, text, onUndo } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 5000)
  },
  hideToast() { set({ toast: null }) },

  // ---------- sync ----------
  scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => get().syncNow(), 1200) },

  async syncNow() {
    const { session, sync } = get()
    if (!session || sync.state === 'syncing') return
    if (!navigator.onLine) { set({ sync: { ...sync, state: 'offline' } }); return }
    set({ sync: { ...sync, state: 'syncing' } })
    try {
      const userId = session.user.id
      // 1) pull
      // one full re-read after this update, so a device still holding an older, richer game can hand it back
      const full = !(await idbGet(K_RESYNC))
      let q = supabase.from('vault_items').select('id,kind,data,rev,deleted,server_ts').order('server_ts', { ascending: true }).limit(5000)
      if (get().cursor && !full) q = q.gt('server_ts', get().cursor)
      const { data: rows, error } = await q
      if (error) throw error
      const items = { ...get().items }, dirty = { ...get().dirty }
      let cursor = get().cursor
      for (const r of rows) {
        const local = items[r.id]
        if (r.id === 'rpg' && local && !local.deleted && !r.deleted) {
          // the game is one document: never let an empty/fresh copy replace a played one
          const m = mergeGame(local, { ...r, rev: Number(r.rev) })
          if (m.backup) idbSet(K_BACKUP, { at: now(), item: local })
          items.rpg = m.item
          if (m.push) dirty.rpg = true; else delete dirty.rpg
        } else if (!local || r.rev >= local.rev) {
          items[r.id] = { id: r.id, kind: r.kind, data: r.data, rev: Number(r.rev), deleted: r.deleted }
          if (local && Number(r.rev) >= local.rev) delete dirty[r.id]
        } else if (Number(r.rev) < local.rev) dirty[r.id] = true // this device has the newer copy: send it
        if (!cursor || r.server_ts > cursor) cursor = r.server_ts
      }
      set({ items, dirty, cursor, pulled: true })
      if (full) idbSet(K_RESYNC, now())
      // 2) push
      const ids = Object.keys(dirty)
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200).map((id) => items[id]).filter(Boolean)
        const payload = chunk.map((it) => ({ user_id: userId, id: it.id, kind: it.kind, data: it.data, rev: it.rev, deleted: it.deleted }))
        const { error: e2 } = await supabase.from('vault_items').upsert(payload, { onConflict: 'user_id,id' })
        if (e2) throw e2
        const d = { ...get().dirty }
        chunk.forEach((it) => { if (get().items[it.id]?.rev === it.rev) delete d[it.id] })
        set({ dirty: d })
      }
      set({ sync: { state: 'ok', at: now(), error: null } })
      get().persist()
    } catch (e) {
      console.error(e)
      set({ sync: { state: 'error', at: get().sync.at, error: e.message || String(e) } })
    }
  },

  async signOut() {
    await supabase.auth.signOut()
    await Promise.all([idbDel(K_ITEMS), idbDel(K_DIRTY), idbDel(K_CURSOR)])
    set({ items: {}, dirty: {}, cursor: null, session: null, pulled: false })
    get().seedDefaults()
  },

  async resetAll() {
    const all = Object.values(get().items).filter((i) => !i.deleted)
    const items = { ...get().items }, dirty = { ...get().dirty }
    all.forEach((i) => { items[i.id] = { ...i, deleted: true, rev: now() }; dirty[i.id] = true })
    set({ items, dirty })
    get().seedDefaults()
    get().persist(); get().scheduleSync()
  },
}))

// ---------- selectors ----------
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)
export function selectList(items, kind) {
  return Object.values(items).filter((i) => i.kind === kind && !i.deleted).map((i) => i.data)
}
export const useAccounts = () => {
  const items = useStore((s) => s.items)
  return selectList(items, 'account').sort(byOrder)
}
export const useCategories = () => selectList(useStore((s) => s.items), 'category').sort(byOrder)
export const useTxns = () => selectList(useStore((s) => s.items), 'txn').sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')))
export const useSettings = () => {
  const it = useStore((s) => s.items.settings)
  const d = it && !it.deleted ? it.data : DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...d, allocation: { ...DEFAULT_SETTINGS.allocation, ...(d.allocation || {}) } }
}
export const useProfile = () => {
  const it = useStore((s) => s.items.profile)
  return { ...DEFAULT_PROFILE, ...(it && !it.deleted ? it.data : {}) }
}
