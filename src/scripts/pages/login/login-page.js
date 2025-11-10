import LoginPresenter from './login-presenter';
import Api from '../../data/api';

export default class LoginPage {
  #presenter = null;

  async render() {
    return `
    <section class="auth-container">
      <div class="auth-card">
        <h1 class="auth-title">Masuk</h1>
        <p class="auth-subtitle">Silakan masuk untuk melanjutkan</p>

        <div id="login-loading" class="auth-loading" style="display: none;" role="status" aria-live="polite">
          Memproses login...
        </div>
        
        <div id="login-error" class="auth-error" style="display: none;" role="alert" aria-live="assertive"></div>
        
        <form id="login-form" class="auth-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input 
              id="email" 
              type="email" 
              class="form-input" 
              required 
              aria-required="true"
              aria-describedby="email-error"
              aria-invalid="false"
              placeholder="contoh@email.com"
            />
            <small id="email-error" class="form-error" role="alert"></small>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              id="password" 
              type="password" 
              class="form-input" 
              required 
              aria-required="true"
              aria-describedby="password-error"
              aria-invalid="false"
              placeholder="Masukkan password"
            />
            <small id="password-error" class="form-error" role="alert"></small>
          </div>

          <button id="login-button" class="submit-button auth-button" type="submit">
            Login
          </button>
        </form>

        <p class="auth-link">
          Belum punya akun?
          <a href="#/register" class="link">Daftar sekarang</a>
        </p>

        <div id="login-success" class="auth-success" style="display: none;" role="status" aria-live="polite"></div>
      </div>
    </section>
  `;
  }

  async afterRender() {
    this.#presenter = new LoginPresenter({
      view: this,
      model: Api
    });

    await this.#presenter.show();
  }

  getFormData() {
    return {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    };
  }

  clearForm() {
    document.getElementById('login-form').reset();
  }

  clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
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
    const button = document.getElementById('login-button');
    if (button) {
      button.disabled = loading;
      button.textContent = loading ? 'Memproses...' : 'Login';
    }
  }

  showLoading() {
    const loading = document.getElementById('login-loading');
    if (loading) loading.style.display = 'block';
    this.setSubmitButtonState(true);
  }

  hideLoading() {
    const loading = document.getElementById('login-loading');
    if (loading) loading.style.display = 'none';
    this.setSubmitButtonState(false);
  }

  showGlobalError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  #hideGlobalError() {
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  showSuccessMessage(message) {
    const successEl = document.getElementById('login-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
      successEl.className = 'auth-success';
    }
  }

  #hideSuccessMessage() {
    const successEl = document.getElementById('login-success');
    if (successEl) successEl.style.display = 'none';
  }

  setupFormEvents(onSubmit) {
    const form = document.getElementById('login-form');
    if (form) {

      form.replaceWith(form.cloneNode(true));

      const newForm = document.getElementById('login-form');
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
    }
  }

  redirectTo(path) {
    window.location.hash = path;
  }

  focusFirstField() {
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.focus();
  }
}