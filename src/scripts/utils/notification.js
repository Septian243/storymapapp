const NotificationHelper = {
    async requestPermission() {
        if (!('Notification' in window)) {
            console.error('Browser tidak mendukung Notification API.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
            console.warn('Izin notifikasi ditolak.');
        } else if (permission === 'default') {
            console.warn('Izin notifikasi belum diputuskan.');
        } else {
            console.log('Izin notifikasi diberikan.');
        }
    },

    async showNotification({ title, body, icon }) {
        if (Notification.permission === 'granted') {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                registration.showNotification(title, {
                    body,
                    icon,
                    vibrate: [100, 50, 100],
                });
            }
        } else {
            console.warn('Notifikasi belum diizinkan.');
        }
    },
};

export default NotificationHelper;
