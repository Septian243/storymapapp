import IDBHelper from '../../data/idb';

export default class HomePresenter {
    #view;
    #model;
    #currentFilter = 'all';
    #currentSort = 'createdAt';
    #currentOrder = 'desc';
    #searchQuery = '';
    #apiStoryIds = [];
    #lastFetchTime = null;
    #cacheDuration = 5 * 60 * 1000;

    constructor({ view, model }) {
        this.#view = view;
        this.#model = model;
    }

    async show() {
        try {
            this.#view.showMapLoading();
            await this.#view.initializeMap();

            this.#loadApiStoryIdsFromCache();
            await this.#loadAndDisplayStories();

            window.addEventListener('stories-synced', () => {
                console.log('🔄 Stories synced, reloading...');
                this.#loadAndDisplayStories();
            });

        } catch (error) {
            console.error('HomePresenter.show() error:', error);
            this.#view.showGlobalError('Gagal memuat halaman. Silakan refresh.');
        } finally {
            this.#view.hideMapLoading();
        }
    }

    #saveApiStoryIdsToCache() {
        try {
            localStorage.setItem('apiStoryIds', JSON.stringify(this.#apiStoryIds));
            localStorage.setItem('apiStoryIdsTimestamp', Date.now().toString());
        } catch (error) {
            console.warn('Failed to save API IDs to cache:', error);
        }
    }

    #loadApiStoryIdsFromCache() {
        try {
            const cachedIds = localStorage.getItem('apiStoryIds');
            const timestamp = localStorage.getItem('apiStoryIdsTimestamp');

            if (cachedIds && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                if (age < 60 * 60 * 1000) {
                    this.#apiStoryIds = JSON.parse(cachedIds);
                    console.log('📦 Loaded API IDs from cache:', this.#apiStoryIds.length);
                }
            }
        } catch (error) {
            console.warn('Failed to load API IDs from cache:', error);
        }
    }

    async #loadAndDisplayStories() {
        try {
            this.#view.showStoriesLoading?.();

            let apiStories = [];
            let allStories = [];
            let shouldFetchFromApi = false;

            const now = Date.now();
            const cacheAge = this.#lastFetchTime ? now - this.#lastFetchTime : Infinity;

            if (navigator.onLine && cacheAge > this.#cacheDuration) {
                shouldFetchFromApi = true;
            }

            if (shouldFetchFromApi) {
                console.log('🌐 Fetching from API (cache expired or first load)...');
                try {
                    const response = await this.#model.getStories();

                    if (!response.error && response.listStory) {
                        apiStories = response.listStory;
                        this.#apiStoryIds = apiStories.map(s => s.id);
                        this.#lastFetchTime = now;
                        this.#saveApiStoryIdsToCache();
                        await IDBHelper.saveStories(apiStories);
                        console.log('✅ Stories saved to IndexedDB');
                    }
                } catch (apiError) {
                    console.warn('⚠️ API failed, using cached data:', apiError);
                }
            } else {
                console.log('📦 Using cached data (fresh or offline)');
            }

            const idbStories = await IDBHelper.getAllStories();
            const pendingStories = await IDBHelper.getAllPendingStories();

            console.log(`📊 Loaded from IDB: ${idbStories.length} stories, ${pendingStories.length} pending`);

            if (this.#apiStoryIds.length === 0 && idbStories.length > 0) {
                console.log('⚠️ No API IDs available, assuming all IDB stories are online');
                this.#apiStoryIds = idbStories.map(s => s.id);
            }

            const markedIdbStories = idbStories.map(story => {
                const isInApi = this.#apiStoryIds.includes(story.id);
                return {
                    ...story,
                    isOffline: this.#apiStoryIds.length > 0 && !isInApi,
                    isPending: false
                };
            });

            const markedPendingStories = pendingStories.map(story => ({
                id: `pending-${story.tempId}`,
                name: story.name || 'Pengguna',
                description: story.description,
                lat: story.lat,
                lon: story.lon,
                createdAt: story.createdAt,
                isPending: true,
                isOffline: false,
                photoBlob: story.photoBlob,
                photoBase64: story.photoBase64
            }));

            allStories = [...markedPendingStories, ...markedIdbStories];
            allStories = await this.#applyFiltersAndSort(allStories);

            const storiesWithLocation = allStories.filter(story => story.lat && story.lon);

            this.#view.displayStories(allStories);
            this.#view.displayMapStories(storiesWithLocation);
            this.#updateStoriesCount(allStories);

            await this.#preloadStoryImages(allStories);

        } catch (error) {
            console.error('HomePresenter.#loadAndDisplayStories error:', error);
            this.#view.showStoriesError('Gagal memuat daftar cerita.');
        } finally {
            this.#view.hideStoriesLoading?.();
        }
    }

    async #preloadStoryImages(stories) {
        const imageUrls = stories
            .map(story => story.photoUrl)
            .filter(url => url && !url.includes('placeholder') && !url.startsWith('data:'));

        if (imageUrls.length === 0) return;

