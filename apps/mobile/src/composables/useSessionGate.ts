import { computed, ref } from 'vue';
import { TEST_NOTICE_VERSION } from '../testNotice';
import type { Session } from '../types';
import {
  type AuthEvent,
  acknowledgeTestNotice,
  changePassword,
  getMe,
  hydrateStoredSession,
  login,
  register,
  resetPassword,
  setStoredUser
} from '../services/http';
import { describeAuthError } from '../services/errors';

type UseSessionGateOptions = {
  initializeWorkspace: () => Promise<void>;
  resetWorkspaceState: () => void;
};

export function useSessionGate(options: UseSessionGateOptions) {
  const authError = ref('');
  const isAuthenticating = ref(false);
  const isBooting = ref(true);
  const session = ref<Session | null>(null);
  const registrationMode = ref<'invite_only' | 'closed'>('invite_only');
  const recoveryCodeNotice = ref('');

  const forcedPwForm = ref({ currentPassword: '', newPassword: '' });
  const forcedPwConfirm = ref('');
  const savingForcedPw = ref(false);
  const forcedPwError = ref('');
  const sessionSyncRequired = ref(false);
  const syncingSessionState = ref(false);
  const sessionSyncError = ref('');
  const noticeGateForced = ref(false);
  const testNoticeConfirmed = ref(false);
  const acknowledgingTestNotice = ref(false);
  const testNoticeError = ref('');

  const requiredTestNoticeVersion = computed(() =>
    session.value?.user.requiredTestNoticeVersion?.trim() || TEST_NOTICE_VERSION
  );

  function userHasFullAccess(nextSession: Session | null): boolean {
    if (!nextSession) return false;
    return !nextSession.user.mustChangePassword && !nextSession.user.mustAcceptTestNotice;
  }

  function setSessionState(nextSession: Session): void {
    session.value = nextSession;
    setStoredUser(nextSession.user);
    if ('recoveryCode' in nextSession) {
      recoveryCodeNotice.value = nextSession.recoveryCode ?? '';
    }
  }

  function clearSessionSyncBlocker(): void {
    sessionSyncRequired.value = false;
    sessionSyncError.value = '';
  }

  function enterSessionSyncRequiredState(
    nextSession: Session | null,
    message = 'Session sync required before continuing.'
  ): void {
    if (nextSession) {
      setSessionState(nextSession);
    }

    clearSessionSyncBlocker();
    sessionSyncRequired.value = true;
    sessionSyncError.value = message;
    noticeGateForced.value = false;
    options.resetWorkspaceState();
  }

  function forceNoticeGate(): void {
    clearSessionSyncBlocker();
    noticeGateForced.value = true;
    options.resetWorkspaceState();
  }

  async function fetchFreshSession(baseSession: Session): Promise<Session> {
    const me = await getMe();
    return {
      ...baseSession,
      user: {
        ...baseSession.user,
        ...me
      }
    };
  }

  async function syncSessionUser(): Promise<Session> {
    if (!session.value) {
      throw new Error('No active session available for sync');
    }

    const nextSession = await fetchFreshSession(session.value);
    setSessionState(nextSession);
    return nextSession;
  }

  async function completeAuth(nextSession: Session): Promise<void> {
    const previousUserId = session.value?.user.id ?? null;
    if (previousUserId && previousUserId !== nextSession.user.id) {
      options.resetWorkspaceState();
    }

    setSessionState(nextSession);
    clearSessionSyncBlocker();
    noticeGateForced.value = false;
    syncingSessionState.value = false;
    testNoticeConfirmed.value = false;
    testNoticeError.value = '';

    if (!userHasFullAccess(nextSession)) {
      options.resetWorkspaceState();
      return;
    }

    await options.initializeWorkspace();
  }

  async function handleAuthEvent(event: AuthEvent): Promise<void> {
    if (event.type === 'user_updated') {
      if (!session.value) return;
      const nextSession = await hydrateStoredSession();
      if (!nextSession) return;
      await completeAuth(nextSession);
      return;
    }

    if (event.type === 'notice_required') {
      if (!session.value || noticeGateForced.value || sessionSyncRequired.value) return;

      forceNoticeGate();

      try {
        const nextSession = await syncSessionUser();
        await completeAuth(nextSession);
      } catch {
        enterSessionSyncRequiredState(session.value);
      }
    }
  }

  async function handleLogin(username: string, pass: string): Promise<void> {
    isAuthenticating.value = true;
    authError.value = '';
    try {
      const response = await login(username, pass);
      await completeAuth(response);
    } catch (error: unknown) {
      authError.value = describeAuthError(error);
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function handleRegister(username: string, pass: string, invite: string): Promise<void> {
    isAuthenticating.value = true;
    authError.value = '';
    try {
      const response = await register(username, pass, invite);
      await completeAuth(response);
    } catch (error: unknown) {
      authError.value = describeAuthError(error);
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function handlePasswordReset(
    username: string,
    recoveryCode: string,
    nextPassword: string
  ): Promise<void> {
    isAuthenticating.value = true;
    authError.value = '';
    try {
      const response = await resetPassword(username, recoveryCode, nextPassword);
      await completeAuth(response);
    } catch (error: unknown) {
      authError.value = describeAuthError(error);
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function handleTestNoticeAck(): Promise<void> {
    if (!session.value) return;
    if (!testNoticeConfirmed.value) {
      testNoticeError.value = 'Please confirm the current test notice before continuing';
      return;
    }

    acknowledgingTestNotice.value = true;
    testNoticeError.value = '';

    try {
      const result = await acknowledgeTestNotice(requiredTestNoticeVersion.value);
      await completeAuth({
        ...session.value,
        user: result.user
      });
    } catch (error: any) {
      testNoticeError.value = error?.response?.data?.error || 'Failed to confirm the current test notice';
    } finally {
      acknowledgingTestNotice.value = false;
    }
  }

  async function handleForcedPasswordChange(): Promise<void> {
    if (forcedPwForm.value.newPassword !== forcedPwConfirm.value) {
      forcedPwError.value = 'New passwords do not match';
      return;
    }

    savingForcedPw.value = true;
    forcedPwError.value = '';

    try {
      const updatedSession = await changePassword({ ...forcedPwForm.value });
      await completeAuth(updatedSession);
      forcedPwForm.value = { currentPassword: '', newPassword: '' };
      forcedPwConfirm.value = '';
    } catch (error: any) {
      forcedPwError.value = error?.response?.data?.error || 'Failed to update password';
    } finally {
      savingForcedPw.value = false;
    }
  }

  async function handleSessionSyncRetry(): Promise<void> {
    if (!session.value) return;

    syncingSessionState.value = true;
    sessionSyncError.value = '';

    try {
      const nextSession = await syncSessionUser();
      await completeAuth(nextSession);
    } catch {
      enterSessionSyncRequiredState(session.value);
    } finally {
      syncingSessionState.value = false;
    }
  }

  async function restoreStoredSession(): Promise<void> {
    try {
      const restoredSession = await hydrateStoredSession();
      if (!restoredSession) return;

      try {
        const freshSession = await fetchFreshSession(restoredSession);
        await completeAuth(freshSession);
      } catch {
        enterSessionSyncRequiredState(restoredSession);
      }
    } finally {
      isBooting.value = false;
    }
  }

  return {
    acknowledgingTestNotice,
    authError,
    completeAuth,
    enterSessionSyncRequiredState,
    fetchFreshSession,
    forcedPwConfirm,
    forcedPwError,
    forcedPwForm,
    handleAuthEvent,
    handleForcedPasswordChange,
    handleLogin,
    handlePasswordReset,
    handleRegister,
    handleSessionSyncRetry,
    handleTestNoticeAck,
    isAuthenticating,
    isBooting,
    noticeGateForced,
    recoveryCodeNotice,
    registrationMode,
    requiredTestNoticeVersion,
    restoreStoredSession,
    savingForcedPw,
    session,
    sessionSyncError,
    sessionSyncRequired,
    setSessionState,
    syncingSessionState,
    testNoticeConfirmed,
    testNoticeError,
    userHasFullAccess,
    clearSessionSyncBlocker,
    forceNoticeGate,
    syncSessionUser
  };
}
