const DEFAULT_TEST_NOTICE_VERSION = 'alpha-v1';

function resolveConfiguredVersion(): string {
  const configured = import.meta.env.VITE_TEST_NOTICE_VERSION?.trim();
  return configured || DEFAULT_TEST_NOTICE_VERSION;
}

export const TEST_NOTICE_VERSION = resolveConfiguredVersion();
export const TEST_NOTICE_TITLE = 'Internal Test Notice';
export const TEST_NOTICE_SUMMARY =
  'This build is for internal testing only. Access stays gated until you confirm you understand the current test notice.';
