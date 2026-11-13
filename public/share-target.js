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

// tapping the daily slip summary opens the inbox
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || './?view=inbox', self.registration.scope).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) { if ('focus' in w) { await w.navigate(target).catch(() => {}); return w.focus() } }
    return self.clients.openWindow(target)
  })())
})
