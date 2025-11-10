import AddStoryPresenter from './add-story-presenter';
import Api from '../../data/api';
import Map from '../../utils/map';
import Camera from '../../utils/camera';

export default class AddStoryPage {
  #presenter = null;
  #map = null;
  #marker = null;
  #currentLocationMarker = null;
  #camera = null;
  #isCameraActive = false;

  async render() {
    return `
    <div class="container add-story">
        <h1>Tambah Cerita Baru</h1>
        
        <div id="page-loading" class="page-loading" style="display: none;" role="status" aria-live="polite">
          <div class="loading-spinner"></div>
          <p>Memuat halaman...</p>
        </div>

        <div id="form-section" style="display: none;">
          <div id="form-loading" class="section-loading" style="display: none;" role="status">
            <div class="loading-spinner small"></div>
            <p>Memuat form...</p>
          </div>
          <div id="form-error" class="section-error" style="display: none;" role="alert"></div>

          <form id="add-story-form" class="story-form" novalidate>
            <div class="form-group">
              <label for="story-description" class="form-label">Deskripsi Cerita *</label>
              <textarea 
                id="story-description"
                class="form-textarea"
                placeholder="Ceritakan pengalaman menarik Anda di lokasi tersebut..."
                required
                minlength="10"
                maxlength="1000"
                rows="4"
                aria-required="true"
                aria-describedby="description-error description-help"
                aria-invalid="false"
              ></textarea>
              <div class="form-error" id="description-error" role="alert"></div>
              <div class="form-help" id="description-help">Minimal 10 karakter, maksimal 1000 karakter</div>
            </div>

            <div class="form-group">
              <label class="form-label">Foto *</label>

              <div id="file-upload-section" class="photo-option">
                <input 
                  type="file" 
                  id="story-photo"
                  class="form-input"
                  accept="image/*"
                  aria-describedby="photo-error photo-help"
                  aria-invalid="false"
                >
                <div class="form-help" id="photo-help">Format: JPG, PNG, GIF. Maksimal 2MB</div>
                
                <div class="photo-option-divider">
                  <span>atau</span>
                </div>

                <button type="button" id="camera-button" class="camera-button">
                  Ambil Foto dengan Kamera
                </button>
                <div class="form-help">Ambil foto langsung menggunakan kamera perangkat Anda</div>
              </div>

              <div id="camera-section" class="camera-section" style="display: none;">
                <div class="camera-header">
                  <h3>Ambil Foto</h3>
                  <button type="button" id="close-camera" class="close-camera-button">Tutup Kamera</button>
                </div>
                
                <div id="camera-error" class="camera-error" style="display: none;" role="alert"></div>
                
                <div class="camera-preview">
                  <video id="camera-video" autoplay playsinline></video>
                  <canvas id="camera-canvas" style="display: none;"></canvas>
                </div>
                
                <div class="camera-controls">
                  <button type="button" id="switch-camera" class="switch-camera-button" title="Ganti Kamera">
                    Ganti Kamera
                  </button>
                  <button type="button" id="capture-button" class="capture-button">
                    Ambil Foto
                  </button>
                  <button type="button" id="retake-button" class="retake-button" style="display: none;">
                    Ambil Ulang
                  </button>
                </div>
                
                <div class="camera-instruction">
                  <small>Posisikan objek dalam frame dan klik "Ambil Foto"</small>
                </div>
              </div>

              <div class="form-error" id="photo-error" role="alert"></div>

              <div id="photo-preview" class="photo-preview" role="region" aria-label="Preview foto"></div>
            </div>

            <div class="form-group">
              <label class="form-label">Lokasi *</label>
              <div id="location-status" class="location-status" role="status" aria-live="polite">
                <span style="color: blue;">Mendeteksi lokasi Anda...</span>
              </div>
              <div id="map-loading" class="section-loading" style="display: none;" role="status">
                <div class="loading-spinner small"></div>
                <p>Memuat peta...</p>
              </div>
              <div id="map-error" class="section-error" style="display: none;" role="alert"></div>
              <div class="map-container">
                <div id="location-map" class="location-map" role="application" aria-label="Peta pemilihan lokasi" tabindex="0"></div>
              </div>
              <div class="location-info">
                <small>Lokasi saat ini akan otomatis terdeteksi. Klik pada peta untuk mengubah lokasi</small>
                <div id="selected-location" class="selected-location" role="status"></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-button" id="cancel-button">Batal</button>
              <button type="submit" class="submit-button" id="submit-button" disabled>
                <span class="button-text">Tambah Cerita</span>
                <div class="button-loading" style="display: none;">
                  <div class="loading-spinner white small"></div>
                  <span>Mengunggah...</span>
                </div>
              </button>
            </div>
          </form>
        </div>

        <div id="submit-loading" class="submit-loading-overlay" style="display: none;" role="status" aria-live="polite">
          <div class="loading-content">
            <div class="loading-spinner large"></div>
            <h3>Menambahkan Cerita...</h3>
            <p>Cerita Anda sedang diunggah, harap tunggu sebentar.</p>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>

        <div id="success-message" class="success-message" style="display: none;" role="status" aria-live="polite">
          <div class="success-content">
            <div class="success-icon">✅</div>
            <h3>Berhasil!</h3>
            <p id="success-text"></p>
          </div>
        </div>
        
        <div id="error-message" class="error-message" style="display: none;" role="alert" aria-live="assertive">
          <div class="error-content">
            <div class="error-icon">❌</div>
            <h3>Terjadi Kesalahan</h3>
            <p id="error-text"></p>
            <button type="button" class="retry-button" id="retry-button">Coba Lagi</button>
          </div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    try {
      this.#presenter = new AddStoryPresenter({
        view: this,
        model: Api
      });
      await this.#presenter.show();
    } catch (error) {
      console.error('afterRender error:', error);
      this.showErrorMessage('Gagal memuat halaman: ' + error.message);
    }
  }

  initializeCamera() {
    try {
      if (!Camera.isSupported()) {
        throw new Error('Browser tidak mendukung akses kamera');
      }

      this.#camera = new Camera().initCamera('camera-video', 'camera-canvas');
      return this.#camera;
    } catch (error) {
      console.error('Error initializing camera:', error);
      throw error;
    }
  }

  setupCameraEvents(onCameraOpen, onCameraClose, onPhotoCapture) {
    const cameraButton = document.getElementById('camera-button');
    const closeCamera = document.getElementById('close-camera');
    const captureButton = document.getElementById('capture-button');
    const retakeButton = document.getElementById('retake-button');
    const switchCameraButton = document.getElementById('switch-camera');

    if (cameraButton) {
      if (!Camera.isSupported()) {
        cameraButton.disabled = true;
        cameraButton.title = 'Kamera tidak didukung di browser ini';
        cameraButton.textContent = '📷 Kamera Tidak Didukung';
      } else {
        cameraButton.addEventListener('click', onCameraOpen);
      }
    }

    if (closeCamera) {
      closeCamera.addEventListener('click', onCameraClose);
    }

    if (captureButton) {
      captureButton.addEventListener('click', async () => {
        await this.#handleCapturePhoto(onPhotoCapture);
      });
    }

    if (retakeButton) {
      retakeButton.addEventListener('click', () => this.#handleRetakePhoto());
    }

    if (switchCameraButton) {
      switchCameraButton.addEventListener('click', () => this.#handleSwitchCamera());
    }
  }

  async #handleCapturePhoto(onPhotoCapture) {
    try {
      if (!this.#camera) {
        throw new Error('Kamera belum diinisialisasi');
      }

      const photoFile = await this.#camera.capturePhoto();
      if (photoFile) {
        this.#camera.showPreview();
        this.#updateCameraButtons(false);

        if (onPhotoCapture) {
          onPhotoCapture(photoFile);
        }
      }
    } catch (error) {
      this.#showCameraError(error.message);
    }
  }

  #handleRetakePhoto() {
    if (this.#camera) {
      this.#camera.showVideo();
      this.#updateCameraButtons(true);
      this.#hideCameraError();
    }
  }

  async #handleSwitchCamera() {
    try {
      if (!this.#camera) return;

      const currentFacingMode = 'environment';
      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

      await this.#camera.switchCamera(newFacingMode);
    } catch (error) {
      this.#showCameraError('Gagal mengganti kamera: ' + error.message);
    }
  }

  #updateCameraButtons(isCapturing) {
    const captureButton = document.getElementById('capture-button');
    const retakeButton = document.getElementById('retake-button');
    const switchCameraButton = document.getElementById('switch-camera');

    if (captureButton) captureButton.style.display = isCapturing ? 'inline-block' : 'none';
    if (retakeButton) retakeButton.style.display = isCapturing ? 'none' : 'inline-block';
    if (switchCameraButton) switchCameraButton.style.display = isCapturing ? 'inline-block' : 'none';
  }

  #showCameraError(message) {
    const errorEl = document.getElementById('camera-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  #hideCameraError() {
    const errorEl = document.getElementById('camera-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  async openCamera() {
    try {
      if (!this.#camera) {
        this.initializeCamera();
      }

      this.#showCameraSection(true);
      this.#updateCameraButtons(true);
      this.#hideCameraError();

      await this.#camera.start();
      this.#isCameraActive = true;

    } catch (error) {
      console.error('Error opening camera:', error);
      this.#showCameraError(error.message);
      this.#showCameraSection(false);
      throw error;
    }
  }

  async closeCamera() {
    try {
      if (this.#camera) {
        await this.#camera.stop();
      }

      this.#showCameraSection(false);
      this.#handleRetakePhoto();
      this.#isCameraActive = false;

    } catch (error) {
      console.error('Error closing camera:', error);
    }
  }

  #showCameraSection(showCamera) {
    const fileUploadSection = document.getElementById('file-upload-section');
    const cameraSection = document.getElementById('camera-section');

    if (fileUploadSection) {
      fileUploadSection.style.display = showCamera ? 'none' : 'block';
    }
    if (cameraSection) {
      cameraSection.style.display = showCamera ? 'block' : 'none';
    }
  }

  showPageLoading() {
    const el = document.getElementById('page-loading');
    if (el) el.style.display = 'block';
  }

  hidePageLoading() {
    const el = document.getElementById('page-loading');
    if (el) el.style.display = 'none';
  }

  showFormLoading() {
    const el = document.getElementById('form-loading');
    if (el) el.style.display = 'block';
  }

  hideFormLoading() {
    const el = document.getElementById('form-loading');
    if (el) el.style.display = 'none';
  }

  showAuthAlert() {
    const formSection = document.getElementById('form-section');
    if (formSection) formSection.style.display = 'none';
    this.showErrorMessage('Anda harus login terlebih dahulu untuk menambahkan cerita.');
    setTimeout(() => this.redirectToLogin(), 2000);
  }

  showFormSection() {
    const formSection = document.getElementById('form-section');
    if (formSection) formSection.style.display = 'block';
  }

  showErrorMessage(msg) {
    const el = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    if (el && errorText) {
      errorText.textContent = msg;
      el.style.display = 'block';
    }

    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
      const newRetryButton = retryButton.cloneNode(true);
      retryButton.parentNode.replaceChild(newRetryButton, retryButton);

      newRetryButton.addEventListener('click', () => {
        this.hideErrorMessage();
      });
    }
  }

  hideErrorMessage() {
    const el = document.getElementById('error-message');
    if (el) el.style.display = 'none';
  }

  showSuccessMessage(msg) {
    const el = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    if (el && successText) {
      successText.textContent = msg;
      el.style.display = 'block';
    }
  }

  hideSuccessMessage() {
    const el = document.getElementById('success-message');
    if (el) el.style.display = 'none';
  }

  showLocationStatus(message, type = 'info') {
    const statusEl = document.getElementById('location-status');
    if (!statusEl) {
      console.warn('Elemen location-status tidak ditemukan');
      return;
    }
    const colors = {
      info: 'blue',
      success: 'green',
      error: 'red'
    };
    statusEl.innerHTML = `<span style="color: ${colors[type]};">${message}</span>`;
  }

  hideLocationStatus() {
    const statusEl = document.getElementById('location-status');
    if (statusEl) {
      statusEl.innerHTML = '';
    }
  }

  showSubmitLoading() {
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton?.querySelector('.button-text');
    const buttonLoading = submitButton?.querySelector('.button-loading');
    const overlay = document.getElementById('submit-loading');

    this.#setFormDisabled(true);

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (buttonText && buttonLoading) {
      buttonText.style.display = 'none';
      buttonLoading.style.display = 'flex';
    }

    if (overlay) {
      overlay.style.display = 'flex';
    }

    this.hideErrorMessage();
    this.hideSuccessMessage();
  }

  hideSubmitLoading() {
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton?.querySelector('.button-text');
    const buttonLoading = submitButton?.querySelector('.button-loading');
    const overlay = document.getElementById('submit-loading');

    this.#setFormDisabled(false);

    if (submitButton) {
      submitButton.disabled = false;
    }

    if (buttonText && buttonLoading) {
      buttonText.style.display = 'block';
      buttonLoading.style.display = 'none';
    }

    if (overlay) {
      overlay.style.display = 'none';
    }

    this.#validateFormState();
  }

  #setFormDisabled(disabled) {
    const form = document.getElementById('add-story-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, button, select');
    inputs.forEach(input => {
      if (input.id !== 'submit-button' && input.id !== 'cancel-button') {
        input.disabled = disabled;
      }
    });
  }

  showMapLoading() {
    const el = document.getElementById('map-loading');
    if (el) el.style.display = 'block';
  }

  hideMapLoading() {
    const el = document.getElementById('map-loading');
    if (el) el.style.display = 'none';
  }

  getFormData() {
    const descEl = document.getElementById('story-description');
    const photoEl = document.getElementById('story-photo');
    const description = descEl ? descEl.value.trim() : '';

    let photo = null;
    if (photoEl && photoEl.files.length > 0) {
      photo = photoEl.files[0];
    }

    return { description, photo };
  }

  setCameraPhoto(photoFile) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(photoFile);

    const photoInput = document.getElementById('story-photo');
    if (photoInput) {
      photoInput.files = dataTransfer.files;
      this.showPhotoPreview(photoFile);
      this.closeCamera();

      this.#validateFormState();
    }
  }

  async initializeMap() {
    this.showMapLoading();

    return new Promise((resolve, reject) => {
      try {
        this.#map = new Map();
        const mapInstance = this.#map.initMap('location-map', {
          center: [-6.2088, 106.8456],
          zoom: 10,
        });

        const timeout = setTimeout(() => {
          console.warn('Map loading timeout');
          this.hideMapLoading();
          resolve(mapInstance);
        }, 5000);

        mapInstance.whenReady(() => {
          clearTimeout(timeout);
          console.log('✅ Map ready');
          this.hideMapLoading();
          resolve(mapInstance);
        });
      } catch (err) {
        console.error('Map init failed:', err);
        this.hideMapLoading();
        reject(err);
      }
    });
  }

  setMapClickHandler(onMapClick) {
    if (this.#map?.instance) {
      this.#map.instance.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }
  }

  setLocationMarker(lat, lng, isCurrentLocation = false) {
    if (!this.#map) return;

    if (isCurrentLocation && this.#currentLocationMarker) {
      this.#map.instance.removeLayer(this.#currentLocationMarker);
    } else if (!isCurrentLocation && this.#marker) {
      this.#map.instance.removeLayer(this.#marker);
    }

    const markerOptions = isCurrentLocation
      ? {
        icon: this.#map.createIcon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMDc3ZmYiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }
      : {};

    const marker = this.#map.addMarker([lat, lng], markerOptions, {
      content: isCurrentLocation
        ? `Lokasi Anda Saat Ini: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        : `Lokasi Terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
    });

    if (isCurrentLocation) {
      this.#currentLocationMarker = marker;
    } else {
      this.#marker = marker;
    }

    this.#map.instance.setView([lat, lng], 13);
  }

  showLocationInfo(lat, lng, isCurrentLocation = false) {
    const el = document.getElementById('selected-location');
    if (el) {
      const prefix = isCurrentLocation ? 'Lokasi Anda Saat Ini:' : 'Lokasi Terpilih:';
      el.innerHTML = `<strong>${prefix}</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  setupFormEvents(onSubmit, onCancel, onPhotoChange) {
    const form = document.getElementById('add-story-form');
    const cancelBtn = document.getElementById('cancel-button');
    const photoInput = document.getElementById('story-photo');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await onSubmit();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', onCancel);
    }

    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        onPhotoChange(e.target.files[0]);
        this.#validateFormState();
      });
    }
  }

  setupFormValidation() {
    const form = document.getElementById('add-story-form');
    const descriptionInput = document.getElementById('story-description');
    const photoInput = document.getElementById('story-photo');
    const submitButton = document.getElementById('submit-button');

    if (!form || !submitButton) return;

    const validateForm = () => {
      this.#validateFormState();
    };

    if (descriptionInput) {
      descriptionInput.addEventListener('input', validateForm);
      descriptionInput.addEventListener('blur', validateForm);
      descriptionInput.addEventListener('change', validateForm);
    }

    if (photoInput) {
      photoInput.addEventListener('change', validateForm);
    }

    this.#validateFormState();
  }

  #validateFormState() {
    const submitButton = document.getElementById('submit-button');
    if (!submitButton) return;

    const { description, photo } = this.getFormData();
    const hasLocation = this.#presenter?.selectedLat && this.#presenter?.selectedLon;

    const isDescriptionValid = description && description.trim().length >= 10;
    const isPhotoValid = !!photo;
    const isLocationValid = !!hasLocation;
    const isFormValid = isDescriptionValid && isPhotoValid && isLocationValid;

    submitButton.disabled = !isFormValid;

    this.#updateValidationFeedback({
      description: isDescriptionValid,
      photo: isPhotoValid,
      location: isLocationValid
    });
  }

  #updateValidationFeedback(validation) {
    const descriptionInput = document.getElementById('story-description');
    const descriptionError = document.getElementById('description-error');

    if (descriptionInput && descriptionError) {
      const descValue = descriptionInput.value.trim();
      if (descValue.length > 0 && descValue.length < 10) {
        descriptionError.textContent = 'Deskripsi minimal 10 karakter';
        descriptionError.style.display = 'block';
        descriptionInput.setAttribute('aria-invalid', 'true');
      } else if (validation.description) {
        descriptionError.textContent = '';
        descriptionError.style.display = 'none';
        descriptionInput.setAttribute('aria-invalid', 'false');
      } else {
        descriptionError.style.display = 'none';
        descriptionInput.setAttribute('aria-invalid', 'false');
      }
    }

    const photoError = document.getElementById('photo-error');
    if (photoError) {
      photoError.style.display = 'none';
    }
  }

  updateLocationValidation(hasLocation) {
    this.#validateFormState();
  }

  showPhotoPreview(file) {
    const previewContainer = document.getElementById('photo-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    if (!file) {
      this.#validateFormState();
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      previewContainer.innerHTML = '<p style="color:red;">❌ Ukuran file maksimal 2MB</p>';
      this.#validateFormState();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.innerHTML = `
      <div class="photo-preview-container">
        <img 
          src="${e.target.result}" 
          alt="Preview Foto" 
          class="photo-preview-image"
        >
        <div class="photo-preview-info">
          <p>📸 ${file.name}</p>
          <p>📊 ${(file.size / 1024).toFixed(2)} KB</p>
          <p>🖼️ ${file.type}</p>
        </div>
      </div>
    `;

      this.#validateFormState();
    };
    reader.readAsDataURL(file);
  }

  setSubmitButtonState(loading) {
    if (loading) {
      this.showSubmitLoading();
    } else {
      this.hideSubmitLoading();
    }
  }

  redirectToStories() {
    window.location.hash = '#/';
  }

  redirectToLogin() {
    window.location.hash = '#/login';
  }

  cleanup() {
    if (this.#camera) {
      this.#camera.destroy();
      this.#camera = null;
    }
  }
}