        console.log('🖼️ Preloading images:', imageUrls.length);

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_IMAGES',
                urls: imageUrls
            });
        }
    }

    async #applyFiltersAndSort(stories) {
        let filteredStories = [...stories];

        if (this.#currentFilter === 'pending') {
            filteredStories = filteredStories.filter(s => s.isPending);
        } else if (this.#currentFilter === 'offline') {
            filteredStories = filteredStories.filter(s => s.isOffline && !s.isPending);
        } else if (this.#currentFilter === 'online') {
            filteredStories = filteredStories.filter(s => !s.isPending && !s.isOffline);
        }

        if (this.#searchQuery.trim()) {
            const query = this.#searchQuery.toLowerCase();
            filteredStories = filteredStories.filter(story =>
                story.name?.toLowerCase().includes(query) ||
                story.description?.toLowerCase().includes(query)
            );
        }

        filteredStories.sort((a, b) => {
            let comparison = 0;

            if (this.#currentSort === 'createdAt') {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                comparison = dateA - dateB;
            } else if (this.#currentSort === 'name') {
                comparison = (a.name || '').localeCompare(b.name || '');
            }

            return this.#currentOrder === 'desc' ? -comparison : comparison;
        });

        return filteredStories;
    }

    #updateStoriesCount(stories) {
        const totalCount = stories.length;
        const pendingCount = stories.filter(s => s.isPending).length;
        const offlineCount = stories.filter(s => s.isOffline && !s.isPending).length;
        const onlineCount = stories.filter(s => !s.isPending && !s.isOffline).length;

        console.log(`📊 Stories: ${totalCount} total, ${onlineCount} online, ${offlineCount} offline, ${pendingCount} pending`);
    }

    async setFilter(filter) {
        this.#currentFilter = filter;
        await this.#refilterStories();
    }

    async setSort(sortBy, order = 'desc') {
        this.#currentSort = sortBy;
        this.#currentOrder = order;
        await this.#refilterStories();
    }

    async setSearch(query) {
        this.#searchQuery = query;
        await this.#refilterStories();
    }

    async #refilterStories() {
        try {
            this.#view.showStoriesLoading?.();

            const idbStories = await IDBHelper.getAllStories();
            const pendingStories = await IDBHelper.getAllPendingStories();

            const markedIdbStories = idbStories.map(story => ({
                ...story,
                isOffline: this.#apiStoryIds.length > 0 && !this.#apiStoryIds.includes(story.id),
                isPending: false
            }));

            const markedPendingStories = pendingStories.map(story => ({
                id: `pending-${story.tempId}`,
                name: story.name || 'Pengguna',
                description: story.description,
                lat: story.lat,
                lon: story.lon,
                createdAt: story.createdAt,
                isPending: true,
                isOffline: false,
                photoBlob: story.photoBlob,
                photoBase64: story.photoBase64
            }));

            let allStories = [...markedPendingStories, ...markedIdbStories];
            allStories = await this.#applyFiltersAndSort(allStories);

            const storiesWithLocation = allStories.filter(story => story.lat && story.lon);

            this.#view.displayStories(allStories);
            this.#view.displayMapStories(storiesWithLocation);
            this.#updateStoriesCount(allStories);

        } catch (error) {
            console.error('Error refiltering stories:', error);
        } finally {
            this.#view.hideStoriesLoading?.();
        }
    }

    async refresh() {
        console.log('🔄 Force refresh from API...');
        this.#lastFetchTime = null;
        await this.#loadAndDisplayStories();
    }

    async deleteStory(storyId, isPending, isOffline) {
        try {
            if (isPending) {
                const tempId = parseInt(storyId.replace('pending-', ''));
                await IDBHelper.deletePendingStory(tempId);
                console.log('✅ Deleted pending story:', tempId);
                this.#view.showDeleteSuccess('Cerita pending berhasil dihapus!');
            } else if (isOffline) {
                await IDBHelper.deleteStory(storyId);
                console.log('✅ Deleted offline story:', storyId);
                this.#view.showDeleteSuccess('Cerita offline berhasil dihapus dari cache!');
            }

            await this.#refilterStories();

        } catch (error) {
            console.error('Error deleting story:', error);
            this.#view.showGlobalError('Gagal menghapus cerita: ' + error.message);
        }
    }

    async clearOfflineStories() {
        try {
            const idbStories = await IDBHelper.getAllStories();
            const offlineStories = idbStories.filter(s =>
                this.#apiStoryIds.length > 0 && !this.#apiStoryIds.includes(s.id)
            );

            for (const story of offlineStories) {
                await IDBHelper.deleteStory(story.id);
            }

            await IDBHelper.clearPendingStories();

            console.log('✅ Offline and pending stories cleared');
            this.#view.showDeleteSuccess('Semua cerita offline dan pending berhasil dihapus!');

            await this.#refilterStories();

        } catch (error) {
            console.error('Error clearing offline stories:', error);
            this.#view.showGlobalError('Gagal menghapus cerita offline: ' + error.message);
        }
    }
}