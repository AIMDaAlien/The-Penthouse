import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ProfileSettings from './ProfileSettings.vue';
import * as http from '../services/http';
import * as notifications from '../services/notifications';
import * as sessionStorage from '../services/sessionStorage';

vi.mock('../services/http', () => ({
  getMe: vi.fn(() => Promise.resolve({
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    role: 'member',
    mustChangePassword: false,
    mustAcceptTestNotice: false,
    requiredTestNoticeVersion: 'alpha-v1',
    acceptedTestNoticeVersion: 'alpha-v1',
    bio: null,
    avatarMediaId: null
  })),
  getMySessions: vi.fn(() => Promise.resolve([
    {
      id: 'session-current',
      createdAt: '2026-03-21T10:00:00.000Z',
      lastUsedAt: '2026-03-21T12:00:00.000Z',
      deviceLabel: 'Android app',
      appContext: 'android',
      hasPushToken: true,
      current: true
    },
    {
      id: 'session-other',
      createdAt: '2026-03-20T09:00:00.000Z',
      lastUsedAt: '2026-03-20T18:00:00.000Z',
      deviceLabel: 'Web browser',
      appContext: 'web',
      hasPushToken: false,
      current: false
    }
  ])),
  revokeSession: vi.fn(() => Promise.resolve()),
  revokeOtherSessions: vi.fn(() => Promise.resolve({ revokedCount: 1 })),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  rotateRecoveryCode: vi.fn(),
  getDeviceNotificationSettings: vi.fn(() => Promise.resolve({
    token: 'push-token-1',
    notificationsEnabled: true,
    previewsEnabled: false,
    quietHoursEnabled: true,
    quietHoursStartMinute: 1320,
    quietHoursEndMinute: 420,
    timezone: 'America/New_York'
  })),
  updateDeviceNotificationSettings: vi.fn((payload) => Promise.resolve(payload))
}));

vi.mock('../services/notifications', () => ({
  getCachedPushToken: vi.fn(() => 'push-token-1')
}));

vi.mock('../services/sessionStorage', () => ({
  loadStoredShowInAppToasts: vi.fn(() => Promise.resolve(true)),
  persistStoredShowInAppToasts: vi.fn(() => Promise.resolve()),
  loadStoredAnimateGifsAutomatically: vi.fn(() => Promise.resolve(true)),
  loadStoredReducedDataMode: vi.fn(() => Promise.resolve(false)),
  persistStoredAnimateGifsAutomatically: vi.fn(() => Promise.resolve()),
  persistStoredReducedDataMode: vi.fn(() => Promise.resolve())
}));

