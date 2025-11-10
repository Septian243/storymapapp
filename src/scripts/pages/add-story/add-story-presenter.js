import IDBHelper from '../../data/idb';
import Auth from '../../utils/auth';

export default class AddStoryPresenter {
    #view;
    #model;
    #cameraPhoto = null;
    selectedLat = null;
    selectedLon = null;

    constructor({ view, model }) {
        this.#view = view;
        this.#model = model;
    }

    async show() {
        try {
            this.#view.showPageLoading();

            if (!Auth.isLoggedIn()) {
                console.warn('User not logged in, redirecting...');
                this.#view.redirectToLogin();
                return;
            }

            this.#view.showFormSection();

            try {
                await this.#view.initializeMap();
            } catch (mapError) {
                console.error('Map initialization failed:', mapError);
            }

            try {
                await this.getCurrentLocation();
            } catch (locationError) {
                console.warn('Location detection failed:', locationError);
            }

            this.#view.setMapClickHandler((lat, lon) => {
                this.selectedLat = lat;
                this.selectedLon = lon;
                this.#view.setLocationMarker(lat, lon);
                this.#view.showLocationInfo(lat, lon);
                this.#view.hideLocationStatus();
                this.#view.updateLocationValidation(true);
            });

            this.#view.setupCameraEvents(
                () => this.#handleCameraOpen(),
                () => this.#handleCameraClose(),
                (photoFile) => this.#handlePhotoCapture(photoFile)
            );

            this.#view.setupFormEvents(
                async () => {
                    await this.#handleFormSubmit();
                },
                () => this.#view.redirectToStories(),
                (file) => {
                    this.#cameraPhoto = null;
                    this.#view.showPhotoPreview(file);
                }
            );

            this.#view.setupFormValidation();

        } catch (err) {
            console.error('Presenter show error:', err);
            const errorMessage = err.message || 'Terjadi kesalahan saat memuat halaman';
            this.#view.showErrorMessage(errorMessage);
        } finally {
            this.#view.hidePageLoading();
        }
    }

    async #handleFormSubmit() {
        const { description, photo } = this.#view.getFormData();
        const finalPhoto = this.#cameraPhoto || photo;

        await this.saveStory({
            description,
            photo: finalPhoto,
            lat: this.selectedLat,
            lon: this.selectedLon
        });
    }

    async #handleCameraOpen() {
        try {
            await this.#view.openCamera();
        } catch (error) {
            console.error('Error opening camera:', error);
            this.#view.showErrorMessage('Tidak dapat membuka kamera: ' + error.message);
        }
    }

    async #handleCameraClose() {
        try {
            await this.#view.closeCamera();
        } catch (error) {
            console.error('Error closing camera:', error);
        }
    }

    #handlePhotoCapture(photoFile) {
        this.#cameraPhoto = photoFile;
        this.#view.setCameraPhoto(photoFile);
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const msg = 'Browser tidak mendukung geolocation';
                this.#view.showLocationStatus(msg, 'error');
                this.#view.updateLocationValidation(false);
                reject(new Error(msg));
                return;
            }

            this.#view.showLocationStatus('🔍 Mendeteksi lokasi Anda...', 'info');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    this.selectedLat = lat;
                    this.selectedLon = lng;

                    this.#view.setLocationMarker(lat, lng, true);
                    this.#view.showLocationInfo(lat, lng, true);
                    this.#view.showLocationStatus('✅ Lokasi Anda berhasil terdeteksi', 'success');
                    this.#view.updateLocationValidation(true);

                    setTimeout(() => {
                        this.#view.hideLocationStatus();
                    }, 3000);

                    resolve({ lat, lng });
                },
                (error) => {
                    let errorMessage = 'Gagal mendapatkan lokasi';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '⚠️ Akses lokasi ditolak. Silakan pilih lokasi pada peta.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '⚠️ Informasi lokasi tidak tersedia. Silakan pilih lokasi pada peta.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '⚠️ Waktu pencarian lokasi habis. Silakan pilih lokasi pada peta.';
                            break;
                        default:
                            errorMessage = '⚠️ Gagal mendeteksi lokasi. Silakan pilih lokasi pada peta.';
                    }

                    this.#view.showLocationStatus(errorMessage, 'error');
                    this.#view.updateLocationValidation(false);

                    console.warn('Location detection failed:', errorMessage);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    async saveStory({ description, photo, lat, lon }) {
        try {
            this.#view.setSubmitButtonState(true);
            this.#view.hideErrorMessage();

            if (!description || description.trim().length < 10) {
                throw new Error('Deskripsi minimal 10 karakter');
            }
            if (!photo) {
                throw new Error('Foto wajib diunggah');
            }
            if (!lat || !lon) {
                throw new Error('Lokasi wajib dipilih pada peta');
            }

            const isOnline = navigator.onLine;

            if (!isOnline) {
                console.log('📴 Offline mode detected, saving locally...');
                await this.#saveOfflineStory({ description, photo, lat, lon });
                return;
            }

            const formData = new FormData();
            formData.append('description', description);
            formData.append('photo', photo);
            formData.append('lat', lat);
            formData.append('lon', lon);

            console.log('🌐 Uploading story to server...');

            await new Promise(resolve => setTimeout(resolve, 500));

            const res = await this.#model.addStory(formData);

            if (res.error) {
                throw new Error(res.message || 'Gagal menambahkan cerita');
            }

            console.log('✅ Story uploaded successfully');

            this.#view.showSuccessMessage('🎉 Cerita berhasil ditambahkan!');
            await new Promise(resolve => setTimeout(resolve, 1500));

            window.location.hash = '#/';

        } catch (err) {
            console.error('Save story error:', err);

            if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                console.log('📴 Network error detected, saving offline...');
                const { description, photo } = this.#view.getFormData();
                const finalPhoto = this.#cameraPhoto || photo;
                await this.#saveOfflineStory({
                    description,
                    photo: finalPhoto,
                    lat: this.selectedLat,
                    lon: this.selectedLon
                });
            } else {
                this.#view.showErrorMessage('❌ Gagal menambahkan cerita: ' + err.message);
            }
        } finally {
            this.#view.setSubmitButtonState(false);
        }
    }

    async #saveOfflineStory({ description, photo, lat, lon }) {
        try {
            console.log('💾 Saving story offline...');

            const photoBlob = await this.#convertToBlob(photo);
            const photoBase64 = await this.#convertToBase64(photo);

            const user = Auth.getUser();
            const userName = user?.name || 'Pengguna';

            const pendingStory = await IDBHelper.savePendingStory({
                description,
                photoBlob,
                photoBase64,
                lat,
                lon,
                name: userName
            });

            console.log('✅ Offline story saved:', pendingStory);

            this.#view.showSuccessMessage(
                '📴 Anda sedang offline. Cerita disimpan dan akan otomatis diunggah saat online kembali.'
            );

            await new Promise(resolve => setTimeout(resolve, 2000));

            window.location.hash = '#/';

        } catch (error) {
            console.error('Error saving offline story:', error);
            this.#view.showErrorMessage('❌ Gagal menyimpan cerita offline: ' + error.message);
        }
    }

    async #convertToBlob(file) {
        if (file instanceof Blob) {
            return file;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const blob = new Blob([reader.result], { type: file.type });
                resolve(blob);
            };
            reader.onerror = () => reject(new Error('Failed to convert file to blob'));
            reader.readAsArrayBuffer(file);
        });
    }

    async #convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = () => reject(new Error('Failed to convert file to base64'));
            reader.readAsDataURL(file);
        });
    }

    cleanup() {
        try {
            this.#view.cleanup();
        } catch (error) {
            console.warn('Cleanup error:', error);
        }
    }
}