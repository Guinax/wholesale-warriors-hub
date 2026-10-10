/* Background notifications for installed PWA. The server must send standards-based Web Push. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "" }; }
  const title = typeof payload.title === "string" ? payload.title.slice(0, 100) : "Adega Maromba";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 240) : "Você recebeu uma atualização.";
  const target = payload.role === "courier" ? "/motoqueiro" : "/revendedor";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icon-192-maromba-v2.png",
    badge: "/icon-192-maromba-v2.png",
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 120) : undefined,
    data: { path: target },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.path || "/", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
