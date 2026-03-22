import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminServerManagement from './AdminServerManagement.vue';
import * as http from '../services/http';

vi.mock('../services/http', () => ({
  getAdminOperatorSummary: vi.fn(() => Promise.resolve({
    app: {
      name: 'The Penthouse API',
      checkedAt: '2026-03-19T18:00:00.000Z',
      databaseReachable: true,
      startedAt: '2026-03-19T17:00:00.000Z',
      uptimeSeconds: 3600,
      version: '0.1.0',
      buildId: 'build-123',
      deployedAt: '2026-03-19T17:05:00.000Z'
    },
    members: {
      total: 12,
      active: 10,
      banned: 1,
      removed: 1,
      admins: 2
    },
    content: {
      chats: 3,
      messages: 42,
      uploads: 5,
      uploadBytesTotal: 4096
    },
    realtime: {
      sockets: 6,
      connectedUsers: 3,
      activeChatRooms: 1
    },
    moderation: {
      hiddenMessages: 2,
      recentActions24h: 4
    },
    invite: {
      code: 'PENTHOUSE-ALPHA',
      uses: 7,
      maxUses: 999999,
      createdAt: '2026-03-18T18:00:00.000Z'
    },
    push: {
      configured: true,
      androidTokens: 4,
      iosTokens: 0,
      notificationsDisabled: 1,
      quietHoursEnabled: 2,
      previewsDisabled: 3,
      sinceStart: {
        successfulSends: 12,
        failedSends: 1,
        staleTokensRemoved: 2,
        lastFailureAt: '2026-03-19T18:15:00.000Z'
      }
    },
    uploads: {
      status: 'available',
      directoryBytes: 8192,
      fileCount: 6,
      latestUploadAt: '2026-03-19T18:10:00.000Z',
      scanLimited: false
    },
    errors: {
      sinceStart: {
        serverErrorCount: 3,
        lastServerErrorAt: '2026-03-19T18:16:00.000Z',
        routeGroups: [
          { group: 'admin', count: 2 },
          { group: 'media', count: 1 }
        ]
      }
    },
    backup: {
      status: 'ok',
      target: 'nas/nightly',
      lastSuccessfulBackupAt: '2026-03-19T17:30:00.000Z'
    }
  }))
}));

describe('AdminServerManagement.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders the operator summary', async () => {
    const wrapper = mount(AdminServerManagement);
    await flushPromises();

    expect(wrapper.text()).toContain('The Penthouse API');
    expect(wrapper.text()).toContain('OK');
    expect(wrapper.text()).toContain('PENTHOUSE-ALPHA');
    expect(wrapper.text()).toContain('Android tokens');
    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('Realtime');
    expect(wrapper.text()).toContain('Moderation');
    expect(wrapper.text()).toContain('Push paused');
    expect(wrapper.text()).toContain('Uploads Storage');
    expect(wrapper.text()).toContain('Files scanned');
    expect(wrapper.text()).toContain('Since this process started');
    expect(wrapper.text()).toContain('Backup');
    expect(wrapper.text()).toContain('build-123');
    expect(vi.mocked(http.getAdminOperatorSummary)).toHaveBeenCalledTimes(1);
  });

  it('refreshes the summary when the refresh button is clicked', async () => {
    const wrapper = mount(AdminServerManagement);
    await flushPromises();

    const refreshButton = wrapper.findAll('button').find((button) => button.text() === 'Refresh');
    expect(refreshButton).toBeTruthy();
    await refreshButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.getAdminOperatorSummary)).toHaveBeenCalledTimes(2);
  });

  it('shows an error state when the summary request fails', async () => {
    vi.mocked(http.getAdminOperatorSummary).mockRejectedValueOnce(new Error('summary failed'));

    const wrapper = mount(AdminServerManagement);
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load operator summary');
  });

  it('can recover on refresh after a previous failure', async () => {
    vi.mocked(http.getAdminOperatorSummary)
      .mockRejectedValueOnce(new Error('summary failed'))
      .mockResolvedValueOnce({
        app: {
          name: 'The Penthouse API',
          checkedAt: '2026-03-19T19:00:00.000Z',
          databaseReachable: true,
          startedAt: '2026-03-19T17:00:00.000Z',
          uptimeSeconds: 7200,
          version: null,
          buildId: null,
          deployedAt: null
        },
        members: {
          total: 12,
          active: 10,
          banned: 1,
          removed: 1,
          admins: 2
        },
        content: {
          chats: 3,
          messages: 42,
          uploads: 5,
          uploadBytesTotal: 4096
        },
        realtime: {
          sockets: 0,
          connectedUsers: 0,
          activeChatRooms: 0
        },
        moderation: {
          hiddenMessages: 0,
          recentActions24h: 0
        },
        invite: {
          code: 'PENTHOUSE-BRAVO',
          uses: 0,
          maxUses: 999999,
          createdAt: '2026-03-19T19:00:00.000Z'
        },
        push: {
          configured: false,
          androidTokens: 0,
          iosTokens: 0,
          notificationsDisabled: 0,
          quietHoursEnabled: 0,
          previewsDisabled: 0,
          sinceStart: {
            successfulSends: 0,
            failedSends: 0,
            staleTokensRemoved: 0,
            lastFailureAt: null
          }
        },
        uploads: {
          status: 'unavailable',
          directoryBytes: null,
          fileCount: null,
          latestUploadAt: null,
          scanLimited: false
        },
        errors: {
          sinceStart: {
            serverErrorCount: 0,
            lastServerErrorAt: null,
            routeGroups: []
          }
        },
        backup: {
          status: 'unconfigured',
          target: null,
          lastSuccessfulBackupAt: null
        }
      });

    const wrapper = mount(AdminServerManagement);
    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load operator summary');

    const refreshButton = wrapper.findAll('button').find((button) => button.text() === 'Refresh');
    expect(refreshButton).toBeTruthy();
    await refreshButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('PENTHOUSE-BRAVO');
    expect(wrapper.text()).not.toContain('Failed to load operator summary');
    expect(wrapper.text()).toContain('unconfigured');
    expect(wrapper.text()).toContain('Unavailable');
  });
});
