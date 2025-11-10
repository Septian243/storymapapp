import IDBHelper from '../data/idb';
import Api from '../data/api';

class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.syncInterval = null;
    }

    init() {
        window.addEventListener('online', () => {
            console.log('🌐 Network: Online');
            this.onOnline();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Network: Offline');
            this.onOffline();
        });

        if (navigator.onLine) {
            this.checkAndSync();
        }

        this.startPeriodicSync();
    }

    async onOnline() {
        this.showToast('Koneksi kembali online — memeriksa data yang perlu disinkronisasi...');
        await this.checkAndSync();
        this.startPeriodicSync();
    }

    onOffline() {
        this.showToast('Anda sedang offline — data akan disinkronisasi saat koneksi kembali.');
        this.stopPeriodicSync();
    }

    async checkAndSync() {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress');
            return;
        }

        try {
            const hasPending = await IDBHelper.hasPendingStories();
            if (hasPending && navigator.onLine) {
                await this.syncNow();
            }
        } catch (error) {
            console.error('❌ Error checking pending stories:', error);
        }
    }

    async syncNow() {
        if (this.isSyncing) {
            return { success: false, message: 'Sync in progress' };
        }

        if (!navigator.onLine) {
            return { success: false, message: 'Offline' };
        }

        this.isSyncing = true;

        try {
            console.log('🔄 Starting sync...');
            const result = await IDBHelper.syncPendingStories(Api);

            if (result.success && result.synced > 0) {
                this.showToast(`Sinkronisasi berhasil! ${result.synced} cerita berhasil disinkronkan.`);
                window.dispatchEvent(new CustomEvent('stories-synced', { detail: result }));
            }

            console.log('✅ Sync result:', result);
            return result;
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.showToast('Gagal melakukan sinkronisasi.');
            return { success: false, error: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    startPeriodicSync() {
        this.stopPeriodicSync();
        if (navigator.onLine) {
            this.syncInterval = setInterval(() => {
                this.checkAndSync();
            }, 30000);
        }
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async getPendingCount() {
        const pending = await IDBHelper.getAllPendingStories();
        return pending.length;
    }

    showToast(message) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            animation: fadeIn 0.3s ease;
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
}

const syncManager = new SyncManager();

export default syncManager;
