import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://penthouse:penthouse@localhost:5432/penthouse'
});

const testPatterns = [
  'reg_%', 'dir_%', 'login_%', 'dup_%', 'badpw_%', 'searchme_%',
  'paginate_%', 'profile_%', 'prof_%', 'selfprofile_%', 'dm_from_%',
  'gif_%', 'poll_%', 'newdm_%', 'esc_dm_%', 'conn_%', 'editname_%',
  'chat_%', 'pending_%', 'short_%', 'mismatch_%', 'sess_%', 'logout_%',
  'settings_%', 'slowdown_%'
];

async function cleanup() {
  try {
    await client.connect();
    console.log('🗑️ Cleaning up test/burner accounts...\n');

    let totalDeleted = 0;
    for (const pattern of testPatterns) {
      const result = await client.query(
        'DELETE FROM users WHERE username LIKE $1',
        [pattern]
      );
      const count = result.rowCount || 0;
      totalDeleted += count;
      if (count > 0) console.log(`  ✓ Deleted ${count} account(s) matching "${pattern}"`);
    }

    console.log(`\n✅ Cleanup complete — deleted ${totalDeleted} test accounts total`);
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanup();
