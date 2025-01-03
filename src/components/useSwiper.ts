import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { onUnmounted, ref, watchEffect } from 'vue';

type Options = {
  loop: boolean;
  direction?: 'horizontal' | 'vertical';
};

export const useSwiper = (options?: Options) => {
  const swiperRef = ref<Swiper>();
  const elementRef = ref<HTMLElement>();
  const activeIndex = ref<number>(0);

  const prevClick = () => {
    if (!swiperRef.value) return;
    swiperRef.value.slidePrev();
  };

  const nextClick = () => {
    if (!swiperRef.value) return;
    swiperRef.value.slideNext();
  };

  const bulletClick = (index: number) => {
    if (!swiperRef.value) return;
    swiperRef.value.slideTo(index, 400);
  };

  const onActiveIndexChange = () => {
    if (!swiperRef.value) return;

    activeIndex.value = swiperRef.value.activeIndex;
  };

  watchEffect(() => {
    if (swiperRef.value) return;
    if (!elementRef.value) return;

    const swiper = new Swiper(elementRef.value as HTMLElement, {
      loop: options?.loop ?? false,
      direction: options?.direction ?? 'horizontal',
      modules: [Pagination],
      pagination: {
        el: '.swiper-pagination',
      },
    });
    swiper.on('activeIndexChange', onActiveIndexChange);
    swiperRef.value = swiper;
  });

  onUnmounted(() => {
    if (swiperRef.value) {
      swiperRef.value?.off('activeIndexChange', onActiveIndexChange);
      swiperRef.value.destroy();
    }
  });

  return {
    swiperRef,
    elementRef,
    activeIndex,
    prevClick,
    nextClick,
    bulletClick,
  };
};
