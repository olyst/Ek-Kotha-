importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAchpbEfFNjdFXjxTi6FGsthmaWullsaiM",
  authDomain: "my-to-up.firebaseapp.com",
  databaseURL: "https://my-to-up-default-rtdb.firebaseio.com",
  projectId: "my-to-up",
  storageBucket: "my-to-up.firebasestorage.app",
  messagingSenderId: "405413447269",
  appId: "1:405413447269:web:bc2a0888f6cf097484a88c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "Ek Kotha";
  const body = data.body || payload.notification?.body || "New alert on Ek Kotha";
  const isCall = data.type === "incoming_call";

  self.registration.showNotification(title, {
    body,
    icon: "https://i.postimg.cc/qvP4tgS2/20261115-084841.png",
    badge: "https://i.postimg.cc/qvP4tgS2/20261115-084841.png",
    tag: data.callId || data.convId || "ek_notif",
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [300, 150, 300, 150, 300] : [150],
    data
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const convId = data.convId || "";
  const callId = data.callId || "";
  const baseUrl = self.registration.scope || "/";
  const targetUrl = callId
    ? `${baseUrl}?callId=${encodeURIComponent(callId)}`
    : (convId ? `${baseUrl}?chat=${encodeURIComponent(convId)}` : baseUrl);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if (callId) client.postMessage({ type: "OPEN_CALL", callId });
          else if (convId) client.postMessage({ type: "OPEN_CONV", convId });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});