// Receives images shared from the gallery ("แชร์ → Vault") and parks them for the app to read.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return
  event.respondWith((async () => {
    try {
      const form = await event.request.formData()
      const cache = await caches.open('vault-share')
      for (const f of form.getAll('slips')) {
        if (!f || !f.type || !f.type.startsWith('image/')) continue
        await cache.put(new Request(`${self.registration.scope}__share/${Date.now()}-${Math.random().toString(36).slice(2)}`), new Response(f, { headers: { 'content-type': f.type } }))
      }
    } catch (e) { /* ignore */ }
    return Response.redirect(`${self.registration.scope}?share=1`, 303)
  })())
})

// tapping the daily reminder opens the slip importer
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || './?slip=1', self.registration.scope).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) { if ('focus' in w) { await w.navigate(target).catch(() => {}); return w.focus() } }
    return self.clients.openWindow(target)
  })())
})

// server push (06:00 fortune digest) — shows even when the app is closed
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { body: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(d.title || 'LifeQuest', {
    body: d.body || '', tag: d.tag || 'push', renotify: true, icon: './icon-192.png', badge: './favicon.png', data: { url: d.url || './' },
  }))
})
