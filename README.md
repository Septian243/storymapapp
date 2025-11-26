# Story Map Project with Webpack

Proyek Story Map ini adalah aplikasi web berbasis Webpack dengan struktur modular, mencakup PWA support, routing, data layer menggunakan API & IndexedDB, serta berbagai utilitas untuk kamera, notifikasi, peta, dan background sync. Dirancang untuk mudah dikembangkan dan dioptimalkan untuk production.

## Table of Contents

- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (disarankan versi 12 atau lebih tinggi)
- [npm](https://www.npmjs.com/) (Node package manager)

### Installation

1. Download starter project [di sini](https://codeload.github.com/Septian243/storymapapp/zip/refs/heads/main).
2. Lakukan unzip file.
3. Pasang seluruh dependencies dengan perintah berikut.
   ```shell
   npm install
   ```

## Scripts

- Build for Production:

  ```shell
  npm run build
  ```

  Script ini menjalankan webpack dalam mode production menggunakan konfigurasi `webpack.prod.js` dan menghasilkan sejumlah file build ke direktori `dist`.

- Start Development Server:

  ```shell
  npm run start-dev
  ```

  Script ini menjalankan server pengembangan webpack dengan fitur live reload dan mode development sesuai konfigurasi di`webpack.dev.js`.

- Serve:
  ```shell
  npm run serve
  ```
  Script ini menggunakan [`http-server`](https://www.npmjs.com/package/http-server) untuk menyajikan konten dari direktori `dist`.

## Project Structure

Proyek starter ini dirancang agar kode tetap modular dan terorganisir.

```text
Story-Map/
├── dist/                                              # Compiled files for production
├── src/                                               # Source project files
│   ├── public/                                        # Public files
│   │   ├── images/                                    # Image assets
│   │   │   ├── icons/                                 # App icons
│   │   │   │   ├── logo-96.png
│   │   │   │   ├── logo-192.png
│   │   │   │   └── logo-512.png
│   │   │   └── screenshoot/                           # Screenshots
│   │   │       ├── Screenshot 2025-11-08 224437.png
│   │   │       ├── Screenshot 2025-11-08 224457.png
│   │   │       └── Screenshot 2025-11-08 230314.png
│   │   ├── favicon.png                                # Favicon
│   │   └── manifest.json                              # PWA manifest file
│   ├── scripts/                                       # Source JavaScript files
│   │   ├── data/                                      # Data layer
│   │   │   ├── api.js                                 # API communication
│   │   │   └── idb.js                                 # IndexedDB operations
│   │   ├── pages/                                     # Page modules
│   │   │   ├── add-story/                             # Add story page
│   │   │   │   ├── add-story-page.js
│   │   │   │   └── add-story-presenter.js
│   │   │   ├── detail/                                # Detail page
│   │   │   │   ├── detail-page.js
│   │   │   │   └── detail-presenter.js
│   │   │   ├── home/                                  # Home page
│   │   │   │   ├── home-page.js
│   │   │   │   └── home-presenter.js
│   │   │   ├── login/                                 # Login page
│   │   │   │   ├── login-page.js
│   │   │   │   └── login-presenter.js
│   │   │   ├── register/                              # Register page
│   │   │   │   ├── register-page.js
│   │   │   │   └── register-presenter.js
│   │   │   └── app.js                                 # Main app initialization
│   │   ├── routes/                                    # Routing
│   │   │   ├── routes.js                              # Route definitions
│   │   │   └── url-parser.js                          # URL parser utility
│   │   ├── utils/                                     # Utility functions
│   │   │   ├── auth.js                                # Authentication utilities
│   │   │   ├── camera.js                              # Camera handling
│   │   │   ├── index.js                               # Utility exports
│   │   │   ├── install-prompt.js                      # PWA install prompt
│   │   │   ├── map.js                                 # Map utilities
│   │   │   ├── notification.js                        # Notification handling
│   │   │   ├── push-subscription.js                   # Push notification subscription
│   │   │   ├── sw-register.js                         # Service worker registration
│   │   │   └── sync-manager.js                        # Background sync manager
│   │   ├── config.js                                  # Configuration file
│   │   ├── index.js                                   # Main JavaScript entry file
│   │   └── sw.js                                      # Service worker file
│   ├── styles/                                        # Source CSS files
│   │   ├── responsives.css                            # Responsive styles
│   │   └── styles.css                                 # Main CSS file
│   └── index.html                                     # Main HTML file
├── .gitignore                                         # Git ignore file
├── package.json                                       # Project metadata and dependencies
├── package-lock.json                                  # Dependency lock file
├── README.md                                          # Project documentation
├── STUDENT.txt                                        # Student information
├── webpack.common.js                                  # Webpack common configuration
├── webpack.dev.js                                     # Webpack development configuration
└── webpack.prod.js                                    # Webpack production configuration
```
