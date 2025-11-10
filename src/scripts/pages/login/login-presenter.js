import Auth from '../../utils/auth';

export default class LoginPresenter {
    #view;
    #model;

    constructor({ view, model }) {
        this.#view = view;
        this.#model = model;
    }

    async show() {
        if (Auth.isLoggedIn()) {
            this.#redirectToApp();
            return;
        }

        this.#view.setupFormEvents(() => this.#handleLogin());
        this.#view.focusFirstField();
    }

    async #handleLogin() {
        this.#view.clearErrors();
        const formData = this.#view.getFormData();
        const validation = this.#validateForm(formData);

        if (!validation.isValid) {
            this.#showValidationErrors(validation.errors);
            return;
        }

        this.#view.showLoading();

        try {
            const response = await this.#model.login({
                email: formData.email,
                password: formData.password,
            });

            if (!response.error) {
                await this.#handleLoginSuccess(response, formData.email);
            } else {
                this.#handleLoginError(response);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.#view.showGlobalError('Terjadi kesalahan jaringan. Periksa koneksi internet Anda.');
        } finally {
            this.#view.hideLoading();
        }
    }

    async #handleLoginSuccess(response, email) {
        const { token, name, userId } = response.loginResult;

        if (!token) {
            throw new Error('Token tidak ditemukan dalam response');
        }

        Auth.saveAuthData(token, {
            id: userId,
            name,
            email,
        });

        this.#view.showSuccessMessage('Login berhasil! Mengalihkan...');

        setTimeout(() => {
            this.#redirectToApp();
        }, 500);
    }

    #handleLoginError(response) {
        const errorMessage = response.message || 'Login gagal. Periksa email dan password Anda.';

        if (response.message?.toLowerCase().includes('email')) {
            this.#view.showFieldError('email', errorMessage);
        } else if (response.message?.toLowerCase().includes('password')) {
            this.#view.showFieldError('password', errorMessage);
        } else {
            this.#view.showGlobalError(errorMessage);
        }
    }

    #validateForm(formData) {
        const errors = {};

        if (!formData.email || formData.email.trim().length === 0) {
            errors.email = 'Email wajib diisi';
        } else if (!this.#isValidEmail(formData.email)) {
            errors.email = 'Format email tidak valid';
        }

        if (!formData.password || formData.password.length === 0) {
            errors.password = 'Password wajib diisi';
        } else if (formData.password.length < 6) {
            errors.password = 'Password minimal 6 karakter';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
        };
    }

    #isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    #showValidationErrors(errors) {
        Object.keys(errors).forEach((field) => {
            this.#view.showFieldError(field, errors[field]);
        });
    }

    #redirectToApp() {
        const redirectUrl = Auth.getRedirectUrl() || '#/';
        Auth.clearRedirectUrl();
        this.#view.redirectTo(redirectUrl);
    }
}
