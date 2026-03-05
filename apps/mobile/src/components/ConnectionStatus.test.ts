import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectionStatus from './ConnectionStatus.vue';

describe('ConnectionStatus.vue', () => {
  it('renders Connected state normally', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: true,
        queuedCount: 0,
        hasPermanentError: false,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Connected');
    expect(wrapper.find('.ok').exists()).toBe(true);
    // Should NOT have retry button or queued count
    expect(wrapper.text()).not.toContain('queued');
    expect(wrapper.find('.tiny-btn').exists()).toBe(false);
  });

  it('renders Offline state', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: false,
        queuedCount: 0,
        hasPermanentError: false,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Offline');
    expect(wrapper.find('.danger').exists()).toBe(true);
  });

  it('renders Reconnecting state (warning yellow, pulsing)', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: false,
        queuedCount: 0,
        hasPermanentError: false,
        isReconnecting: true
      }
    });

    expect(wrapper.text()).toContain('Reconnecting...');
    expect(wrapper.find('.warning').exists()).toBe(true);
    expect(wrapper.find('.pulsing').exists()).toBe(true);
  });

  it('renders Reconnect failed state with Try reconnect button', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: false,
        queuedCount: 5,
        hasPermanentError: true,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Reconnect failed');
    expect(wrapper.text()).toContain('5 queued');
    
    const btn = wrapper.find('button.tiny-btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('Try reconnect');

    await btn.trigger('click');
    expect(wrapper.emitted('reconnect')).toBeTruthy();
  });

  it('renders Offline with flush Retry button when queued > 0 but online', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: true,
        queuedCount: 3,
        hasPermanentError: false,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Connected');
    expect(wrapper.text()).toContain('3 queued');

    const btn = wrapper.find('button.tiny-btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('Retry');

    await btn.trigger('click');
    expect(wrapper.emitted('flush')).toBeTruthy();
  });
});
