import { beforeEach, describe, expect, it, vi } from 'vitest';

const scheduleMock = vi.fn(async () => undefined);
const createChannelMock = vi.fn(async () => undefined);
const removeAllLocalListenersMock = vi.fn(async () => undefined);
const addLocalListenerMock = vi.fn(async () => ({ remove: vi.fn() }));
const checkLocalPermissionsMock = vi.fn(async () => ({ display: 'granted' as const }));
const requestLocalPermissionsMock = vi.fn(async () => ({ display: 'granted' as const }));
const getLocalDeliveredNotificationsMock = vi.fn(async () => ({ notifications: [] }));
const removeLocalDeliveredNotificationsMock = vi.fn(async () => undefined);
const removeAllLocalDeliveredNotificationsMock = vi.fn(async () => undefined);

const removeAllPushListenersMock = vi.fn(async () => undefined);
const addPushListenerMock = vi.fn(async () => ({ remove: vi.fn() }));
const checkPushPermissionsMock = vi.fn(async () => ({ receive: 'granted' as const }));
const requestPushPermissionsMock = vi.fn(async () => ({ receive: 'granted' as const }));
const getPushTokenMock = vi.fn(async () => ({ token: 'push-token-1' }));
const deletePushTokenMock = vi.fn(async () => undefined);
const getPushDeliveredNotificationsMock = vi.fn(async () => ({ notifications: [] }));
const removePushDeliveredNotificationsMock = vi.fn(async () => undefined);
const removeAllPushDeliveredNotificationsMock = vi.fn(async () => undefined);
const localListeners: Record<string, Function> = {};
const pushListeners: Record<string, Function> = {};

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true
  }
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: scheduleMock,
    createChannel: createChannelMock,
    removeAllListeners: removeAllLocalListenersMock,
    addListener: vi.fn(async (eventName: string, handler: Function) => {
      localListeners[eventName] = handler;
      return addLocalListenerMock();
    }),
    checkPermissions: checkLocalPermissionsMock,
    requestPermissions: requestLocalPermissionsMock,
    getDeliveredNotifications: getLocalDeliveredNotificationsMock,
    removeDeliveredNotifications: removeLocalDeliveredNotificationsMock,
    removeAllDeliveredNotifications: removeAllLocalDeliveredNotificationsMock
  }
}));

vi.mock('@capacitor-firebase/messaging', () => ({
  FirebaseMessaging: {
    removeAllListeners: removeAllPushListenersMock,
    addListener: vi.fn(async (eventName: string, handler: Function) => {
      pushListeners[eventName] = handler;
      return addPushListenerMock();
    }),
    checkPermissions: checkPushPermissionsMock,
    requestPermissions: requestPushPermissionsMock,
    getToken: getPushTokenMock,
    deleteToken: deletePushTokenMock,
    getDeliveredNotifications: getPushDeliveredNotificationsMock,
    removeDeliveredNotifications: removePushDeliveredNotificationsMock,
    removeAllDeliveredNotifications: removeAllPushDeliveredNotificationsMock
  }
}));

