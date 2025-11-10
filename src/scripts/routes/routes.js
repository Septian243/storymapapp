import HomePage from '../pages/home/home-page.js';
import DetailPage from '../pages/detail/detail-page.js';
import AddStoryPage from '../pages/add-story/add-story-page.js';
import LoginPage from '../pages/login/login-page.js';
import RegisterPage from '../pages/register/register-page.js';

const routes = {
  '/': HomePage,
  '/add-story': AddStoryPage,
  '/detail/:id': DetailPage,
  '/login': LoginPage,
  '/register': RegisterPage,
};

export default routes;
