import CONFIG from '../config';
import Auth from '../utils/auth';

const ENDPOINTS = {
  LOGIN: `${CONFIG.BASE_URL}/login`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORY_BY_ID: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
};

class Api {
  // ===== LOGIN =====
  static async login({ email, password }) {
    try {
      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      return {
        error: !response.ok,
        message: data.message || (response.ok ? 'Login berhasil' : 'Login gagal'),
        loginResult: data.loginResult,
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal menghubungi server',
        loginResult: null,
      };
    }
  }

  // ===== REGISTER =====
  static async register({ name, email, password }) {
    try {
      const response = await fetch(ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      return {
        error: !response.ok,
        message: data.message || (response.ok ? 'Registrasi berhasil' : 'Registrasi gagal'),
        user: data.user,
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal menghubungi server',
        user: null,
      };
    }
  }

  // ===== GET STORIES =====
  static async getStories() {
    try {
      const response = await fetch(ENDPOINTS.STORIES, {
        headers: {
          ...Auth.getAuthHeader(),
        },
      });
      const data = await response.json();

      return {
        error: !response.ok,
        message: data.message || (response.ok ? 'Stories loaded successfully' : 'Failed to load stories'),
        listStory: data.listStory || [],
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal memuat cerita',
        listStory: [],
      };
    }
  }

  // ===== ADD STORY =====
  static async addStory(formData) {
    try {
      const response = await fetch(ENDPOINTS.STORIES, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Auth.getToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      return {
        error: !response.ok,
        message: data.message || (response.ok ? 'Cerita berhasil ditambahkan' : 'Gagal menambah cerita'),
        story: data.story,
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal menambah cerita',
        story: null,
      };
    }
  }

  static async getStoryById(id) {
    try {
      const endpointUrl = ENDPOINTS.STORY_BY_ID(id);
      const response = await fetch(endpointUrl, {
        headers: {
          ...Auth.getAuthHeader(),
        },
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        return {
          error: true,
          message: data.message || `Gagal memuat cerita (${response.status})`,
          data: null,
        };
      }

      return {
        error: false,
        message: 'Berhasil memuat detail cerita',
        data: data.story,
      };
    } catch (error) {
      console.error('API getStoryById error:', error);
      return {
        error: true,
        message: 'Network error: Gagal memuat detail cerita',
        data: null,
      };
    }
  }

  // ===== GET CURRENT USER =====
  static async getCurrentUser() {
    const token = Auth.getToken();
    const user = Auth.getUser();

    if (!token || !user) {
      return null;
    }

    return { ...user, token };
  }

  // ===== SUBSCRIBE PUSH NOTIFICATION =====
  static async subscribeNotification({ endpoint, keys, token }) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint,
          keys,
        }),
      });

      const data = await response.json();
      return {
        error: !response.ok,
        message:
          data.message ||
          (response.ok
            ? 'Berhasil berlangganan notifikasi'
            : 'Gagal berlangganan notifikasi'),
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal mengirim langganan notifikasi',
      };
    }
  }

  // ===== UNSUBSCRIBE PUSH NOTIFICATION =====
  static async unsubscribeNotification({ endpoint, token }) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });

      const data = await response.json();
      return {
        error: !response.ok,
        message:
          data.message ||
          (response.ok
            ? 'Berhasil berhenti langganan notifikasi'
            : 'Gagal berhenti langganan notifikasi'),
      };
    } catch (error) {
      return {
        error: true,
        message: 'Network error: Gagal berhenti langganan notifikasi',
      };
    }
  }
}

export default Api;
