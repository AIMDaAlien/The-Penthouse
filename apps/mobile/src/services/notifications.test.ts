import { beforeEach, describe, expect, it, vi } from 'vitest';

const scheduleMock = vi.fn(async () => undefined);
const createChannelMock = vi.fn(async () => undefined);
const removeAllListenersMock = vi.fn(async () => undefined);
const addListenerMock = vi.fn(async () => ({ remove: vi.fn() }));
const checkPermissionsMock = vi.fn(async () => ({ display: 'granted' as const }));
const requestPermissionsMock = vi.fn(async () => ({ display: 'granted' as const }));
const getDeliveredNotificationsMock = vi.fn(async () => ({ notifications: [] }));
const removeDeliveredNotificationsMock = vi.fn(async () => undefined);
const removeAllDeliveredNotificationsMock = vi.fn(async () => undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true
  }
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: scheduleMock,
    createChannel: createChannelMock,
    removeAllListeners: removeAllListenersMock,
    addListener: addListenerMock,
    checkPermissions: checkPermissionsMock,
    requestPermissions: requestPermissionsMock,
    getDeliveredNotifications: getDeliveredNotificationsMock,
    removeDeliveredNotifications: removeDeliveredNotificationsMock,
    removeAllDeliveredNotifications: removeAllDeliveredNotificationsMock
  }
}));

describe('notifications service', () => {
  function scheduledBodyAt(index: number): string {
    const call = scheduleMock.mock.calls[index] as any[] | undefined;
    return (call?.[0] as { notifications: Array<{ body: string }> } | undefined)?.notifications[0]?.body ?? '';
  }

  function scheduledIdAt(index: number): number {
    const call = scheduleMock.mock.calls[index] as any[] | undefined;
    return (call?.[0] as { notifications: Array<{ id: number }> } | undefined)?.notifications[0]?.id ?? 0;
  }

  beforeEach(() => {
    vi.resetModules();
    scheduleMock.mockClear();
    createChannelMock.mockClear();
    removeAllListenersMock.mockClear();
    addListenerMock.mockClear();
    checkPermissionsMock.mockClear();
    requestPermissionsMock.mockClear();
    getDeliveredNotificationsMock.mockClear();
    removeDeliveredNotificationsMock.mockClear();
    removeAllDeliveredNotificationsMock.mockClear();
  });

  it('schedules notifications for text, image, gif, and file messages', async () => {
    const notifications = await import('./notifications');

    const cases = [
      { type: 'text', content: 'hello there', expectedBody: 'hello there' },
      { type: 'image', content: 'photo.png', expectedBody: 'Sent an image' },
      { type: 'gif', content: 'party gif', expectedBody: 'Sent a GIF' },
      { type: 'file', content: 'notes.txt', expectedBody: 'Sent an attachment' }
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
});
