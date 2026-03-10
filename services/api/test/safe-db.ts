export function assertSafeTestDatabase(databaseUrl = process.env.DATABASE_URL): void {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for test helpers');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean).pop() ?? '';
  if (!databaseName || !/test/i.test(databaseName)) {
    throw new Error(`Refusing to run destructive tests against non-test database "${databaseName || 'unknown'}"`);
  }
}
