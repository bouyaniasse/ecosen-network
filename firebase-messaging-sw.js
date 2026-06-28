importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC9QZx-gJSETguNsgAm4gn5CTtof87Hqsk",
  authDomain: "ecosen-network.firebaseapp.com",
  projectId: "ecosen-network",
  storageBucket: "ecosen-network.firebasestorage.app",
  messagingSenderId: "718363075817",
  appId: "1:718363075817:web:5662a42fa64fda4b66bc78"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Notification arrière-plan:', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png',
    badge: '/icon.png'
  });
});
