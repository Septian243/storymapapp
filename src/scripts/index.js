import '../styles/styles.css';
import '../styles/responsives.css';
import 'leaflet/dist/leaflet.css';

import registerSW from './utils/sw-register';
import NotificationHelper from './utils/notification';
import App from './pages/app';
import './utils/install-prompt';
import syncManager from './utils/sync-manager';


window.syncManager = syncManager;

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  const safeRender = async () => {
    try {
      const beforeHash = window.location.hash;
      console.log('🧩 Rendering page for hash:', beforeHash);

      await app.renderPage();

      if (window.location.hash !== beforeHash) {
        console.log('🔁 Hash changed during render, re-rendering...');
        await new Promise((r) => setTimeout(r, 50));
        await app.renderPage();
      }
    } catch (err) {
      console.error('❌ Render error:', err);
      document.querySelector('#main-content').innerHTML =
        '<p style="text-align:center; color:red;">Terjadi kesalahan saat memuat halaman.</p>';
    }
  };

  try {
    const registration = await registerSW();
    if (registration) {
      window.serviceWorkerRegistration = registration;
      console.log('✅ Service Worker siap digunakan');
    }

    await NotificationHelper.requestPermission();

    syncManager.init();
    console.log('✅ Sync Manager initialized');

    if (!window.location.hash) window.location.hash = '#/';

    console.log('✅ Final hash to render:', window.location.hash);
    await safeRender();

    let hashChangeTimeout;
    window.addEventListener('hashchange', () => {
      clearTimeout(hashChangeTimeout);
      hashChangeTimeout = setTimeout(() => {
        safeRender();
      }, 50);
    });

    window.addEventListener('online', () => {
      console.log('✅ Kembali online');
      setTimeout(() => {
        if (window.syncManager) {
          window.syncManager.checkAndSync();
        }
      }, 2000);
    });

    window.addEventListener('offline', () => {
      console.log('⚠️ Anda sedang offline');

      if (NotificationHelper.isSupported()) {
        NotificationHelper.showNotification('Anda sedang offline', {
          body: 'Data akan disinkronisasi saat koneksi kembali',
        });
      }
    });

  } catch (err) {
    console.error('❌ Init error:', err);
    await safeRender();
  }
});

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false }
);