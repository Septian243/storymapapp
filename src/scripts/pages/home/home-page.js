import HomePresenter from './home-presenter';
import Auth from '../../utils/auth';
import Api from '../../data/api';
import Map from '../../utils/map';
import PushSubscriptionHelper from '../../utils/push-subscription';

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
            
            <!-- SKILLED: Search, Filter, Sort Controls -->
            <div class="stories-controls">
              <div class="search-box">
                <input 
                  type="search" 
                  id="story-search" 
                  placeholder="Cari cerita..." 
                  aria-label="Cari cerita"
                >
              </div>
              
              <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all" aria-label="Tampilkan semua cerita">
                  Semua
                </button>
                <button class="filter-btn" data-filter="online" aria-label="Tampilkan cerita online">
                  ✅ Online
                </button>
                <button class="filter-btn" data-filter="offline" aria-label="Tampilkan cerita offline (hanya di cache)">
                  💾 Offline
                </button>
                <button class="filter-btn" data-filter="pending" aria-label="Tampilkan cerita pending">
                  📴 Pending
                </button>
              </div>
              
              <div class="sort-controls">
                <label for="sort-select">Urutkan:</label>
                <select id="sort-select" aria-label="Pilih urutan cerita">
                  <option value="createdAt-desc">Terbaru</option>
                  <option value="createdAt-asc">Terlama</option>
                  <option value="name-asc">Nama (A-Z)</option>
                  <option value="name-desc">Nama (Z-A)</option>
                </select>
              </div>
              
              <button id="refresh-stories" class="refresh-btn" aria-label="Refresh cerita">
                🔄 Refresh
              </button>
              
              <!-- BASIC: Clear All Button - Hanya untuk data offline/pending -->
              <button id="clear-offline-stories" class="clear-all-btn" aria-label="Hapus semua cerita offline dari cache">
                🗑️ Clear Offline Data
              </button>
            </div>
          </div>

          <div id="stories-loading" class="section-loading">Memuat cerita...</div>
          <div id="stories-error" class="section-error" style="display:none;"></div>
          <div id="stories-count" class="stories-count"></div>
          <div id="stories-list" class="stories-grid"></div>
        </section>
      </div>

      <!-- Modal Konfirmasi Delete -->
      <div id="delete-modal" class="modal" style="display:none;">
        <div class="modal-content">
          <h3>Hapus Cerita?</h3>
          <p id="delete-modal-text">Apakah Anda yakin ingin menghapus cerita ini?</p>
          <div class="modal-actions">
            <button id="cancel-delete" class="cancel-btn">Batal</button>
            <button id="confirm-delete" class="delete-btn">Hapus</button>
          </div>
        </div>
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
    const clearOfflineBtn = document.getElementById('clear-offline-stories');

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
          const filter = btn.dataset.filter;
          this.#presenter.setFilter(filter);
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

    if (clearOfflineBtn) {
      clearOfflineBtn.addEventListener('click', () => {
        this.showClearOfflineConfirmation();
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

    sessionStorage.setItem('allStories', JSON.stringify(stories));

    const totalCount = stories.length;
    const pendingCount = stories.filter(s => s.isPending).length;
    const offlineCount = stories.filter(s => s.isOffline).length;
    const onlineCount = totalCount - pendingCount - offlineCount;

    if (countEl) {
      countEl.innerHTML = `
        <strong>Total:</strong> ${totalCount} cerita | 
        <span style="color: green;">✅ Online: ${onlineCount}</span> | 
        <span style="color: blue;">💾 Offline: ${offlineCount}</span> |
        <span style="color: orange;">📴 Pending: ${pendingCount}</span>
      `;
    }

    list.innerHTML = stories.length
      ? stories.map((s, index) => {
        const isPending = s.isPending;
        const isOffline = s.isOffline;
        const isOnlineOnly = !isPending && !isOffline;

        let cardClass = '';
        let badge = '';

        if (isPending) {
          cardClass = 'pending';
          badge = '📴 Pending';
        } else if (isOffline) {
          cardClass = 'offline';
          badge = '💾 Offline';
        }

        let photoUrl = 'https://via.placeholder.com/300x200?text=No+Image';

        if (isPending && s.photoBase64) {
          photoUrl = s.photoBase64;
        } else if (s.photoUrl) {
          photoUrl = s.photoUrl;
        }

        return `
            <article class="story-card ${cardClass}" tabindex="0" role="article" aria-labelledby="story-title-${s.id}">
              ${badge ? `<div class="story-badge">${badge}</div>` : ''}
              <img 
                src="${photoUrl}" 
                alt="${s.name}" 
                class="story-image"
                crossorigin="anonymous"
                loading="${index < 6 ? 'eager' : 'lazy'}"
                onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=No+Image';"
              >
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
                    <button class="delete-story-btn" data-id="${s.id}" data-pending="true" data-offline="false" aria-label="Hapus cerita pending">
                      🗑️ Hapus Pending
                    </button>
                  ` : isOffline ? `
                    <button class="delete-story-btn" data-id="${s.id}" data-pending="false" data-offline="true" aria-label="Hapus cerita offline">
                      🗑️ Hapus dari Cache
                    </button>
                  ` : `
                    <a href="#/detail/${s.id.toLowerCase()}" class="story-detail-link" aria-label="Baca detail cerita ${s.name}">
                      Lihat detail
                    </a>
                  `}
                </div>
              </div>
            </article>
          `;
      }).join('')
      : `<div class="no-stories" role="status">Belum ada cerita yang tersedia.</div>`;

    this.setupDeleteButtons();
  }

  setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-story-btn');

    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const storyId = btn.dataset.id;
        const isPending = btn.dataset.pending === 'true';
        const isOffline = btn.dataset.offline === 'true';

        this.showDeleteConfirmation(storyId, isPending, isOffline);
      });
    });
  }

  showDeleteConfirmation(storyId, isPending, isOffline) {
    const modal = document.getElementById('delete-modal');
    const modalText = document.getElementById('delete-modal-text');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    if (isPending) {
      modalText.textContent = 'Cerita ini belum tersinkronisasi. Yakin ingin menghapusnya?';
    } else if (isOffline) {
      modalText.textContent = 'Hapus cerita ini dari cache lokal? (Cerita tidak ada di server)';
    }

    modal.style.display = 'flex';

    const handleConfirm = async () => {
      await this.#presenter.deleteStory(storyId, isPending, isOffline);
      modal.style.display = 'none';
      cleanup();
    };

    const handleCancel = () => {
      modal.style.display = 'none';
      cleanup();
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  }

  showClearOfflineConfirmation() {
    const modal = document.getElementById('delete-modal');
    const modalText = document.getElementById('delete-modal-text');
    const confirmBtn = document.getElementById('confirm-delete');
    const cancelBtn = document.getElementById('cancel-delete');

    modalText.textContent = 'Hapus SEMUA cerita offline dan pending dari cache lokal?';
    modal.style.display = 'flex';

    const handleConfirm = async () => {
      await this.#presenter.clearOfflineStories();
      modal.style.display = 'none';
      cleanup();
    };

    const handleCancel = () => {
      modal.style.display = 'none';
      cleanup();
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  }

  showDeleteSuccess(message) {
    alert(message);
  }

  showMapLoading() {
    document.getElementById('map-loading').style.display = 'block';
    document.getElementById('stories-loading').style.display = 'block';
  }

  hideMapLoading() {
    document.getElementById('map-loading').style.display = 'none';
    document.getElementById('stories-loading').style.display = 'none';
  }

  showStoriesLoading() {
    document.getElementById('stories-loading').style.display = 'block';
  }

  hideStoriesLoading() {
    document.getElementById('stories-loading').style.display = 'none';
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
    alert(message);
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