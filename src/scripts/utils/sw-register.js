const registerSW = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './'
            });
            console.log('✅ Service Worker registered successfully:', registration.scope);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Service Worker update found!');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('✨ New Service Worker available! Please refresh.');
                    }
                });
            });

            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    } else {
        console.warn('⚠️ Service Worker is not supported in this browser.');
        return null;
    }
};

export default registerSW;
