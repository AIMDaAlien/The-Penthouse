import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AdminInviteManagement from './AdminInviteManagement.vue';
import * as http from '../services/http';

vi.mock('../services/http', () => ({
  getAdminInvites: vi.fn(() => Promise.resolve([
    {
      id: 'inv-1',
      code: 'ALPHA-CODE',
      label: 'alpha-batch',
      uses: 3,
      maxUses: 10,
      expiresAt: null,
      revokedAt: null,
      createdAt: '2026-03-19T12:00:00.000Z'
    },
    {
      id: 'inv-2',
      code: 'REVOKED-CODE',
      label: 'old-batch',
      uses: 1,
      maxUses: 10,
      expiresAt: null,
      revokedAt: '2026-03-20T08:00:00.000Z',
      createdAt: '2026-03-18T12:00:00.000Z'
    },
    {
      id: 'inv-3',
      code: 'FULL-CODE',
      label: 'full-batch',
      uses: 5,
      maxUses: 5,
      expiresAt: null,
      revokedAt: null,
      createdAt: '2026-03-17T12:00:00.000Z'
    }
  ])),
  createAdminInvite: vi.fn(() => Promise.resolve({
    id: 'inv-new',
    code: 'NEW-CODE',
    label: 'new-batch',
    uses: 0,
    maxUses: 20,
    expiresAt: null,
    revokedAt: null,
    createdAt: '2026-03-21T10:00:00.000Z'
  })),
  revokeAdminInvite: vi.fn(() => Promise.resolve()),
  getRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'invite_only' })),
  updateRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'closed' }))
}));

