import HomePresenter from './home-presenter';
import Auth from '../../utils/auth';
import Api from '../../data/api';
import Map from '../../utils/map';
import PushSubscriptionHelper from '../../utils/push-subscription';
import Swal from 'sweetalert2';

export default class HomePage {
  #presenter = null;
  #mapWrapper = null;
  #markers = [];

  async render() {
    const isLoggedIn = Auth.isLoggedIn();
    const user = Auth.getUser();

    return `
      <div class="container">
        <section class="hero">
          <h1>Selamat Datang di Story Map</h1>
          <p>Temukan dan bagikan cerita menarik di seluruh Dunia</p>
          ${isLoggedIn ? `<p>Halo, <strong>${user.name}</strong>!</p>` : ''}
        </section>

        <section class="map-section">
          <h2>Peta Cerita</h2>
          <div id="map-loading" class="section-loading">Memuat peta...</div>
          <div id="map-error" class="section-error" style="display:none;"></div>
          <div id="home-map" class="home-map"></div>
        </section>

        <section class="recent-stories">
          <div class="stories-header">
            <h2>Cerita Terbaru</h2>
            
            <!-- Compact Controls Layout -->
            <div class="stories-controls-wrapper">
              <!-- Search Box -->
              <div class="search-box">
                <label for="story-search" class="visually-hidden">Cari cerita</label>
                <span class="search-icon">🔍</span>
                <input 
                  type="search" 
                  id="story-search" 
                  placeholder="Cari cerita..." 
                  aria-label="Cari cerita"
                >
              </div>
              
              <!-- Filter Buttons -->
              <button class="filter-btn active" data-tab="all" aria-label="Tampilkan semua cerita">
                Semua
              </button>
              <button class="filter-btn" data-tab="online" aria-label="Tampilkan cerita online">
                ✅ Online
              </button>
              <button class="filter-btn" data-tab="saved" aria-label="Tampilkan cerita tersimpan">
                💾 Tersimpan
              </button>
              <button class="filter-btn" data-tab="pending" aria-label="Tampilkan cerita pending">
                📦 Pending
              </button>
              
              <!-- Sort Dropdown -->
              <div class="sort-wrapper">
                <label for="sort-select">Urutkan:</label>
                <select id="sort-select" aria-label="Pilih urutan cerita">
                  <option value="createdAt-desc">Terbaru</option>
                  <option value="createdAt-asc">Terlama</option>
                  <option value="name-asc">Nama (A-Z)</option>
                  <option value="name-desc">Nama (Z-A)</option>
                </select>
              </div>
              
              <!-- Action Buttons -->
              <button id="refresh-stories" class="action-btn refresh-btn" aria-label="Refresh cerita">
                🔄 Refresh
              </button>
              
              <button id="clear-saved-stories" class="action-btn clear-btn" aria-label="Hapus semua cerita tersimpan dari cache">
                🗑️ Clear Cache
              </button>
            </div>
          </div>

          <div id="stories-loading" class="section-loading">Memuat cerita...</div>
          <div id="stories-error" class="section-error" style="display:none;"></div>
          <div id="stories-count" class="stories-count"></div>
          <div id="stories-list" class="stories-grid"></div>
        </section>
      </div>
    `;
  }

  async afterRender() {
    try {
      this.#mapWrapper = new Map();
      await this.initializeMap();

      this.#presenter = new HomePresenter({
        view: this,
        model: Api,
      });

      await this.#presenter.show();

      this.setupStoriesControls();

