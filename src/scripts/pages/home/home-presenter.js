import IDBHelper from '../../data/idb';

export default class HomePresenter {
    #view;
    #model;
    #currentFilter = 'all';
    #currentSort = 'createdAt';
    #currentOrder = 'desc';
    #searchQuery = '';
    #savedStoryIds = [];
    #lastFetchTime = null;
    #cacheDuration = 5 * 60 * 1000;
    #lastApiStories = [];

    constructor({ view, model }) {
        this.#view = view;
        this.#model = model;

        this.#loadCachedApiStories();
    }

    async show() {
        try {
            this.#view.showMapLoading();
            await this.#view.initializeMap();

            await this.#loadSavedStoryIds();
            await this.#loadAndDisplayStories();

            window.addEventListener('stories-synced', () => {
                console.log('🔄 Stories synced, reloading...');
                this.refresh();
            });

        } catch (error) {
            console.error('HomePresenter.show() error:', error);
            if (this.#view) {
                this.#view.showGlobalError?.('Gagal memuat halaman. Silakan refresh.');
            }
        } finally {
            if (this.#view) {
                this.#view.hideMapLoading();
            }
        }
    }

    async #loadSavedStoryIds() {
        this.#savedStoryIds = await IDBHelper.getSavedStoryIds();
        console.log('📦 Loaded saved story IDs:', this.#savedStoryIds.length);
    }

    #loadCachedApiStories() {
        try {
            const cached = sessionStorage.getItem('cachedApiStories');
            if (cached) {
                this.#lastApiStories = JSON.parse(cached);
                console.log('📦 Loaded cached API stories:', this.#lastApiStories.length);
            }
        } catch (error) {
            console.warn('Failed to load cached API stories:', error);
            this.#lastApiStories = [];
        }
    }

