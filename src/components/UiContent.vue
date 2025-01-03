<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    class?: string;
    // fullscreen?: boolean;
    overflowYAuto?: boolean;
    scrollY?: boolean;
    border?: 'top' | 'right' | 'bottom' | 'left' | undefined;
    color?: 'base' | 'light';
  }>(),
  {
    color: 'base',
    overflowYAuto: true,
    // fullscreen: true,
    scrollY: false,
  },
);
</script>

<template>
  <div
    :class="[
      `
        ui-content
        w-full
        h-full
 
        flex flex-col justify-between                
        border-gray-200 dark:border-white/10 
      `,
      props.color === 'base' && 'bg-white dark:bg-gray-900',
      props.color === 'light' && 'bg-light-70 dark:bg-gray-800',
      {
        'border-t': props.border === 'top',
        'border-r': props.border === 'right',
        'border-b': props.border === 'bottom',
        'border-l': props.border === 'left',
      },
      {
        'overflow-y-auto': props.scrollY,
      },
    ]"
  >
    <div class="flex-grow-0 flex-shrink basis-auto">
      <slot name="start"></slot>
    </div>

    <div
      :class="[
        `
        flex-grow flex-shrink basis-auto         
        relative scrollbar-thin scrollbar-thumb-rounded-full
        `,
        {
          'overflow-y-auto': props.overflowYAuto,
        },
        props.class && props.class,
      ]"
    >
      <slot></slot>
    </div>

    <div class="flex-grow-0 flex-shrink basis-auto">
      <slot name="end"></slot>
    </div>
  </div>
</template>