      this.initPushButtons();
    } catch (err) {
      console.error('HomePage afterRender error:', err);
      this.showGlobalError('Gagal memuat halaman: ' + err.message);
    }
  }

  setupStoriesControls() {
    const searchInput = document.getElementById('story-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort-select');
    const refreshBtn = document.getElementById('refresh-stories');
    const clearSavedBtn = document.getElementById('clear-saved-stories');

    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.#presenter.setSearch(e.target.value);
        }, 300);
      });
    }

    if (filterButtons.length > 0) {
      filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          filterButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab;
          this.#presenter.setFilter(tab);
        });
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, order] = e.target.value.split('-');
        this.#presenter.setSort(sortBy, order);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.#presenter.refresh();
      });
    }

    if (clearSavedBtn) {
      clearSavedBtn.addEventListener('click', () => {
        this.showClearSavedConfirmation();
      });
    }
  }

  async initializeMap() {
    this.showMapLoading();
    try {
      this.#mapWrapper.initMap('home-map', { center: [-2.5489, 118.0149], zoom: 5 });
    } catch (error) {
      console.error('Error saat inisialisasi peta:', error);
      this.showMapError('Gagal memuat peta');
    } finally {
      this.hideMapLoading();
    }
  }

  initPushButtons() {
    const notifBtn = document.getElementById('nav-notif-btn');
    const notifItem = document.getElementById('notif-nav-item');
    if (!notifBtn || !notifItem) return;

    if (notifBtn.dataset.listenerAdded) return;
    notifBtn.dataset.listenerAdded = 'true';

    if (!Auth.isLoggedIn()) {
      notifItem.style.display = 'none';
      return;
    }

    notifItem.style.display = 'inline-block';

    (async () => {
      const registration =
        window.serviceWorkerRegistration || (await navigator.serviceWorker.ready);

      const sub = await registration.pushManager.getSubscription();
      this.updateNotifButton(notifBtn, !!sub);
    })();

    notifBtn.addEventListener('click', async () => {
      const registration =
        window.serviceWorkerRegistration || (await navigator.serviceWorker.ready);

      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        const result = await PushSubscriptionHelper.unsubscribeUser(registration);
        if (result.success) {
          this.updateNotifButton(notifBtn, false);
        }
      } else {
        const result = await PushSubscriptionHelper.subscribeUser(registration);
        if (result.success) {
          this.updateNotifButton(notifBtn, true);
        }
      }
    });
  }

  updateNotifButton(button, isActive) {
    button.textContent = isActive
      ? '❌ Matikan Notifikasi'
      : '🔔 Aktifkan Notifikasi';
  }

  displayMapStories(stories) {
    if (!this.#mapWrapper.instance) {
      console.error('Map belum diinisialisasi');
      this.showMapError('Peta tidak tersedia');
      return;
    }

    this.#markers.forEach(m => this.#mapWrapper.instance.removeLayer(m));
    this.#markers = [];

    stories.forEach(story => {
      if (!story.lat || !story.lon) return;

      const popupContent = `
        <div class="popup-content">
          <img src="${story.photoUrl || story.photoBase64 || 'https://via.placeholder.com/100x80?text=No+Image'}" alt="${story.name}"
              style="width:100px;height:80px;object-fit:cover;border-radius:8px;"
              onerror="this.src='https://via.placeholder.com/100x80?text=No+Image'">
          <h3>${story.name}</h3>
          <p>${story.description}</p>
          <small>${this.#formatDate(story.createdAt)}</small>
        </div>
      `;

      const marker = this.#mapWrapper.addMarker(
        [story.lat, story.lon],
        {},
        { content: popupContent }
      );

      this.#markers.push(marker);
    });

    this.#mapWrapper.fitToMarkers(this.#markers);
  }

  displayStories(stories) {
    const list = document.getElementById('stories-list');
    const countEl = document.getElementById('stories-count');

    console.log('📊 Displaying stories:', stories.length);
    if (stories.length > 0) {
      console.log('🔍 Sample story:', stories[0]);
    }

    sessionStorage.setItem('allStories', JSON.stringify(stories));

    const totalCount = stories.length;
    const pendingCount = stories.filter(s => s.isPending).length;
    const savedCount = stories.filter(s => s.isSaved).length;
    const onlineCount = stories.filter(s => !s.isPending && !s.isSaved).length;

    if (countEl) {
      countEl.innerHTML = `
        <strong>Total: ${totalCount} cerita</strong>
        <span>🌐 Online: ${onlineCount}</span>
        <span>💾 Tersimpan: ${savedCount}</span>
        <span>⏳ Pending: ${pendingCount}</span>
      `;
    }

    list.innerHTML = stories.length
      ? stories.map((s, index) => {
        const isPending = s.isPending;
        const isSaved = s.isSaved;
        const isOnline = !isPending && !isSaved;

        let cardClass = '';
        let badge = '';

        if (isPending) {
          cardClass = 'pending';
          badge = '⏳ Pending';
        } else if (isSaved) {
          cardClass = 'saved';
          badge = '💾 Tersimpan';
        }

        let photoUrl = '';

        if (isPending && s.photoBase64) {
          photoUrl = s.photoBase64;
        } else if (s.photoUrl) {
          photoUrl = s.photoUrl;
        } else {
          photoUrl = 'https://placehold.co/300x200/e9ecef/6c757d?text=Tidak+Ada+Gambar';
        }

        const imgOnError = `this.onerror=null; this.src='https://placehold.co/300x200/e9ecef/6c757d?text=Gambar+Tidak+Tersedia';`;

        return `
            <article class="story-card ${cardClass}" tabindex="0" role="article" aria-labelledby="story-title-${s.id}">
              <div class="story-image-wrapper">
                ${badge ? `<div class="story-badge">${badge}</div>` : ''}
                <img 
                  src="${photoUrl}" 
                  alt="${s.name || 'Story'}" 
                  class="story-image"
                  loading="${index < 6 ? 'eager' : 'lazy'}"
                  onerror="${imgOnError}"
                >
              </div>
              <div class="story-content">
                <h3 id="story-title-${s.id}" class="story-name">${s.name || 'Tanpa Nama'}</h3>
                <p class="story-description">${s.description || 'Tidak ada deskripsi'}</p>
                ${s.lat && s.lon ? `
                  <div class="story-location" aria-label="Lokasi: ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}">
                    📍 ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}
                  </div>
                ` : ''}
                <time class="story-date" datetime="${new Date(s.createdAt).toISOString()}">
                  📅 ${new Date(s.createdAt).toLocaleDateString('id-ID')}
                </time>
                
                <div class="story-actions">
                  ${isPending ? `
                    <button class="delete-story-btn" data-id="${s.id}" data-pending="true" aria-label="Hapus cerita pending">
                      🗑️ Hapus Story
                    </button>
                  ` : isSaved ? `
                    <a href="#/detail/${s.id.toLowerCase()}" class="story-detail-link" aria-label="Baca detail cerita ${s.name}">
                      Lihat detail
                    </a>
                    <button class="delete-story-btn" data-id="${s.id}" data-saved="true" aria-label="Hapus cerita dari penyimpanan">
                      🗑️ Hapus Story
                    </button>
                  ` : `
                    <a href="#/detail/${s.id.toLowerCase()}" class="story-detail-link" aria-label="Baca detail cerita ${s.name}">
                      Lihat detail
                    </a>
                    <button class="save-story-btn" data-id="${s.id}" aria-label="Simpan cerita ke penyimpanan lokal">
                      💾 Simpan Story
                    </button>
                  `}
                </div>
              </div>
            </article>
          `;
      }).join('')
      : `<div class="no-stories" role="status">Belum ada cerita yang tersedia.</div>`;

    this.setupActionButtons();
  }

  setupActionButtons() {
    const saveButtons = document.querySelectorAll('.save-story-btn');
    const deleteButtons = document.querySelectorAll('.delete-story-btn');

    saveButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const storyId = btn.dataset.id;
        await this.showSaveConfirmation(storyId);
      });
    });

    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const storyId = btn.dataset.id;
        const isPending = btn.dataset.pending === 'true';
        const isSaved = btn.dataset.saved === 'true';

        this.showDeleteConfirmation(storyId, isPending, isSaved);
      });
    });
  }

  async showSaveConfirmation(storyId) {
    const result = await Swal.fire({
      title: '💾 Simpan Cerita?',
      text: 'Cerita akan disimpan di penyimpanan lokal Anda',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await this.#presenter.saveStory(storyId);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Gagal menyimpan: ${error.message}`);
          return false;
        }
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Cerita berhasil disimpan!',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async showDeleteConfirmation(storyId, isPending, isSaved) {
    let titleText = 'Hapus Cerita?';
    let bodyText = 'Apakah Anda yakin ingin menghapus cerita ini?';

    if (isPending) {
      titleText = 'Hapus Cerita Pending?';
      bodyText = 'Cerita ini belum tersinkronisasi. Yakin ingin menghapusnya?';
    } else if (isSaved) {
      titleText = 'Hapus dari Penyimpanan?';
      bodyText = 'Hapus cerita ini dari penyimpanan lokal Anda?';
    }

    const result = await Swal.fire({
      title: titleText,
      text: bodyText,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await this.#presenter.deleteStory(storyId, isPending, isSaved);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Gagal menghapus: ${error.message}`);
          return false;
        }
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Cerita berhasil dihapus!',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  async showClearSavedConfirmation() {
    const result = await Swal.fire({
      title: 'Hapus Semua Cache?',
      html: '<strong>Hapus SEMUA cerita tersimpan dan pending dari penyimpanan lokal?</strong><br><small>Tindakan ini tidak dapat dibatalkan!</small>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await this.#presenter.clearSavedStories();
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Gagal menghapus: ${error.message}`);
          return false;
        }
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'success',
        title: 'Cache Terhapus!',
        text: 'Semua cerita tersimpan dan pending berhasil dihapus!',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }

  showMapLoading() {
    const mapLoading = document.getElementById('map-loading');
    const storiesLoading = document.getElementById('stories-loading');
    if (mapLoading) mapLoading.style.display = 'block';
    if (storiesLoading) storiesLoading.style.display = 'block';
  }

  hideMapLoading() {
    const mapLoading = document.getElementById('map-loading');
    const storiesLoading = document.getElementById('stories-loading');
    if (mapLoading) mapLoading.style.display = 'none';
    if (storiesLoading) storiesLoading.style.display = 'none';
  }

  showStoriesLoading() {
    const el = document.getElementById('stories-loading');
    if (el) el.style.display = 'block';
  }

  hideStoriesLoading() {
    const el = document.getElementById('stories-loading');
    if (el) el.style.display = 'none';
  }

  showMapError(message) {
    const el = document.getElementById('map-error');
    el.textContent = message;
    el.style.display = 'block';
  }

  hideMapError() {
    const el = document.getElementById('map-error');
    el.style.display = 'none';
  }

  showStoriesError(message) {
    const el = document.getElementById('stories-error');
    el.textContent = message;
    el.style.display = 'block';
  }

  showGlobalError(message) {
    Swal.fire({
      title: '❌ Error',
      text: message,
      icon: 'error',
      confirmButtonColor: '#667eea',
      confirmButtonText: 'OK'
    });
  }

  #formatDate(date) {
    try {
      return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Tanggal tidak valid';
    }
  }
}