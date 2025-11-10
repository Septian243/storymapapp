export default class DetailPresenter {
    #view;
    #model;

    constructor({ view, model }) {
        this.#view = view;
        this.#model = model;
    }

    async showDetail(storyId) {
        try {
            this.#view.showLoading();

            const result = await this.#model.getStoryById(storyId);

            this.#view.hideLoading();

            if (result.error) {
                console.error('API Error:', result.message);

                if (result.message.includes('404') || result.message.includes('tidak ditemukan')) {
                    this.#view.showError('Cerita tidak ditemukan. ID mungkin tidak valid.');
                } else if (result.message.includes('401') || result.message.includes('token')) {
                    this.#view.showError('Sesi login telah berakhir. Silakan login kembali.');
                    setTimeout(() => {
                        window.location.hash = '#/login';
                    }, 2000);
                } else {
                    this.#view.showError(result.message || 'Gagal memuat detail cerita');
                }
                return;
            }

            if (!result.data) {
                this.#view.showError('Data cerita tidak ditemukan dalam response');
                return;
            }

            console.log('Story data received:', result.data);
            this.#view.displayStoryDetail(result.data);
        } catch (err) {
            console.error('DetailPresenter error:', err);
            this.#view.hideLoading();
            this.#view.showError('Terjadi kesalahan sistem: ' + err.message);
        }
    }
}