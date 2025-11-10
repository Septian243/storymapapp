import RegisterPresenter from './register-presenter';
import Api from '../../data/api';

export default class RegisterPage {
  #presenter = null;

  async render() {
    return `
    <div class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Daftar Akun</h1>
        <p class="auth-subtitle">Buat akun baru untuk mulai berbagi cerita</p>
        
        <div id="register-loading" class="auth-loading" style="display: none;" role="status" aria-live="polite">
          Memproses pendaftaran...
        </div>

        <div id="register-error" class="auth-error" style="display: none;" role="alert" aria-live="assertive"></div>
        
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="name" class="form-label">Nama Lengkap</label>
            <input 
              type="text" 
              id="name" 
              class="form-input" 
              placeholder="Masukkan nama lengkap"
              required
              minlength="3"
              maxlength="50"
              aria-required="true"
              aria-describedby="name-error" 
              aria-invalid="false"
            >
            <div class="form-error" id="name-error"></div>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input 
              type="email" 
              id="email" 
              class="form-input" 
              placeholder="nama@email.com"
              required
              aria-required="true"
              aria-describedby="email-error" 
              aria-invalid="false"
            >
            <div class="form-error" id="email-error"></div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input 
              type="password" 
              id="password" 
              class="form-input" 
              placeholder="Minimal 6 karakter"
              required
              minlength="6"
              aria-required="true"
              aria-describedby="password-error" 
              aria-invalid="false"
            >
            <div class="form-error" id="password-error"></div>
          </div>

          <div class="form-group">
            <label for="confirm-password" class="form-label">Konfirmasi Password</label>
            <input 
              type="password" 
              id="confirm-password" 
              class="form-input" 
              placeholder="Ulangi password"
              required
              aria-required="true"
              aria-describedby="confirm-error" 
              aria-invalid="false"
            >
            <div class="form-error" id="confirm-password-error"></div>
          </div>

          <button type="submit" class="submit-button auth-button" id="submit-button">
            Daftar
          </button>
        </form>

        <div class="auth-link">
          Sudah punya akun? <a href="#/login" class="link">Login di sini</a>
        </div>

        <div id="register-success" class="auth-success" style="display: none;"></div>
      </div>
    </div>
  `;
  }

  async afterRender() {
    this.#presenter = new RegisterPresenter({
      view: this,
      model: Api
    });

    await this.#presenter.show();
  }

  getFormData() {
    return {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirm-password').value
    };
  }

  clearForm() {
    document.getElementById('register-form').reset();
  }

  clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('.form-input').forEach(input => input.classList.remove('error'));
    this.#hideGlobalError();
    this.#hideSuccessMessage();
  }

  showFieldError(field, message) {
    const errorElement = document.getElementById(`${field}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      const input = document.getElementById(field);
      if (input) input.classList.add('error');
    }
  }

  clearFieldErrors() {
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('.form-input').forEach(input => input.classList.remove('error'));
  }

  setSubmitButtonState(loading) {
    const button = document.getElementById('submit-button');
    if (button) {
      button.disabled = loading;
      button.textContent = loading ? 'Memproses...' : 'Daftar';
    }
  }

  showLoading() {
    const loading = document.getElementById('register-loading');
    if (loading) loading.style.display = 'block';
    this.setSubmitButtonState(true);
  }

  hideLoading() {
    const loading = document.getElementById('register-loading');
    if (loading) loading.style.display = 'none';
    this.setSubmitButtonState(false);
  }

  showGlobalError(message) {
    const errorEl = document.getElementById('register-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  #hideGlobalError() {
    const errorEl = document.getElementById('register-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  showSuccessMessage(message) {
    const successEl = document.getElementById('register-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
      successEl.className = 'auth-success';
    }
  }

  #hideSuccessMessage() {
    const successEl = document.getElementById('register-success');
    if (successEl) successEl.style.display = 'none';
  }

  setupFormEvents(onSubmit) {
    const form = document.getElementById('register-form');
    if (form) {
      form.replaceWith(form.cloneNode(true));

      const newForm = document.getElementById('register-form');
      newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await onSubmit();
      });

      newForm.addEventListener('input', (e) => {
        if (e.target.matches('.form-input')) {
          this.clearFieldErrors();
          this.#hideGlobalError();
        }
      });

      const passwordInput = document.getElementById('password');
      const confirmPasswordInput = document.getElementById('confirm-password');

      if (passwordInput && confirmPasswordInput) {
        const validatePasswords = () => {
          const password = passwordInput.value;
          const confirmPassword = confirmPasswordInput.value;

          if (confirmPassword && password !== confirmPassword) {
            this.showFieldError('confirmPassword', 'Konfirmasi password tidak sesuai');
          } else {
            this.clearFieldErrors();
          }
        };

        passwordInput.addEventListener('input', validatePasswords);
        confirmPasswordInput.addEventListener('input', validatePasswords);
      }
    }
  }

  redirectToLogin() {
    window.location.hash = '#/login';
  }

  focusFirstField() {
    const nameInput = document.getElementById('name');
    if (nameInput) nameInput.focus();
  }
}