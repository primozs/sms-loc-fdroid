<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    class?: string;
    overflowYAuto?: boolean;
    scrollY?: boolean;
    border?: 'top' | 'right' | 'bottom' | 'left' | undefined;
    color?: 'base' | 'light';
  }>(),
  {
    color: 'base',
    overflowYAuto: true,
    scrollY: false,
  },
);
</script>

<template>
  <div
    class="ui-content"
    :class="[
      `ui-content--${props.color}`,
      props.border && `ui-content--border-${props.border}`,
      { 'ui-content--scroll': props.scrollY },
    ]"
  >
    <div class="ui-content__slot">
      <slot name="start"></slot>
    </div>

    <div
      class="ui-content__main"
      :class="[
        { 'ui-content__main--scroll': props.overflowYAuto },
        props.class,
      ]"
    >
      <slot></slot>
    </div>

    <div class="ui-content__slot">
      <slot name="end"></slot>
    </div>
  </div>
</template>

<style scoped>
.ui-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-color: var(--ion-border-color, rgba(0, 0, 0, 0.12));
}
.ui-content--base {
  background: var(--ion-background-color, #fff);
}
.ui-content--light {
  background: var(--ion-color-step-50, var(--ion-color-light));
}
.ui-content--border-top {
  border-top: 1px solid var(--ion-border-color);
}
.ui-content--border-right {
  border-right: 1px solid var(--ion-border-color);
}
.ui-content--border-bottom {
  border-bottom: 1px solid var(--ion-border-color);
}
.ui-content--border-left {
  border-left: 1px solid var(--ion-border-color);
}
.ui-content--scroll {
  overflow-y: auto;
}
.ui-content__slot {
  flex: 0 0 auto;
}
.ui-content__main {
  flex: 1 1 auto;
  position: relative;
  min-height: 0;
}
.ui-content__main--scroll {
  overflow-y: auto;
}
</style>