describe('ProfileSettings.vue notification controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.mocked(sessionStorage.loadStoredShowInAppToasts).mockResolvedValue(true);
    vi.mocked(sessionStorage.loadStoredAnimateGifsAutomatically).mockResolvedValue(true);
    vi.mocked(sessionStorage.loadStoredReducedDataMode).mockResolvedValue(false);
    vi.mocked(notifications.getCachedPushToken).mockReturnValue('push-token-1');
  });

  it('loads and renders device notification settings when a push token exists', async () => {
    const wrapper = mount(ProfileSettings);
    await flushPromises();

    expect(wrapper.text()).toContain('Notifications');
    expect(wrapper.text()).toContain('Push on this device');
    expect(wrapper.text()).toContain('Show message previews');
    expect(wrapper.text()).toContain('Quiet hours');
    expect(wrapper.text()).toContain('Show in-app toasts');
    expect(wrapper.text()).toContain('Sessions and Devices');
    expect(wrapper.text()).toContain('Current session');
    expect(wrapper.text()).toContain('Android app');
    expect(wrapper.text()).toContain('Web browser');
    expect(vi.mocked(http.getDeviceNotificationSettings)).toHaveBeenCalledWith('push-token-1');
    expect(vi.mocked(http.getMySessions)).toHaveBeenCalledTimes(1);
  });

  it('saves backend-backed settings and persists the local toast preference', async () => {
    const wrapper = mount(ProfileSettings);
    await flushPromises();

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(false);
    await checkboxes[1].setValue(false);
    await checkboxes[2].setValue(true);
    await checkboxes[3].setValue(true);

    const timeInputs = wrapper.findAll('input[type="time"]');
    await timeInputs[0].setValue('23:15');
    await timeInputs[1].setValue('06:45');

    const notificationForm = wrapper.findAll('form').at(2);
    expect(notificationForm).toBeTruthy();
    await notificationForm!.trigger('submit.prevent');
    await flushPromises();

    expect(vi.mocked(http.updateDeviceNotificationSettings)).toHaveBeenCalledWith({
      token: 'push-token-1',
      notificationsEnabled: false,
      previewsEnabled: true,
      quietHoursEnabled: true,
      quietHoursStartMinute: 1395,
      quietHoursEndMinute: 405,
      timezone: 'America/New_York'
    });
    expect(vi.mocked(sessionStorage.persistStoredShowInAppToasts)).toHaveBeenCalledWith(false);
    const emitted = wrapper.emitted('notification-preferences-updated') ?? [];
    expect(emitted.at(-1)).toEqual([{ showInAppToasts: false }]);
  });

  it('shows the no-push-token notice and still allows the local toast control', async () => {
    vi.mocked(notifications.getCachedPushToken).mockReturnValue(null);

    const wrapper = mount(ProfileSettings);
    await flushPromises();

    expect(wrapper.text()).toContain('Device push controls are unavailable until push is active on this device.');
    expect(wrapper.text()).toContain('Show in-app toasts');
    expect(vi.mocked(http.getDeviceNotificationSettings)).not.toHaveBeenCalled();
  });

  it('loads and persists local media preferences', async () => {
    vi.mocked(sessionStorage.loadStoredAnimateGifsAutomatically).mockResolvedValue(false);
    vi.mocked(sessionStorage.loadStoredReducedDataMode).mockResolvedValue(true);

    const wrapper = mount(ProfileSettings);
    await flushPromises();

    expect(wrapper.text()).toContain('Media');
    expect(wrapper.text()).toContain('Animate GIFs automatically');
    expect(wrapper.text()).toContain('Reduced data mode');

    const forms = wrapper.findAll('form');
    const mediaForm = forms.at(3);
    expect(mediaForm).toBeTruthy();

    const checkboxes = mediaForm!.findAll('input[type="checkbox"]');
    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(false);
    await mediaForm!.trigger('submit.prevent');
    await flushPromises();

    expect(vi.mocked(sessionStorage.persistStoredAnimateGifsAutomatically)).toHaveBeenCalledWith(true);
    expect(vi.mocked(sessionStorage.persistStoredReducedDataMode)).toHaveBeenCalledWith(false);
    const emitted = wrapper.emitted('media-preferences-updated') ?? [];
    expect(emitted.at(-1)).toEqual([{ animateGifsAutomatically: true, reducedDataMode: false }]);
  });

  it('revokes a single other session and refreshes the list', async () => {
    const wrapper = mount(ProfileSettings);
    await flushPromises();

    const revokeButton = wrapper.findAll('button').find((button) => button.text() === 'Revoke');
    expect(revokeButton).toBeTruthy();
    await revokeButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.revokeSession)).toHaveBeenCalledWith('session-other');
    expect(vi.mocked(http.getMySessions)).toHaveBeenCalledTimes(2);
  });

  it('revokes all other sessions when requested', async () => {
    vi.mocked(http.getMySessions).mockResolvedValueOnce([
      {
        id: 'session-current',
        createdAt: '2026-03-21T10:00:00.000Z',
        lastUsedAt: '2026-03-21T12:00:00.000Z',
        deviceLabel: 'Android app',
        appContext: 'android',
        hasPushToken: true,
        current: true
      },
      {
        id: 'session-other-a',
        createdAt: '2026-03-20T09:00:00.000Z',
        lastUsedAt: '2026-03-20T18:00:00.000Z',
        deviceLabel: 'Web browser',
        appContext: 'web',
        hasPushToken: false,
        current: false
      },
      {
        id: 'session-other-b',
        createdAt: '2026-03-19T09:00:00.000Z',
        lastUsedAt: '2026-03-19T18:00:00.000Z',
        deviceLabel: 'Android app',
        appContext: 'android',
        hasPushToken: false,
        current: false
      }
    ]);

    const wrapper = mount(ProfileSettings);
    await flushPromises();

    const revokeAllButton = wrapper.findAll('button').find((button) => button.text() === 'Revoke all others');
    expect(revokeAllButton).toBeTruthy();
    await revokeAllButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.revokeOtherSessions)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(http.getMySessions)).toHaveBeenCalledTimes(2);
  });
});
