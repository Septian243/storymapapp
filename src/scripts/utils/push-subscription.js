import Api from '../data/api';
import Auth from './auth';
import CONFIG from '../config';
import Swal from 'sweetalert2';

const PushSubscriptionHelper = {
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    async subscribeUser(registration) {
        try {
            if (!registration?.pushManager) {
                throw new Error('PushManager tidak tersedia');
            }

            const result = await Swal.fire({
                title: 'Aktifkan Notifikasi?',
                text: 'Anda akan menerima pemberitahuan dari aplikasi ini.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, aktifkan',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });

            if (!result.isConfirmed) {
                console.log('❌ Pengguna membatalkan aktivasi notifikasi.');
                return { success: false, cancelled: true };
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Izin Ditolak',
                    text: 'Izin notifikasi tidak diberikan. Aktifkan notifikasi di pengaturan browser Anda.',
                });
                return { success: false, cancelled: false };
            }

            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
            };

            const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);
            console.log('✅ Push Subscription sukses:', pushSubscription);

            const token = Auth.getToken();
            if (!token) {
                await Swal.fire({
                    icon: 'info',
                    title: 'Login Diperlukan',
                    text: 'Silakan login terlebih dahulu untuk mengaktifkan notifikasi.',
                });
                return { success: false, cancelled: false };
            }

            const subJSON = pushSubscription.toJSON();

            await Api.subscribeNotification({
                endpoint: subJSON.endpoint,
                keys: subJSON.keys,
                token,
            });

            await Swal.fire({
                icon: 'success',
                title: 'Notifikasi Aktif!',
                text: 'Anda akan menerima pemberitahuan dari aplikasi.',
                timer: 2000,
                showConfirmButton: false,
            });

            console.log('🔔 Subscription dikirim ke server');
            return { success: true, cancelled: false };
        } catch (error) {
            console.error('❌ Gagal membuat Push Subscription:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Gagal Mengaktifkan',
                text: 'Terjadi kesalahan saat mengaktifkan notifikasi.',
            });
            return { success: false, cancelled: false };
        }
    },

    async unsubscribeUser(registration) {
        try {
            if (!registration?.pushManager) {
                throw new Error('PushManager tidak tersedia');
            }

            const existingSub = await registration.pushManager.getSubscription();

            if (!existingSub) {
                await Swal.fire({
                    icon: 'info',
                    title: 'Tidak Ada Langganan',
                    text: 'Anda belum berlangganan notifikasi.',
                });
                return { success: false, cancelled: false };
            }

            const result = await Swal.fire({
                title: 'Nonaktifkan Notifikasi?',
                text: 'Anda tidak akan lagi menerima pemberitahuan dari aplikasi ini.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, nonaktifkan',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            });

            if (!result.isConfirmed) {
                console.log('❌ Pengguna membatalkan penghentian notifikasi.');
                return { success: false, cancelled: true };
            }

            const token = Auth.getToken();
            if (!token) {
                await Swal.fire({
                    icon: 'info',
                    title: 'Login Diperlukan',
                    text: 'Silakan login terlebih dahulu untuk menonaktifkan notifikasi.',
                });
                return { success: false, cancelled: false };
            }

            await Api.unsubscribeNotification({
                endpoint: existingSub.endpoint,
                token,
            });

            await existingSub.unsubscribe();

            await Swal.fire({
                icon: 'success',
                title: 'Notifikasi Dinonaktifkan',
                text: 'Anda tidak akan lagi menerima pemberitahuan.',
                timer: 2000,
                showConfirmButton: false,
            });

            console.log('🔕 Berhasil berhenti langganan notifikasi');
            return { success: true, cancelled: false };
        } catch (error) {
            console.error('❌ Gagal unsubscribe dari Push:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Gagal Menonaktifkan',
                text: 'Terjadi kesalahan saat menonaktifkan notifikasi.',
            });
            return { success: false, cancelled: false };
        }
    },
};

export default PushSubscriptionHelper;