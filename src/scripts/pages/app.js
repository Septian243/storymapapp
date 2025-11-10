import routes from '../routes/routes.js';
import {
  getActivePathname,
  getActiveRoute,
  parseActivePathname,
  getRoute,
} from '../routes/url-parser.js';
import Auth from '../utils/auth.js';
import Swal from 'sweetalert2';

export default class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #authLinks = null;
  #navList = null;
  #isTransitioning = false;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#authLinks = document.getElementById('auth-links');
    this.#navList = document.getElementById('nav-list');

    this.#setupDrawer();
    this.#initialUIUpdate();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#toggleDrawer();
    });

    this.#drawerButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#toggleDrawer();
      }
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#navigationDrawer.classList.contains('open')) {
        this.#toggleDrawer();
        this.#drawerButton.focus();
      }
    });
  }

  #toggleDrawer() {
    const isOpen = this.#navigationDrawer.classList.toggle('open');
    this.#drawerButton.setAttribute('aria-expanded', isOpen.toString());

    if (isOpen) {
      const firstLink = this.#navigationDrawer.querySelector('a');
      if (firstLink) firstLink.focus();
    }
  }

  #initialUIUpdate() {
    this.#updateAuthUI();
    this.#updateMenuVisibility();
    this.#updateNotifButtonUI();
  }

  #updateAuthUI() {
    if (!this.#authLinks) return;

    if (Auth.isLoggedIn()) {
      this.#authLinks.innerHTML = `
        <li><a href="#" id="logout-link">Logout</a></li>
      `;

      const logoutLink = document.getElementById('logout-link');
      if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
          e.preventDefault();
          this.#handleLogout();
        });
      }
    } else {
      this.#authLinks.innerHTML = `
        <li><a href="#/login">Login</a></li>
        <li><a href="#/register">Daftar</a></li>
      `;
    }
  }

  #updateNotifButtonUI() {
    const notifItem = document.getElementById('notif-nav-item');
    if (!notifItem) return;

    if (Auth.isLoggedIn()) {
      notifItem.style.display = 'inline-block';
    } else {
      notifItem.style.display = 'none';
    }
  }

  #updateMenuVisibility() {
    if (this.#navList) {
      const currentPath = getActivePathname();
      const isPublicRoute = this.#isPublicRoute(currentPath);

      if (isPublicRoute) {
        this.#navList.style.display = 'none';
        return;
      }

      const isDesktop = window.matchMedia('(min-width: 1000px)').matches;
      if (isDesktop) {
        this.#navList.style.display = 'flex';
      } else {
        this.#navList.style.display = Auth.isLoggedIn() ? 'flex' : 'none';
      }
    }
  }

  async #handleLogout() {
    const result = await Swal.fire({
      title: 'Konfirmasi Logout',
      text: 'Apakah Anda yakin ingin keluar dari akun?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      Auth.logout();
      this.#updateAuthUI();
      this.#updateMenuVisibility();
      this.#updateNotifButtonUI();

      await Swal.fire({
        icon: 'success',
        title: 'Logout Berhasil',
        text: 'Anda telah keluar dari akun.',
        timer: 1500,
        showConfirmButton: false,
      });

      window.location.hash = '#/login';
    }
  }

  #isPublicRoute(url) {
    const publicRoutes = ['/login', '/register'];
    return publicRoutes.includes(url);
  }

  async #performViewTransition(updateCallback) {
    if (!document.startViewTransition) {
      await updateCallback();
      return;
    }

    if (this.#isTransitioning) {
      await updateCallback();
      return;
    }

    this.#isTransitioning = true;

    try {
      const transition = document.startViewTransition(async () => {
        await updateCallback();
      });

      await transition.finished;
    } catch (error) {
      console.error('View transition error:', error);
      await updateCallback();
    } finally {
      this.#isTransitioning = false;
    }
  }

  async renderPage() {
    await this.#performViewTransition(async () => {
      const currentPath = getActivePathname();
      const parsedUrl = parseActivePathname();
      const routeKey = getRoute(currentPath);
      const PageClass = routes[routeKey];

      if (!Auth.isLoggedIn() && !this.#isPublicRoute(currentPath)) {
        Auth.saveRedirectUrl(`#${currentPath}`);
        window.location.hash = '#/login';
        return;
      }

      if (Auth.isLoggedIn() && this.#isPublicRoute(currentPath)) {
        const redirectUrl = Auth.getRedirectUrl();
        Auth.clearRedirectUrl();
        window.location.hash = redirectUrl || '#/';
        return;
      }

      if (PageClass) {
        const page = new PageClass({ params: parsedUrl });
        this.#content.innerHTML = await page.render();
        await page.afterRender?.();
      } else {
        this.#content.innerHTML = `<h2>404 - Halaman tidak ditemukan</h2>`;
      }

      this.#resetScrollPosition();

      this.#updateMenuVisibility();
      this.#updateAuthUI();
      this.#updateNotifButtonUI();
    });
  }

  #resetScrollPosition() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (this.#content) this.#content.scrollTop = 0;
  }
}
