import { mount } from '@vue/test-utils';
// @ts-ignore
import TestPlugin from '@/views/dev/TestPlugin.vue';
import { describe, expect, test } from 'vitest';

describe('TestPlugin.vue', () => {
  test('renders TestPlugin', () => {
    const wrapper = mount(TestPlugin);
    expect(wrapper.text()).toMatch('');
  });
});
