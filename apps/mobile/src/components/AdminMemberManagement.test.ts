import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminMemberManagement from './AdminMemberManagement.vue';
import * as http from '../services/http';

vi.mock('../services/http', () => ({
  getAdminMembers: vi.fn(() => Promise.resolve([
    {
      id: 'member-1',
      username: 'aimtest',
      displayName: 'Aim Test',
      avatarUrl: null,
      bio: null,
      role: 'member',
      status: 'active',
      mustChangePassword: false,
      createdAt: '2026-03-19T10:00:00.000Z'
    },
    {
      id: 'member-2',
      username: 'bannedtest',
      displayName: 'Banned Test',
      avatarUrl: null,
      bio: null,
      role: 'member',
      status: 'banned',
      mustChangePassword: false,
      createdAt: '2026-03-18T10:00:00.000Z'
    },
    {
      id: 'member-3',
      username: 'removedtest',
      displayName: 'Removed Test',
      avatarUrl: null,
      bio: null,
      role: 'member',
      status: 'removed',
      mustChangePassword: false,
      createdAt: '2026-03-17T10:00:00.000Z'
    }
  ])),
  removeAdminMember: vi.fn(() => Promise.resolve()),
  banAdminMember: vi.fn(() => Promise.resolve()),
  issueAdminTempPassword: vi.fn(() => Promise.resolve({
    userId: 'member-1',
    username: 'aimtest',
    temporaryPassword: 'TEMP-PASS-1234'
  }))
}));

describe('AdminMemberManagement.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => true)
    });
  });

  it('loads members on mount', async () => {
    const wrapper = mount(AdminMemberManagement, {
      props: {
        currentUserId: 'admin-1'
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('@aimtest');
    expect(wrapper.text()).toContain('active');
    expect(wrapper.text()).toContain('banned');
    expect(vi.mocked(http.getAdminMembers)).toHaveBeenCalledTimes(1);
  });

  it('issues a temporary password and shows it immediately', async () => {
    const wrapper = mount(AdminMemberManagement, {
      props: {
        currentUserId: 'admin-1'
      }
    });
    await flushPromises();

    const tempButton = wrapper.findAll('button').find((button) => button.text().includes('Temp password'));
    expect(tempButton).toBeTruthy();
    await tempButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.issueAdminTempPassword)).toHaveBeenCalledWith('member-1');
    expect(wrapper.text()).toContain('TEMP-PASS-1234');
    expect(wrapper.text()).toContain('@aimtest');
  });

  it('calls remove and ban actions for active members after confirmation', async () => {
    const wrapper = mount(AdminMemberManagement, {
      props: {
        currentUserId: 'admin-1'
      }
    });
    await flushPromises();

    const removeButton = wrapper.findAll('button').find((button) => button.text().includes('Remove'));
    const banButton = wrapper.findAll('button').find((button) => button.text().includes('Ban'));

    expect(removeButton).toBeTruthy();
    expect(banButton).toBeTruthy();

    await removeButton!.trigger('click');
    await flushPromises();
    await banButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.removeAdminMember)).toHaveBeenCalledWith('member-1');
    expect(vi.mocked(http.banAdminMember)).toHaveBeenCalledWith('member-1');
  });

  it('does not call destructive APIs when confirmation is cancelled', async () => {
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => false)
    });

    const wrapper = mount(AdminMemberManagement, {
      props: {
        currentUserId: 'admin-1'
      }
    });
    await flushPromises();

    const removeButton = wrapper.findAll('button').find((button) => button.text().includes('Remove'));
    const banButton = wrapper.findAll('button').find((button) => button.text().includes('Ban'));

    await removeButton!.trigger('click');
    await banButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.removeAdminMember)).not.toHaveBeenCalled();
    expect(vi.mocked(http.banAdminMember)).not.toHaveBeenCalled();
  });

  it('does not expose active destructive actions for banned or removed members', async () => {
    const wrapper = mount(AdminMemberManagement, {
      props: {
        currentUserId: 'admin-1'
      }
    });
    await flushPromises();

    const rows = wrapper.findAll('.member-admin-row');
    const bannedRow = rows.find((row) => row.text().includes('@bannedtest'));
    const removedRow = rows.find((row) => row.text().includes('@removedtest'));

    expect(bannedRow).toBeTruthy();
    expect(removedRow).toBeTruthy();

    const bannedButtons = bannedRow!.findAll('button');
    const removedButtons = removedRow!.findAll('button');

    expect(bannedButtons.find((button) => button.text().includes('Remove'))?.attributes('disabled')).toBeDefined();
    expect(bannedButtons.find((button) => button.text().includes('Ban'))?.attributes('disabled')).toBeDefined();
    expect(removedButtons.find((button) => button.text().includes('Remove'))?.attributes('disabled')).toBeDefined();
    expect(removedButtons.find((button) => button.text().includes('Ban'))?.attributes('disabled')).toBeDefined();
  });
});
