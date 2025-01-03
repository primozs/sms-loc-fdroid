import { onMounted, ref } from 'vue';
import { useRouter, type RouteLocationResolvedGeneric } from 'vue-router';

type Options = {
  path: string;
};

export const usePrefetch = ({ path }: Options) => {
  const prefetched = ref(false);
  const router = useRouter();

  const cb: IdleRequestCallback = () => {
    if (prefetched.value) return;

    const route = router.resolve(path);
    const components = getRouteComponents(route);

    for (const Component of components) {
      // @ts-ignore
      Component();
    }
    prefetched.value = true;
  };

  onMounted(() => {
    setTimeout(() => {
      requestIdleCallback(cb, { timeout: 2000 });
    }, 2000);
  });
};

const getRouteComponents = (route: RouteLocationResolvedGeneric) => {
  const components = route.matched
    .map((record) => {
      // @ts-ignore
      const res = Object.values(record.components);
      return res;
    })
    .flat()
    .filter((Component) => {
      // @ts-ignore
      return typeof Component === 'function' && Component.cid === undefined;
    });
  return components;
};
