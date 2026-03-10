import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectionStatus from './ConnectionStatus.vue';

const baseDiagnostics = {
  transport: 'unknown' as const,
  lastError: null,
  lastDisconnectReason: null,
  lastConnectedAt: null,
  fallbackActive: false
};

describe('ConnectionStatus.vue', () => {
  it('renders Connected state normally', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'connected',
        hasNetwork: true,
        queuedCount: 0,
        diagnostics: baseDiagnostics
      }
    });

    expect(wrapper.text()).toContain('Connected');
    expect(wrapper.find('.ok').exists()).toBe(true);
    expect(wrapper.find('button.action-btn').exists()).toBe(false);
  });

  it('renders Offline state when network is unavailable', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'idle',
        hasNetwork: false,
        queuedCount: 0,
        diagnostics: baseDiagnostics
      }
    });

    expect(wrapper.text()).toContain('Offline');
    expect(wrapper.find('.danger').exists()).toBe(true);
  });

  it('renders Reconnecting state as a warning with pulse indicator', () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'connecting',
        hasNetwork: true,
        queuedCount: 0,
        diagnostics: baseDiagnostics
      }
    });

    expect(wrapper.text()).toContain('Reconnecting...');
    expect(wrapper.find('.warning').exists()).toBe(true);
    expect(wrapper.find('.pulsing').exists()).toBe(true);
  });

  it('renders Reconnect failed with retry actions', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'failed',
        hasNetwork: true,
        queuedCount: 5,
        diagnostics: {
          ...baseDiagnostics,
          lastError: 'reconnect_failed',
          fallbackActive: true
        }
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

  it('renders degraded realtime with flush action when queued messages exist', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'degraded',
        hasNetwork: true,
        queuedCount: 3,
        diagnostics: {
          ...baseDiagnostics,
          fallbackActive: true
        }
      }
    });

    expect(wrapper.text()).toContain('Realtime offline');
    expect(wrapper.text()).toContain('3 queued');
    expect(wrapper.find('.warning').exists()).toBe(true);

    const btn = wrapper.find('button.bg-retry');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe('Retry sends');

    await btn.trigger('click');
    expect(wrapper.emitted('flush')).toBeTruthy();
  });

  it('shows diagnostics only when debug mode is enabled and toggled open', async () => {
    const wrapper = mount(ConnectionStatus, {
      props: {
        realtimeState: 'degraded',
        hasNetwork: true,
        queuedCount: 1,
        diagnostics: {
          transport: 'polling',
          lastError: 'xhr poll error',
          lastDisconnectReason: 'transport close',
          lastConnectedAt: '2026-03-09T12:00:00.000Z',
          fallbackActive: true
        },
        debugEnabled: true
      }
    });

    expect(wrapper.find('.diagnostic-panel').exists()).toBe(false);

    await wrapper.find('button.debug-toggle').trigger('click');

    expect(wrapper.find('.diagnostic-panel').exists()).toBe(true);
    expect(wrapper.text()).toContain('State');
    expect(wrapper.text()).toContain('degraded');
    expect(wrapper.text()).toContain('Transport');
    expect(wrapper.text()).toContain('polling');
    expect(wrapper.text()).toContain('Fallback');
    expect(wrapper.text()).toContain('Active');
    expect(wrapper.text()).toContain('xhr poll error');
    expect(wrapper.text()).toContain('transport close');
    expect(wrapper.text()).toContain('Connected');
    expect(wrapper.text()).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});
