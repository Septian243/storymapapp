export default class Camera {
    #mediaStream = null;
    #videoElement = null;
    #canvasElement = null;
    #onPhotoCapture = null;

    constructor() {
        this.#videoElement = null;
        this.#canvasElement = null;
    }

    initCamera(videoId, canvasId) {
        this.#videoElement = document.getElementById(videoId);
        this.#canvasElement = document.getElementById(canvasId);

        if (!this.#videoElement || !this.#canvasElement) {
            throw new Error('Video atau Canvas element tidak ditemukan');
        }

        return this;
    }

    async start() {
        try {
            await this.stop();

            if (!this.#videoElement) {
                throw new Error('Video element belum diinisialisasi');
            }

            this.#mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            this.#videoElement.srcObject = this.#mediaStream;

            await new Promise((resolve, reject) => {
                this.#videoElement.onloadedmetadata = () => {
                    this.#videoElement.play().then(resolve).catch(reject);
                };
                this.#videoElement.onerror = reject;

                setTimeout(() => {
                    if (this.#videoElement.readyState >= 2) {
                        resolve();
                    }
                }, 3000);
            });

            console.log('✅ Camera started successfully');
            return true;
        } catch (error) {
            console.error('Error starting camera:', error);
            throw new Error(`Tidak dapat mengakses kamera: ${error.message}`);
        }
    }

    async stop() {
        if (this.#mediaStream) {
            this.#mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.#mediaStream = null;
        }

        if (this.#videoElement) {
            this.#videoElement.srcObject = null;
        }

        console.log('Camera stopped');
    }

    async capturePhoto() {
        try {
            if (!this.#videoElement || !this.#canvasElement) {
                throw new Error('Video atau Canvas element tidak ditemukan');
            }

            if (!this.#mediaStream) {
                throw new Error('Kamera belum dihidupkan');
            }

            this.#canvasElement.width = this.#videoElement.videoWidth;
            this.#canvasElement.height = this.#videoElement.videoHeight;

            const context = this.#canvasElement.getContext('2d');
            context.drawImage(this.#videoElement, 0, 0, this.#canvasElement.width, this.#canvasElement.height);

            const blob = await new Promise((resolve) => {
                this.#canvasElement.toBlob(resolve, 'image/jpeg', 0.8);
            });

            if (!blob) {
                throw new Error('Gagal mengambil foto');
            }

            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
                type: 'image/jpeg'
            });

            console.log('Photo captured successfully');
            return file;

        } catch (error) {
            console.error('Error capturing photo:', error);
            throw new Error(`Gagal mengambil foto: ${error.message}`);
        }
    }

    getPreviewUrl() {
        if (!this.#canvasElement) return null;

        return this.#canvasElement.toDataURL('image/jpeg');
    }

    showVideo() {
        if (this.#videoElement) {
            this.#videoElement.style.display = 'block';
        }
        if (this.#canvasElement) {
            this.#canvasElement.style.display = 'none';
        }
    }

    showPreview() {
        if (this.#videoElement) {
            this.#videoElement.style.display = 'none';
        }
        if (this.#canvasElement) {
            this.#canvasElement.style.display = 'block';
        }
    }

    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    async getCameras() {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) {
                return [];
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting cameras:', error);
            return [];
        }
    }

    async switchCamera(facingMode = 'environment') {
        await this.stop();

        if (!this.#videoElement) {
            throw new Error('Video element belum diinisialisasi');
        }

        this.#mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        this.#videoElement.srcObject = this.#mediaStream;
        await this.#videoElement.play();
    }

    destroy() {
        this.stop();
        this.#videoElement = null;
        this.#canvasElement = null;
        this.#onPhotoCapture = null;
    }
}