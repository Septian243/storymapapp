import Auth from '../../utils/auth';

export default class RegisterPresenter {
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

        this.#view.setupFormEvents(() => this.#handleRegister());
        this.#view.focusFirstField();
    }

    async #handleRegister() {
        this.#view.clearErrors();

        const formData = this.#view.getFormData();
        const validation = this.#validateForm(formData);

        if (!validation.isValid) {
            this.#showValidationErrors(validation.errors);
            return;
        }

        this.#view.showLoading();

        try {
            const response = await this.#model.register({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });

            if (!response.error) {
                await this.#handleRegisterSuccess(response);
            } else {
                this.#handleRegisterError(response);
            }

        } catch (error) {
            console.error('Register error:', error);
            this.#view.showGlobalError('Terjadi kesalahan jaringan. Periksa koneksi internet Anda.');
        } finally {
            this.#view.hideLoading();
        }
    }

    async #handleRegisterSuccess(response) {
        this.#view.showSuccessMessage('✅ Pendaftaran berhasil! Mengalihkan ke halaman login...');
        this.#view.clearForm();

        setTimeout(() => {
            this.#view.redirectToLogin();
        }, 1000);
    }

    #handleRegisterError(response) {
        const errorMessage = response.message || 'Pendaftaran gagal. Silakan coba lagi.';

        if (response.message?.toLowerCase().includes('email')) {
            this.#view.showFieldError('email', errorMessage);
        } else if (response.message?.toLowerCase().includes('nama') || response.message?.toLowerCase().includes('name')) {
            this.#view.showFieldError('name', errorMessage);
        } else if (response.message?.toLowerCase().includes('password')) {
            this.#view.showFieldError('password', errorMessage);
        } else {
            this.#view.showGlobalError(errorMessage);
        }
    }

    #validateForm(formData) {
        const errors = {};

        if (!formData.name || formData.name.trim().length === 0) {
            errors.name = 'Nama wajib diisi';
        } else if (formData.name.length < 3) {
            errors.name = 'Nama minimal 3 karakter';
        } else if (formData.name.length > 50) {
            errors.name = 'Nama maksimal 50 karakter';
        }

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

        if (!formData.confirmPassword || formData.confirmPassword.length === 0) {
            errors.confirmPassword = 'Konfirmasi password wajib diisi';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Konfirmasi password tidak sesuai';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    #isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    #showValidationErrors(errors) {
        Object.keys(errors).forEach(field => {
            this.#view.showFieldError(field, errors[field]);
        });
    }

    #redirectToApp() {
        const redirectUrl = Auth.getRedirectUrl() || '#/';
        Auth.clearRedirectUrl();
        window.location.hash = redirectUrl;
    }
}