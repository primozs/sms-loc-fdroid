import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import ContactsTabsView from '@/views/contacts/ContactsTabsView.vue';
import { getPresentationHasBeenViewed } from '@/views/presentation/usePresentation';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    redirect: '/contacts',
  },
  {
    path: '/contacts/',
    component: ContactsTabsView,
    children: [
      {
        path: '',
        name: 'contacts-list',
        redirect: '/contacts/list',
      },
      {
        path: 'list',
        component: () => import('@/views/contacts/ContactsView.vue'),
      },
      {
        path: 'list/:id',
        component: () => import('@/views/contacts/ContactDetailView.vue'),
      },
      {
        path: 'list/map/:id',
        component: () => import('@/views/contacts/ResponseMapView.vue'),
      },
      {
        path: 'map',
        component: () => import('@/views/map/MapView.vue'),
      },
      {
        path: 'settings',
        component: () => import('@/views/settings/SettingsView.vue'),
      },
    ],
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('@/views/SupportView.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
  },
  {
    path: '/terms-of-use',
    name: 'terms-of-use',
    component: () => import('@/views/TermsOfUseView.vue'),
  },
  {
    path: '/logs',
    name: 'logs',
    component: () => import('@/views/logs/LogsView.vue'),
  },
  {
    path: '/presentation',
    name: 'presentation',
    component: () => import('@/views/presentation/PresentationView.vue'),
  },
  {
    path: '/dev',
    name: 'dev',
    component: () => import('@/views/dev/DevView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  // start application route guard
  if (
    to.redirectedFrom &&
    to.fullPath === '/contacts/list' &&
    to.redirectedFrom.name === 'home'
  ) {
    const presBeenViewed = await getPresentationHasBeenViewed();
    if (!presBeenViewed) {
      next({ path: '/presentation' });
      return;
    }
  }

  next();
});

export default router;