describe('notifications service', () => {
  function scheduledNotificationAt(index: number): Record<string, unknown> {
    const call = scheduleMock.mock.calls[index] as any[] | undefined;
    return (call?.[0] as { notifications: Array<Record<string, unknown>> } | undefined)?.notifications[0] ?? {};
  }

  function scheduledBodyAt(index: number): string {
    return String(scheduledNotificationAt(index).body ?? '');
  }

  function scheduledIdAt(index: number): number {
    return Number(scheduledNotificationAt(index).id ?? 0);
  }

  beforeEach(() => {
    vi.resetModules();
    scheduleMock.mockClear();
    createChannelMock.mockClear();
    removeAllLocalListenersMock.mockClear();
    addLocalListenerMock.mockClear();
    checkLocalPermissionsMock.mockClear();
    requestLocalPermissionsMock.mockClear();
    getLocalDeliveredNotificationsMock.mockClear();
    removeLocalDeliveredNotificationsMock.mockClear();
    removeAllLocalDeliveredNotificationsMock.mockClear();
    removeAllPushListenersMock.mockClear();
    addPushListenerMock.mockClear();
    checkPushPermissionsMock.mockClear();
    requestPushPermissionsMock.mockClear();
    getPushTokenMock.mockClear();
    deletePushTokenMock.mockClear();
    getPushDeliveredNotificationsMock.mockClear();
    removePushDeliveredNotificationsMock.mockClear();
    removeAllPushDeliveredNotificationsMock.mockClear();
    Object.keys(localListeners).forEach((key) => delete localListeners[key]);
    Object.keys(pushListeners).forEach((key) => delete pushListeners[key]);
  });

  it('fires immediate local notifications for text, image, gif, and file messages', async () => {
    const notifications = await import('./notifications');

    const cases = [
      { type: 'text', content: 'hello there' },
      { type: 'image', content: 'photo.png' },
      { type: 'gif', content: 'party gif' },
      { type: 'file', content: 'notes.txt' }
    ] as const;

    for (const [index, entry] of cases.entries()) {
      await notifications.scheduleIncomingMessageNotification({
        id: `msg-${index}`,
        chatId: 'chat-1',
        senderId: 'user-2',
        senderUsername: 'other-user',
        senderDisplayName: 'Other User',
        senderAvatarUrl: null,
        content: entry.content,
        type: entry.type,
        metadata: null,
        createdAt: new Date(Date.now() + index * 1000).toISOString(),
        clientMessageId: `client-${index}`
      }, 'General');
    }

    expect(scheduleMock).toHaveBeenCalledTimes(4);
    expect(scheduledBodyAt(0)).toBe('hello there');
    expect(scheduledBodyAt(1)).toBe('Sent an image');
    expect(scheduledBodyAt(2)).toBe('Sent a GIF');
    expect(scheduledBodyAt(3)).toBe('Sent an attachment');
    expect(scheduledNotificationAt(0)).not.toHaveProperty('schedule');
  });

  it('does not drop rapid same-chat notifications for different messages', async () => {
    const notifications = await import('./notifications');

    await notifications.scheduleIncomingMessageNotification({
      id: 'msg-1',
      chatId: 'chat-rapid',
      senderId: 'user-2',
      senderUsername: 'other-user',
      senderDisplayName: 'Other User',
      senderAvatarUrl: null,
      content: 'first',
      type: 'text',
      metadata: null,
      createdAt: new Date().toISOString(),
      clientMessageId: 'client-1'
    }, 'Rapid');

    await notifications.scheduleIncomingMessageNotification({
      id: 'msg-2',
      chatId: 'chat-rapid',
      senderId: 'user-2',
      senderUsername: 'other-user',
      senderDisplayName: 'Other User',
      senderAvatarUrl: null,
      content: 'second',
      type: 'text',
      metadata: null,
      createdAt: new Date(Date.now() + 100).toISOString(),
      clientMessageId: 'client-2'
    }, 'Rapid');

    expect(scheduleMock).toHaveBeenCalledTimes(2);
    expect(scheduledIdAt(0)).not.toBe(scheduledIdAt(1));
  });

  it('deduplicates the same notification seed', async () => {
    const notifications = await import('./notifications');

    const message = {
      id: 'msg-repeat',
      chatId: 'chat-repeat',
      senderId: 'user-2',
      senderUsername: 'other-user',
      senderDisplayName: 'Other User',
      senderAvatarUrl: null,
      content: 'repeat me',
      type: 'text' as const,
      metadata: null,
      createdAt: new Date().toISOString(),
      clientMessageId: 'client-repeat'
    };

    await notifications.scheduleIncomingMessageNotification(message, 'Repeat');
    await notifications.scheduleIncomingMessageNotification(message, 'Repeat');

    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('wires push token, push tap, and foreground push callbacks', async () => {
    const notifications = await import('./notifications');
    const onOpenChat = vi.fn();
    const onForegroundPush = vi.fn();
    const onTokenReceived = vi.fn();

    await notifications.initializeNotifications(onOpenChat, onForegroundPush, onTokenReceived);

    expect(pushListeners.notificationActionPerformed).toBeTypeOf('function');
    expect(pushListeners.notificationReceived).toBeTypeOf('function');
    expect(pushListeners.tokenReceived).toBeTypeOf('function');

    pushListeners.notificationActionPerformed({
      notification: {
        data: { chatId: 'chat-9', messageId: 'msg-9', senderId: 'user-9' }
      }
    });

    expect(onOpenChat).toHaveBeenCalledWith('chat-9');

    pushListeners.notificationReceived({
      notification: {
        title: 'Other User',
        body: 'hello from push',
        data: { chatId: 'chat-9', messageId: 'msg-9', senderId: 'user-9', type: 'message.new' }
      }
    });

    expect(onForegroundPush).toHaveBeenCalledWith(expect.objectContaining({
      chatId: 'chat-9',
      messageId: 'msg-9',
      senderId: 'user-9',
      title: 'Other User',
      body: 'hello from push',
      type: 'message.new'
    }));

    const initialToken = await notifications.getPushToken();
    expect(initialToken).toBe('push-token-1');

    pushListeners.tokenReceived({ token: 'push-token-refresh' });
    expect(onTokenReceived).toHaveBeenCalledWith('push-token-refresh', 'push-token-1');
  });

  it('gets and deletes the current push token', async () => {
    const notifications = await import('./notifications');

    await notifications.ensurePushPermission();
    const token = await notifications.getPushToken();
    expect(token).toBe('push-token-1');
    expect(notifications.getCachedPushToken()).toBe('push-token-1');

    await notifications.deletePushToken();
    expect(deletePushTokenMock).toHaveBeenCalledTimes(1);
    expect(notifications.getCachedPushToken()).toBeNull();
  });
});
