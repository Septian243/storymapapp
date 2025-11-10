export default class Auth {
    static #TOKEN_KEY = 'story-app-token';
    static #USER_KEY = 'story-app-user';
    static #REDIRECT_KEY = 'story-app-redirect';

    static saveAuthData(token, user) {
        localStorage.setItem(this.#TOKEN_KEY, token);
        localStorage.setItem(this.#USER_KEY, JSON.stringify(user));
    }

    static getToken() {
        return localStorage.getItem(this.#TOKEN_KEY);
    }

    static getUser() {
        const user = localStorage.getItem(this.#USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static isLoggedIn() {
        return !!this.getToken();
    }

    static logout() {
        localStorage.removeItem(this.#TOKEN_KEY);
        localStorage.removeItem(this.#USER_KEY);
        localStorage.removeItem(this.#REDIRECT_KEY);
    }

    static getAuthHeader() {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    static saveRedirectUrl(url) {
        localStorage.setItem(this.#REDIRECT_KEY, url);
    }

    static getRedirectUrl() {
        return localStorage.getItem(this.#REDIRECT_KEY) || '#/';
    }

    static clearRedirectUrl() {
        localStorage.removeItem(this.#REDIRECT_KEY);
    }
}
