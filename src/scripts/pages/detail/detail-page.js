import DetailPresenter from './detail-presenter.js';
import Api from '../../data/api.js';
import Map from '../../utils/map.js';

export default class DetailPage {
  #presenter = null;
  #storyId = null;
  #mapWrapper = null;
  #storyMarker = null;

  constructor({ params } = {}) {
    this.#storyId = params?.id || null;
    this.#mapWrapper = null;
    this.#storyMarker = null;
  }

  async render() {
    return `
      <div class="container add-story">
        <h1>Detail Cerita</h1>
        <section class="story-detail-section">
          <div id="story-detail-loading" class="section-loading">Memuat detail cerita...</div>
          <div id="story-detail-error" class="section-error" style="display:none;"></div>
          <div id="story-detail-content" class="story-detail">
            ${!this.#storyId ? '<p class="error">ID cerita tidak valid</p>' : ''}
          </div>
        </section>

        <section class="story-map-section">
          <h2>Lokasi Cerita</h2>
          <div id="story-map-loading" class="section-loading">Memuat peta...</div>
          <div id="story-map-error" class="section-error" style="display:none;"></div>
          <div id="story-detail-map" class="story-detail-map"></div>
          <div id="story-coordinates" class="story-coordinates"></div>
        </section>
      </div>
    `;
  }

  async afterRender() {
    console.log('DetailPage afterRender, storyId:', this.#storyId);

    if (!this.#storyId) {
      this.showError('ID cerita tidak ditemukan.');
      return;
    }

    let correctId = await this.#getCorrectStoryId(this.#storyId);
    console.log('Correct story ID:', correctId);

    this.#presenter = new DetailPresenter({
      view: this,
      model: Api,
    });

    await this.#presenter.showDetail(correctId);
  }

  async #getCorrectStoryId(lowercaseId) {
    try {
      const storedStories = JSON.parse(sessionStorage.getItem('allStories') || '[]');
      const matchingStory = storedStories.find(story =>
        story.id.toLowerCase() === lowercaseId
      );

      if (matchingStory) {
        console.log('Found correct ID mapping:', matchingStory.id);
        return matchingStory.id;
      }

      console.warn('No ID mapping found, using lowercase ID as fallback');
      return lowercaseId;

    } catch (error) {
      console.error('Error getting correct story ID:', error);
      return lowercaseId;
    }
  }

  showLoading() {
    const loading = document.getElementById('story-detail-loading');
    const error = document.getElementById('story-detail-error');
    const content = document.getElementById('story-detail-content');

    if (loading) loading.style.display = 'block';
    if (error) error.style.display = 'none';
    if (content) content.innerHTML = '';
  }

  hideLoading() {
    const loading = document.getElementById('story-detail-loading');
    if (loading) loading.style.display = 'none';
  }

  showError(message) {
    const err = document.getElementById('story-detail-error');
    const content = document.getElementById('story-detail-content');

    if (err) {
      err.textContent = message;
      err.style.display = 'block';
    }
    if (content) content.innerHTML = '';

    console.error('DetailPage Error:', message);
  }

  displayStoryDetail(story) {
    console.log('Displaying story:', story);

    const container = document.getElementById('story-detail-content');
    const err = document.getElementById('story-detail-error');

    if (!container) return;
    if (err) err.style.display = 'none';

    if (!story || !story.name || !story.description) {
      this.showError('Data cerita tidak lengkap');
      return;
    }

    const date = new Date(story.createdAt).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    container.innerHTML = `
    <article class="story-detail-card" role="article">
    <h2 class="story-title">${story.name}</h2>

    <div class="story-info">
      <div class="story-date">
        📅 ${date}
      </div>
      ${story.lat && story.lon ? `
        <div class="story-location">
          🗺️ ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}
        </div>` : ''}
    </div>

    ${story.lat && story.lon ? `
    <div class="story-coordinates">
      <span>Latitude:</span> ${story.lat.toFixed(10)}
      <span>Longitude:</span> ${story.lon.toFixed(10)}
    </div>` : ''}

    <div class="story-description">
      <p>${story.description}</p>
    </div>

    <div class="story-image-wrapper-detail">
      <img 
        src="${story.photoUrl}" 
        alt="${story.name}" 
        class="story-detail-image"
        onerror="this.src='https://via.placeholder.com/600x350?text=Gambar+Tidak+Tersedia'">
    </div>
  </article>
  `;

    this.#displayStoryMap(story);
  }

  #displayStoryMap(story) {
    const mapContainer = document.getElementById('story-detail-map');
    const mapLoading = document.getElementById('story-map-loading');
    const mapError = document.getElementById('story-map-error');
    const coordinatesContainer = document.getElementById('story-coordinates');

    if (mapLoading) mapLoading.style.display = 'none';

    if (!story.lat || !story.lon) {
      if (mapContainer) mapContainer.style.display = 'none';
      if (mapError) {
        mapError.textContent = 'Cerita ini tidak memiliki informasi lokasi';
        mapError.style.display = 'block';
      }
      if (coordinatesContainer) coordinatesContainer.innerHTML = '';
      return;
    }

    if (coordinatesContainer) {
      coordinatesContainer.innerHTML = `
        <div class="story-coordinates">
          <span>Latitude:</span> ${story.lat.toFixed(10)}
          <span>Longitude:</span> ${story.lon.toFixed(10)}
        </div>
      `;
    }

    if (mapError) mapError.style.display = 'none';
    if (mapContainer) mapContainer.style.display = 'block';

    this.#initializeStoryMap(story.lat, story.lon, story.name);
  }

  #initializeStoryMap(lat, lon, storyName) {
    try {
      if (this.#mapWrapper) {
        this.#mapWrapper.instance.remove();
        this.#mapWrapper = null;
        this.#storyMarker = null;
      }

      this.#mapWrapper = new Map();
      this.#mapWrapper.initMap('story-detail-map', {
        center: [lat, lon],
        zoom: 13
      });

      this.#storyMarker = this.#mapWrapper.addMarker(
        [lat, lon],
        {},
        {
          content: `
            <div class="popup-content">
              <b>${storyName}</b><br>
              <small>Lokasi cerita</small>
            </div>
          `
        }
      );

      this.#storyMarker.openPopup();
      console.log('Peta detail cerita berhasil dimuat');

    } catch (error) {
      console.error('Error initializing story map:', error);
      const mapError = document.getElementById('story-map-error');
      if (mapError) {
        mapError.textContent = 'Gagal memuat peta: ' + error.message;
        mapError.style.display = 'block';
      }
    }
  }
}