describe('AdminInviteManagement.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => true)
    });
  });

  it('renders invite list with correct status chips', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    expect(vi.mocked(http.getAdminInvites)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(http.getRegistrationMode)).toHaveBeenCalledTimes(1);

    expect(wrapper.text()).toContain('3 loaded');
    expect(wrapper.text()).toContain('alpha-batch');
    expect(wrapper.text()).toContain('ALPHA-CODE');
    expect(wrapper.text()).toContain('old-batch');
    expect(wrapper.text()).toContain('full-batch');

    const rows = wrapper.findAll('.invite-row');
    expect(rows).toHaveLength(3);

    const activeRow = rows.find((row) => row.text().includes('alpha-batch'));
    const revokedRow = rows.find((row) => row.text().includes('old-batch'));
    const exhaustedRow = rows.find((row) => row.text().includes('full-batch'));

    expect(activeRow!.find('.invite-status-active').exists()).toBe(true);
    expect(activeRow!.text()).toContain('active');

    expect(revokedRow!.find('.invite-status-revoked').exists()).toBe(true);
    expect(revokedRow!.text()).toContain('revoked');

    expect(exhaustedRow!.find('.invite-status-exhausted').exists()).toBe(true);
    expect(exhaustedRow!.text()).toContain('exhausted');
  });

  it('creates an invite and refreshes the list', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const labelInput = wrapper.find('input[placeholder*="Invite label"]');
    const maxUsesInput = wrapper.find('input[type="number"]');
    const form = wrapper.find('.create-invite-form');

    await labelInput.setValue('new-batch');
    await maxUsesInput.setValue(20);
    await form.trigger('submit');
    await flushPromises();

    expect(vi.mocked(http.createAdminInvite)).toHaveBeenCalledWith({
      label: 'new-batch',
      maxUses: 20
    });
    expect(wrapper.text()).toContain('Invite created.');
    // List should have been refreshed (called once on mount + once after create)
    expect(vi.mocked(http.getAdminInvites)).toHaveBeenCalledTimes(2);
  });

  it('revokes an invite and refreshes the list', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const rows = wrapper.findAll('.invite-row');
    const activeRow = rows.find((row) => row.text().includes('alpha-batch'));
    const revokeButton = activeRow!.findAll('button').find((button) => button.text().includes('Revoke'));

    expect(revokeButton).toBeTruthy();
    await revokeButton!.trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalled();
    expect(vi.mocked(http.revokeAdminInvite)).toHaveBeenCalledWith('inv-1');
    // List should have been refreshed (called once on mount + once after revoke)
    expect(vi.mocked(http.getAdminInvites)).toHaveBeenCalledTimes(2);
  });

  it('disables revoke button for non-active invites', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const rows = wrapper.findAll('.invite-row');
    const revokedRow = rows.find((row) => row.text().includes('old-batch'));
    const exhaustedRow = rows.find((row) => row.text().includes('full-batch'));

    const revokedButton = revokedRow!.findAll('button').find((button) => button.text().includes('Revoke'));
    const exhaustedButton = exhaustedRow!.findAll('button').find((button) => button.text().includes('Revoke'));

    expect(revokedButton!.attributes('disabled')).toBeDefined();
    expect(exhaustedButton!.attributes('disabled')).toBeDefined();
  });

  it('toggles registration mode', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    expect(wrapper.text()).toContain('Invite-only');
    expect(wrapper.text()).toContain('Switch to closed');

    const toggleButton = wrapper.findAll('button').find((button) => button.text().includes('Switch to closed'));
    expect(toggleButton).toBeTruthy();
    await toggleButton!.trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalled();
    expect(vi.mocked(http.updateRegistrationMode)).toHaveBeenCalledWith({
      registrationMode: 'closed'
    });
    expect(wrapper.text()).toContain('Registration mode updated to Closed.');
  });

  it('does not revoke when confirmation is cancelled', async () => {
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => false)
    });

    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const rows = wrapper.findAll('.invite-row');
    const activeRow = rows.find((row) => row.text().includes('alpha-batch'));
    const revokeButton = activeRow!.findAll('button').find((button) => button.text().includes('Revoke'));

    await revokeButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.revokeAdminInvite)).not.toHaveBeenCalled();
  });

  it('emits mode-changed when admin toggles registration mode', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const toggleButton = wrapper.findAll('button').find((button) => button.text().includes('Switch to closed'));
    expect(toggleButton).toBeTruthy();
    await toggleButton!.trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalled();
    expect(vi.mocked(http.updateRegistrationMode)).toHaveBeenCalledWith({
      registrationMode: 'closed'
    });

    const emitted = wrapper.emitted('mode-changed');
    expect(emitted).toBeTruthy();
    expect(emitted!).toHaveLength(1);
    expect(emitted![0]).toEqual(['closed']);
  });

  it('create invite form sends expiresAt when set', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const labelInput = wrapper.find('input[placeholder*="Invite label"]');
    const maxUsesInput = wrapper.find('input[type="number"]');
    const expiresInput = wrapper.find('input[type="datetime-local"]');
    const form = wrapper.find('.create-invite-form');

    await labelInput.setValue('expiring-batch');
    await maxUsesInput.setValue(10);
    await expiresInput.setValue('2026-12-31T23:59');
    await form.trigger('submit');
    await flushPromises();

    expect(vi.mocked(http.createAdminInvite)).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(http.createAdminInvite).mock.calls[0][0];
    expect(callArg.label).toBe('expiring-batch');
    expect(callArg.expiresAt).toBeDefined();
    expect(typeof callArg.expiresAt).toBe('string');
    // Should be an ISO string derived from the datetime-local value
    expect(callArg.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('create invite form omits expiresAt when empty', async () => {
    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const labelInput = wrapper.find('input[placeholder*="Invite label"]');
    const form = wrapper.find('.create-invite-form');

    await labelInput.setValue('no-expiry-batch');
    await form.trigger('submit');
    await flushPromises();

    expect(vi.mocked(http.createAdminInvite)).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(http.createAdminInvite).mock.calls[0][0];
    expect(callArg.label).toBe('no-expiry-batch');
    expect(callArg.expiresAt).toBeUndefined();
  });

  it('does not toggle mode when confirmation is cancelled', async () => {
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => false)
    });

    const wrapper = mount(AdminInviteManagement);
    await flushPromises();

    const toggleButton = wrapper.findAll('button').find((button) => button.text().includes('Switch to closed'));
    await toggleButton!.trigger('click');
    await flushPromises();

    expect(vi.mocked(http.updateRegistrationMode)).not.toHaveBeenCalled();
  });
});
