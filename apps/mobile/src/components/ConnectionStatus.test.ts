import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectionStatus from './ConnectionStatus.vue';

describe('ConnectionStatus.vue', () => {
  it('renders Connected state normally', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: true,
        hasNetwork: true,
        queuedCount: 0,
        hasPermanentError: false,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Connected');
    expect(wrapper.find('.ok').exists()).toBe(true);
    // Should NOT have retry button or queued count
    expect(wrapper.text()).not.toContain('queued');
    expect(wrapper.find('button.action-btn').exists()).toBe(false);
  });

  it('renders Offline state', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: false,
        hasNetwork: false,
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
        hasNetwork: true,
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
        hasNetwork: true,
        queuedCount: 5,
        hasPermanentError: true,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Reconnect failed');
    expect(wrapper.text()).toContain('5 queued');

    const retryBtn = wrapper.find('button.bg-retry');
    expect(retryBtn.exists()).toBe(true);
    expect(retryBtn.text()).toBe('Retry sends');

    const reconnectBtn = wrapper.find('button.bg-reconnect');
    expect(reconnectBtn.exists()).toBe(true);
    expect(reconnectBtn.text()).toBe('Try reconnect');

    await reconnectBtn.trigger('click');
    expect(wrapper.emitted('reconnect')).toBeTruthy();
  });

  it('renders Offline with flush Retry button when queued > 0 but online', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        isOnline: false,
        hasNetwork: true,
        queuedCount: 3,
        hasPermanentError: false,
        isReconnecting: false
      }
    });

    expect(wrapper.text()).toContain('Realtime offline');
    expect(wrapper.text()).toContain('3 queued');
    expect(wrapper.find('.warning').exists()).toBe(true);

    const btn = wrapper.find('button.action-btn');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('Retry sends');

    await btn.trigger('click');
    expect(wrapper.emitted('flush')).toBeTruthy();
  });
});
