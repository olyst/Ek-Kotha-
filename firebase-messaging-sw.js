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

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Ek Kotha";
  const options = {
    body: payload.notification?.body || "New notification",
    icon: "https://i.postimg.cc/qvP4tgS2/20261115-084841.png",
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const convId = event.notification.data?.convId || "";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length) {
        clients[0].focus();
        if (convId) clients[0].postMessage({ type: "OPEN_CONV", convId });
      } else {
        self.clients.openWindow(convId ? `./?chat=${convId}` : "./");
      }
    })
  );
});