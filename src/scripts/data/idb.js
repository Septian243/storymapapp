import { openDB } from 'idb';

const DB_NAME = 'story-app-db';
const DB_VERSION = 1;
const STORE_NAME = 'stories';
const PENDING_STORE = 'pending-stories';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const storyStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            storyStore.createIndex('createdAt', 'createdAt', { unique: false });
            storyStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains(PENDING_STORE)) {
            const pendingStore = db.createObjectStore(PENDING_STORE, {
                keyPath: 'tempId',
                autoIncrement: true
            });
            pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
    },
});

const IDBHelper = {
    async getAllStories() {
        const db = await dbPromise;
        return db.getAll(STORE_NAME);
    },

    async getStoryById(id) {
        const db = await dbPromise;
        return db.get(STORE_NAME, id);
    },

    async saveStory(story) {
        const db = await dbPromise;
        return db.put(STORE_NAME, story);
    },

    async deleteStory(id) {
        const db = await dbPromise;
        return db.delete(STORE_NAME, id);
    },

    async clearAllStories() {
        const db = await dbPromise;
        return db.clear(STORE_NAME);
    },

    async isStorySaved(id) {
        const db = await dbPromise;
        const story = await db.get(STORE_NAME, id);
        return !!story;
    },

    async getSavedStoryIds() {
        const stories = await this.getAllStories();
        return stories.map(s => s.id);
    },

    async searchStories(query) {
        const stories = await this.getAllStories();
        const lowerQuery = query.toLowerCase();

        return stories.filter(story =>
            story.name?.toLowerCase().includes(lowerQuery) ||
            story.description?.toLowerCase().includes(lowerQuery)
        );
    },

    async sortStories(sortBy = 'createdAt', order = 'desc') {
        const stories = await this.getAllStories();

        return stories.sort((a, b) => {
            let comparison = 0;

            if (sortBy === 'createdAt') {
                comparison = new Date(a.createdAt) - new Date(b.createdAt);
            } else if (sortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            }

            return order === 'desc' ? -comparison : comparison;
        });
    },

    async filterStories(filterFn) {
        const stories = await this.getAllStories();
        return stories.filter(filterFn);
    },

    async savePendingStory(storyData) {
        const db = await dbPromise;
        const pendingStory = {
            ...storyData,
            createdAt: new Date().toISOString(),
            synced: false
        };

        const id = await db.add(PENDING_STORE, pendingStory);
        return { ...pendingStory, tempId: id };
    },

    async getAllPendingStories() {
        const db = await dbPromise;
        return db.getAll(PENDING_STORE);
    },

    async deletePendingStory(tempId) {
        const db = await dbPromise;
        return db.delete(PENDING_STORE, tempId);
    },

    async clearPendingStories() {
        const db = await dbPromise;
        return db.clear(PENDING_STORE);
    },

    async syncPendingStories(apiInstance) {
        try {
            const pendingStories = await this.getAllPendingStories();

            if (pendingStories.length === 0) {
                return { success: true, synced: 0 };
            }

            const results = [];

            for (const pendingStory of pendingStories) {
                try {
                    const formData = new FormData();
                    formData.append('description', pendingStory.description);

                    if (pendingStory.photoBlob) {
                        formData.append('photo', pendingStory.photoBlob, 'photo.jpg');
                    }

                    if (pendingStory.lat && pendingStory.lon) {
                        formData.append('lat', pendingStory.lat);
                        formData.append('lon', pendingStory.lon);
                    }

                    const response = await apiInstance.addStory(formData);

                    if (!response.error) {
                        await this.deletePendingStory(pendingStory.tempId);
                        results.push({ success: true, tempId: pendingStory.tempId });
                    }
                } catch (error) {
                    console.error('Failed to sync story:', error);
                    results.push({
                        success: false,
                        tempId: pendingStory.tempId,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;

            return {
                success: successCount > 0,
                synced: successCount,
                failed: results.length - successCount,
                total: results.length
            };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: error.message };
        }
    },

    async hasPendingStories() {
        const pending = await this.getAllPendingStories();
        return pending.length > 0;
    }
};

export default IDBHelper;