    #saveCachedApiStories(stories) {
        try {
            sessionStorage.setItem('cachedApiStories', JSON.stringify(stories));
            this.#lastApiStories = stories;
        } catch (error) {
            console.warn('Failed to save cached API stories:', error);
        }
    }

    async #loadAndDisplayStories() {
        try {
            if (!this.#view) {
                console.warn('View is null, skipping load');
                return;
            }

            this.#view.showStoriesLoading?.();

            let apiStories = [];

            if (navigator.onLine) {
                console.log('🌐 Fetching from API...');
                try {
                    const response = await this.#model.getStories();

                    if (!response.error && response.listStory) {
                        apiStories = response.listStory;
                        this.#lastFetchTime = Date.now();
                        this.#saveCachedApiStories(apiStories);

                        console.log('✅ Fetched from API:', apiStories.length, 'stories');
                    }
                } catch (apiError) {
                    console.warn('⚠️ API failed, using cached stories:', apiError);
                    apiStories = this.#lastApiStories;
                }
            } else {
                console.log('📴 Offline mode - using cached API stories');
                apiStories = this.#lastApiStories;
            }

            const savedStories = await IDBHelper.getAllStories();
            const pendingStories = await IDBHelper.getAllPendingStories();

            console.log(`📊 API: ${apiStories.length}, Saved: ${savedStories.length}, Pending: ${pendingStories.length}`);

            await this.#loadSavedStoryIds();

            const markedApiStories = apiStories.map(story => ({
                ...story,
                isSaved: this.#savedStoryIds.includes(story.id),
                isPending: false,
                isOnline: true
            }));

            const markedSavedStories = savedStories.map(story => ({
                ...story,
                isSaved: true,
                isPending: false,
                isOnline: false
            }));

            const markedPendingStories = pendingStories.map(story => ({
                id: `pending-${story.tempId}`,
                name: story.name || 'Pengguna',
                description: story.description,
                lat: story.lat,
                lon: story.lon,
                createdAt: story.createdAt,
                isPending: true,
                isSaved: false,
                isOnline: false,
                photoBlob: story.photoBlob,
                photoBase64: story.photoBase64
            }));

            const savedIds = new Set(savedStories.map(s => s.id));
            const uniqueApiStories = markedApiStories.filter(s => !savedIds.has(s.id));

            let allStories = [...markedPendingStories, ...markedSavedStories, ...uniqueApiStories];

            console.log('📦 Before filter - All stories:', allStories.length);
            console.log('  - Pending:', markedPendingStories.length);
            console.log('  - Saved:', markedSavedStories.length);
            console.log('  - Unique API:', uniqueApiStories.length);

            allStories = await this.#applyFiltersAndSort(allStories);

            console.log('📦 After filter - Filtered stories:', allStories.length);

            const storiesWithLocation = allStories.filter(story => story.lat && story.lon);

            if (!this.#view) {
                console.warn('View was destroyed during load');
                return;
            }

            this.#view.displayStories(allStories);
            this.#view.displayMapStories(storiesWithLocation);
            this.#updateStoriesCount(allStories);

            await this.#preloadStoryImages(allStories);

        } catch (error) {
            console.error('HomePresenter.#loadAndDisplayStories error:', error);
            if (this.#view) {
                this.#view.showStoriesError?.('Gagal memuat daftar cerita.');
            }
        } finally {
            if (this.#view) {
                this.#view.hideStoriesLoading?.();
            }
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
        } else if (this.#currentFilter === 'saved') {
            filteredStories = filteredStories.filter(s => s.isSaved && !s.isPending);
        } else if (this.#currentFilter === 'online') {
            filteredStories = filteredStories.filter(s => !s.isPending && !s.isSaved);
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
        const savedCount = stories.filter(s => s.isSaved && !s.isPending).length;
        const onlineCount = stories.filter(s => !s.isPending && !s.isSaved).length;

        console.log(`📊 Stories: ${totalCount} total, ${onlineCount} online, ${savedCount} saved, ${pendingCount} pending`);
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
            if (!this.#view) {
                console.warn('View is null, skipping refilter');
                return;
            }

            this.#view.showStoriesLoading?.();

            let apiStories = [];

            if (navigator.onLine) {
                try {
                    const response = await this.#model.getStories();
                    if (!response.error && response.listStory) {
                        apiStories = response.listStory;
                        this.#saveCachedApiStories(apiStories);
                    }
                } catch (error) {
                    console.warn('Failed to fetch from API during refilter:', error);
                    apiStories = this.#lastApiStories;
                }
            } else {
                console.log('📴 Offline mode - using cached stories for refilter');
                apiStories = this.#lastApiStories;
            }

            const savedStories = await IDBHelper.getAllStories();
            const pendingStories = await IDBHelper.getAllPendingStories();

            await this.#loadSavedStoryIds();

            const markedApiStories = apiStories.map(story => ({
                ...story,
                isSaved: this.#savedStoryIds.includes(story.id),
                isPending: false,
                isOnline: true
            }));

            const markedSavedStories = savedStories.map(story => ({
                ...story,
                isSaved: true,
                isPending: false,
                isOnline: false
            }));

            const markedPendingStories = pendingStories.map(story => ({
                id: `pending-${story.tempId}`,
                name: story.name || 'Pengguna',
                description: story.description,
                lat: story.lat,
                lon: story.lon,
                createdAt: story.createdAt,
                isPending: true,
                isSaved: false,
                isOnline: false,
                photoBlob: story.photoBlob,
                photoBase64: story.photoBase64
            }));

            const savedIds = new Set(savedStories.map(s => s.id));
            const uniqueApiStories = markedApiStories.filter(s => !savedIds.has(s.id));

            let allStories = [...markedPendingStories, ...markedSavedStories, ...uniqueApiStories];

            console.log('🔄 Refilter - Before filter:', allStories.length);
            console.log('  - Current filter:', this.#currentFilter);
            console.log('  - Pending:', markedPendingStories.length);
            console.log('  - Saved:', markedSavedStories.length);
            console.log('  - Unique API:', uniqueApiStories.length);

            allStories = await this.#applyFiltersAndSort(allStories);

            console.log('🔄 Refilter - After filter:', allStories.length);

            const storiesWithLocation = allStories.filter(story => story.lat && story.lon);

            if (!this.#view) {
                console.warn('View was destroyed during refilter');
                return;
            }

            this.#view.displayStories(allStories);
            this.#view.displayMapStories(storiesWithLocation);
            this.#updateStoriesCount(allStories);

        } catch (error) {
            console.error('Error refiltering stories:', error);
        } finally {
            if (this.#view) {
                this.#view.hideStoriesLoading?.();
            }
        }
    }

    async refresh() {
        console.log('🔄 Force refresh from API...');

        this.#lastFetchTime = null;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CLEAR_API_CACHE'
            });
        }

        await this.#loadAndDisplayStories();
    }

    async saveStory(storyId) {
        let story = this.#lastApiStories.find(s => s.id === storyId);

        if (!story && navigator.onLine) {
            const response = await this.#model.getStories();

            if (!response.error && response.listStory) {
                story = response.listStory.find(s => s.id === storyId);
            }
        }

        if (!story) {
            throw new Error('Cerita tidak ditemukan');
        }

        await IDBHelper.saveStory(story);
        console.log('✅ Story saved:', storyId);
        await this.#refilterStories();
    }

    async deleteStory(storyId, isPending, isSaved) {
        if (isPending) {
            const tempId = parseInt(storyId.replace('pending-', ''));
            await IDBHelper.deletePendingStory(tempId);
            console.log('✅ Deleted pending story:', tempId);
        } else if (isSaved) {
            await IDBHelper.deleteStory(storyId);
            console.log('✅ Deleted saved story:', storyId);
        }

        await this.#refilterStories();
    }

    async clearSavedStories() {
        await IDBHelper.clearAllStories();
        await IDBHelper.clearPendingStories();

        console.log('✅ All saved and pending stories cleared');

        await this.#refilterStories();
    }
}