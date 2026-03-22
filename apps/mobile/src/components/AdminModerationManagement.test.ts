import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminModerationManagement from './AdminModerationManagement.vue';
import * as http from '../services/http';

const baseMessage = {
  id: 'message-1',
  chatId: 'chat-1',
  senderId: 'user-2',
  senderUsername: 'aimtest',
  senderDisplayName: 'Aim Test',
  senderAvatarUrl: null,
  senderStatus: 'active' as const,
  hidden: false,
  content: 'Hello from audit',
  type: 'text' as const,
  metadata: null,
  createdAt: '2026-03-20T12:00:00.000Z',
  moderation: {
    hiddenByModeration: false,
    latestAction: null,
    latestReason: null,
    latestCreatedAt: null,
    latestActorUserId: null,
    latestActorUsername: null,
    latestActorDisplayName: null
  }
};

vi.mock('../services/http', () => ({
  getAdminChats: vi.fn(() => Promise.resolve([
    { id: 'chat-1', name: 'General', type: 'channel', updatedAt: '2026-03-20T12:00:00.000Z', unreadCount: 0 }
  ])),
  getAdminChatMessages: vi.fn(() => Promise.resolve([baseMessage])),
  hideAdminMessage: vi.fn(() => Promise.resolve({
    ...baseMessage,
    hidden: true,
    moderation: {
      hiddenByModeration: true,
      latestAction: 'hide',
      latestReason: 'Spam cleanup',
      latestCreatedAt: '2026-03-20T12:05:00.000Z',
      latestActorUserId: 'admin-1',
      latestActorUsername: 'owner',
      latestActorDisplayName: 'Owner'
    }
  })),
  unhideAdminMessage: vi.fn(() => Promise.resolve({
    ...baseMessage,
    moderation: {
      hiddenByModeration: false,
      latestAction: 'unhide',
      latestReason: 'Restored after review',
      latestCreatedAt: '2026-03-20T12:10:00.000Z',
      latestActorUserId: 'admin-1',
      latestActorUsername: 'owner',
      latestActorDisplayName: 'Owner'
    }
  }))
}));

describe('AdminModerationManagement.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads moderation history for the first available chat', async () => {
    const wrapper = mount(AdminModerationManagement);

    await flushPromises();

    expect(vi.mocked(http.getAdminChats)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(http.getAdminChatMessages)).toHaveBeenCalledWith('chat-1');
    expect(wrapper.text()).toContain('Hello from audit');
    expect(wrapper.text()).toContain('General');
  });

  it('requires a reason before hiding a message', async () => {
    const wrapper = mount(AdminModerationManagement);

    await flushPromises();

    const hideButton = wrapper.findAll('button').find((button) => button.text().includes('Hide'));
    expect(hideButton).toBeTruthy();
    await hideButton!.trigger('click');
    await flushPromises();

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');
    await flushPromises();

    expect(vi.mocked(http.hideAdminMessage)).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Reason is required.');
  });

  it('hides a message and refreshes the audit list', async () => {
    vi.mocked(http.getAdminChatMessages)
      .mockResolvedValueOnce([baseMessage])
      .mockResolvedValueOnce([
        {
          ...baseMessage,
          hidden: true,
          moderation: {
            hiddenByModeration: true,
            latestAction: 'hide',
            latestReason: 'Spam cleanup',
            latestCreatedAt: '2026-03-20T12:05:00.000Z',
            latestActorUserId: 'admin-1',
            latestActorUsername: 'owner',
            latestActorDisplayName: 'Owner'
          }
        }
      ]);

    const wrapper = mount(AdminModerationManagement, {
      props: {}
    });

    await flushPromises();

    const hideButton = wrapper.findAll('button').find((button) => button.text().includes('Hide'));
    await hideButton!.trigger('click');
    await flushPromises();

    await wrapper.find('textarea').setValue('Spam cleanup');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(vi.mocked(http.hideAdminMessage)).toHaveBeenCalledWith('message-1', 'Spam cleanup');
    expect(vi.mocked(http.getAdminChatMessages)).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Message hidden.');
    expect(wrapper.text()).toContain('Latest hide');
  });

  it('restores a moderated message with a required reason', async () => {
    vi.mocked(http.getAdminChatMessages).mockResolvedValueOnce([
      {
        ...baseMessage,
        hidden: true,
        moderation: {
          hiddenByModeration: true,
          latestAction: 'hide',
          latestReason: 'Spam cleanup',
          latestCreatedAt: '2026-03-20T12:05:00.000Z',
          latestActorUserId: 'admin-1',
          latestActorUsername: 'owner',
          latestActorDisplayName: 'Owner'
        }
      }
    ]);

    const wrapper = mount(AdminModerationManagement);

    await flushPromises();

    const restoreButton = wrapper.findAll('button').find((button) => button.text().includes('Restore'));
    await restoreButton!.trigger('click');
    await flushPromises();

    await wrapper.find('textarea').setValue('Restored after review');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(vi.mocked(http.unhideAdminMessage)).toHaveBeenCalledWith('message-1', 'Restored after review');
  });

  it('can load a DM chat from the admin chat list', async () => {
    vi.mocked(http.getAdminChats).mockResolvedValueOnce([
      { id: 'dm-1', name: '@aimtest + @owner', type: 'dm', updatedAt: '2026-03-20T12:00:00.000Z', unreadCount: 0 }
    ]);

    const wrapper = mount(AdminModerationManagement);
    await flushPromises();

    expect(wrapper.text()).toContain('@aimtest + @owner');
    expect(vi.mocked(http.getAdminChatMessages)).toHaveBeenCalledWith('dm-1');
  });
});
